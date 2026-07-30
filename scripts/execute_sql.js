import fs from 'fs';
import path from 'path';

const sqlFile = process.argv[2] || './auth_migration.sql';
const sqlPath = path.resolve(sqlFile);

if (!fs.existsSync(sqlPath)) {
  console.error(`❌ Error: SQL file not found at ${sqlPath}`);
  process.exit(1);
}

const sqlQuery = fs.readFileSync(sqlPath, 'utf8');

// Load environment variables
const dotenvPath = path.resolve('./.env');
const env = {};
if (fs.existsSync(dotenvPath)) {
  const envContent = fs.readFileSync(dotenvPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key && val) {
        env[key] = val;
      }
    }
  });
}

const projectRef = env.SUPABASE_PROJECT_REF || 'txlructjsvtqvnleljyz';
const token = env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`Executing SQL from ${sqlFile} on Supabase project ${projectRef}...`);

const run = async () => {
  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sqlQuery })
    });

    const data = await response.json();
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(data.message || JSON.stringify(data));
    }

    console.log('✅ SQL EXECUTED SUCCESSFULLY ON SUPABASE DIRECTLY!');
    console.log(data);
    process.exit(0);
  } catch (err) {
    console.error('❌ SQL execution failed:', err.message);
    process.exit(1);
  }
};

run();
