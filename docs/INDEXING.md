# BidWizer Indexing Architecture

This document explains the new document indexing pipeline, artifact format, and operational guidelines.

## Goals

- Support multi-hundred-megabyte ZIP archives containing thousands of PDFs.
- Avoid per-chunk storage in Postgres; move heavy artifacts to Supabase storage.
- Share index artifacts across users and workspaces using document content fingerprints.
- Provide resumable background processing with observable progress and live reuse.

## Artifact Overview

Artifacts are stored in Supabase Storage under:

```
tenders/{orgId}/{tenderId}/indexes/{docHash}/v{version}/index.v1.tar.zst
```

Tar contents:

| File | Purpose |
| --- | --- |
| `manifest.json` | Metadata (schema version, stats, file list, checksum). |
| `chunks.jsonl.gz` | JSONL payload of chunk metadata and text (gzip compressed). |
| `embeddings.f16.bin` | Concatenated Float16 embeddings (row-major). |
| `names.map.json` | Mapping of `fileId` → `{ path, name, pages }`. |
| `hnsw.index` | Optional ANN index (reserved for future support). |

### Manifest Schema (simplified)

```json
{
  "version": 1,
  "schema": "bidwizer.index.v1",
  "docHash": "sha256-of-archive",
  "orgId": "org",
  "tenderId": "tender",
  "stats": {
    "totalChunks": 0,
    "totalPages": 0,
    "totalTokens": 0,
    "chunkSize": 1024,
    "chunkOverlap": 160,
    "embeddingModel": "text-embedding-3-small",
    "embeddingDimensions": 1536
  },
  "files": [
    {
      "fileId": "sha1-of-path",
      "path": "folder/document.pdf",
      "sha256": "…",
      "pages": 12,
      "size": 123456
    }
  ],
  "hasHnswIndex": false,
  "checksum": "sha256 manifest integrity"
}
```

Each chunk line contains:

```json
{
  "chunkId": "fileId:000123",
  "fileId": "fileId",
  "page": 4,
  "offset": 0,
  "length": 1000,
  "md5": "md5-of-text",
  "text": "chunk body…"
}
```

Embeddings are kept in Float16 to reduce storage requirements by ~50%.

## Processing Pipeline

Pipeline is orchestrated by BullMQ (`tender-indexing` queue) and Redis for coordination.

1. **Queue** (`index` job) – Acquire Redis lock (`lock:index:{docHash}`) and enqueue `{ tenderId, fileId, docHash }` for the selected PDF.
2. **Worker** – Download the PDF from Supabase using the stored bucket/key, extract page text, split it into ~1500-character chunks (with overlap), embed via OpenAI, and upsert the chunk rows in Postgres.
3. **Finalize** – Update the related `index_artifact` row with chunk counts, bytes, and status `READY`, while streaming progress snapshots to Redis.

Redis keys:

- `lock:index:{docHash}` – Prevent duplicate builds (30-minute TTL with heartbeat).
- `progress:index:{docHash}` – JSON payload describing the phase, percent, and ETA (12-hour TTL).

Progress phases: `queued → manifest → embedding → ready` (or `failed`).

## Database

`IndexArtifact` records store minimal metadata:

```prisma
model IndexArtifact {
  id          String @id @default(cuid())
  orgId       String
  tenderId    String
  docHash     String @unique
  version     Int    @default(1)
  status      IndexArtifactStatus @default(BUILDING)
  storageKey  String
  totalChunks Int    @default(0)
  totalPages  Int    @default(0)
  bytesApprox Int    @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Statuses: `BUILDING`, `READY`, `FAILED`.

## API Endpoints

| Route | Method | Description |
| --- | --- | --- |
| `/api/tenders/{tenderId}/docs/{docHash}/ensure-index` | `POST` | Authenticate + queue per-file indexing. Returns ready/building status. Accepts `{ forceRebuild? }`. |
| `/api/tenders/{tenderId}/docs/{docHash}/progress` | `GET` | Fetch current progress snapshot (or READY/FAILED metadata). |
| `/api/tenders/{tenderId}/docs/{docHash}/ask` | `POST` | Perform semantic question answering on the artifact. Body: `{ question, topK?, maxContextChars? }`. |
| `/api/tenders/{tenderId}/docs/{docHash}/release` | `POST` | Release cached artifact from in-memory LRU store. |

All routes reuse existing NextAuth session + `ensureTenderAccess` to enforce org membership.

## Worker Service

Run the worker alongside the Next.js server:

```bash
npm run worker
```

Environment variables required:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_TENDER_UPLOADS_BUCKET` (optional; defaults to `tender-uploads`)
- `SUPABASE_TENDER_INDEX_BUCKET` (optional; defaults to `tender-indexes`)
- `REDIS_URL` (or `UPSTASH_REDIS_URL`)
- `OPENAI_API_KEY`

The worker uses `ts-node` with the TypeScript source in `server/workers/indexWorker.ts`. Logs surface job lifecycle and failures.

## In-Memory Caching

`lib/indexing/loader.ts` maintains an LRU cache (default 5 artifacts / 512 MB). Artifacts include parsed manifest, chunk metadata, and decoded Float32 embeddings for fast inference. The `/release` API evicts a specific docHash, and the cache automatically disposes least-recently-used items.

## Failure & Resume

- Locks auto-expire; the worker heartbeats every 25 seconds.
- Progress snapshots survive up to 12 hours; clients can poll `/progress` to surface live updates.
- On failure the artifact row is marked `FAILED`, the lock is released, and workspace files are cleaned up.

## Client Workflow

1. Load the tender document tree/preview to obtain the extracted file’s `docHash` and `fileId`.
2. Call `POST /ensure-index` for that `{tenderId, docHash}` (optionally passing `{ forceRebuild: true }`). The response confirms whether indexing was queued or already ready.
3. Poll `/progress` until status becomes `ready` (or subscribe to live updates).
4. Use `/ask` or `/brief` with the same `docHash` (and `fileId` for targeting). Optionally call `/release` after idle periods to free cached artifacts.

## Testing Checklist

- Upload a large ZIP containing multiple PDFs → selecting any PDF queues an `index` job, emits per-file logs, and stores chunk rows for that file in Postgres.
- Re-selecting the same file returns `status: "ready"` immediately (no rebuild).
- `/ask` responds in <1 s once chunks exist, with citations referencing source pages.
- The related `index_artifact` row reports accurate `totalChunks`/`totalPages`, and Supabase holds the extracted PDF under `tenders/{tenderId}/extracted/{uploadId}/`.

Refer to the worker logs and Redis progress keys for diagnosing stuck or failed builds.
