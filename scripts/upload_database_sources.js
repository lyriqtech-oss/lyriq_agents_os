import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/)
    .filter(line => line && !line.trim().startsWith('#') && line.includes('='))
    .map(line => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = 'database-migrations';
const { error: bucketError } = await supabase.storage.createBucket(bucket, { public: false });
if (bucketError && !/already exists/i.test(bucketError.message)) throw bucketError;

const files = [
  'database.json',
  'auth_migration.sql',
  'supabase_migration.sql',
  ...fs.readdirSync('supabase/migrations').map(file => `supabase/migrations/${file}`),
];
for (const file of files) {
  const contentType = path.extname(file) === '.json' ? 'application/json' : 'application/sql';
  const { error } = await supabase.storage.from(bucket).upload(file, fs.readFileSync(file), {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`${file}: ${error.message}`);
}
console.log(JSON.stringify({ bucket, private: true, uploaded: files.length, files }, null, 2));
