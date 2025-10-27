/**
 * BidWizer diagnostics for indexing worker/queue/DB.
 * Run with: node -r dotenv/config scripts/diag-worker.mjs dotenv_config_path=.env.local
 */
import IORedis from "ioredis";
import { Queue, QueueEvents } from "bullmq";
import { PrismaClient } from "@prisma/client";

const env = {
  REDIS_URL: process.env.REDIS_URL || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
};

// 1) print env presence (no secrets)
console.log("[diag] env presence:", Object.fromEntries(Object.entries(env).map(([k, v]) => [k, Boolean(v)])));

// Prefer disabling Prisma prepared statements when not explicitly configured
if (!process.env.PRISMA_DISABLE_PREPARED_STATEMENTS) {
  process.env.PRISMA_DISABLE_PREPARED_STATEMENTS = "true";
}

function adjustDatabaseUrlForPgBouncer(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const hasPreparedStatementsOverride =
      parsed.searchParams.has("pgbouncer") ||
      parsed.searchParams.has("preparedStatements") ||
      parsed.searchParams.has("statement_cache_size");

    if (!hasPreparedStatementsOverride) {
      parsed.searchParams.set("pgbouncer", "true");
      if (!parsed.searchParams.has("connection_limit")) {
        parsed.searchParams.set("connection_limit", "1");
      }
      console.log("[diag] adjusted DATABASE_URL for PgBouncer compatibility");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

const databaseUrl = adjustDatabaseUrlForPgBouncer(env.DATABASE_URL);

// 2) Redis connection (TLS if rediss://)
const isRedisTLS = env.REDIS_URL.startsWith("rediss://");
const redisOptions = isRedisTLS ? { tls: {}, maxRetriesPerRequest: null } : { maxRetriesPerRequest: null };
const redis = new IORedis(env.REDIS_URL, redisOptions);

try {
  await redis.ping();
  console.log(`[diag] Redis OK (${isRedisTLS ? "TLS" : "no TLS"})`);
} catch (e) {
  console.error("[diag] Redis ERROR:", e.message);
  process.exit(1);
}

// 3) BullMQ queue connectivity + counts
const connection = redis; // reuse
const QUEUE_NAME = process.env.BIDWIZER_INDEX_QUEUE || "tender-indexing";
const q = new Queue(QUEUE_NAME, { connection });

const waiting = await q.getWaiting();
const active = await q.getActive();
const delayed = await q.getDelayed();
const failed = await q.getFailed();
const completed = await q.getCompleted(0, 20);

console.log(`[diag] Queue "${QUEUE_NAME}" counts:`, {
  waiting: waiting.length,
  active: active.length,
  delayed: delayed.length,
  failed: failed.length,
  completed: completed.length,
});

// 4) Prisma DB connection + prepared statements warning
const prismaOptions = databaseUrl
  ? {
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    }
  : undefined;

const prisma = new PrismaClient(prismaOptions);
try {
  await prisma.$queryRaw`SELECT 1`;
  console.log("[diag] Prisma DB OK");
} catch (e) {
  console.error("[diag] Prisma DB ERROR:", e.message);
  console.log("\n[hint] If error mentions prepared statements (e.g., 42P05 'prepared statement s0 already exists'),");
  console.log("       add one of:");
  console.log("       - ?pgbouncer=true (recommended when behind PgBouncer)");
  console.log("       - ?preparedStatements=false or ?statement_cache_size=0");
  console.log("       to your DATABASE_URL and restart dev + worker.\n");
}

// 5) Smoke enqueue a test job and wait briefly for a worker to take it
const qe = new QueueEvents(QUEUE_NAME, { connection });
await qe.waitUntilReady();

const testJob = await q.add("diagnostic-test", { t: Date.now() }, { removeOnComplete: 100, removeOnFail: 100, attempts: 1 });
console.log("[diag] enqueued test job:", testJob.id);

let took = false;
qe.on("active", ({ jobId }) => {
  if (jobId === testJob.id) {
    took = true;
    console.log("[diag] ✅ A worker picked the test job:", jobId);
  }
});
qe.on("failed", ({ jobId, failedReason }) => {
  if (jobId === testJob.id) {
    console.log("[diag] ❌ Test job failed:", failedReason);
    if (failedReason?.includes("Unsupported job name: diagnostic-test")) {
      console.log("[diag] hint: restart your worker so it includes the diagnostic-test handler.");
    }
  }
});
qe.on("completed", ({ jobId }) => {
  if (jobId === testJob.id) {
    console.log("[diag] ✅ Test job completed:", jobId);
  }
});

await new Promise((r) => setTimeout(r, 4000));
if (!took) {
  console.log("[diag] ⚠️ No worker picked the test job within 4s.");
  console.log('      • Ensure the worker is running:  npm run worker');
  console.log(`      • Worker queue name must be "${QUEUE_NAME}"`);
  console.log("      • Worker must use same REDIS_URL and TLS settings (rediss:// needs tls:{})");
}

await prisma.$disconnect();
await q.close();
await qe.close();
await redis.quit();
process.exit(0);
