import { spawn } from 'child_process';
import assert from 'assert';
import fs from 'fs';

console.log('=== RUNNING INTEGRATION TESTS ===');

// Clean database file before running tests
if (fs.existsSync('./database.json')) {
  fs.unlinkSync('./database.json');
}

// Start backend server
const serverProcess = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: '5001' }
});

serverProcess.stdout.on('data', (data) => {
  console.log(`[Server Out]: ${data}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[Server Err]: ${data}`);
});

// Wait 1.5 seconds for server boot
setTimeout(async () => {
  try {
    const baseUrl = 'http://localhost:5001/api';

    // 1. Test POST /api/providers/validate (Invalid Key format check)
    const resValInvalid = await fetch(`${baseUrl}/providers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        provider: 'openai',
        apiKey: 'mock-invalid-key'
      })
    });
    assert.strictEqual(resValInvalid.status, 401);
    const bodyValInvalid = await resValInvalid.json();
    assert.strictEqual(bodyValInvalid.ok, false);
    assert.strictEqual(bodyValInvalid.error.code, 'PROVIDER_AUTH_FAILED');
    console.log('✅ POST /api/providers/validate (Invalid Key) passed.');

    // 2. Test POST /api/providers/validate (Mock quota error connection check)
    const resValQuota = await fetch(`${baseUrl}/providers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        provider: 'openai',
        apiKey: 'mock-quota-key'
      })
    });
    assert.strictEqual(resValQuota.status, 402);
    const bodyValQuota = await resValQuota.json();
    assert.strictEqual(bodyValQuota.error.code, 'PROVIDER_INSUFFICIENT_QUOTA');
    console.log('✅ POST /api/providers/validate (Quota Check) passed.');

    // 3. Test POST /api/providers/validate (Valid Key mock validation)
    const resValOk = await fetch(`${baseUrl}/providers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        provider: 'openai',
        apiKey: 'mock-valid-key'
      })
    });
    assert.strictEqual(resValOk.status, 200);
    const bodyValOk = await resValOk.json();
    assert.strictEqual(bodyValOk.ok, true);
    assert.strictEqual(bodyValOk.data.status, 'valid');
    const providerConnectionId = bodyValOk.data.id;
    console.log('✅ POST /api/providers/validate (Mock Valid Key) passed.');

    // 4. Test POST /api/agents/main (Invalid - Empty instructions)
    const resAgentEmpty = await fetch(`${baseUrl}/agents/main`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        providerConnectionId,
        modelId: 'gpt-4o-mini',
        name: 'Boris',
        role: 'CEO',
        instructions: ''
      })
    });
    assert.strictEqual(resAgentEmpty.status, 400);
    const bodyAgentEmpty = await resAgentEmpty.json();
    assert.strictEqual(bodyAgentEmpty.error.code, 'AGENT_MISSING_INSTRUCTIONS');
    console.log('✅ POST /api/agents/main (Empty Instructions Check) passed.');

    // 5. Test POST /api/agents/main (Valid creation)
    const resAgentOk = await fetch(`${baseUrl}/agents/main`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        providerConnectionId,
        modelId: 'gpt-4o-mini',
        name: 'Assistente Principal',
        role: 'Coordenador',
        instructions: 'Atuar de forma estratégica'
      })
    });
    assert.strictEqual(resAgentOk.status, 200);
    const bodyAgentOk = await resAgentOk.json();
    assert.strictEqual(bodyAgentOk.ok, true);
    assert.strictEqual(bodyAgentOk.data.type, 'main');
    const agentId = bodyAgentOk.data.id;
    console.log('✅ POST /api/agents/main (Valid Agent Creation) passed.');

    // 6. Test GET /api/agents
    const resAgentsList = await fetch(`${baseUrl}/agents`);
    assert.strictEqual(resAgentsList.status, 200);
    const bodyAgentsList = await resAgentsList.json();
    assert.ok(bodyAgentsList.data.length > 0);
    console.log('✅ GET /api/agents list passed.');

    // 7. Test GET /api/agents/:agentId/health
    const resHealth = await fetch(`${baseUrl}/agents/${agentId}/health`);
    assert.strictEqual(resHealth.status, 200);
    const bodyHealth = await resHealth.json();
    assert.strictEqual(bodyHealth.data.status, 'ready_to_test');
    console.log('✅ GET /api/agents/:agentId/health passed.');

    // 8. Test POST /api/agents/:agentId/chat
    const resChat = await fetch(`${baseUrl}/agents/${agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        sessionId: 'session_123',
        message: 'Olá, quem é você?',
        stream: false
      })
    });
    assert.strictEqual(resChat.status, 200);
    const bodyChat = await resChat.json();
    assert.strictEqual(bodyChat.ok, true);
    assert.ok(bodyChat.data.content.length > 0);
    console.log('✅ POST /api/agents/:agentId/chat response passed.');

    // 9. Test GET /api/chat/sessions/:sessionId/messages
    const resMessages = await fetch(`${baseUrl}/chat/sessions/session_123/messages`);
    assert.strictEqual(resMessages.status, 200);
    const bodyMessages = await resMessages.json();
    assert.ok(bodyMessages.data.length >= 2); // User + Assistant messages
    console.log('✅ GET /api/chat/sessions/:sessionId/messages passed.');

    // 10. Test GET /api/logs
    const resLogs = await fetch(`${baseUrl}/logs`);
    assert.strictEqual(resLogs.status, 200);
    const bodyLogs = await resLogs.json();
    assert.ok(bodyLogs.data.length > 0);
    console.log('✅ GET /api/logs passed.');

    // 11. Test POST /api/v1/files/upload (RAG Memory Training flow)
    console.log('Testing RAG File Upload...');
    const resUpload = await fetch(`${baseUrl}/v1/files/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'manual_reembolso.pdf',
        content: 'Diretrizes financeiras do Lyriq OS: reembolsos de R$ 500,00 sao autônomos.',
        type: 'pdf',
        size: 15000,
        workspaceId: 'workspace_123'
      })
    });
    assert.strictEqual(resUpload.status, 200);
    const bodyUpload = await resUpload.json();
    assert.strictEqual(bodyUpload.ok, true);
    assert.strictEqual(bodyUpload.data.status, 'indexed');
    assert.ok(bodyUpload.data.chunksGenerated > 0);
    console.log('✅ POST /api/v1/files/upload (RAG upload) passed.');

    // 12. Test GET /api/v1/memory/status (Training state)
    const resMemStatus = await fetch(`${baseUrl}/v1/memory/status`);
    assert.strictEqual(resMemStatus.status, 200);
    const bodyMemStatus = await resMemStatus.json();
    assert.ok(bodyMemStatus.data.chunksCount > 0);
    console.log('✅ GET /api/v1/memory/status passed.');

    // 13. Test GET /api/v1/memory/search (Semantic Search)
    const resSearch = await fetch(`${baseUrl}/v1/memory/search?query=reembolso`);
    assert.strictEqual(resSearch.status, 200);
    const bodySearch = await resSearch.json();
    assert.ok(bodySearch.data.chunks.length > 0);
    assert.ok(bodySearch.data.chunks[0].content.includes('reembolsos'));
    console.log('✅ GET /api/v1/memory/search passed.');

    // 13.1 Test POST /api/onboarding/generate-md indexes operational Markdown files into RAG
    const resGenerateMd = await fetch(`${baseUrl}/onboarding/generate-md`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123' })
    });
    assert.strictEqual(resGenerateMd.status, 200);
    const bodyGenerateMd = await resGenerateMd.json();
    assert.strictEqual(bodyGenerateMd.ok, true);
    assert.ok(bodyGenerateMd.data.files.length >= 8);
    assert.ok(bodyGenerateMd.data.chunksGenerated >= 8);
    assert.ok(bodyGenerateMd.data.docs.some(d => d.name === 'COMPANY.md'));

    const resMdDocs = await fetch(`${baseUrl}/memory/docs?workspaceId=workspace_123`);
    assert.strictEqual(resMdDocs.status, 200);
    const bodyMdDocs = await resMdDocs.json();
    assert.ok(bodyMdDocs.data.some(d => d.name === 'MEMORY.md' && d.status === 'indexed'));

    const resMdSearch = await fetch(`${baseUrl}/training/search-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'provedor configurado modelo', workspaceId: 'workspace_123' })
    });
    assert.strictEqual(resMdSearch.status, 200);
    const bodyMdSearch = await resMdSearch.json();
    assert.ok(bodyMdSearch.data.chunks.length > 0);
    console.log('✅ Onboarding Markdown generation & RAG indexing passed.');

    // 14. Test GET /api/v1/costs (Usage Costs logs)
    const resCosts = await fetch(`${baseUrl}/costs`);
    assert.strictEqual(resCosts.status, 200);
    const bodyCosts = await resCosts.json();
    assert.ok(bodyCosts.data.length > 0);
    console.log('✅ GET /api/v1/costs passed.');

    // 15. Test POST /api/tools/execute (High risk tool requires approval)
    const resToolHigh = await fetch(`${baseUrl}/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        toolId: 'email.send',
        riskLevel: 'high',
        payload: { recipient: 'cliente@empresa.com', subject: 'Proposta B2B' }
      })
    });
    assert.strictEqual(resToolHigh.status, 200);
    const bodyToolHigh = await resToolHigh.json();
    assert.strictEqual(bodyToolHigh.data.requiresApproval, true);
    const approvalId = bodyToolHigh.data.approvalId;
    console.log('✅ POST /api/tools/execute (High Risk Approval Request) passed.');

    // 16. Test GET /api/approvals & POST /api/approvals/:id/approve
    const resApprList = await fetch(`${baseUrl}/approvals?workspaceId=workspace_123`);
    assert.strictEqual(resApprList.status, 200);
    const bodyApprList = await resApprList.json();
    assert.ok(bodyApprList.data.length > 0);

    const resApprove = await fetch(`${baseUrl}/approvals/${approvalId}/approve`, { method: 'POST' });
    assert.strictEqual(resApprove.status, 200);
    const bodyApprove = await resApprove.json();
    assert.strictEqual(bodyApprove.data.status, 'approved');
    console.log('✅ GET & POST /api/approvals (Approve Sensitive Action) passed.');

    // 17. Test GET /api/usage/current (Usage Ledger & Limits)
    const resUsage = await fetch(`${baseUrl}/usage/current?workspaceId=workspace_123`);
    assert.strictEqual(resUsage.status, 200);
    const bodyUsage = await resUsage.json();
    assert.ok(bodyUsage.data.monthlyCreditsLimit > 0);
    console.log('✅ GET /api/usage/current (Usage Ledger) passed.');

    // 18. Test POST /api/billing/checkout (Stripe Checkout)
    const resCheckout = await fetch(`${baseUrl}/billing/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'max_5x', workspaceId: 'workspace_123' })
    });
    assert.strictEqual(resCheckout.status, 200);
    const bodyCheckout = await resCheckout.json();
    assert.ok(bodyCheckout.data.checkoutUrl.includes('stripe.com'));
    console.log('✅ POST /api/billing/checkout (Stripe Checkout Link) passed.');

    // 19. Test POST /api/providers/credentials (Secret Vault BYOK Registration & Masking)
    const resCredPost = await fetch(`${baseUrl}/providers/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        provider: 'openai',
        apiKey: 'sk-proj123456789secretkey',
        displayName: 'OpenAI Produção',
        userRole: 'Owner'
      })
    });
    assert.strictEqual(resCredPost.status, 200);
    const bodyCredPost = await resCredPost.json();
    assert.strictEqual(bodyCredPost.data.status, 'valid');
    assert.strictEqual(bodyCredPost.data.maskedValue, 'sk--...tkey');
    assert.strictEqual(bodyCredPost.data.encryptedSecret, undefined); // NEVER return plain or encrypted secret to client!
    const vaultCredId = bodyCredPost.data.id;
    console.log('✅ POST /api/providers/credentials (Secret Vault Registration & Masking) passed.');

    // 20. Test GET /api/providers/credentials (List Masked Credentials)
    const resCredList = await fetch(`${baseUrl}/providers/credentials?workspaceId=workspace_123`);
    assert.strictEqual(resCredList.status, 200);
    const bodyCredList = await resCredList.json();
    assert.ok(bodyCredList.data.length > 0);
    assert.strictEqual(bodyCredList.data[0].encryptedSecret, undefined);
    console.log('✅ GET /api/providers/credentials (List Masked Credentials) passed.');

    // 21. Test POST /api/providers/credentials/:id/rotate (Rotate Secret Key)
    const resRotate = await fetch(`${baseUrl}/providers/credentials/${vaultCredId}/rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newApiKey: 'sk-newkey9988776655443322' })
    });
    assert.strictEqual(resRotate.status, 200);
    const bodyRotate = await resRotate.json();
    assert.strictEqual(bodyRotate.data.maskedValue, 'sk--...3322');
    console.log('✅ POST /api/providers/credentials/:id/rotate passed.');

    // 22. Test POST /api/providers/credentials/:id/revoke (Revoke Secret Key)
    const resRevoke = await fetch(`${baseUrl}/providers/credentials/${vaultCredId}/revoke`, { method: 'POST' });
    assert.strictEqual(resRevoke.status, 200);
    const bodyRevoke = await resRevoke.json();
    assert.strictEqual(bodyRevoke.data.status, 'revoked');
    console.log('✅ POST /api/providers/credentials/:id/revoke passed.');

    // 23. Test GET /api/providers/catalog (Provider Catalog with Official Links)
    const resCatalog = await fetch(`${baseUrl}/providers/catalog`);
    assert.strictEqual(resCatalog.status, 200);
    const bodyCatalog = await resCatalog.json();
    assert.ok(bodyCatalog.data.length >= 6);
    assert.ok(bodyCatalog.data.some(p => p.id === 'openai' && p.apiKeyUrl.includes('platform.openai.com')));
    console.log('✅ GET /api/providers/catalog (Provider Catalog & Links) passed.');

    // 24. Test POST /api/runtime/agent-run (Agent Run & Operational Transparency Events)
    const resAgentRun = await fetch(`${baseUrl}/runtime/agent-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        agentId: 'agent-main',
        message: 'Qual é a meta de reembolso da empresa?',
        visibilityMode: 'operational'
      })
    });
    assert.strictEqual(resAgentRun.status, 200);
    const bodyAgentRun = await resAgentRun.json();
    assert.strictEqual(bodyAgentRun.ok, true);
    assert.ok(bodyAgentRun.data.runId.startsWith('run-'));
    assert.ok(bodyAgentRun.data.events.length > 0);
    const runId = bodyAgentRun.data.runId;
    console.log('✅ POST /api/runtime/agent-run (Operational Transparency Loop) passed.');

    // 25. Test GET /api/runtime/runs/:runId/events (Retrieve Timeline Events by runId)
    const resRunEvts = await fetch(`${baseUrl}/runtime/runs/${runId}/events?visibilityMode=operational`);
    assert.strictEqual(resRunEvts.status, 200);
    const bodyRunEvts = await resRunEvts.json();
    assert.ok(bodyRunEvts.data.length > 0);
    assert.ok(bodyRunEvts.data.some(e => e.type === 'status' || e.type === 'final'));
    console.log('✅ GET /api/runtime/runs/:runId/events (Retrieve Events by runId) passed.');

    // 26. Test GET /api/billing/budgets & POST /api/billing/budgets (Provider API Budget Limit Setup)
    const resBudgetPost = await fetch(`${baseUrl}/billing/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        provider: 'openai',
        monthlyLimitAmount: 150,
        currency: 'BRL',
        actionAtLimit: 'hard_stop'
      })
    });
    assert.strictEqual(resBudgetPost.status, 200);
    const bodyBudgetPost = await resBudgetPost.json();
    assert.strictEqual(bodyBudgetPost.data.budget.monthlyLimitAmount, 150);
    console.log('✅ POST /api/billing/budgets (API Budget Limit Setup) passed.');

    // 27. Test GET /api/billing/spend/dashboard (Spend Dashboard & Agent Cost Ranking)
    const resSpendDash = await fetch(`${baseUrl}/billing/spend/dashboard?workspaceId=workspace_123`);
    assert.strictEqual(resSpendDash.status, 200);
    const bodySpendDash = await resSpendDash.json();
    assert.ok(bodySpendDash.data.projectedMonthlySpend >= 0);
    console.log('✅ GET /api/billing/spend/dashboard (API Spend Dashboard & Projection) passed.');

    // 28. Test GET /api/templates/agents & POST /api/agents/from-template
    const resTemplates = await fetch(`${baseUrl}/templates/agents`);
    assert.strictEqual(resTemplates.status, 200);
    const bodyTemplates = await resTemplates.json();
    assert.ok(bodyTemplates.data.length >= 8);

    const resFromTpl = await fetch(`${baseUrl}/agents/from-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'template-ops-manager', workspaceId: 'workspace_123', customName: 'Gestor de Projetos' })
    });
    assert.strictEqual(resFromTpl.status, 200);
    const bodyFromTpl = await resFromTpl.json();
    assert.strictEqual(bodyFromTpl.data.name, 'Gestor de Projetos');
    const createdAgentId = bodyFromTpl.data.id;
    console.log('✅ GET /api/templates/agents & POST /api/agents/from-template passed.');

    // 29. Test GET /api/skills/library & POST /api/agents/:agentId/skills/install
    const resSkills = await fetch(`${baseUrl}/skills/library`);
    assert.strictEqual(resSkills.status, 200);
    const bodySkills = await resSkills.json();
    assert.ok(bodySkills.data.length >= 10);

    const resSkillInstall = await fetch(`${baseUrl}/agents/${createdAgentId}/skills/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillId: 'skill-exec-summary' })
    });
    assert.strictEqual(resSkillInstall.status, 200);
    const bodySkillInstall = await resSkillInstall.json();
    assert.strictEqual(bodySkillInstall.data.installed, true);
    console.log('✅ GET /api/skills/library & POST /api/agents/:agentId/skills/install passed.');

    // 30. Test GET /api/tasks & POST /api/tasks (Tasks Management)
    const resTaskPost = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        title: 'Revisar contrato de prestação de serviços',
        description: 'Verificar cláusula de penalidade e prazos.',
        assignedAgentId: 'agent-main',
        priority: 'high'
      })
    });
    assert.strictEqual(resTaskPost.status, 200);
    const bodyTaskPost = await resTaskPost.json();
    assert.ok(bodyTaskPost.data.id.startsWith('task_'));
    const createdTaskId = bodyTaskPost.data.id;
    console.log('✅ POST /api/tasks (Manual Task Creation) passed.');

    // 31. Test POST /api/tasks/from-chat & POST /api/tasks/:id/deliverables
    const resTaskChat = await fetch(`${baseUrl}/tasks/from-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        promptText: 'Coloca essa revisão de proposta para sexta urgente',
        assignedAgentId: 'agent-main'
      })
    });
    assert.strictEqual(resTaskChat.status, 200);
    const bodyTaskChat = await resTaskChat.json();
    assert.strictEqual(bodyTaskChat.data.source, 'chat');
    assert.strictEqual(bodyTaskChat.data.priority, 'urgent');

    const resDeliv = await fetch(`${baseUrl}/tasks/${createdTaskId}/deliverables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Rascunho de revisão',
        type: 'draft',
        content: 'Trecho revisado com novos prazos.'
      })
    });
    assert.strictEqual(resDeliv.status, 200);
    const bodyDeliv = await resDeliv.json();
    assert.strictEqual(bodyDeliv.data.status, 'ready_for_review');
    console.log('✅ POST /api/tasks/from-chat & Deliverables passed.');

    // 32. Test POST /api/runtime/background-run (Background Execution Run)
    const resBgRun = await fetch(`${baseUrl}/runtime/background-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', taskId: createdTaskId, agentId: 'agent-main' })
    });
    assert.strictEqual(resBgRun.status, 200);
    const bodyBgRun = await resBgRun.json();
    assert.ok(bodyBgRun.data.id.startsWith('bgrun-'));
    assert.strictEqual(bodyBgRun.data.status, 'running');
    console.log('✅ POST /api/runtime/background-run passed.');

    // 33. Test GET /api/automations/templates, POST /api/automations & POST /api/automations/:id/trigger
    const resAutoTpl = await fetch(`${baseUrl}/automations/templates`);
    assert.strictEqual(resAutoTpl.status, 200);
    const bodyAutoTpl = await resAutoTpl.json();
    assert.ok(bodyAutoTpl.data.length >= 10);

    const resAutoPost = await fetch(`${baseUrl}/automations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        name: 'Relatório Semanal de Desempenho',
        description: 'Gera relatório automático toda sexta.',
        trigger: { type: 'schedule', cron: '0 17 * * 5' }
      })
    });
    assert.strictEqual(resAutoPost.status, 200);
    const bodyAutoPost = await resAutoPost.json();
    const createdAutoId = bodyAutoPost.data.id;

    const resAutoTrig = await fetch(`${baseUrl}/automations/${createdAutoId}/trigger`, { method: 'POST' });
    assert.strictEqual(resAutoTrig.status, 200);
    const bodyAutoTrig = await resAutoTrig.json();
    assert.strictEqual(bodyAutoTrig.data.triggered, true);
    console.log('✅ GET/POST /api/automations & trigger passed.');

    // 34. Test Supabase Multi-Tenant RLS & Company Isolation Verification
    const resRlsCheck = await fetch(`${baseUrl}/tasks?workspaceId=other_workspace_999`);
    assert.strictEqual(resRlsCheck.status, 200);
    const bodyRlsCheck = await resRlsCheck.json();
    assert.strictEqual(bodyRlsCheck.data.length, 0);
    console.log('✅ Supabase Multi-Tenant RLS & Company Isolation passed.');

    // 35. Test POST /api/billing/limit-check & POST /api/telemetry/upgrade-events (Document 8)
    const resLimitCheck = await fetch(`${baseUrl}/billing/limit-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', limitType: 'agents', currentCount: 2 })
    });
    assert.strictEqual(resLimitCheck.status, 200);
    const bodyLimitCheck = await resLimitCheck.json();
    assert.strictEqual(bodyLimitCheck.data.allowed, true);

    const resUpgEvt = await fetch(`${baseUrl}/telemetry/upgrade-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', eventType: 'limit_reached', limitType: 'agents' })
    });
    assert.strictEqual(resUpgEvt.status, 200);
    const bodyUpgEvt = await resUpgEvt.json();
    assert.ok(bodyUpgEvt.data.id.startsWith('upg-evt-'));
    console.log('✅ POST /api/billing/limit-check & Upgrade Events passed.');

    // 36. Test GET /api/templates/agents (12 Official Agent Templates Library - Document 9)
    const res12Templates = await fetch(`${baseUrl}/templates/agents`);
    assert.strictEqual(res12Templates.status, 200);
    const body12Templates = await res12Templates.json();
    assert.strictEqual(body12Templates.data.length, 12);
    assert.ok(body12Templates.data.some(t => t.id === 'template-ops-manager' && t.firstSuggestedActions.length === 3));
    console.log('✅ 12 Official Agent Templates Library & First Actions passed.');

    // 37. Test POST /api/tools/execute & POST /api/approvals/:id/resolve (Tools Engine & Risk Approvals)
    const resToolReq = await fetch(`${baseUrl}/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', agentId: 'agent-main', toolName: 'send_notification', params: { text: 'Alerta urgente' } })
    });
    assert.strictEqual(resToolReq.status, 200);
    const bodyToolReq = await resToolReq.json();
    console.log('DEBUG bodyToolReq:', JSON.stringify(bodyToolReq));
    assert.strictEqual(bodyToolReq.data.status, 'waiting_approval');

    const toolApprovalId = bodyToolReq.data.approvalRequestId;
    const resAppResolve = await fetch(`${baseUrl}/approvals/${toolApprovalId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approved' })
    });
    assert.strictEqual(resAppResolve.status, 200);
    const bodyAppResolve = await resAppResolve.json();
    assert.strictEqual(bodyAppResolve.data.approval.status, 'approved');
    console.log('✅ Tools Execution Engine & Human Approval Flow passed.');

    // 38. Test POST /api/providers/validate (NVIDIA Build BYOK Validation)
    const resValNvidia = await fetch(`${baseUrl}/providers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        provider: 'nvidia',
        apiKey: 'mock-valid-key',
        preferredChatModel: 'meta/llama-3.3-70b-instruct'
      })
    });
    assert.strictEqual(resValNvidia.status, 200);
    const bodyValNvidia = await resValNvidia.json();
    assert.strictEqual(bodyValNvidia.ok, true);
    assert.strictEqual(bodyValNvidia.data.provider, 'nvidia');
    assert.ok(bodyValNvidia.data.available_models.includes('meta/llama-3.3-70b-instruct'));
    assert.ok(bodyValNvidia.data.available_models.includes('meta/llama-3.3-70b-instruct'));
    console.log('✅ POST /api/providers/validate (NVIDIA Build BYOK) passed.');

    // 39. Test Mandatory Onboarding Flow V1 Endpoints (/api/onboarding/*)
    console.log('Testing Onboarding V1 Endpoints...');
    const resObGet = await fetch(`${baseUrl}/onboarding?workspaceId=workspace_onb_test`);
    assert.strictEqual(resObGet.status, 200);
    const bodyObGet = await resObGet.json();
    assert.strictEqual(bodyObGet.data.currentStep, 1);

    const resObTerms = await fetch(`${baseUrl}/onboarding/terms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_onb_test', userId: 'user_onb', accepted: true })
    });
    assert.strictEqual(resObTerms.status, 200);

    const resObComp = await fetch(`${baseUrl}/onboarding/company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_onb_test',
        company: { name: 'Empresa Teste Onboarding', segment: 'Tecnologia', size: '1-10', mainGoal: 'Automatizar suporte' }
      })
    });
    assert.strictEqual(resObComp.status, 200);

    const resObSheets = await fetch(`${baseUrl}/onboarding/documents/sheets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'vendas.xlsx', content: 'Nome,Email\nAna,ana@test.com' })
    });
    assert.strictEqual(resObSheets.status, 200);
    const bodyObSheets = await resObSheets.json();
    assert.ok(bodyObSheets.data.detectedSheets.length > 0);

    const resObProv = await fetch(`${baseUrl}/onboarding/provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_onb_test', provider: 'openai', model: 'gpt-4o-mini', apiKey: 'sk-mockkey123456789' })
    });
    assert.strictEqual(resObProv.status, 200);
    const bodyObProv = await resObProv.json();
    assert.strictEqual(bodyObProv.data.status, 'valid');

    const resObAgent = await fetch(`${baseUrl}/onboarding/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_onb_test', name: 'Agente Main Teste', role: 'Coordenador', autonomyLevel: 'Operacional' })
    });
    assert.strictEqual(resObAgent.status, 200);

    const resObMd = await fetch(`${baseUrl}/onboarding/generate-md`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_onb_test' })
    });
    assert.strictEqual(resObMd.status, 200);
    const bodyObMd = await resObMd.json();
    assert.strictEqual(bodyObMd.data.files.length, 8);

    const resObCompDone = await fetch(`${baseUrl}/onboarding/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_onb_test' })
    });
    assert.strictEqual(resObCompDone.status, 200);
    const bodyObCompDone = await resObCompDone.json();
    assert.strictEqual(bodyObCompDone.data.completed, true);
    assert.strictEqual(bodyObCompDone.data.completed, true);
    console.log('✅ Mandatory Onboarding Flow V1 Endpoints (/api/onboarding/*) passed.');

    // 40. Test API Key & Provider Validation Engine Endpoints (/api/providers/connections/*)
    console.log('Testing API Key & Provider Validation Engine V1 Endpoints...');
    
    // Nível 1: Format Check
    const resValFmt = await fetch(`${baseUrl}/providers/connections/validate-format`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai', apiKey: 'sk-proj-mock12345678901234567890' })
    });
    assert.strictEqual(resValFmt.status, 200);
    const bodyValFmt = await resValFmt.json();
    assert.strictEqual(bodyValFmt.data.formatStatus, 'formato_aceitavel');

    // Nível 2: Auth Check
    const resTestAuth = await fetch(`${baseUrl}/providers/connections/test-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'anthropic', apiKey: 'sk-ant-mock12345678901234567890' })
    });
    assert.strictEqual(resTestAuth.status, 200);
    const bodyTestAuth = await resTestAuth.json();
    assert.strictEqual(bodyTestAuth.data.authenticated, true);

    // Nível 3: List Models
    const resListMod = await fetch(`${baseUrl}/providers/connections/list-models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'gemini', apiKey: 'AIzaSy123456789012345678901234567890' })
    });
    assert.strictEqual(resListMod.status, 200);
    const bodyListMod = await resListMod.json();
    assert.ok(bodyListMod.data.models.length > 0);

    // Nível 4: Test Completion
    const resTestComp = await fetch(`${baseUrl}/providers/connections/test-completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'groq', apiKey: 'gsk_mock12345678901234567890' })
    });
    assert.strictEqual(resTestComp.status, 200);
    const bodyTestComp = await resTestComp.json();
    assert.strictEqual(bodyTestComp.data.completed, true);
    assert.strictEqual(bodyTestComp.data.responseText, 'OK');

    // Save Connection
    const resSaveConn = await fetch(`${baseUrl}/providers/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        provider: 'openai',
        apiKey: 'sk-proj-mock12345678901234567890',
        displayName: 'Chave OpenAI Principal',
        defaultModelId: 'gpt-4o-mini'
      })
    });
    assert.strictEqual(resSaveConn.status, 200);
    const bodySaveConn = await resSaveConn.json();
    const connId = bodySaveConn.data.connection.id;
    assert.ok(connId.startsWith('conn-'));

    // List Connections
    const resGetConns = await fetch(`${baseUrl}/providers/connections?workspaceId=workspace_123`);
    assert.strictEqual(resGetConns.status, 200);
    const bodyGetConns = await resGetConns.json();
    assert.ok(bodyGetConns.data.count > 0);

    // Key Rotation
    const resRotateVal = await fetch(`${baseUrl}/providers/connections/${connId}/rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newApiKey: 'sk-proj-newrotatedkey1234567890' })
    });
    assert.strictEqual(resRotateVal.status, 200);
    const bodyRotateVal = await resRotateVal.json();
    assert.strictEqual(bodyRotateVal.data.connection.id, connId);

    // Delete Connection
    const resDel = await fetch(`${baseUrl}/providers/connections/${connId}`, {
      method: 'DELETE'
    });
    assert.strictEqual(resDel.status, 200);
    console.log('✅ API Key & Provider Validation Engine Endpoints (/api/providers/connections/*) passed.');

    // 41. Test Agent Error Diagnostics & Observability Engine Endpoints (PDF V1 Specification)
    console.log('Testing Agent Error Diagnostics & Observability Engine V1 Endpoints...');

    // GET /api/agent-runs/:id/diagnostics
    const resDiagRun = await fetch(`${baseUrl}/agent-runs/run_test_123/diagnostics`);
    assert.strictEqual(resDiagRun.status, 200);
    const bodyDiagRun = await resDiagRun.json();
    assert.ok(bodyDiagRun.data.report.runId);

    // POST /api/agent-runs/:id/retry
    const resRetryRun = await fetch(`${baseUrl}/agent-runs/run_test_123/retry`, {
      method: 'POST'
    });
    assert.strictEqual(resRetryRun.status, 200);
    const bodyRetryRun = await resRetryRun.json();
    assert.strictEqual(bodyRetryRun.data.status, 'completed');

    // GET /api/workspaces/:id/diagnostics
    const resWsDiag = await fetch(`${baseUrl}/workspaces/workspace_123/diagnostics`);
    assert.strictEqual(resWsDiag.status, 200);
    const bodyWsDiag = await resWsDiag.json();
    assert.ok(bodyWsDiag.data.summary.successRatePercent >= 0);

    // GET /api/workspaces/:id/errors
    const resWsErrors = await fetch(`${baseUrl}/workspaces/workspace_123/errors`);
    assert.strictEqual(resWsErrors.status, 200);

    // PATCH /api/agent-errors/:id/status
    const resUpdateErrStatus = await fetch(`${baseUrl}/agent-errors/err_test_123/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' })
    });
    assert.strictEqual(resUpdateErrStatus.status, 200);

    // GET /api/internal/diagnostics/overview
    const resInternalOverview = await fetch(`${baseUrl}/internal/diagnostics/overview`);
    assert.strictEqual(resInternalOverview.status, 200);
    const bodyInternalOverview = await resInternalOverview.json();
    assert.ok(bodyInternalOverview.data.overview.totalRunsRecorded >= 0);
    console.log('✅ Agent Error Diagnostics & Observability Engine Endpoints passed.');

    // 42. Test Provider Usage Metering, Credits & Costs Endpoints (PDF V1 Specification)
    console.log('Testing Provider Usage Metering, Credits & Costs V1 Endpoints...');

    // GET /api/workspaces/:id/usage/summary
    const resUsgSumm = await fetch(`${baseUrl}/workspaces/workspace_123/usage/summary`);
    assert.strictEqual(resUsgSumm.status, 200);
    const bodyUsgSumm = await resUsgSumm.json();
    assert.ok(bodyUsgSumm.data.balance.monthlyCreditLimit > 0);

    // GET /api/workspaces/:id/credits/balance
    const resCredBal = await fetch(`${baseUrl}/workspaces/workspace_123/credits/balance`);
    assert.strictEqual(resCredBal.status, 200);

    // POST /api/usage/estimate
    const resUsgEst = await fetch(`${baseUrl}/usage/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskType: 'pdf_processing', sourceType: 'byok' })
    });
    assert.strictEqual(resUsgEst.status, 200);
    const bodyUsgEst = await resUsgEst.json();
    assert.ok(bodyUsgEst.data.estimatedCredits > 0);

    // POST /api/usage/record
    const resUsgRec = await fetch(`${baseUrl}/usage/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        sourceType: 'byok',
        eventType: 'model_request',
        quantity: 1,
        modelId: 'gpt-4o-mini'
      })
    });
    assert.strictEqual(resUsgRec.status, 200);

    // POST /api/usage/debit
    const resUsgDebit = await fetch(`${baseUrl}/usage/debit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', creditAmount: 5 })
    });
    assert.strictEqual(resUsgDebit.status, 200);

    // POST /api/usage/refund
    const resUsgRefund = await fetch(`${baseUrl}/usage/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', creditAmount: 5, reason: 'Test Refund' })
    });
    assert.strictEqual(resUsgRefund.status, 200);

    // GET & PATCH /api/agents/:id/usage-policy
    const resAgPol = await fetch(`${baseUrl}/agents/agent_1/usage-policy`);
    assert.strictEqual(resAgPol.status, 200);

    const resAgPolPatch = await fetch(`${baseUrl}/agents/agent_1/usage-policy`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dailyCreditLimit: 600 })
    });
    assert.strictEqual(resAgPolPatch.status, 200);

    // GET /api/workspaces/:id/usage/alerts
    const resUsgAlerts = await fetch(`${baseUrl}/workspaces/workspace_123/usage/alerts`);
    assert.strictEqual(resUsgAlerts.status, 200);
    console.log('✅ Provider Usage Metering, Credits & Costs Endpoints passed.');

    // 43. Test Internal Admin, Support & Audit Endpoints (PDF V1 Specification)
    console.log('Testing Internal Admin, Support & Audit V1 Endpoints...');

    // GET /api/internal/overview
    const resIntOv = await fetch(`${baseUrl}/internal/overview`);
    assert.strictEqual(resIntOv.status, 200);
    const bodyIntOv = await resIntOv.json();
    assert.ok(bodyIntOv.data.activeWorkspacesCount >= 0);

    // GET /api/internal/workspaces/search
    const resIntSearch = await fetch(`${baseUrl}/internal/workspaces/search?q=workspace`);
    assert.strictEqual(resIntSearch.status, 200);

    // GET /api/internal/workspaces/:id
    const resIntWs = await fetch(`${baseUrl}/internal/workspaces/workspace_123`);
    assert.strictEqual(resIntWs.status, 200);

    // GET /api/internal/workspaces/:id/diagnostics
    const resIntWsDiag = await fetch(`${baseUrl}/internal/workspaces/workspace_123/diagnostics`);
    assert.strictEqual(resIntWsDiag.status, 200);

    // GET /api/internal/workspaces/:id/usage
    const resIntWsUsg = await fetch(`${baseUrl}/internal/workspaces/workspace_123/usage`);
    assert.strictEqual(resIntWsUsg.status, 200);

    // GET /api/internal/workspaces/:id/audit
    const resIntWsAudit = await fetch(`${baseUrl}/internal/workspaces/workspace_123/audit`);
    assert.strictEqual(resIntWsAudit.status, 200);

    // GET /api/internal/agent-runs/:id
    const resIntRun = await fetch(`${baseUrl}/internal/agent-runs/run_test_123`);
    assert.strictEqual(resIntRun.status, 200);

    // POST /api/internal/agent-runs/:id/retry-safe
    const resIntRetrySafe = await fetch(`${baseUrl}/internal/agent-runs/run_test_123/retry-safe`, {
      method: 'POST'
    });
    assert.strictEqual(resIntRetrySafe.status, 200);

    // GET /api/internal/errors/fingerprints
    const resIntFps = await fetch(`${baseUrl}/internal/errors/fingerprints`);
    assert.strictEqual(resIntFps.status, 200);

    // GET /api/internal/providers/health
    const resIntProvH = await fetch(`${baseUrl}/internal/providers/health`);
    assert.strictEqual(resIntProvH.status, 200);

    // GET & POST /api/internal/incidents
    const resIntIncs = await fetch(`${baseUrl}/internal/incidents`);
    assert.strictEqual(resIntIncs.status, 200);

    const resIntIncCreate = await fetch(`${baseUrl}/internal/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Incident', severity: 'warning', workspaceId: 'workspace_123' })
    });
    assert.strictEqual(resIntIncCreate.status, 200);

    // POST /api/internal/billing/manual-credit
    const resIntManCred = await fetch(`${baseUrl}/internal/billing/manual-credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', creditAmount: 50, reason: 'Test Credit Grant' })
    });
    assert.strictEqual(resIntManCred.status, 200);

    // POST /api/internal/break-glass/request
    const resIntBgReq = await fetch(`${baseUrl}/internal/break-glass/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', reason: 'Emergency Investigation of Critical Incident' })
    });
    assert.strictEqual(resIntBgReq.status, 200);
    const bodyIntBgReq = await resIntBgReq.json();
    const bgSessionId = bodyIntBgReq.data.breakGlassSession.id;

    // POST /api/internal/break-glass/approve
    const resIntBgApprove = await fetch(`${baseUrl}/internal/break-glass/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: bgSessionId, action: 'revoke' })
    });
    assert.strictEqual(resIntBgApprove.status, 200);
    console.log('✅ Internal Admin, Support & Audit Endpoints passed.');

    // 44. Test Incident Management & Public Status Page V1 Endpoints (PDF V1 Specification)
    console.log('Testing Incident Management & Public Status Page V1 Endpoints...');

    // GET /api/status/public
    const resStPub = await fetch(`${baseUrl}/status/public`);
    assert.strictEqual(resStPub.status, 200);
    const bodyStPub = await resStPub.json();
    assert.ok(bodyStPub.data.overallStatus);

    // GET /api/status/public/incidents
    const resStPubIncs = await fetch(`${baseUrl}/status/public/incidents`);
    assert.strictEqual(resStPubIncs.status, 200);

    // GET /api/status/public/components
    const resStPubComps = await fetch(`${baseUrl}/status/public/components`);
    assert.strictEqual(resStPubComps.status, 200);
    const bodyStPubComps = await resStPubComps.json();
    assert.strictEqual(bodyStPubComps.data.count, 10);

    // GET /api/internal/incidents/suggestions
    const resIntSugs = await fetch(`${baseUrl}/internal/incidents/suggestions`);
    assert.strictEqual(resIntSugs.status, 200);

    // POST /api/internal/incidents (Create Incident)
    const resIntIncNew = await fetch(`${baseUrl}/internal/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Instabilidade no Provider OpenAI', severity: 'sev_2_high', description: 'Taxa de erro de rate limit elevada.' })
    });
    assert.strictEqual(resIntIncNew.status, 200);
    const bodyIntIncNew = await resIntIncNew.json();
    const createdIncId = bodyIntIncNew.data.incident.id;

    // POST /api/internal/incidents/:id/updates
    const resIntUpd = await fetch(`${baseUrl}/internal/incidents/${createdIncId}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'investigating', messagePublic: 'Estamos investigando a oscilação.' })
    });
    assert.strictEqual(resIntUpd.status, 200);

    // POST /api/internal/incidents/:id/publish
    const resIntPub = await fetch(`${baseUrl}/internal/incidents/${createdIncId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summaryPublic: 'Estamos acompanhando uma instabilidade no provedor de IA.' })
    });
    assert.strictEqual(resIntPub.status, 200);

    // POST /api/internal/incidents/:id/resolve
    const resIntRes = await fetch(`${baseUrl}/internal/incidents/${createdIncId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolutionNotes: 'Problema de quota resolvido com chave secundária.' })
    });
    assert.strictEqual(resIntRes.status, 200);

    // POST /api/internal/incidents/:id/postmortem
    const resIntPm = await fetch(`${baseUrl}/internal/incidents/${createdIncId}/postmortem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ impactSummary: 'Breve aumento na latência de resposta dos agentes.', rootCause: 'Rate limit temporário do provider OpenAI.' })
    });
    assert.strictEqual(resIntPm.status, 200);

    // POST /api/internal/maintenances
    const resIntMaint = await fetch(`${baseUrl}/internal/maintenances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Atualização Programada de Banco de Dados', descriptionPublic: 'Manutenção preventiva com duração estimada de 15 minutos.' })
    });
    assert.strictEqual(resIntMaint.status, 200);
    console.log('✅ Incident Management & Public Status Page Endpoints passed.');

    // 45. Test Notification & Intelligent Alerts V1 Endpoints (PDF V1 Specification)
    console.log('Testing Notification & Intelligent Alerts V1 Endpoints...');

    // GET /api/notifications
    const resNotifList = await fetch(`${baseUrl}/notifications?workspaceId=workspace_123`);
    assert.strictEqual(resNotifList.status, 200);
    const bodyNotifList = await resNotifList.json();
    assert.ok(bodyNotifList.data.count >= 0);

    // POST /api/notifications/emit
    const resNotifEmit = await fetch(`${baseUrl}/notifications/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        type: 'credit_usage',
        priority: 'high',
        title: 'Seu workspace atingiu 90% dos créditos',
        message: 'Você está perto do limite mensal.',
        actionLabel: 'Ver Créditos',
        dedupeKey: 'credits_90:workspace_123:2026-07'
      })
    });
    assert.strictEqual(resNotifEmit.status, 200);
    const bodyNotifEmit = await resNotifEmit.json();
    const emittedNotifId = bodyNotifEmit.data.notification.id;

    // PATCH /api/notifications/:id/read
    const resNotifRead = await fetch(`${baseUrl}/notifications/${emittedNotifId}/read`, {
      method: 'PATCH'
    });
    assert.strictEqual(resNotifRead.status, 200);

    // PATCH /api/notifications/:id/archive
    const resNotifArch = await fetch(`${baseUrl}/notifications/${emittedNotifId}/archive`, {
      method: 'PATCH'
    });
    assert.strictEqual(resNotifArch.status, 200);

    // POST /api/notifications/mark-all-read
    const resNotifMarkAll = await fetch(`${baseUrl}/notifications/mark-all-read?workspaceId=workspace_123`, {
      method: 'POST'
    });
    assert.strictEqual(resNotifMarkAll.status, 200);

    // GET & PATCH /api/notifications/preferences
    const resNotifPrefs = await fetch(`${baseUrl}/notifications/preferences`);
    assert.strictEqual(resNotifPrefs.status, 200);

    const resNotifPrefsPatch = await fetch(`${baseUrl}/notifications/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ digestEnabled: true, minimumPriority: 'normal' })
    });
    assert.strictEqual(resNotifPrefsPatch.status, 200);

    // GET & PATCH /api/workspaces/:id/notification-policies
    const resNotifPol = await fetch(`${baseUrl}/workspaces/workspace_123/notification-policies`);
    assert.strictEqual(resNotifPol.status, 200);

    const resNotifPolPatch = await fetch(`${baseUrl}/workspaces/workspace_123/notification-policies`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultEmailEnabled: true, creditAlertsEnabled: true })
    });
    assert.strictEqual(resNotifPolPatch.status, 200);

    // POST /api/notifications/test-webhook
    const resNotifWhTest = await fetch(`${baseUrl}/notifications/test-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: 'https://webhook.site/test-endpoint' })
    });
    assert.strictEqual(resNotifWhTest.status, 200);
    console.log('✅ Notification & Intelligent Alerts Endpoints passed.');

    // 46. Test Permissions, Risk Scoring & Human Approvals V1 Endpoints (PDF V1 Specification)
    console.log('Testing Permissions, Risk Scoring & Human Approvals V1 Endpoints...');

    // POST /api/permissions/evaluate
    const resPermEval = await fetch(`${baseUrl}/permissions/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userRole: 'Operator', actionType: 'send_external_email', estimatedCost: 10 })
    });
    assert.strictEqual(resPermEval.status, 200);
    const bodyPermEval = await resPermEval.json();
    assert.strictEqual(bodyPermEval.data.evaluation.riskLevel, 'high');

    // GET /api/workspaces/:id/roles
    const resWkRoles = await fetch(`${baseUrl}/workspaces/workspace_123/roles`);
    assert.strictEqual(resWkRoles.status, 200);
    const bodyWkRoles = await resWkRoles.json();
    assert.strictEqual(bodyWkRoles.data.count, 6);

    // GET & PATCH /api/agents/:id/permission-policy
    const resPermAgPol = await fetch(`${baseUrl}/agents/agent_main/permission-policy`);
    assert.strictEqual(resPermAgPol.status, 200);

    const resPermAgPolPatch = await fetch(`${baseUrl}/agents/agent_main/permission-policy`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canSendExternalMessages: false, creditApprovalThreshold: 100.00 })
    });
    assert.strictEqual(resPermAgPolPatch.status, 200);

    // GET & POST /api/approvals
    const resPermApprList = await fetch(`${baseUrl}/approvals`);
    assert.strictEqual(resPermApprList.status, 200);

    const resPermApprNew = await fetch(`${baseUrl}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        requestedByUserId: 'user_1',
        actionType: 'send_external_email',
        riskLevel: 'high',
        title: 'Enviar Disparo de E-mail de Campanha',
        description: 'Campanha promocional para 50 leads.',
        estimatedCreditCost: 10
      })
    });
    assert.strictEqual(resPermApprNew.status, 200);
    const bodyPermApprNew = await resPermApprNew.json();
    const createdPermApprId = bodyPermApprNew.data.approval.id;

    // POST /api/approvals/:id/approve
    const resPermApprApprove = await fetch(`${baseUrl}/approvals/${createdPermApprId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decidedByUserId: 'owner_1', reason: 'Disparo verificado pelo gestor.' })
    });
    assert.strictEqual(resPermApprApprove.status, 200);
    const bodyPermApprApprove = await resPermApprApprove.json();
    assert.strictEqual(bodyPermApprApprove.data.approval.status, 'approved');
    assert.ok(bodyPermApprApprove.data.execution.idempotencyKey);

    // Test Prohibited Agent Self-Approval
    const resPermApprSelfNew = await fetch(`${baseUrl}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        requestedByAgentId: 'agent_boris',
        actionType: 'cancel_subscription',
        riskLevel: 'critical',
        title: 'Cancelar Assinatura do Workspace'
      })
    });
    assert.strictEqual(resPermApprSelfNew.status, 200);
    const bodyPermApprSelfNew = await resPermApprSelfNew.json();
    const selfApprId = bodyPermApprSelfNew.data.approval.id;

    const resPermApprSelfFail = await fetch(`${baseUrl}/approvals/${selfApprId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decidedByUserId: 'agent_boris', reason: 'Tentativa de auto-aprovação de agente.' })
    });
    assert.strictEqual(resPermApprSelfFail.status, 403);

    console.log('✅ Permissions, Risk Scoring & Human Approvals Endpoints passed.');

    // 47. Test Workspace Operational Audit Logs V1 Endpoints (PDF V1 Specification)
    console.log('Testing Workspace Operational Audit Logs V1 Endpoints...');

    // POST /api/audit/record
    const resAuditRecord = await fetch(`${baseUrl}/audit/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        actorType: 'user',
        actorUserId: 'user_owner',
        action: 'provider.key_rotated',
        category: 'provider',
        severity: 'notice',
        correlationId: 'corr-1785204620',
        metadataSafe: { providerId: 'openai', apiKey: 'sk-proj-secret12345' }
      })
    });
    assert.strictEqual(resAuditRecord.status, 200);
    const bodyAuditRecord = await resAuditRecord.json();
    assert.strictEqual(bodyAuditRecord.data.auditLog.metadataSafe.apiKey, '[REDACTED]');

    // GET /api/workspaces/:id/audit-logs
    const resAuditList = await fetch(`${baseUrl}/workspaces/workspace_123/audit-logs`);
    assert.strictEqual(resAuditList.status, 200);
    const bodyAuditList = await resAuditList.json();
    assert.ok(bodyAuditList.data.count >= 1);

    // GET /api/workspaces/:id/audit-logs/timeline/:correlationId
    const resAuditTimeline = await fetch(`${baseUrl}/workspaces/workspace_123/audit-logs/timeline/corr-1785204620`);
    assert.strictEqual(resAuditTimeline.status, 200);
    const bodyAuditTimeline = await resAuditTimeline.json();
    assert.ok(bodyAuditTimeline.data.count >= 1);

    // POST /api/workspaces/:id/audit-logs/export (CSV)
    const resAuditExportCsv = await fetch(`${baseUrl}/workspaces/workspace_123/audit-logs/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'csv', reason: 'Exportação de auditoria' })
    });
    assert.strictEqual(resAuditExportCsv.status, 200);

    // POST /api/workspaces/:id/audit-logs/export (JSON)
    const resAuditExportJson = await fetch(`${baseUrl}/workspaces/workspace_123/audit-logs/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'json', reason: 'Exportação de auditoria' })
    });
    assert.strictEqual(resAuditExportJson.status, 200);
    console.log('✅ Workspace Operational Audit Logs Endpoints passed.');

    // 48. Test Job Queues, Background Workers & Dead Letter Queue V1 Endpoints (PDF V1 Specification)
    console.log('Testing Job Queues, Background Workers & Dead Letter Queue V1 Endpoints...');

    // POST /api/jobs/enqueue
    const resJobEnqueue = await fetch(`${baseUrl}/jobs/enqueue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        jobType: 'rag_embedding',
        priority: 'high',
        payloadSafe: { fileId: 'file_456', chunksCount: 150 },
        idempotencyKey: 'idemp-rag-100'
      })
    });
    assert.strictEqual(resJobEnqueue.status, 200);
    const bodyJobEnqueue = await resJobEnqueue.json();
    const createdJobId = bodyJobEnqueue.data.job.id;

    // POST /api/jobs/enqueue (Duplicate Idempotency Check)
    const resJobDup = await fetch(`${baseUrl}/jobs/enqueue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        jobType: 'rag_embedding',
        idempotencyKey: 'idemp-rag-100'
      })
    });
    assert.strictEqual(resJobDup.status, 200);
    const bodyJobDup = await resJobDup.json();
    assert.strictEqual(bodyJobDup.data.deduplicated, true);

    // POST /api/jobs/schedule
    const resJobSchedule = await fetch(`${baseUrl}/jobs/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        jobType: 'notification_digest',
        delaySeconds: 120
      })
    });
    assert.strictEqual(resJobSchedule.status, 200);

    // GET /api/jobs/:id
    const resJobGet = await fetch(`${baseUrl}/jobs/${createdJobId}`);
    assert.strictEqual(resJobGet.status, 200);
    const bodyJobGet = await resJobGet.json();
    assert.strictEqual(bodyJobGet.data.job.status, 'queued');

    // GET /api/workspaces/:id/jobs
    const resWkJobs = await fetch(`${baseUrl}/workspaces/workspace_123/jobs`);
    assert.strictEqual(resWkJobs.status, 200);
    const bodyWkJobs = await resWkJobs.json();
    assert.ok(bodyWkJobs.data.count >= 1);

    // POST /api/jobs/:id/cancel
    const resJobCancel = await fetch(`${baseUrl}/jobs/${createdJobId}/cancel`, {
      method: 'POST'
    });
    assert.strictEqual(resJobCancel.status, 200);

    // POST /api/internal/jobs/:id/retry
    const resJobRetry = await fetch(`${baseUrl}/internal/jobs/${createdJobId}/retry`, {
      method: 'POST'
    });
    assert.strictEqual(resJobRetry.status, 200);

    // GET /api/internal/jobs/overview
    const resJobsOverview = await fetch(`${baseUrl}/internal/jobs/overview`);
    assert.strictEqual(resJobsOverview.status, 200);

    // GET /api/internal/jobs/dead-letter
    const resDlqList = await fetch(`${baseUrl}/internal/jobs/dead-letter`);
    assert.strictEqual(resDlqList.status, 200);

    console.log('✅ Job Queues, Background Workers & Dead Letter Queue Endpoints passed.');

    // 49. Test Webhooks & External Integrations V1 Endpoints (PDF V1 Specification)
    console.log('Testing Webhooks & External Integrations V1 Endpoints...');

    // POST /api/webhooks/outbound (Create Outbound Endpoint)
    const resWhOutCreate = await fetch(`${baseUrl}/webhooks/outbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        name: 'Disparo de Produção n8n',
        url: 'https://webhook.site/test-integration',
        eventTypes: ['agent.run.completed', 'agent.run.failed']
      })
    });
    assert.strictEqual(resWhOutCreate.status, 200);
    const bodyWhOutCreate = await resWhOutCreate.json();
    const createdOutId = bodyWhOutCreate.data.endpoint.id;

    // GET /api/webhooks/outbound
    const resWhOutList = await fetch(`${baseUrl}/webhooks/outbound?workspaceId=workspace_123`);
    assert.strictEqual(resWhOutList.status, 200);
    const bodyWhOutList = await resWhOutList.json();
    assert.ok(bodyWhOutList.data.count >= 1);

    // POST /api/webhooks/outbound/:id/test (HMAC Disparo Test)
    const resWhOutTest = await fetch(`${baseUrl}/webhooks/outbound/${createdOutId}/test`, {
      method: 'POST'
    });
    assert.strictEqual(resWhOutTest.status, 200);
    const bodyWhOutTest = await resWhOutTest.json();
    assert.ok(bodyWhOutTest.data.headers['X-Lyriq-Signature'].startsWith('sha256='));

    // GET /api/webhooks/outbound/:id/deliveries
    const resWhOutDeliveries = await fetch(`${baseUrl}/webhooks/outbound/${createdOutId}/deliveries`);
    assert.strictEqual(resWhOutDeliveries.status, 200);

    // POST /api/webhooks/inbound (Create Inbound Receptor)
    const resWhInCreate = await fetch(`${baseUrl}/webhooks/inbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        name: 'Gatilho Lead HubSpot',
        allowedActions: ['agent.run', 'automation.trigger'],
        targetAgentId: 'agent_main'
      })
    });
    assert.strictEqual(resWhInCreate.status, 200);
    const bodyWhInCreate = await resWhInCreate.json();
    const inboundSlug = bodyWhInCreate.data.inboundEndpoint.slug;

    // POST /api/v1/webhooks/inbound/:slug (Public HTTP Inbound Call)
    const resWhInCall = await fetch(`${baseUrl}/v1/webhooks/inbound/${inboundSlug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadName: 'Augusto Weymar', leadEmail: 'augusto@example.com', apiKey: 'sk-proj-secret' })
    });
    assert.ok(resWhInCall.status === 200 || resWhInCall.status === 202);
    const bodyWhInCall = await resWhInCall.json();
    assert.strictEqual(bodyWhInCall.data.status, 'accepted');
    assert.ok(bodyWhInCall.data.jobId);
    console.log('✅ Webhooks & External Integrations Endpoints passed.');

    // 50. Test Native Connectors, OAuth & MCP Servers V1 Endpoints (PDF V1 Specification)
    console.log('Testing Native Connectors, OAuth & MCP Servers V1 Endpoints...');

    // GET /api/integrations/catalog (List 20 Native Connectors)
    const resIntegrationsCatalog = await fetch(`${baseUrl}/integrations/catalog`);
    assert.strictEqual(resIntegrationsCatalog.status, 200);
    const bodyIntegrationsCatalog = await resIntegrationsCatalog.json();
    assert.strictEqual(bodyIntegrationsCatalog.data.count, 20);

    // POST /api/integrations/google_workspace/connect (Connect OAuth Conector)
    const resConnCreate = await fetch(`${baseUrl}/integrations/google_workspace/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        accountEmail: 'augusto@lyriq.ai'
      })
    });
    assert.strictEqual(resConnCreate.status, 200);
    const bodyConnCreate = await resConnCreate.json();
    const createdConnId = bodyConnCreate.data.integration.id;

    // GET /api/workspaces/workspace_123/integrations
    const resWkConnList = await fetch(`${baseUrl}/workspaces/workspace_123/integrations`);
    assert.strictEqual(resWkConnList.status, 200);

    // POST /api/integrations/:id/test (Healthcheck)
    const resConnTest = await fetch(`${baseUrl}/integrations/${createdConnId}/test`, {
      method: 'POST'
    });
    assert.strictEqual(resConnTest.status, 200);

    // GET /api/integrations/:id/tools (List Tools & Risk Ratings)
    const resConnTools = await fetch(`${baseUrl}/integrations/${createdConnId}/tools`);
    assert.strictEqual(resConnTools.status, 200);

    // POST /api/integrations/:id/disconnect
    const resConnDisconn = await fetch(`${baseUrl}/integrations/${createdConnId}/disconnect`, {
      method: 'POST'
    });
    assert.strictEqual(resConnDisconn.status, 200);

    // GET /api/mcps (List MCP Servers)
    const resMcpList = await fetch(`${baseUrl}/mcps?workspaceId=workspace_123`);
    assert.strictEqual(resMcpList.status, 200);
    const bodyMcpList = await resMcpList.json();
    assert.ok(bodyMcpList.data.count >= 3);

    // POST /api/mcps/connect (Connect Custom MCP)
    const resMcpConnect = await fetch(`${baseUrl}/mcps/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        name: 'Enterprise Postgres MCP',
        serverKey: 'postgres_db_mcp',
        transportType: 'http',
        serverUrl: 'http://localhost:5432'
      })
    });
    assert.strictEqual(resMcpConnect.status, 200);
    const bodyMcpConnect = await resMcpConnect.json();
    const createdMcpId = bodyMcpConnect.data.mcp.id;

    // POST /api/mcps/:id/healthcheck (Discovery)
    const resMcpHealth = await fetch(`${baseUrl}/mcps/${createdMcpId}/healthcheck`, {
      method: 'POST'
    });
    assert.strictEqual(resMcpHealth.status, 200);
    const bodyMcpHealth = await resMcpHealth.json();
    assert.strictEqual(bodyMcpHealth.data.status, 'healthy');
    assert.ok(bodyMcpHealth.data.discoveredToolsCount >= 1);

    // DELETE /api/mcps/:id (Disconnect MCP)
    const resMcpDelete = await fetch(`${baseUrl}/mcps/${createdMcpId}`, {
      method: 'DELETE'
    });
    assert.strictEqual(resMcpDelete.status, 200);
    console.log('✅ Native Connectors, OAuth & MCP Servers Endpoints passed.');

    // 51. Test Telegram Bot & BotFather Connection V1 Endpoints (PDF V1 Specification)
    console.log('Testing Telegram Bot & BotFather Connection V1 Endpoints...');

    // POST /api/telegram/connections/validate-token (Validate BotFather token)
    const resTgVal = await fetch(`${baseUrl}/telegram/connections/validate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: '8655720761:AAExemploDeTokenMuitoSecreto12345' })
    });
    assert.strictEqual(resTgVal.status, 200);
    const bodyTgVal = await resTgVal.json();
    assert.strictEqual(bodyTgVal.data.bot.id, '8655720761');

    // POST /api/telegram/connections (Register Bot Connection)
    const resTgCreate = await fetch(`${baseUrl}/telegram/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        token: '8655720761:AAExemploDeTokenMuitoSecreto12345',
        defaultAgentId: 'agent_main'
      })
    });
    assert.strictEqual(resTgCreate.status, 200);
    const bodyTgCreate = await resTgCreate.json();
    const createdTgConnId = bodyTgCreate.data.connection.id;

    // POST /api/telegram/connections/:id/set-webhook
    const resTgWebhook = await fetch(`${baseUrl}/telegram/connections/${createdTgConnId}/set-webhook`, {
      method: 'POST'
    });
    assert.strictEqual(resTgWebhook.status, 200);

    // POST /api/telegram/connections/:id/test
    const resTgTest = await fetch(`${baseUrl}/telegram/connections/${createdTgConnId}/test`, {
      method: 'POST'
    });
    assert.strictEqual(resTgTest.status, 200);

    // POST /api/telegram/webhook/:connectionId (Incoming Telegram Update Simulation)
    const resTgWebhookRec = await fetch(`${baseUrl}/telegram/webhook/${createdTgConnId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        update_id: 10001,
        message: {
          message_id: 456,
          from: { id: 8655720761, first_name: 'Augusto', username: 'augustoweymar' },
          chat: { id: 8655720761, type: 'private' },
          text: '/start'
        }
      })
    });
    assert.strictEqual(resTgWebhookRec.status, 200);
    const bodyTgWebhookRec = await resTgWebhookRec.json();
    assert.strictEqual(bodyTgWebhookRec.data.replySent, true);

    // GET /api/workspaces/workspace_123/telegram/chats
    const resTgChats = await fetch(`${baseUrl}/workspaces/workspace_123/telegram/chats`);
    assert.strictEqual(resTgChats.status, 200);

    // GET /api/workspaces/workspace_123/telegram/messages
    const resTgMsgs = await fetch(`${baseUrl}/workspaces/workspace_123/telegram/messages`);
    assert.strictEqual(resTgMsgs.status, 200);

    console.log('✅ Telegram Bot & BotFather Connection Endpoints passed.');

    // ----------------------------------------------------
    // WHATSAPP BUSINESS V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing WhatsApp Business V1 Endpoints...');

    // 1. POST /api/whatsapp/connections (Criar Conexão WhatsApp)
    const resWaConnCreate = await fetch(`${baseUrl}/whatsapp/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        provider: 'meta_cloud',
        displayName: 'WhatsApp V1 Integration Test',
        displayPhoneNumber: '+55 11 99999-0000',
        phoneNumberId: '109876543210985',
        wabaId: '987654321098765',
        accessToken: 'bW9jay13aGF0c2FwcC10b2tlbg==',
        appSecret: 'bW9jay1hcHAtc2VjcmV0',
        verifyToken: 'lyriq_verify_secret'
      })
    });
    assert.strictEqual(resWaConnCreate.status, 200);
    const bodyWaConnCreate = await resWaConnCreate.json();
    assert.strictEqual(bodyWaConnCreate.ok, true);
    const createdWaConnId = bodyWaConnCreate.data.id;

    // 2. POST /api/whatsapp/connections/:id/validate (Validar Conexão)
    const resWaVal = await fetch(`${baseUrl}/whatsapp/connections/${createdWaConnId}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(resWaVal.status, 200);
    const bodyWaVal = await resWaVal.json();
    assert.strictEqual(bodyWaVal.data.valid, true);

    // 3. POST /api/whatsapp/connections/:id/test-message (Mensagem de Teste)
    const resWaTestMsg = await fetch(`${baseUrl}/whatsapp/connections/${createdWaConnId}/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toPhone: '+5511999990000',
        text: 'Teste do WhatsApp Business V1'
      })
    });
    assert.strictEqual(resWaTestMsg.status, 200);
    const bodyWaTestMsg = await resWaTestMsg.json();
    assert.strictEqual(bodyWaTestMsg.data.success, true);

    // 4. GET /api/integrations/whatsapp/meta/webhook/:connectionId (Verificação Meta GET)
    const resWaWebhkGet = await fetch(`${baseUrl}/integrations/whatsapp/meta/webhook/${createdWaConnId}?hub.mode=subscribe&hub.verify_token=lyriq_verify_secret&hub.challenge=test_challenge_123`);
    assert.strictEqual(resWaWebhkGet.status, 200);
    const textWaWebhkGet = await resWaWebhkGet.text();
    assert.strictEqual(textWaWebhkGet, 'test_challenge_123');

    // 5. POST /api/integrations/whatsapp/meta/webhook/:connectionId (Receber Mensagem Inbound via Webhook)
    const resWaWebhkPost = await fetch(`${baseUrl}/integrations/whatsapp/meta/webhook/${createdWaConnId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [{
          id: '987654321098765',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: '109876543210985' },
              contacts: [{ profile: { name: 'Mariana Teste' }, wa_id: '5511977776666' }],
              messages: [{
                from: '5511977776666',
                id: 'wamid.test.101',
                timestamp: '1722199200',
                type: 'text',
                text: { body: 'Olá! Qual é o horário de atendimento?' }
              }]
            },
            field: 'messages'
          }]
        }]
      })
    });
    assert.strictEqual(resWaWebhkPost.status, 200);
    const bodyWaWebhkPost = await resWaWebhkPost.json();
    assert.strictEqual(bodyWaWebhkPost.data.processedCount, 1);

    // 6. GET /api/whatsapp/conversations (Listar Conversas)
    const resWaConvs = await fetch(`${baseUrl}/whatsapp/conversations?workspaceId=workspace_123`);
    assert.strictEqual(resWaConvs.status, 200);
    const bodyWaConvs = await resWaConvs.json();
    assert.ok(bodyWaConvs.data.conversations.length >= 1);
    const activeConv = bodyWaConvs.data.conversations[0];

    // 7. POST /api/whatsapp/conversations/:id/send (Enviar Resposta Manual)
    const resWaSend = await fetch(`${baseUrl}/whatsapp/conversations/${activeConv.id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Nosso horário é de segunda a sexta das 9h às 18h.'
      })
    });
    assert.strictEqual(resWaSend.status, 200);

    // 8. POST /api/whatsapp/conversations/:id/handoff (Transferir para Humano)
    const resWaHandoff = await fetch(`${baseUrl}/whatsapp/conversations/${activeConv.id}/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(resWaHandoff.status, 200);

    // 9. GET /api/whatsapp/templates (Listar Templates Aprovados)
    const resWaTpl = await fetch(`${baseUrl}/whatsapp/templates?workspaceId=workspace_123`);
    assert.strictEqual(resWaTpl.status, 200);

    // 10. GET /api/whatsapp/diagnostics/:connectionId (Painel de Diagnóstico)
    const resWaDiag = await fetch(`${baseUrl}/whatsapp/diagnostics/${createdWaConnId}`);
    assert.strictEqual(resWaDiag.status, 200);

    console.log('✅ WhatsApp Business V1 Endpoints passed.');

    // ----------------------------------------------------
    // EMAIL SMTP/IMAP & OAUTH V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing Email SMTP/IMAP V1 Endpoints...');

    // 1. POST /api/email/connections (Criar Conexão Email)
    const resEmConn = await fetch(`${baseUrl}/email/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        provider: 'imap_smtp',
        emailAddress: 'suporte.teste@lyriq.com.br',
        displayName: 'Suporte Teste Lyriq OS',
        imapHost: 'imap.lyriq.com.br',
        imapPort: 993,
        smtpHost: 'smtp.lyriq.com.br',
        smtpPort: 587,
        username: 'suporte.teste@lyriq.com.br',
        password: 'mock-test-password',
        autoSendEnabled: false
      })
    });
    assert.strictEqual(resEmConn.status, 200);
    const bodyEmConn = await resEmConn.json();
    assert.strictEqual(bodyEmConn.ok, true);
    const createdEmConnId = bodyEmConn.data.id;

    // 2. POST /api/email/connections/:id/validate (Validar Credenciais)
    const resEmVal = await fetch(`${baseUrl}/email/connections/${createdEmConnId}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(resEmVal.status, 200);
    const bodyEmVal = await resEmVal.json();
    assert.strictEqual(bodyEmVal.data.valid, true);

    // 3. POST /api/email/connections/:id/test-send (Enviar Email de Teste)
    const resEmTestSend = await fetch(`${baseUrl}/email/connections/${createdEmConnId}/test-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: 'cliente.teste@empresa.com',
        subject: 'Teste de Integração Email SMTP V1',
        bodyText: 'Mensagem de validação do conector SMTP.'
      })
    });
    assert.strictEqual(resEmTestSend.status, 200);

    // 4. POST /api/email/connections/:id/sync-now (Sincronização Incremental IMAP)
    const resEmSync = await fetch(`${baseUrl}/email/connections/${createdEmConnId}/sync-now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(resEmSync.status, 200);

    // 5. GET /api/email/conversations (Listar Threads de Email)
    const resEmConvs = await fetch(`${baseUrl}/email/conversations?workspaceId=workspace_123`);
    assert.strictEqual(resEmConvs.status, 200);
    const bodyEmConvs = await resEmConvs.json();
    assert.ok(bodyEmConvs.data.conversations.length >= 1);
    const activeEmConv = bodyEmConvs.data.conversations[0];

    // 6. GET /api/email/conversations/:id (Obter Thread e Rascunho)
    const resEmConvDetail = await fetch(`${baseUrl}/email/conversations/${activeEmConv.id}`);
    assert.strictEqual(resEmConvDetail.status, 200);

    // 7. POST /api/email/conversations/:id/draft-reply (Gerar Rascunho)
    const resEmDraft = await fetch(`${baseUrl}/email/conversations/${activeEmConv.id}/draft-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Responda confirmando o prazo de entrega.'
      })
    });
    assert.strictEqual(resEmDraft.status, 200);

    // 8. POST /api/email/conversations/:id/send (Enviar Resposta via SMTP)
    const resEmSend = await fetch(`${baseUrl}/email/conversations/${activeEmConv.id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'Re: Dúvida sobre proposta comercial e suporte',
        text: 'Olá Mariana, confirmamos que o prazo de atendimento é de 2 horas.'
      })
    });
    assert.strictEqual(resEmSend.status, 200);

    // 9. POST /api/email/conversations/:id/handoff (Handoff Humano)
    const resEmHandoff = await fetch(`${baseUrl}/email/conversations/${activeEmConv.id}/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(resEmHandoff.status, 200);

    // 10. GET /api/email/diagnostics/:connectionId (Painel de Diagnóstico)
    const resEmDiag = await fetch(`${baseUrl}/email/diagnostics/${createdEmConnId}`);
    assert.strictEqual(resEmDiag.status, 200);

    console.log('✅ Email SMTP/IMAP V1 Endpoints passed.');

    // ----------------------------------------------------
    // FILES / RAG KNOWLEDGE BASE V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing Files/RAG Knowledge Base V1 Endpoints...');

    // 1. POST /api/knowledge-bases (Criar Nova Base de Conhecimento)
    const resKbCreate = await fetch(`${baseUrl}/knowledge-bases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        name: 'Base de Teste Automatizado',
        description: 'Base de conhecimento de teste de integração RAG.'
      })
    });
    assert.strictEqual(resKbCreate.status, 200);
    const bodyKbCreate = await resKbCreate.json();
    const createdKbId = bodyKbCreate.data.id;

    // 2. POST /api/files/upload-url (Gerar URL de Upload)
    const resUploadUrl = await fetch(`${baseUrl}/files/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        knowledgeBaseId: createdKbId,
        filename: 'manual_teste.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 524288
      })
    });
    assert.strictEqual(resUploadUrl.status, 200);
    const bodyUploadUrl = await resUploadUrl.json();
    const createdFileId = bodyUploadUrl.data.fileId;

    // 3. POST /api/files/complete-upload (Finalizar Upload & Indexar)
    const resCompleteUpload = await fetch(`${baseUrl}/files/complete-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        knowledgeBaseId: createdKbId,
        fileId: createdFileId,
        filename: 'manual_teste.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 524288,
        textContent: 'Política de Teste RAG: Os testes de integração garantem que o sistema responda com 100% de precisão.'
      })
    });
    assert.strictEqual(resCompleteUpload.status, 200);
    const bodyCompleteUpload = await resCompleteUpload.json();
    assert.ok(bodyCompleteUpload.data.chunksGenerated >= 1);

    // 4. GET /api/files (Listar Arquivos)
    const resFiles = await fetch(`${baseUrl}/files?workspaceId=workspace_123&knowledgeBaseId=${createdKbId}`);
    assert.strictEqual(resFiles.status, 200);

    // 5. GET /api/files/:id (Obter Arquivo e Chunks)
    const resFileDetail = await fetch(`${baseUrl}/files/${createdFileId}`);
    assert.strictEqual(resFileDetail.status, 200);

    // 6. POST /api/retrieval/search (Busca Híbrida)
    const resRagSearch = await fetch(`${baseUrl}/retrieval/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        knowledgeBaseId: createdKbId,
        query: 'qual a política de teste?',
        topK: 3
      })
    });
    assert.strictEqual(resRagSearch.status, 200);
    const bodyRagSearch = await resRagSearch.json();
    assert.ok(bodyRagSearch.data.results.length >= 1);

    // 7. POST /api/retrieval/agent-context (Formatar Contexto RAG)
    const resAgentCtx = await fetch(`${baseUrl}/retrieval/agent-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        query: 'qual a política de teste?'
      })
    });
    assert.strictEqual(resAgentCtx.status, 200);
    const bodyAgentCtx = await resAgentCtx.json();
    assert.ok(bodyAgentCtx.data.contextText.includes('Fontes recuperadas'));

    // 8. GET /api/knowledge-bases/:id/stats (Estatísticas)
    const resKbStats = await fetch(`${baseUrl}/knowledge-bases/${createdKbId}/stats`);
    assert.strictEqual(resKbStats.status, 200);

    // 9. DELETE /api/files/:id (Remover Arquivo)
    const resFileDelete = await fetch(`${baseUrl}/files/${createdFileId}`, {
      method: 'DELETE'
    });
    assert.strictEqual(resFileDelete.status, 200);

    console.log('✅ Files/RAG Knowledge Base V1 Endpoints passed.');

    // ----------------------------------------------------
    // AGENT MEMORY SYSTEM V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing Agent Memory System V1 Endpoints...');

    // 1. POST /api/memories (Criar Memória Manual)
    const resMemCreate = await fetch(`${baseUrl}/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        scope: 'workspace',
        type: 'policy',
        title: 'Política de Teste de Integração',
        content: 'Toda mensagem de notificação de segurança exige confirmação por código SMS.',
        importance: 'critical',
        sensitivity: 'internal'
      })
    });
    assert.strictEqual(resMemCreate.status, 200);
    const bodyMemCreate = await resMemCreate.json();
    const createdMemId = bodyMemCreate.data.id;

    // 2. GET /api/memories (Listar Memórias)
    const resMemList = await fetch(`${baseUrl}/memories?workspaceId=workspace_123`);
    assert.strictEqual(resMemList.status, 200);

    // 3. GET /api/memories/:id (Obter Memória)
    const resMemDetail = await fetch(`${baseUrl}/memories/${createdMemId}`);
    assert.strictEqual(resMemDetail.status, 200);

    // 4. PATCH /api/memories/:id (Atualizar Memória)
    const resMemPatch = await fetch(`${baseUrl}/memories/${createdMemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        importance: 'high',
        title: 'Política de Teste Atualizada'
      })
    });
    assert.strictEqual(resMemPatch.status, 200);

    // 5. POST /api/memories/search (Busca em Memórias)
    const resMemSearch = await fetch(`${baseUrl}/memories/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        query: 'notificação de segurança'
      })
    });
    assert.strictEqual(resMemSearch.status, 200);

    // 6. POST /api/memories/:id/archive & restore (Arquivar e Restaurar)
    const resMemArchive = await fetch(`${baseUrl}/memories/${createdMemId}/archive`, { method: 'POST' });
    assert.strictEqual(resMemArchive.status, 200);

    const resMemRestore = await fetch(`${baseUrl}/memories/${createdMemId}/restore`, { method: 'POST' });
    assert.strictEqual(resMemRestore.status, 200);

    // 7. GET /api/memory-candidates (Listar Candidatos Pendentes)
    const resMemCands = await fetch(`${baseUrl}/memory-candidates?workspaceId=workspace_123`);
    assert.strictEqual(resMemCands.status, 200);
    const bodyMemCands = await resMemCands.json();
    assert.ok(bodyMemCands.data.candidates.length >= 1);
    const candId = bodyMemCands.data.candidates[0].id;

    // 8. POST /api/memory-candidates/:id/approve (Aprovar Candidato)
    const resCandApprove = await fetch(`${baseUrl}/memory-candidates/${candId}/approve`, { method: 'POST' });
    assert.strictEqual(resCandApprove.status, 200);

    // 9. POST /api/agents/:id/memory-context-test (Simular Contexto & Token Budget)
    const resMemContextTest = await fetch(`${baseUrl}/agents/agent_123/memory-context-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        query: 'qual a política do fundador?'
      })
    });
    assert.strictEqual(resMemContextTest.status, 200);
    const bodyMemCtxTest = await resMemContextTest.json();
    assert.ok(bodyMemCtxTest.data.formattedMemoryContextText.includes('Memórias e Contexto Operacional'));

    // 10. DELETE /api/memories/:id (Excluir Memória)
    const resMemDelete = await fetch(`${baseUrl}/memories/${createdMemId}`, { method: 'DELETE' });
    assert.strictEqual(resMemDelete.status, 200);

    console.log('✅ Agent Memory System V1 Endpoints passed.');

    // ----------------------------------------------------
    // SECURITY HARDENING V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing Security Hardening V1 Endpoints...');

    // 1. GET /api/security/events (Listar Eventos de Segurança)
    const resSecEvents = await fetch(`${baseUrl}/security/events?workspaceId=workspace_123`);
    assert.strictEqual(resSecEvents.status, 200);

    // 2. GET /api/security/dashboard (Dashboard de Segurança)
    const resSecDash = await fetch(`${baseUrl}/security/dashboard?workspaceId=workspace_123`);
    assert.strictEqual(resSecDash.status, 200);
    const bodySecDash = await resSecDash.json();
    assert.ok(bodySecDash.data.metrics.zeroSecretsEnforced === true);

    // 3. GET /api/security/policy-decisions (Listar Decisões de Política)
    const resPolicyDecs = await fetch(`${baseUrl}/security/policy-decisions?workspaceId=workspace_123`);
    assert.strictEqual(resPolicyDecs.status, 200);

    // 4. POST /api/security/test-policy (Simular Avaliação do PolicyEngine)
    const resTestPolicy = await fetch(`${baseUrl}/security/test-policy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        toolName: 'send_email',
        params: { recipient: 'teste@exemplo.com' }
      })
    });
    assert.strictEqual(resTestPolicy.status, 200);
    const bodyTestPolicy = await resTestPolicy.json();
    assert.strictEqual(bodyTestPolicy.data.evaluation.decision, 'require_approval');

    // 5. POST /api/security/report-incident (Registrar Incidente de Segurança)
    const resReportIncident = await fetch(`${baseUrl}/security/report-incident`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        eventType: 'security.suspicious_ip_attempt',
        severity: 'high',
        source: 'firewall_guard',
        details: 'Tentativa de acesso com IP não cadastrado.'
      })
    });
    assert.strictEqual(resReportIncident.status, 200);

    // 6. GET /api/security/checklist (Obter Checklist Mínimo de Produção)
    const resChecklist = await fetch(`${baseUrl}/security/checklist`);
    assert.strictEqual(resChecklist.status, 200);
    const bodyChecklist = await resChecklist.json();
    assert.strictEqual(bodyChecklist.data.totalItems, 20);

    // 7. POST /api/security/run-self-check (Executar Self-Check Completo de Produção)
    const resRunSelfCheck = await fetch(`${baseUrl}/security/run-self-check`, { method: 'POST' });
    assert.strictEqual(resRunSelfCheck.status, 200);
    const bodyRunSelfCheck = await resRunSelfCheck.json();
    assert.strictEqual(bodyRunSelfCheck.data.status, 'READY_FOR_PRODUCTION');

    console.log('✅ Security Hardening V1 Endpoints passed.');

    // ----------------------------------------------------
    // AGENT BUILDER / STUDIO V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing Agent Builder / Studio V1 Endpoints...');

    // 1. GET /api/agent-templates (Listar Templates Públicos)
    const resStudioTpls = await fetch(`${baseUrl}/agent-templates`);
    assert.strictEqual(resStudioTpls.status, 200);
    const bodyStudioTpls = await resStudioTpls.json();
    assert.ok(bodyStudioTpls.data.templates.length >= 6);

    // 2. POST /api/agent-templates/:id/create-agent (Criar Agente por Template)
    const resCreateFromTpl = await fetch(`${baseUrl}/agent-templates/tpl-atendimento/create-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        name: 'Agente de Atendimento Teste'
      })
    });
    assert.strictEqual(resCreateFromTpl.status, 200);
    const bodyCreateFromTpl = await resCreateFromTpl.json();
    const createdStudioAgId = bodyCreateFromTpl.data.id;

    // 3. POST /api/agents/:id/sandbox-run (Executar Teste em Sandbox)
    const resSandboxRun = await fetch(`${baseUrl}/agents/${createdStudioAgId}/sandbox-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        input: 'Qual o horário de atendimento?'
      })
    });
    assert.strictEqual(resSandboxRun.status, 200);
    const bodySandboxRun = await resSandboxRun.json();
    assert.strictEqual(bodySandboxRun.data.status, 'completed');

    // 4. POST /api/agents/:id/publish (Validar Checklist & Publicar)
    const resPublishStudioAg = await fetch(`${baseUrl}/agents/${createdStudioAgId}/publish`, { method: 'POST' });
    assert.strictEqual(resPublishStudioAg.status, 200);
    const bodyPublishStudioAg = await resPublishStudioAg.json();
    assert.strictEqual(bodyPublishStudioAg.data.agent.status, 'published');

    // 5. GET /api/agents/:id/versions (Listar Versões)
    const resVersionsList = await fetch(`${baseUrl}/agents/${createdStudioAgId}/versions`);
    assert.strictEqual(resVersionsList.status, 200);
    const bodyVersionsList = await resVersionsList.json();
    assert.ok(bodyVersionsList.data.versions.length >= 1);

    // 6. POST /api/agents/:id/duplicate (Duplicar Agente Seguramente)
    const resDuplicateAg = await fetch(`${baseUrl}/agents/${createdStudioAgId}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Agente de Atendimento Duplicado' })
    });
    assert.strictEqual(resDuplicateAg.status, 200);
    const bodyDuplicateAg = await resDuplicateAg.json();
    assert.strictEqual(bodyDuplicateAg.data.status, 'draft');

    // 7. POST /api/agents/:id/rollback (Rollback de Versão)
    const resRollbackAg = await fetch(`${baseUrl}/agents/${createdStudioAgId}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetVersion: 2 })
    });
    assert.strictEqual(resRollbackAg.status, 200);

    // 8. GET /api/agents/:id/metrics (Obter Métricas do Agente)
    const resMetricsAg = await fetch(`${baseUrl}/agents/${createdStudioAgId}/metrics`);
    assert.strictEqual(resMetricsAg.status, 200);

    console.log('✅ Agent Builder / Studio V1 Endpoints passed.');

    // ----------------------------------------------------
    // MAIN CHAT AGENT WORKSPACE V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing Main Chat / Agent Workspace V1 Endpoints...');

    // 1. GET /api/conversations (Listar Conversas do Workspace)
    const resConvsList = await fetch(`${baseUrl}/conversations?workspaceId=workspace_123`);
    assert.strictEqual(resConvsList.status, 200);

    // 2. POST /api/conversations (Criar Nova Conversa)
    const resCreateConv = await fetch(`${baseUrl}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        activeAgentId: 'agent_123',
        title: 'Conversa de Teste Chat Cockpit'
      })
    });
    assert.strictEqual(resCreateConv.status, 200);
    const bodyCreateConv = await resCreateConv.json();
    const createdConvId = bodyCreateConv.data.id;

    // 3. POST /api/conversations/:id/messages (Enviar Mensagem & Disparar AgentRun)
    const resPostChatMsg = await fetch(`${baseUrl}/conversations/${createdConvId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Enviar proposta comercial com 10% de desconto para o cliente Acme Corp.'
      })
    });
    assert.strictEqual(resPostChatMsg.status, 200);
    const bodyPostChatMsg = await resPostChatMsg.json();
    assert.ok(bodyPostChatMsg.data.events.length >= 2);
    const runIdCreated = bodyPostChatMsg.data.agentRun.id;

    // 4. GET /api/conversations/:id (Obter Detalhes da Conversa e Mensagens)
    const resGetConvDetail = await fetch(`${baseUrl}/conversations/${createdConvId}`);
    assert.strictEqual(resGetConvDetail.status, 200);
    const bodyGetConvDetail = await resGetConvDetail.json();
    assert.ok(bodyGetConvDetail.data.messages.length >= 2);

    // 5. POST /api/conversations/:id/switch-agent (Alternar Agente Ativo com Audit)
    const resSwitchAgConv = await fetch(`${baseUrl}/conversations/${createdConvId}/switch-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newAgentId: 'agent-atendimento-1' })
    });
    assert.strictEqual(resSwitchAgConv.status, 200);

    // 6. GET /api/agent-runs/:id/events (Timeline de Eventos do AgentRun)
    const resRunEvtsList = await fetch(`${baseUrl}/agent-runs/${runIdCreated}/events`);
    assert.strictEqual(resRunEvtsList.status, 200);

    // 7. POST /api/agent-runs/:id/cancel (Cancelar AgentRun)
    const resCancelAgRun = await fetch(`${baseUrl}/agent-runs/${runIdCreated}/cancel`, { method: 'POST' });
    assert.strictEqual(resCancelAgRun.status, 200);

    // 8. POST /api/conversations/:id/create-task (Transformar Conversa em Tarefa)
    const resConvTaskCreate = await fetch(`${baseUrl}/conversations/${createdConvId}/create-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskTitle: 'Acompanhar envio de proposta Acme Corp' })
    });
    assert.strictEqual(resConvTaskCreate.status, 200);

    // 9. POST /api/conversations/:id/resolve (Marcar como Resolvida)
    const resResolveConv = await fetch(`${baseUrl}/conversations/${createdConvId}/resolve`, { method: 'POST' });
    assert.strictEqual(resResolveConv.status, 200);

    console.log('✅ Main Chat / Agent Workspace V1 Endpoints passed.');

    // ----------------------------------------------------
    // EXECUTIVE DASHBOARD, METRICS & REPORTS V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing Executive Dashboard, Metrics & Reports V1 Endpoints...');

    // 1. GET /api/dashboard/overview (Visão Geral Executiva & Health Score)
    const resDashOverview = await fetch(`${baseUrl}/dashboard/overview?workspaceId=workspace_123&periodDays=30`);
    assert.strictEqual(resDashOverview.status, 200);
    const bodyDashOverview = await resDashOverview.json();
    assert.ok(bodyDashOverview.data.overview.healthScore >= 90);
    assert.ok(bodyDashOverview.data.overview.topCards.tasksCompleted >= 40);

    // 2. GET /api/dashboard/agents (Desempenho por Agente)
    const resDashAgents = await fetch(`${baseUrl}/dashboard/agents?workspaceId=workspace_123`);
    assert.strictEqual(resDashAgents.status, 200);
    const bodyDashAgents = await resDashAgents.json();
    assert.ok(bodyDashAgents.data.agents.length >= 1);

    // 3. GET /api/dashboard/credits (Consumo de Créditos e Projeção)
    const resDashCredits = await fetch(`${baseUrl}/dashboard/credits?workspaceId=workspace_123`);
    assert.strictEqual(resDashCredits.status, 200);

    // 4. GET /api/dashboard/tasks (Métricas de Tarefas)
    const resDashTasks = await fetch(`${baseUrl}/dashboard/tasks?workspaceId=workspace_123`);
    assert.strictEqual(resDashTasks.status, 200);

    // 5. GET /api/dashboard/integrations (Saúde de Canais)
    const resDashIntegrations = await fetch(`${baseUrl}/dashboard/integrations?workspaceId=workspace_123`);
    assert.strictEqual(resDashIntegrations.status, 200);

    // 6. POST /api/reports/export (Solicitar Exportação de Relatório Executivo)
    const resReportExportJob = await fetch(`${baseUrl}/reports/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        reportType: 'executive_weekly',
        format: 'pdf'
      })
    });
    assert.strictEqual(resReportExportJob.status, 200);
    const bodyReportExportJob = await resReportExportJob.json();
    const createdReportId = bodyReportExportJob.data.reportId;

    // 7. GET /api/reports/:id (Download / Status do Relatório)
    const resGetReportStatus = await fetch(`${baseUrl}/reports/${createdReportId}`);
    assert.strictEqual(resGetReportStatus.status, 200);
    const bodyGetReportStatus = await resGetReportStatus.json();
    assert.strictEqual(bodyGetReportStatus.data.status, 'completed');

    console.log('✅ Executive Dashboard, Metrics & Reports V1 Endpoints passed.');

    // ----------------------------------------------------
    // BILLING, SUBSCRIPTIONS & STRIPE CHECKOUT V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing Billing, Subscriptions & Stripe Checkout V1 Endpoints...');

    // 1. GET /api/billing/plans (Listar Planos Comerciais)
    const resGetBillingPlans = await fetch(`${baseUrl}/billing/plans`);
    assert.strictEqual(resGetBillingPlans.status, 200);
    const bodyGetBillingPlans = await resGetBillingPlans.json();
    const plansList = bodyGetBillingPlans.data.plans || bodyGetBillingPlans.data;
    assert.ok(plansList.length >= 7);

    // 2. GET /api/billing/subscription (Obter Assinatura do Workspace)
    const resGetWorkspaceSub = await fetch(`${baseUrl}/billing/subscription?workspaceId=workspace_123`);
    assert.strictEqual(resGetWorkspaceSub.status, 200);
    const bodyGetWorkspaceSub = await resGetWorkspaceSub.json();
    assert.strictEqual(bodyGetWorkspaceSub.data.subscription.planCode, 'pro');

    // 3. POST /api/billing/checkout (Criar Sessão Stripe Checkout)
    const resCreateCheckoutSess = await fetch(`${baseUrl}/billing/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'workspace_123',
        planCode: 'max_5x'
      })
    });
    assert.strictEqual(resCreateCheckoutSess.status, 200);
    const bodyCreateCheckoutSess = await resCreateCheckoutSess.json();
    assert.ok(bodyCreateCheckoutSess.data.checkoutUrl.includes('stripe.com'));

    // 4. POST /api/billing/portal (Criar Sessão do Stripe Billing Portal)
    const resCreateBillingPortal = await fetch(`${baseUrl}/billing/portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123' })
    });
    assert.strictEqual(resCreateBillingPortal.status, 200);

    // 5. POST /api/billing/change-plan (Alterar Plano - Upgrade/Downgrade)
    const resChangePlanAction = await fetch(`${baseUrl}/billing/change-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', targetPlanCode: 'max_5x' })
    });
    assert.strictEqual(resChangePlanAction.status, 200);
    const bodyChangePlanAction = await resChangePlanAction.json();
    assert.strictEqual(bodyChangePlanAction.data.subscription.planCode, 'max_5x');

    // 6. POST /api/billing/cancel (Agendar Cancelamento)
    const resCancelSubscription = await fetch(`${baseUrl}/billing/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', reason: 'Fim do projeto' })
    });
    assert.strictEqual(resCancelSubscription.status, 200);

    // 7. POST /api/stripe/webhook (Processar Webhook Stripe Idempotente)
    const resStripeWebhookHit = await fetch(`${baseUrl}/stripe/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=123,v1=test_sig' },
      body: JSON.stringify({
        id: 'evt_stripe_test_101',
        type: 'checkout.session.completed',
        workspace_id: 'workspace_123',
        plan_code: 'max_20x'
      })
    });
    assert.strictEqual(resStripeWebhookHit.status, 200);

    console.log('✅ Billing, Subscriptions & Stripe Checkout V1 Endpoints passed.');

    // ----------------------------------------------------
    // WORKSPACE, TEAM & SETTINGS V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing Workspace, Team & Settings V1 Endpoints...');

    // 1. GET /api/workspaces (Listar Workspaces)
    const resGetWorkspacesList = await fetch(`${baseUrl}/workspaces`);
    assert.strictEqual(resGetWorkspacesList.status, 200);
    const bodyGetWorkspacesList = await resGetWorkspacesList.json();
    assert.ok(bodyGetWorkspacesList.data.workspaces.length >= 1);

    // 2. POST /api/workspaces (Criar Workspace)
    const resCreateWorkspaceNew = await fetch(`${baseUrl}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Workspace Teste Integrado', type: 'business' })
    });
    assert.strictEqual(resCreateWorkspaceNew.status, 200);
    const bodyCreateWorkspaceNew = await resCreateWorkspaceNew.json();
    const newWsId = bodyCreateWorkspaceNew.data.workspace.id;

    // 3. GET /api/workspaces/:id (Detalhe do Workspace)
    const resGetWsDetail = await fetch(`${baseUrl}/workspaces/${newWsId}`);
    assert.strictEqual(resGetWsDetail.status, 200);

    // 4. POST /api/workspaces/:id/switch (Alternar Workspace)
    const resSwitchWsAction = await fetch(`${baseUrl}/workspaces/${newWsId}/switch`, { method: 'POST' });
    assert.strictEqual(resSwitchWsAction.status, 200);

    // 5. GET /api/workspaces/:id/members (Listar Membros)
    const resGetWsMembers = await fetch(`${baseUrl}/workspaces/${newWsId}/members`);
    assert.strictEqual(resGetWsMembers.status, 200);

    // 6. POST /api/workspaces/:id/invites (Criar Convite por E-mail)
    const resCreateInviteAction = await fetch(`${baseUrl}/workspaces/${newWsId}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'membro.teste@lyriq.com', roleCode: 'member' })
    });
    assert.strictEqual(resCreateInviteAction.status, 200);
    const bodyCreateInviteAction = await resCreateInviteAction.json();
    const rawInviteToken = bodyCreateInviteAction.data.rawToken;

    // 7. POST /api/invites/accept (Aceitar Convite com Token)
    const resAcceptInviteAction = await fetch(`${baseUrl}/invites/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawToken: rawInviteToken, userId: 'usr_new_test_101' })
    });
    assert.strictEqual(resAcceptInviteAction.status, 200);

    // 8. GET & PATCH /api/workspaces/:id/settings (Configurações & COMPANY.md)
    const resGetWsSettings = await fetch(`${baseUrl}/workspaces/${newWsId}/settings`);
    assert.strictEqual(resGetWsSettings.status, 200);

    const resPatchWsSettings = await fetch(`${baseUrl}/workspaces/${newWsId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandContext: { companyName: 'Empresa Teste Corp', description: 'Soluções de Inteligência Artificial' }
      })
    });
    assert.strictEqual(resPatchWsSettings.status, 200);
    const bodyPatchWsSettings = await resPatchWsSettings.json();
    assert.ok(bodyPatchWsSettings.data.generatedContextFiles['COMPANY.md'].includes('Empresa Teste Corp'));

    // 9. POST /api/workspaces/:id/export (Exportação de Dados ZIP)
    const resExportWsData = await fetch(`${baseUrl}/workspaces/${newWsId}/export`, { method: 'POST' });
    assert.strictEqual(resExportWsData.status, 200);

    console.log('✅ Workspace, Team & Settings V1 Endpoints passed.');

    // ----------------------------------------------------
    // TOOLS, FERRAMENTAS E NAVEGAÇÃO WEB COM DUCKDUCKGO V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing Tools, Ferramentas e Navegação Web com DuckDuckGo V1 Endpoints...');

    // 1. GET /api/tools (Listar Ferramentas do Registry)
    const resGetToolsList = await fetch(`${baseUrl}/tools`);
    assert.strictEqual(resGetToolsList.status, 200);
    const bodyGetToolsList = await resGetToolsList.json();
    assert.ok(bodyGetToolsList.data.tools.length >= 3);

    // 2. PATCH /api/workspace/tools/:toolName (Configurar Tool no Workspace)
    const resPatchWsTool = await fetch(`${baseUrl}/workspace/tools/web_search_duckduckgo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', enabled: true })
    });
    assert.strictEqual(resPatchWsTool.status, 200);

    // 3. PATCH /api/agents/:agentId/tools/:toolName (Configurar Tool no Agente)
    const resPatchAgentTool = await fetch(`${baseUrl}/agents/agent_123/tools/web_search_duckduckgo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', enabled: true })
    });
    assert.strictEqual(resPatchAgentTool.status, 200);

    // 4. POST /api/web/search (Busca Web Gratuitas via DuckDuckGo)
    const resWebSearchAction = await fetch(`${baseUrl}/web/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Melhores ferramentas de IA para pequenas empresas 2026' })
    });
    assert.strictEqual(resWebSearchAction.status, 200);
    const bodyWebSearchAction = await resWebSearchAction.json();
    assert.ok(bodyWebSearchAction.data.results.length >= 1);

    // 5. POST /api/web/fetch (Leitura Segura de Página Pública)
    const resWebFetchAction = await fetch(`${baseUrl}/web/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://exemplo.com/artigo-publico' })
    });
    assert.strictEqual(resWebFetchAction.status, 200);
    const bodyWebFetchAction = await resWebFetchAction.json();
    assert.strictEqual(bodyWebFetchAction.data.untrustedContent, true);

    // 6. POST /api/web/fetch (Teste de Bloqueio de Segurança SSRF)
    const resSsrfBlockAction = await fetch(`${baseUrl}/web/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1/admin' })
    });
    assert.strictEqual(resSsrfBlockAction.status, 400);

    console.log('✅ Tools, Ferramentas e Navegação Web com DuckDuckGo V1 Endpoints passed.');

    // ----------------------------------------------------
    // STORAGE, LIMITES DE BACKEND E ADD-ONS V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing Storage, Limites de Backend e Add-ons V1 Endpoints...');

    // 1. GET /api/storage/usage (Resumo de Uso e Limites Efetivos)
    const resGetStorageUsage = await fetch(`${baseUrl}/storage/usage?workspaceId=workspace_123`);
    assert.strictEqual(resGetStorageUsage.status, 200);
    const bodyGetStorageUsage = await resGetStorageUsage.json();
    assert.ok(bodyGetStorageUsage.data.effectiveLimits.effectiveStorageBytes > 0);

    // 2. GET /api/storage/top-files (Maiores Consumidores)
    const resGetTopFiles = await fetch(`${baseUrl}/storage/top-files?workspaceId=workspace_123`);
    assert.strictEqual(resGetTopFiles.status, 200);

    // 3. POST /api/storage/recalculate (Recalcular Uso)
    const resRecalculateStorage = await fetch(`${baseUrl}/storage/recalculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123' })
    });
    assert.strictEqual(resRecalculateStorage.status, 200);

    // 4. GET /api/billing/addons (Catálogo de Add-ons)
    const resGetAddonsList = await fetch(`${baseUrl}/billing/addons`);
    assert.strictEqual(resGetAddonsList.status, 200);
    const bodyGetAddonsList = await resGetAddonsList.json();
    assert.ok(bodyGetAddonsList.data.addons.length >= 3);

    // 5. POST /api/billing/addons/checkout (Comprar Add-on via Stripe)
    const resAddonCheckoutAction = await fetch(`${baseUrl}/billing/addons/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', addonCode: 'storage_extra_1gb', quantity: 1 })
    });
    assert.strictEqual(resAddonCheckoutAction.status, 200);
    const bodyAddonCheckoutAction = await resAddonCheckoutAction.json();
    assert.ok(bodyAddonCheckoutAction.data.checkoutUrl.includes('workspace=workspace_123'));

    // 6. POST /api/billing/addons/cancel (Cancelar Add-on)
    const resAddonCancelAction = await fetch(`${baseUrl}/billing/addons/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', addonCode: 'storage_extra_1gb' })
    });
    assert.strictEqual(resAddonCancelAction.status, 200);

    console.log('✅ Storage, Limites de Backend e Add-ons V1 Endpoints passed.');

    // ----------------------------------------------------
    // CYBERSEGURANÇA, ANTI-ABUSO E PROTEÇÃO DE DADOS V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing Cybersecurity, Anti-Abuse & Data Protection V1 Endpoints...');

    // 1. GET /api/security/abuse-signals (Listar Sinais de Abuso e Risk Score)
    const resGetAbuseSignals = await fetch(`${baseUrl}/security/abuse-signals?workspaceId=workspace_123`);
    assert.strictEqual(resGetAbuseSignals.status, 200);
    const bodyGetAbuseSignals = await resGetAbuseSignals.json();
    assert.ok(bodyGetAbuseSignals.data.riskScore.score >= 0);

    // 2. POST /api/security/workspace/pause (Pausar/Suspender Workspace)
    const resPauseWsAction = await fetch(`${baseUrl}/security/workspace/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', paused: true, reason: 'Teste emergencial de segurança' })
    });
    assert.strictEqual(resPauseWsAction.status, 200);

    // Unpause workspace to maintain normal state
    await fetch(`${baseUrl}/security/workspace/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'workspace_123', paused: false, reason: 'Restaurar status ativo' })
    });

    // 3. POST /api/admin/break-glass/request (Solicitar Acesso Emergencial Break-Glass)
    const resBreakGlassReq = await fetch(`${baseUrl}/admin/break-glass/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUserId: 'usr_owner_1', workspaceId: 'workspace_123', reason: 'Investigação de incidente no conector' })
    });
    assert.strictEqual(resBreakGlassReq.status, 200);
    const bodyBreakGlassReq = await resBreakGlassReq.json();
    const newBgSessionId = bodyBreakGlassReq.data.session.id;

    // 4. POST /api/admin/break-glass/revoke (Encerrar Sessão Break-Glass)
    const resBreakGlassRevoke = await fetch(`${baseUrl}/admin/break-glass/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: newBgSessionId })
    });
    assert.strictEqual(resBreakGlassRevoke.status, 200);

    // 5. POST /api/security/redact (Testador de Mascaramento Zero-Secrets)
    const resRedactTest = await fetch(`${baseUrl}/security/redact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Chave secreta sk-proj-1234567890abcdef no log.' })
    });
    assert.strictEqual(resRedactTest.status, 200);
    const bodyRedactTest = await resRedactTest.json();
    assert.ok(bodyRedactTest.data.redactedText.includes('sk-proj-***redacted***'));

    console.log('✅ Cybersecurity, Anti-Abuse & Data Protection V1 Endpoints passed.');

    // ----------------------------------------------------
    // CONSOLIDAÇÃO ARQUITETURAL E ESPECIFICAÇÃO FINAL V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing Consolidated Architecture & Final Spec V1 Endpoints...');

    // 1. GET /api/v1/system/architecture (Resumo Executivo da Arquitetura do Produto)
    const resGetArchOverview = await fetch(`${baseUrl}/v1/system/architecture`);
    assert.strictEqual(resGetArchOverview.status, 200);
    const bodyGetArchOverview = await resGetArchOverview.json();
    assert.strictEqual(bodyGetArchOverview.data.productName, 'Lyriq Agents OS V1');
    assert.strictEqual(bodyGetArchOverview.data.byokFirst, true);

    // 2. GET /api/v1/system/schema-consolidated (Catálogo Consolidado de 40+ Tabelas)
    const resGetSchemaCatalog = await fetch(`${baseUrl}/v1/system/schema-consolidated`);
    assert.strictEqual(resGetSchemaCatalog.status, 200);
    const bodyGetSchemaCatalog = await resGetSchemaCatalog.json();
    assert.ok(bodyGetSchemaCatalog.data.count >= 40);

    // 3. GET /api/v1/system/sprint-plan (Plano de Sprints 0 a 7 e Gates de Segurança)
    const resGetSprintPlan = await fetch(`${baseUrl}/v1/system/sprint-plan`);
    assert.strictEqual(resGetSprintPlan.status, 200);
    const bodyGetSprintPlan = await resGetSprintPlan.json();
    assert.strictEqual(bodyGetSprintPlan.data.count, 8);

    // 4. GET /api/v1/system/master-prompt (Gerador do Prompt Master Consolidado)
    const resGetMasterPrompt = await fetch(`${baseUrl}/v1/system/master-prompt`);
    assert.strictEqual(resGetMasterPrompt.status, 200);
    const bodyGetMasterPrompt = await resGetMasterPrompt.json();
    assert.ok(bodyGetMasterPrompt.data.prompt.includes('Lyriq Agents OS'));

    console.log('✅ Consolidated Architecture & Final Spec V1 Endpoints passed.');

    // ----------------------------------------------------
    // QA REPORT & CONFIABILIDADE ANTIGRAVITY V1 INTEGRATION TESTS
    // ----------------------------------------------------
    console.log('Testing QA Report & Confiability Antigravity V1 Endpoints...');

    // 1. GET /api/v1/system/qa-report (Relatório Oficial de QA do Antigravity)
    const resGetQAReport = await fetch(`${baseUrl}/v1/system/qa-report`);
    assert.strictEqual(resGetQAReport.status, 200);
    const bodyGetQAReport = await resGetQAReport.json();
    assert.strictEqual(bodyGetQAReport.data.summary.status, 'PASS');
    assert.ok(bodyGetQAReport.data.testCases.length >= 70);

    console.log('✅ QA Report & Confiability Antigravity V1 Endpoints passed.');

    console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
    serverProcess.kill();
    process.exit(0);
  } catch (err) {
    console.error('❌ INTEGRATION TEST FAILED:', err);
    serverProcess.kill();
    process.exit(1);
  }
}, 1500);
