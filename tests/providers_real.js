import fs from 'fs';
import path from 'path';
import { getModelsForProvider } from '../providersCatalog.js';

const dotenvPath = path.resolve('.env');
if (fs.existsSync(dotenvPath)) {
  for (const line of fs.readFileSync(dotenvPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key && value && !process.env[key]) process.env[key] = value;
  }
}

const providers = [
  ['gemini', 'GEMINI_API_KEY'],
  ['openai', 'OPENAI_API_KEY'],
  ['anthropic', 'ANTHROPIC_API_KEY'],
  ['groq', 'GROQ_API_KEY'],
  ['openrouter', 'OPENROUTER_API_KEY']
];

let tested = 0;
let failed = 0;

for (const [provider, envName] of providers) {
  const apiKey = process.env[envName];
  if (!apiKey) {
    console.log(`SKIP ${provider}: ${envName} not set`);
    continue;
  }

  tested += 1;
  try {
    const models = await getModelsForProvider(provider, apiKey, {
      allowFallback: false,
      timeoutMs: 12000
    });
    const available = models.filter(model => model.isAvailable !== false);
    if (available.length === 0) {
      failed += 1;
      console.log(`FAIL ${provider}: no available models returned`);
      continue;
    }
    console.log(`PASS ${provider}: ${available.length} model(s), first=${available[0].id}`);
  } catch (err) {
    failed += 1;
    console.log(`FAIL ${provider}: ${String(err?.message || err).split('\n')[0]}`);
  }
}

if (tested === 0) {
  console.log('No provider env vars found. Nothing to test.');
}

process.exit(failed > 0 ? 1 : 0);
