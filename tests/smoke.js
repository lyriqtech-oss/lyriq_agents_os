import { spawn } from 'child_process';
import assert from 'assert';

console.log('=== RUNNING SMOKE TEST: MAIN AGENT CHAT & RAG ===');

const serverProcess = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: '5003' }
});

setTimeout(async () => {
  try {
    const baseUrl = 'http://localhost:5003/api/v1';

    // 1. Connect & Validate Provider
    console.log('1. Connecting Provider...');
    const resConnect = await fetch(`${baseUrl}/providers/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        provider: 'openai',
        apiKey: 'mock-valid-key'
      })
    });
    const connectData = await resConnect.json();
    assert.strictEqual(connectData.ok, true);
    const providerConnectionId = connectData.data.id;

    console.log('2. Validating Provider Connection...');
    const resVal = await fetch(`${baseUrl}/providers/${providerConnectionId}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredChatModel: 'gpt-4o-mini' })
    });
    const valData = await resVal.json();
    assert.strictEqual(valData.ok, true);
    assert.strictEqual(valData.data.status, 'valid');

    // 2. Create Main Agent
    console.log('3. Creating Main Agent...');
    const resAgent = await fetch(`${baseUrl}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        providerConnectionId,
        modelId: 'gpt-4o-mini',
        name: 'Boris',
        role: 'CEO',
        instructions: 'Instruções de teste.'
      })
    });
    const agentData = await resAgent.json();
    assert.strictEqual(agentData.ok, true);
    const agentId = agentData.data.id;

    // 3. Test Agent status before testing
    console.log('4. Checking agent health status...');
    const resHealth1 = await fetch(`${baseUrl}/agents/${agentId}/health`);
    const healthData1 = await resHealth1.json();
    assert.strictEqual(healthData1.ok, true);
    assert.strictEqual(healthData1.data.readinessScore, 80);

    // 4. Test communication check to activate agent
    console.log('5. Executing response communication test...');
    const resTest = await fetch(`${baseUrl}/agents/${agentId}/test`, {
      method: 'POST'
    });
    const testData = await resTest.json();
    assert.strictEqual(testData.ok, true);

    const resHealth2 = await fetch(`${baseUrl}/agents/${agentId}/health`);
    const healthData2 = await resHealth2.json();
    assert.strictEqual(healthData2.data.readinessScore, 100);
    assert.strictEqual(healthData2.data.status, 'active');

    // 5. Upload document to RAG training pipeline
    console.log('6. Uploading document for RAG indexing...');
    const resUpload = await fetch(`${baseUrl}/files/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'politica_salarial.pdf',
        content: 'Política salarial do Lyriq OS: o teto máximo de bônus é de 20%.',
        type: 'pdf',
        size: 8000,
        workspaceId: 'workspace_123'
      })
    });
    const uploadData = await resUpload.json();
    assert.strictEqual(uploadData.ok, true);
    const sourceId = uploadData.data.id;

    // Poll status until indexed
    let isDocReady = false;
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 80));
      const resStatus = await fetch(`${baseUrl}/memory/sources/${sourceId}`);
      const statusData = await resStatus.json();
      if (statusData.ok && statusData.data.status === 'indexed') {
        isDocReady = true;
        break;
      }
    }
    assert.ok(isDocReady);

    // 6. Test chat with matching query
    console.log('7. Sending message query and checking citation...');
    const resChat = await fetch(`http://localhost:5003/api/agents/${agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        sessionId: 'session_smoke',
        message: 'Qual o teto máximo de bônus da política salarial?'
      })
    });
    const chatData = await resChat.json();
    assert.strictEqual(resChat.status, 200);
    assert.strictEqual(chatData.ok, true);
    console.log(`💬 Agent Response: "${chatData.data.content}"`);
    assert.ok(chatData.data.content.includes('[Fonte: politica_salarial.pdf'));

    console.log('🎉 SMOKE TEST PASSED SUCCESSFULLY!');
    serverProcess.kill();
    process.exit(0);
  } catch (err) {
    console.error('❌ SMOKE TEST FAILED:', err);
    serverProcess.kill();
    process.exit(1);
  }
}, 1500);
