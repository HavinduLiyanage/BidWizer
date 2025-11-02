import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXTAUTH_URL: z
    .string()
    .trim()
    .url()
    .optional(),
  NEXTAUTH_SECRET: z.string().trim().min(16),
  DATABASE_URL: z.string().trim(),
  REDIS_URL: z.string().trim().optional(),
  UPSTASH_REDIS_URL: z.string().trim().optional(),
  OPENAI_API_KEY: z.string().trim().optional(),

  // Email
  EMAIL_PROVIDER: z.enum(['resend', 'smtp']).default('smtp'),
  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASS: z.string().trim().optional(),
  SMTP_FROM: z
    .string()
    .trim()
    .default('BidWizer <no-reply@bidwizer.app>'),
  RESEND_API_KEY: z.string().trim().optional(),

  // Feature flags / product
  PLAN_ENFORCEMENT_ENABLED: z.coerce.boolean().default(true),
  WATERMARK_ENABLED: z.coerce.boolean().default(false),
  INGESTION_MODE: z.enum(['eager', 'lazy']).default('eager'),
  RETRIEVAL_TOP_K: z.coerce.number().default(8),
  EMBED_BATCH_SIZE: z.coerce.number().default(128),
  PARTIAL_READY_THRESHOLD: z.coerce.number().default(0.2),

  // Storage/queue (existing now = supabase/bullmq; future = s3/sqs)
  STORAGE_DRIVER: z.enum(['supabase', 's3']).default('supabase'),
  QUEUE_DRIVER: z.enum(['bullmq', 'sqs']).default('bullmq'),

  // Limits
  MAX_UPLOAD_MB: z.coerce.number().default(512),
  MAX_ZIP_ENTRIES: z.coerce.number().default(20_000),
  MAX_EXTRACTED_BYTES: z.coerce.number().default(2_147_483_648),

  // Supabase configuration
  SUPABASE_URL: z.string().trim().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().optional(),
  SUPABASE_TENDER_UPLOADS_BUCKET: z.string().trim().optional(),
  SUPABASE_STORAGE_UPLOADS_BUCKET: z.string().trim().optional(),
  SUPABASE_TENDER_INDEX_BUCKET: z.string().trim().optional(),
  SUPABASE_STORAGE_INDEX_BUCKET: z.string().trim().optional(),
  SUPABASE_OBJECT_MAX_BYTES: z.string().trim().optional(),
  SUPABASE_OBJECT_MAX_MB: z.string().trim().optional(),

  // Upload handling
  TENDER_UPLOAD_MAX_SIZE_MB: z.string().trim().optional(),

  // Queueing
  BIDWIZER_INDEX_QUEUE: z.string().trim().optional(),

  // Prisma tuning
  PRISMA_DISABLE_PREPARED_STATEMENTS: z.string().trim().optional(),

  // Miscellaneous
  NEXT_PUBLIC_FX_USD_LKR: z.string().trim().optional(),
  BASE_URL: z.string().trim().optional(),
})

export const env = Object.freeze(schema.parse(process.env))

if (!env.PRISMA_DISABLE_PREPARED_STATEMENTS) {
  process.env.PRISMA_DISABLE_PREPARED_STATEMENTS = 'true'
}

export type Env = typeof env
