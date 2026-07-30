import { spawn } from 'child_process';
import assert from 'assert';
import fs from 'fs';

console.log('=== RUNNING E2E TESTS ===');

// Reset database
if (fs.existsSync('./database.json')) {
  fs.unlinkSync('./database.json');
}

// Start backend
const serverProcess = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: '5002' }
});

setTimeout(async () => {
  try {
    const baseUrl = 'http://localhost:5002/api';

    // 1. Criar workspace / Entrar no workspace
    console.log('Step 1: Criando/Acessando workspace workspace_123');

    // 2. Conectar provider com key valida mockada
    console.log('Step 2: Conectando provider de IA com "mock-valid-key"');
    const resProvider = await fetch(`${baseUrl}/providers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        provider: 'openai',
        apiKey: 'mock-valid-key',
        preferredChatModel: 'gpt-4o-mini',
        preferredEmbeddingModel: 'text-embedding-3-small'
      })
    });
    const providerData = await resProvider.json();
    assert.strictEqual(providerData.ok, true);
    assert.strictEqual(providerData.data.status, 'valid');
    const providerConnectionId = providerData.data.id;

    // 3. Selecionar modelo
    const selectedModel = providerData.data.selected_chat_model;
    assert.strictEqual(selectedModel, 'gpt-4o-mini');
    console.log(`Step 3: Modelo selecionado com sucesso: ${selectedModel}`);

    // 4. Criar main agent
    console.log('Step 4: Criando Main Agent (Coordenador Boris)');
    const resAgent = await fetch(`${baseUrl}/agents/main`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        providerConnectionId,
        modelId: selectedModel,
        name: 'Boris',
        role: 'CEO Operacional',
        instructions: 'Você coordena a equipe e reporta faturamento do CRM.'
      })
    });
    const agentData = await resAgent.json();
    assert.strictEqual(agentData.ok, true);
    assert.strictEqual(agentData.data.name, 'Boris');
    assert.strictEqual(agentData.data.status, 'ready_to_test');
    const agentId = agentData.data.id;

    // 5. Enviar primeira mensagem no chat
    console.log('Step 5: Enviando mensagem ao chat do main agent');
    const resChat = await fetch(`${baseUrl}/agents/${agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        sessionId: 'session_e2e_789',
        message: 'Olá Boris, qual é a nossa meta?',
        stream: false
      })
    });
    const chatData = await resChat.json();
    assert.strictEqual(chatData.ok, true);
    console.log(`Step 6: Resposta do agente recebida: "${chatData.data.content}"`);

    // 6. Recarregar pagina / Confirmar histórico persistido
    console.log('Step 7: Simulando recarregamento de página: Lendo histórico de mensagens persistidas');
    const resMessages = await fetch(`${baseUrl}/chat/sessions/session_e2e_789/messages`);
    const historyData = await resMessages.json();
    assert.strictEqual(historyData.data.length, 2); // 1 user message + 1 assistant message
    assert.strictEqual(historyData.data[0].role, 'user');
    assert.strictEqual(historyData.data[1].role, 'assistant');
    console.log('✅ Histórico de conversa persistido com sucesso.');

    // 7. Abrir logs / Confirmar eventos do chat
    console.log('Step 8: Verificando se logs de auditoria de runtime foram gerados');
    const resLogs = await fetch(`${baseUrl}/runtime/logs`);
    const logsData = await resLogs.json();
    
    // Check that we have audit log events in our runtimeLogs list
    const logEvents = logsData.data.map(l => l.event);
    assert.ok(logEvents.includes('chat_send_requested'));
    assert.ok(logEvents.includes('chat_agent_loaded'));
    assert.ok(logEvents.includes('chat_message_persisted'));
    console.log('✅ Todos os eventos operacionais de runtime foram registrados de forma auditável.');

    // 8. Upload document to RAG memory training pipeline
    console.log('Step 9: Fazendo upload de documento de regras financeiras');
    const resDocUpload = await fetch(`${baseUrl}/v1/files/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'manual_reembolso.pdf',
        content: 'Diretrizes financeiras do Lyriq OS: reembolsos de R$ 500,00 sao autônomos.',
        type: 'pdf',
        size: 12000,
        workspaceId: 'workspace_123'
      })
    });
    const docUploadData = await resDocUpload.json();
    assert.strictEqual(docUploadData.ok, true);
    const sourceId = docUploadData.data.id;

    // 9. Poll source status until indexed
    console.log('Step 10: Pollando status do processamento RAG...');
    let isIndexed = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 80));
      const resStatus = await fetch(`${baseUrl}/v1/memory/sources/${sourceId}`);
      const statusData = await resStatus.json();
      if (statusData.ok && statusData.data.status === 'indexed') {
        isIndexed = true;
        break;
      }
    }
    assert.ok(isIndexed, 'O documento deveria ter sido indexado com status "indexed"');
    console.log('✅ Documento indexado com sucesso no RAG.');

    // 10. Send query matching document contents to get cited source
    console.log('Step 11: Enviando pergunta semântica contendo palavra-chave');
    const resRagChat = await fetch(`${baseUrl}/agents/${agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        sessionId: 'session_e2e_789',
        message: 'Qual o valor limite para reembolso autônomo?',
        stream: false
      })
    });
    const ragChatData = await resRagChat.json();
    assert.strictEqual(resRagChat.status, 200);
    assert.strictEqual(ragChatData.ok, true);
    
    // The assistant's reply must cite the source matching the chunk
    assert.ok(ragChatData.data.content.includes('[Fonte: manual_reembolso.pdf'), 'A resposta do agente deveria citar a fonte da memória');
    console.log(`Step 12: Resposta do agente com citação recebida: "${ragChatData.data.content}"`);

    console.log('🎉 E2E TESTS COMPLETED AND VERIFIED SUCCESSFULLY!');
    serverProcess.kill();
    process.exit(0);
  } catch (err) {
    console.error('❌ E2E TEST FAILED:', err);
    try {
      const resLogs = await fetch('http://localhost:5002/api/runtime/logs');
      const logsData = await resLogs.json();
      console.log('Current recorded logs in DB:', JSON.stringify(logsData, null, 2));
    } catch (e) {
      console.error('Failed to dump logs:', e);
    }
    serverProcess.kill();
    process.exit(1);
  }
}, 1500);
