const { createClient } = require('@supabase/supabase-js')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
}

const client = createClient(url, key, { auth: { persistSession: false } })

async function listRecursive(prefix = '') {
  const { data, error } = await client.storage.from('tender-uploads').list(prefix, {
    limit: 1000,
  })

  if (error) {
    console.error('List error for prefix', prefix, error)
    return
  }

  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (!entry.metadata) {
      await listRecursive(path)
    } else {
      console.log(`${path}\t${entry.metadata.size ?? 0}`)
    }
  }
}

listRecursive('tenders')
  .then(() => {
    console.log('Done.')
  })
  .catch((error) => {
    console.error('Error listing bucket contents:', error)
    process.exit(1)
  })
