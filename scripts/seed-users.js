/**
 * Seed 4 standard users + 1 admin in Supabase.
 * Run: node scripts/seed-users.js
 * Requires: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Match users created via SQL (supabase/seed-users.sql)
const USERS = [
  { email: 'keshu@narprafoods.com', password: '123456', name: 'Keshu', role: 'user' },
  { email: 'raja@narprafoods.com', password: '123456', name: 'Raja', role: 'user' },
  { email: 'tamasa@narprafoods.com', password: '123456', name: 'Tamasa', role: 'user' },
  { email: 'atish@narprafoods.com', password: '123456', name: 'Atish', role: 'user' },
  { email: 'lipsa@narprafoods.com', password: '123456', name: 'Lipsa', role: 'user' },
  { email: 'admin@narprafoods.com', password: '123456', name: 'Admin', role: 'admin' },
]

function loadEnv() {
  const env = {}
  for (const p of [join(__dirname, '..', '.env.local'), join(process.cwd(), '.env.local')]) {
    try {
      const content = readFileSync(p, 'utf-8')
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^([^#=]+)=(.*)$/)
        if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
      }
      break
    } catch (_) {}
  }
  return env
}

async function main() {
  const env = loadEnv()
  const url = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    console.error('Add SUPABASE_SERVICE_ROLE_KEY to .env.local (from Supabase Dashboard → Settings → API)')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  console.log('Syncing profiles (listUsers first to avoid createUser schema errors)...\n')

  // listUsers often works when createUser fails with "Database error checking email"
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
  const existingByEmail = new Map((listData?.users ?? []).map((u) => [u.email, u]))

  if (listError) {
    console.warn('listUsers failed:', listError.message, '- will try createUser for each')
  }

  for (const u of USERS) {
    const existing = existingByEmail.get(u.email)
    if (existing) {
      const { error: upsertErr } = await supabase.from('profiles').upsert(
        { id: existing.id, name: u.name, role: u.role },
        { onConflict: 'id' }
      )
      if (upsertErr) {
        console.error(`❌ ${u.email} — profile upsert failed:`, upsertErr.message)
      } else {
        console.log(`✅ ${u.email} — profile synced`)
      }
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name },
      })
      if (error) {
        console.error(`❌ ${u.email}:`, error.message)
      } else {
        console.log(`✅ ${u.email} — created`)
        await supabase.from('profiles').upsert({ id: data.user.id, name: u.name, role: u.role }, { onConflict: 'id' })
      }
    }
  }

  console.log('\nDone! Credentials:')
  USERS.forEach((u) => console.log(`  ${u.role === 'admin' ? '👑' : '👤'} ${u.email} / ${u.password}`))
}

main().catch(console.error)
