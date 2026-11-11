import { useEffect, useMemo, useState } from 'react';
import { Bot, ChevronRight, CirclePlay, Clock3, Copy, GitBranch, Plus, Save, ShieldCheck, Trash2, Zap } from 'lucide-react';
import './AutomationWorkspace.css';

type Agent = { id: string; name: string; role: string; model_id?: string };
type AgentStep = { id: string; type: 'agent_task'; agentId: string; instruction: string };
type ConditionStep = { id: string; type: 'condition'; contains: string; onFalse: 'stop' | 'skip_next' };
type Step = AgentStep | ConditionStep;
type Trigger = { type: 'manual' | 'webhook' | 'interval'; minutes?: number };
type Flow = { id: string; kind: string; name: string; description: string; status: string; trigger: Trigger; steps: Step[]; nextRunAt?: string | null };
type RunStep = { stepId: string; type?: string; agentName?: string; output: string; skipped?: boolean; matched?: boolean };
type Run = { id: string; status: string; source?: string; input?: string; startedAt: string; error?: string; steps?: RunStep[] };
const agentStep = (agentId = ''): AgentStep => ({ id: crypto.randomUUID(), type: 'agent_task', agentId, instruction: '' });
const conditionStep = (): ConditionStep => ({ id: crypto.randomUUID(), type: 'condition', contains: '', onFalse: 'stop' });
const tokenKey = (id: string) => `agent-center-hook-token-${id}`;

export default function AutomationWorkspace() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Flow | null>(null);
  const [selectedStep, setSelectedStep] = useState(0);
  const [runs, setRuns] = useState<Run[]>([]);
  const [hookToken, setHookToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [testInput, setTestInput] = useState('');
  const savedFlow = useMemo(() => flows.find(flow => flow.id === draft?.id), [flows, draft?.id]);
  const changed = !!draft?.id && JSON.stringify({ name: draft.name, description: draft.description, trigger: draft.trigger, steps: draft.steps }) !== JSON.stringify({ name: savedFlow?.name, description: savedFlow?.description, trigger: savedFlow?.trigger, steps: savedFlow?.steps });

  useEffect(() => {
    Promise.all([fetch('/api/agents').then(r => r.json()), fetch('/api/automations?workspaceId=workspace_123').then(r => r.json())])
      .then(([agentsResult, flowsResult]) => {
        setAgents(Array.isArray(agentsResult.data) ? agentsResult.data : []);
        const items = Array.isArray(flowsResult.data) ? flowsResult.data.filter((flow: Flow) => flow.kind === 'agent_flow') : [];
        setFlows(items);
        if (items[0]) setSelectedId(items[0].id);
      }).catch(() => setError('Não foi possível carregar as automações. Atualize a página.'));
  }, []);
  useEffect(() => {
    const selected = flows.find(flow => flow.id === selectedId);
    if (selected) {
      setDraft({ ...selected, steps: selected.steps.map(step => ({ ...step })) });
      setSelectedStep(0);
      setHookToken(localStorage.getItem(tokenKey(selected.id)) || '');
      fetch(`/api/automations/${selected.id}/runs`).then(r => r.json()).then(result => setRuns(Array.isArray(result.data) ? result.data : [])).catch(() => setRuns([]));
    }
  }, [selectedId, flows]);

  const start = () => {
    setSelectedId(null); setRuns([]); setHookToken(''); setError(''); setNotice(''); setSelectedStep(0);
    setDraft({ id: '', kind: 'agent_flow', name: '', description: '', status: 'draft', trigger: { type: 'manual' }, steps: [agentStep(agents[0]?.id)] });
  };
  const update = (change: Partial<Flow>) => setDraft(previous => previous ? { ...previous, ...change } : previous);
  const updateStep = (change: Partial<AgentStep> | Partial<ConditionStep>) => setDraft(previous => previous ? {
    ...previous, steps: previous.steps.map((step, index) => index === selectedStep ? { ...step, ...change } as Step : step)
  } : previous);

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim() || draft.steps.some(step => step.type === 'agent_task' ? !step.agentId || step.instruction.trim().length < 10 : !step.contains.trim())) {
      setError('Preencha o nome e a configuração de cada etapa. Instruções dos agentes precisam de pelo menos 10 caracteres.'); return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      const creating = !draft.id;
      const response = await fetch(creating ? '/api/automations' : `/api/automations/${draft.id}`, {
        method: creating ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'workspace_123', kind: 'agent_flow', name: draft.name, description: draft.description, trigger: draft.trigger, steps: draft.steps })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error?.message || 'Não foi possível salvar o fluxo.');
      if (result.data.webhookToken) {
        localStorage.setItem(tokenKey(result.data.id), result.data.webhookToken);
        setHookToken(result.data.webhookToken);
      }
      setFlows(previous => creating ? [...previous, result.data] : previous.map(flow => flow.id === draft.id ? result.data : flow));
      setSelectedId(result.data.id);
      setNotice('Fluxo salvo. Execute agora ou ative o gatilho configurado.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o fluxo.'); }
    finally { setBusy(false); }
  };
  const setActive = async () => {
    if (!draft?.id || changed) { setError('Salve o fluxo antes de alterar o estado.'); return; }
    setBusy(true); setError('');
    try {
      const nextStatus = draft.status === 'active' ? 'paused' : 'active';
      const response = await fetch(`/api/automations/${draft.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error?.message || 'Não foi possível atualizar o fluxo.');
      setFlows(previous => previous.map(flow => flow.id === draft.id ? result.data : flow));
      setNotice(nextStatus === 'active' ? 'Gatilho ativado. Execuções agendadas podem usar sua API de IA.' : 'Gatilho pausado.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o fluxo.'); }
    finally { setBusy(false); }
  };
  const run = async () => {
    if (!draft?.id || changed) { setError('Salve as alterações antes de executar.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/automations/${draft.id}/trigger`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: testInput }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error?.message || 'Não foi possível executar o fluxo.');
      setRuns(previous => [result.data.run, ...previous]);
      setNotice(result.data.run.status === 'completed' ? 'Execução concluída. Veja a saída abaixo.' : 'Execução interrompida. Veja o histórico abaixo.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível executar o fluxo.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!draft?.id || !window.confirm(`Excluir a automação "${draft.name}"?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/automations/${draft.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Não foi possível excluir o fluxo.');
      localStorage.removeItem(tokenKey(draft.id));
      setFlows(previous => previous.filter(flow => flow.id !== draft.id)); setSelectedId(null); setDraft(null); setRuns([]); setHookToken('');
      setNotice('Fluxo excluído.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível excluir o fluxo.'); }
    finally { setBusy(false); }
  };
  const rotateToken = async () => {
    if (!draft?.id || draft.trigger.type !== 'webhook' || changed) return;
    if (!window.confirm('Gerar um novo token? O token anterior deixará de funcionar.')) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/automations/${draft.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trigger: draft.trigger, rotateWebhookToken: true }) });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.data.webhookToken) throw new Error('Não foi possível renovar o token.');
      localStorage.setItem(tokenKey(draft.id), result.data.webhookToken);
      setHookToken(result.data.webhookToken); setNotice('Token renovado. Atualize a integração que chama este webhook.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível renovar o token.'); }
    finally { setBusy(false); }
  };

  const step = draft?.steps[selectedStep];
  const triggerLabel = draft?.trigger.type === 'interval' ? `A cada ${draft.trigger.minutes || 30} min` : draft?.trigger.type === 'webhook' ? 'Webhook' : 'Manual';
  return <div className="automation-workspace">
    <header className="auto-header"><div><h1><GitBranch size={31}/> Automações</h1><p>Crie fluxos, conecte seus agentes e acompanhe cada execução.</p></div><button onClick={start} className="auto-primary"><Plus size={16}/> Nova automação</button></header>
    <div className="auto-shell"><aside className="auto-sidebar"><div className="auto-sidebar-title"><strong>Fluxos</strong><span>{flows.length}</span></div>
      {flows.map(flow => <button className={`auto-flow-link ${selectedId === flow.id ? 'selected' : ''}`} key={flow.id} onClick={() => { setSelectedId(flow.id); setError(''); setNotice(''); }}><GitBranch size={17}/><span><strong>{flow.name}</strong><small>{flow.steps.length} {flow.steps.length === 1 ? 'etapa' : 'etapas'} · {flow.trigger.type === 'interval' ? 'Agendado' : flow.trigger.type === 'webhook' ? 'Webhook' : 'Manual'} · {flow.trigger.type === 'manual' ? 'Pronto' : flow.status === 'active' ? 'Ativo' : 'Pausado'}</small></span><ChevronRight size={14}/></button>)}
      {flows.length === 0 && <p className="auto-sidebar-empty">Nenhum fluxo salvo ainda.</p>}
      <p className="auto-sidebar-note">Agendamentos e webhooks só rodam depois que você ativa o fluxo. Cada etapa usa o modelo do agente selecionado.</p>
    </aside><main className="auto-main">{draft ? <>
      <div className="auto-toolbar"><div><h2>{draft.name || 'Novo fluxo'} <span className={`auto-toolbar-state ${draft.status === 'active' ? 'active' : ''}`}>{draft.trigger.type === 'manual' ? 'Manual' : draft.status === 'active' ? 'Ativo' : 'Pausado'}</span></h2><p>{triggerLabel} → agentes e condições → resultado</p></div><div className="auto-toolbar-actions">
        {draft.id && <button className="auto-delete" title="Excluir fluxo" aria-label="Excluir fluxo" onClick={remove}><Trash2 size={17}/></button>}
        <button className="auto-secondary" disabled={busy} onClick={save}><Save size={15}/> Salvar</button>
        {draft.id && draft.trigger.type !== 'manual' && <button className="auto-secondary" disabled={busy || changed} onClick={setActive}>{draft.status === 'active' ? 'Pausar gatilho' : 'Ativar gatilho'}</button>}
        <button className="auto-primary" disabled={busy || !draft.id || changed} onClick={run}><CirclePlay size={16}/>{busy ? 'Aguarde...' : 'Executar agora'}</button>
      </div></div><div className="auto-body">
        <div className="auto-messages">{error && <p className="auto-error" role="alert">{error}</p>}{notice && <p className="auto-notice" role="status">{notice}</p>}</div>
        <div className="auto-flow-canvas" aria-label="Fluxo da automação"><div className="auto-node trigger"><span><Zap size={19}/></span><div><strong>{triggerLabel}</strong><small>Gatilho do fluxo</small></div></div>
          {draft.steps.map((item, index) => <div className="auto-node-wrap" key={item.id}><div className="auto-connector"/><button className={`auto-node agent ${selectedStep === index ? 'selected' : ''}`} onClick={() => setSelectedStep(index)}><span>{item.type === 'condition' ? <GitBranch size={20}/> : <Bot size={20}/>}</span><div><strong>{item.type === 'condition' ? 'Condição' : agents.find(agent => agent.id === item.agentId)?.name || 'Escolha um agente'}</strong><small>Etapa {index + 1} · {item.type === 'condition' ? 'Decisão' : 'Agente'}</small></div></button></div>)}
          <div className="auto-node-wrap"><div className="auto-connector"/><div className="auto-node output"><span><GitBranch size={19}/></span><div><strong>Resultado</strong><small>Saída registrada no histórico</small></div></div></div>
        </div>
        <p className="auto-canvas-hint">Deslize para acompanhar todas as etapas do fluxo.</p>
        <div className="auto-flow-status" role="status"><span className={`auto-status-dot ${runs[0]?.status === 'failed' ? 'failed' : runs[0]?.status === 'completed' ? 'completed' : ''}`}/><span>{runs[0] ? `Última execução: ${runs[0].status === 'completed' ? 'concluída' : runs[0].status === 'stopped' ? 'parada pela condição' : 'falhou'}` : 'Ainda sem execuções'}</span>{runs[0] && <time>{new Date(runs[0].startedAt).toLocaleString('pt-BR')}</time>}</div>
        <div className="auto-add-actions"><button className="auto-add-step" disabled={draft.steps.length >= 8} onClick={() => { setSelectedStep(draft.steps.length); update({ steps: [...draft.steps, agentStep(agents[0]?.id)] }); }}><Plus size={15}/> Adicionar agente</button><button className="auto-add-step" disabled={draft.steps.length >= 8} onClick={() => { setSelectedStep(draft.steps.length); update({ steps: [...draft.steps, conditionStep()] }); }}><Plus size={15}/> Adicionar condição</button></div>
        <div className="auto-editor"><section><h3>Configuração do fluxo</h3><label>Nome<input value={draft.name} onChange={event => update({ name: event.target.value })} placeholder="Ex.: Revisar solicitações"/></label><label>Descrição<input value={draft.description} onChange={event => update({ description: event.target.value })} placeholder="O que este fluxo faz?"/></label><label>Gatilho<select value={draft.trigger.type} onChange={event => update({ trigger: event.target.value === 'interval' ? { type: 'interval', minutes: 30 } : { type: event.target.value as 'manual' | 'webhook' } })}><option value="manual">Manual</option><option value="interval">Agendado</option><option value="webhook">Webhook</option></select></label>
          {draft.trigger.type === 'interval' && <><label>Intervalo em minutos<input type="number" min="5" max="1440" value={draft.trigger.minutes || 30} onChange={event => update({ trigger: { type: 'interval', minutes: Number(event.target.value) } })}/></label><div className="auto-trigger-info"><Clock3 size={16}/><span>{draft.status === 'active' && draft.nextRunAt ? `Próxima execução: ${new Date(draft.nextRunAt).toLocaleString('pt-BR')}` : 'Salve e ative o gatilho para agendar. O servidor precisa estar ligado.'}</span></div></>}
          {draft.trigger.type === 'webhook' && draft.id && <div className="auto-hook"><p>Envie um POST para:</p><code>{`${window.location.origin}/api/automation-hooks/${draft.id}`}</code><p>Com o cabeçalho <code>x-agent-center-hook-token</code>:</p><div className="auto-hook-token"><input aria-label="Token do webhook" type="password" readOnly value={hookToken} placeholder="Renove o token neste navegador"/><button title="Copiar token" aria-label="Copiar token" disabled={!hookToken} onClick={() => navigator.clipboard.writeText(hookToken)}><Copy size={15}/></button></div><button className="auto-link" onClick={rotateToken}>Gerar novo token</button><p>Ative o fluxo antes de receber chamadas. Guarde o token na integração que envia o webhook.</p></div>}
          {draft.trigger.type === 'manual' && <div className="auto-trigger-info"><Clock3 size={16}/><span>Este fluxo executa apenas quando você clicar em “Executar agora”.</span></div>}
        </section><section><div className="auto-editor-heading"><h3>Etapa {selectedStep + 1}: {step?.type === 'condition' ? 'condição' : 'agente'}</h3>{draft.steps.length > 1 && <button onClick={() => { update({ steps: draft.steps.filter((_, index) => index !== selectedStep) }); setSelectedStep(Math.max(0, selectedStep - 1)); }}>Remover etapa</button>}</div>
          {step?.type === 'agent_task' && <><label>Agente<select value={step.agentId} onChange={event => updateStep({ agentId: event.target.value })}><option value="">Escolha um agente</option>{agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}{agent.model_id ? '' : ' · sem modelo'}</option>)}</select></label><label>Instrução<textarea rows={5} value={step.instruction} onChange={event => updateStep({ instruction: event.target.value })} placeholder="Descreva a tarefa que este agente deve executar."/></label><p className="auto-help">A resposta desta etapa segue como contexto para a próxima.</p></>}
          {step?.type === 'condition' && <><label>Continuar se a resposta contiver<input value={step.contains} onChange={event => updateStep({ contains: event.target.value })} placeholder="Ex.: aprovado"/></label><label>Se não contiver<select value={step.onFalse} onChange={event => updateStep({ onFalse: event.target.value as 'stop' | 'skip_next' })}><option value="stop">Parar o fluxo</option><option value="skip_next">Pular o próximo agente</option></select></label><p className="auto-help">A condição verifica o texto da resposta anterior, sem fazer outra chamada de IA.</p></>}
        </section></div>
        <section className="auto-runs"><h3>Teste ao vivo</h3><p>Escreva uma entrada para o primeiro agente e clique em “Executar agora”. Cada execução chama o modelo configurado e aparece abaixo.</p><label className="auto-test-label" htmlFor="auto-test-input">Entrada do teste</label><textarea id="auto-test-input" className="auto-test-input" value={testInput} onChange={event => setTestInput(event.target.value)} maxLength={8000} rows={3} placeholder="Ex.: Responda com uma saudação curta em português e diga a data de hoje."/><div className="auto-test-actions"><span>{testInput.length}/8.000 caracteres</span><button className="auto-primary" disabled={busy || !draft.id || changed} onClick={run}><CirclePlay size={16}/>{busy ? 'Executando com IA...' : 'Executar teste ao vivo'}</button></div><h3>Execuções recentes</h3>{runs.length === 0 ? <p>Nenhuma execução ainda. Salve e execute o fluxo para ver os resultados.</p> : runs.map(item => <div className="auto-run" key={item.id}><div><strong className={item.status === 'failed' ? 'failed' : 'success'}>{item.status === 'completed' ? 'Concluída' : item.status === 'stopped' ? 'Parada pela condição' : 'Falhou'}</strong><time>{new Date(item.startedAt).toLocaleString('pt-BR')} · {item.source || 'manual'}</time></div>{item.input && <p className="auto-run-input"><strong>Entrada:</strong> {item.input}</p>}{item.error && <p role="alert">{item.error}</p>}{item.steps?.map(result => <details key={result.stepId} open={item.id === runs[0]?.id}><summary>{result.agentName || (result.type === 'condition' ? 'Condição' : 'Etapa')} · ver resultado</summary><pre>{result.output}</pre></details>)}</div>)}</section>
      </div></> : <div className="auto-welcome"><span><ShieldCheck size={28}/></span><h2>Crie seu primeiro fluxo</h2><p>Conecte tarefas, agentes e condições. Escolha quando executar.</p><button className="auto-primary" onClick={start}><Plus size={16}/> Novo fluxo</button></div>}</main></div>
  </div>;
}
