import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

console.log('=== STARTING SUPABASE DATA MIGRATION ===');

// 1. Load environment variables
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

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('SUA_URL_AQUI')) {
  console.error('❌ Error: Supabase credentials not found in .env. Please configure them first.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Read database.json
const dbPath = path.resolve('./database.json');
if (!fs.existsSync(dbPath)) {
  console.error('❌ Error: database.json not found in the workspace.');
  process.exit(1);
}

const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const run = async () => {
  try {
    // 1. Sync workspaces
    if (dbData.workspaces && dbData.workspaces.length > 0) {
      console.log(`Migrating ${dbData.workspaces.length} workspaces...`);
      const { error } = await supabase.from('workspaces').upsert(dbData.workspaces);
      if (error) throw error;
    }

    // 2. Sync providers
    if (dbData.providers && dbData.providers.length > 0) {
      console.log(`Migrating ${dbData.providers.length} providers...`);
      const mapped = dbData.providers.map(p => ({
        id: p.id,
        workspace_id: p.workspace_id || p.workspaceId,
        provider: p.provider,
        encrypted_api_key: p.encrypted_api_key || p.encryptedApiKey,
        status: p.status,
        detected_account: p.detected_account || null,
        available_models: p.available_models || p.availableModels || [],
        selected_chat_model: p.selected_chat_model || p.selectedChatModel || null,
        selected_embedding_model: p.selected_embedding_model || p.selectedEmbeddingModel || null,
        last_validated_at: p.last_validated_at || p.lastValidatedAt || null,
        created_at: p.created_at || p.createdAt || null
      }));
      const { error } = await supabase.from('providers').upsert(mapped);
      if (error) throw error;
    }

    // 3. Sync agents
    if (dbData.agents && dbData.agents.length > 0) {
      console.log(`Migrating ${dbData.agents.length} agents...`);
      const mapped = dbData.agents.map(a => ({
        id: a.id,
        workspace_id: a.workspace_id || a.workspaceId,
        provider_connection_id: a.provider_connection_id || a.providerConnectionId,
        model_id: a.model_id || a.modelId,
        name: a.name,
        role: a.role,
        instructions: a.instructions,
        type: a.type,
        status: a.status,
        created_at: a.created_at || a.createdAt || null
      }));
      const { error } = await supabase.from('agents').upsert(mapped);
      if (error) throw error;
    }

    // 4. Sync messages
    if (dbData.messages && dbData.messages.length > 0) {
      console.log(`Migrating ${dbData.messages.length} messages...`);
      const mapped = dbData.messages.map(m => ({
        id: m.id,
        session_id: m.session_id || m.sessionId,
        agent_id: m.agent_id || m.agentId,
        role: m.role,
        content: m.content,
        provider: m.provider || null,
        model: m.model || null,
        token_input: m.token_input || m.tokenInput || null,
        token_output: m.token_output || m.tokenOutput || null,
        cost_estimate: m.cost_estimate || m.costEstimate || null,
        created_at: m.created_at || m.createdAt || null
      }));
      const { error } = await supabase.from('messages').upsert(mapped);
      if (error) throw error;
    }

    // 5. Sync runtimeLogs
    if (dbData.runtimeLogs && dbData.runtimeLogs.length > 0) {
      console.log(`Migrating ${dbData.runtimeLogs.length} runtimeLogs...`);
      const mapped = dbData.runtimeLogs.map(l => ({
        id: l.id,
        request_id: l.requestId,
        workspace_id: l.workspaceId,
        user_id: l.userId,
        agent_id: l.agentId,
        session_id: l.sessionId,
        event: l.event,
        status: l.status,
        duration_ms: l.durationMs,
        error_code: l.errorCode,
        safe_message: l.safeMessage,
        metadata: l.metadata,
        created_at: l.createdAt
      }));
      const { error } = await supabase.from('runtime_logs').upsert(mapped);
      if (error) throw error;
    }

    console.log('🎉 DATA MIGRATION COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Data migration failed:', err.message);
    process.exit(1);
  }
};

run();
