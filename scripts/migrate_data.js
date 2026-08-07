import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('.env'), 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
);

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
}

const source = JSON.parse(fs.readFileSync(path.resolve('database.json'), 'utf8'));
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const snakeCase = value => value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
const tableOverrides = {
  approvals: 'approval_requests',
  models: 'provider_models',
  companyProfile: 'companies',
  subscriptions: 'workspace_subscriptions',
};

const schemaResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
  headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  },
});
if (!schemaResponse.ok) throw new Error(`Could not inspect Supabase schema (${schemaResponse.status})`);
const openApi = await schemaResponse.json();
const definitions = openApi.definitions || openApi.components?.schemas || {};

const result = { migrated: {}, skipped: {}, failed: {} };

const legacyRecords = Object.entries(source).flatMap(([collection, rawRecords]) => {
  const records = Array.isArray(rawRecords) ? rawRecords : [rawRecords];
  return records.map((payload, index) => ({
    collection_name: collection,
    record_id: String(payload?.id ?? `${collection}:${index}`),
    payload,
    source_file: 'database.json',
  }));
});

for (let offset = 0; offset < legacyRecords.length; offset += 100) {
  const batch = legacyRecords.slice(offset, offset + 100);
  const { error } = await supabase
    .from('legacy_database_records')
    .upsert(batch, { onConflict: 'collection_name,record_id' });
  if (error) throw new Error(`Legacy staging import failed: ${error.message}`);
}
result.legacyStaging = legacyRecords.length;

for (const [collection, rawRecords] of Object.entries(source)) {
  const records = Array.isArray(rawRecords) ? rawRecords : [rawRecords];
  if (records.length === 0) continue;

  const table = tableOverrides[collection] || snakeCase(collection);
  const definition = definitions[table];
  if (!definition) {
    result.skipped[collection] = `table ${table} does not exist`;
    continue;
  }

  const columns = new Set(Object.keys(definition.properties || {}));
  const mappedRecords = records.map(record => Object.fromEntries(
      Object.entries(record)
        .map(([key, value]) => [snakeCase(key), value])
        .filter(([key, value]) => columns.has(key) && value !== undefined),
    )).filter(record => Object.keys(record).length > 0);

  if (mappedRecords.length === 0) {
    result.failed[collection] = 'no compatible columns';
    continue;
  }

  const canUpsert = columns.has('id') && mappedRecords.every(record => record.id != null);
  const query = canUpsert
    ? supabase.from(table).upsert(mappedRecords, { onConflict: 'id' })
    : supabase.from(table).insert(mappedRecords);
  const { error } = await query;
  if (error) {
    result.failed[collection] = `${error.code || 'error'} ${error.message}`;
    continue;
  }
  result.migrated[collection] = mappedRecords.length;
}

const migratedCount = Object.values(result.migrated).reduce((sum, count) => sum + count, 0);
console.log(JSON.stringify({ migratedCount, ...result }, null, 2));
if (Object.keys(result.failed).length > 0 || Object.keys(result.skipped).length > 0) process.exitCode = 2;
