import { useEffect, useState } from 'react';
import { Bot, ChevronRight, CirclePlay, Clock3, GitBranch, Plus, Save, Trash2, Zap } from 'lucide-react';
import './AutomationWorkspace.css';

type Agent = { id: string; name: string; role: string; model_id?: string };
type Step = { id: string; type: 'agent_task'; agentId: string; instruction: string };
type Flow = { id: string; kind: string; name: string; description: string; status: string; trigger: { type: 'manual' }; steps: Step[]; lastRunAt?: string };
type Run = { id: string; status: string; startedAt: string; error?: string; steps?: { stepId: string; agentName: string; output: string }[] };
const newStep = (agentId = ''): Step => ({ id: crypto.randomUUID(), type: 'agent_task', agentId, instruction: '' });

export default function AutomationWorkspace() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Flow | null>(null);
  const [selectedStep, setSelectedStep] = useState(0);
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    Promise.all([fetch('/api/agents').then(r => r.json()), fetch('/api/automations?workspaceId=workspace_123').then(r => r.json())]).then(([agentsResult, flowsResult]) => {
      setAgents(Array.isArray(agentsResult.data) ? agentsResult.data : []);
      const items = Array.isArray(flowsResult.data) ? flowsResult.data.filter((flow: Flow) => flow.kind === 'agent_flow') : [];
      setFlows(items); if (items[0]) setSelectedId(items[0].id);
    }).catch(() => setError('Não foi possível carregar as automações. Atualize a página.'));
  }, []);
  useEffect(() => {
    const selected = flows.find(flow => flow.id === selectedId);
    if (selected) { setDraft({ ...selected, steps: selected.steps.map(step => ({ ...step })) }); setSelectedStep(0); }
    if (selectedId) fetch(`/api/automations/${selectedId}/runs`).then(r => r.json()).then(result => setRuns(Array.isArray(result.data) ? result.data : [])).catch(() => setRuns([]));
  }, [selectedId, flows]);
  const start = () => { setSelectedId(null); setRuns([]); setError(''); setNotice(''); setSelectedStep(0); setDraft({ id: '', kind: 'agent_flow', name: '', description: '', status: 'draft', trigger: { type: 'manual' }, steps: [newStep(agents[0]?.id)] }); };
  const update = (change: Partial<Flow>) => setDraft(previous => previous ? { ...previous, ...change } : previous);
  const updateStep = (change: Partial<Step>) => setDraft(previous => previous ? { ...previous, steps: previous.steps.map((step, index) => index === selectedStep ? { ...step, ...change } : step) } : previous);
  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim() || draft.steps.some(step => !step.agentId || step.instruction.trim().length < 10)) { setError('Dê um nome ao fluxo e escreva uma instrução de pelo menos 10 caracteres para cada etapa.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const creating = !draft.id;
      const response = await fetch(creating ? '/api/automations' : `/api/automations/${draft.id}`, { method: creating ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId: 'workspace_123', kind: 'agent_flow', name: draft.name, description: draft.description, trigger: { type: 'manual' }, steps: draft.steps }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error?.message || 'Não foi possível salvar o fluxo.');
      setFlows(previous => creating ? [...previous, result.data] : previous.map(flow => flow.id === draft.id ? result.data : flow));
      setSelectedId(result.data.id); setNotice('Fluxo salvo. Você já pode executá-lo manualmente.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o fluxo.'); }
    finally { setBusy(false); }
  };
  const run = async () => {
    if (!draft?.id) { setError('Salve o fluxo antes de executar.'); return; }
    if (JSON.stringify(flows.find(flow => flow.id === draft.id)?.steps) !== JSON.stringify(draft.steps)) { setError('Salve as alterações antes de executar.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/automations/${draft.id}/trigger`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error?.message || 'Não foi possível executar o fluxo.');
      setRuns(previous => [result.data.run, ...previous]);
      setNotice(result.data.run.status === 'completed' ? 'Execução concluída. Veja a saída abaixo.' : 'Execução interrompida. Veja o motivo abaixo.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível executar o fluxo.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!draft?.id || !window.confirm(`Excluir a automação "${draft.name}"?`)) return;
    setBusy(true);
    try { const response = await fetch(`/api/automations/${draft.id}`, { method: 'DELETE' }); if (!response.ok) throw new Error('Não foi possível excluir o fluxo.'); setFlows(previous => previous.filter(flow => flow.id !== draft.id)); setSelectedId(null); setDraft(null); setRuns([]); setNotice('Fluxo excluído.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível excluir o fluxo.'); }
    finally { setBusy(false); }
  };

  return <div className="automation-workspace"><header className="auto-header"><div><h1>Automações</h1><p>Monte um fluxo, atribua agentes e acompanhe cada execução.</p></div><button onClick={start} className="auto-primary"><Plus size={16}/> Novo fluxo</button></header><div className="auto-shell"><aside className="auto-sidebar"><div className="auto-sidebar-title"><strong>Fluxos</strong><span>{flows.length}</span></div>{flows.map(flow => <button className={`auto-flow-link ${selectedId === flow.id ? 'selected' : ''}`} key={flow.id} onClick={() => { setSelectedId(flow.id); setError(''); setNotice(''); }}><GitBranch size={17}/><span><strong>{flow.name}</strong><small>{flow.steps.length} {flow.steps.length === 1 ? 'etapa' : 'etapas'} · Manual</small></span><ChevronRight size={14}/></button>)}{flows.length === 0 && <p className="auto-sidebar-empty">Nenhum fluxo salvo ainda.</p>}<p className="auto-sidebar-note">Nesta primeira versão, o gatilho é manual e cada etapa executa um agente com um modelo real configurado.</p></aside><main className="auto-main">{draft ? <><div className="auto-toolbar"><div><h2>{draft.name || 'Novo fluxo'}</h2><p>Gatilho manual → agentes → resultado</p></div><div className="auto-toolbar-actions">{draft.id && <button className="auto-delete" title="Excluir fluxo" aria-label="Excluir fluxo" onClick={remove}><Trash2 size={17}/></button>}<button className="auto-secondary" disabled={busy} onClick={save}><Save size={15}/> Salvar</button><button className="auto-primary" disabled={busy || !draft.id} onClick={run}><CirclePlay size={16}/>{busy ? 'Aguarde...' : 'Executar agora'}</button></div></div><div className="auto-body">{error && <p className="auto-error" role="alert">{error}</p>}{notice && <p className="auto-notice" role="status">{notice}</p>}<div className="auto-flow-canvas" aria-label="Fluxo da automação"><div className="auto-node trigger"><span><Zap size={19}/></span><div><strong>Início manual</strong><small>Executar quando você clicar</small></div></div>{draft.steps.map((step, index) => <div className="auto-node-wrap" key={step.id}><div className="auto-connector"/><button className={`auto-node agent ${selectedStep === index ? 'selected' : ''}`} onClick={() => setSelectedStep(index)}><span><Bot size={20}/></span><div><strong>{agents.find(agent => agent.id === step.agentId)?.name || 'Escolha um agente'}</strong><small>Etapa {index + 1} · Agente</small></div></button></div>)}<div className="auto-node-wrap"><div className="auto-connector"/><div className="auto-node output"><span><GitBranch size={19}/></span><div><strong>Resultado</strong><small>Saída registrada no histórico</small></div></div></div></div><button className="auto-add-step" disabled={draft.steps.length >= 5} onClick={() => { setSelectedStep(draft.steps.length); update({ steps: [...draft.steps, newStep(agents[0]?.id)] }); }}><Plus size={15}/> Adicionar agente ao fluxo {draft.steps.length >= 5 ? '(máximo 5)' : ''}</button><div className="auto-editor"><section><h3>Configuração do fluxo</h3><label>Nome<input value={draft.name} onChange={event => update({ name: event.target.value })} placeholder="Ex.: Revisar solicitações"/></label><label>Descrição<input value={draft.description} onChange={event => update({ description: event.target.value })} placeholder="O que este fluxo faz?"/></label><div className="auto-trigger-info"><Clock3 size={16}/><span>Gatilho manual. Agendamentos e webhooks virão em uma próxima etapa.</span></div></section><section><div className="auto-editor-heading"><h3>Etapa {selectedStep + 1}: agente</h3>{draft.steps.length > 1 && <button onClick={() => { update({ steps: draft.steps.filter((_, index) => index !== selectedStep) }); setSelectedStep(Math.max(0, selectedStep - 1)); }}>Remover etapa</button>}</div><label>Agente<select value={draft.steps[selectedStep]?.agentId || ''} onChange={event => updateStep({ agentId: event.target.value })}><option value="">Escolha um agente</option>{agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}{agent.model_id ? '' : ' · sem modelo'}</option>)}</select></label><label>Instrução<textarea rows={5} value={draft.steps[selectedStep]?.instruction || ''} onChange={event => updateStep({ instruction: event.target.value })} placeholder="Descreva a tarefa que este agente deve executar."/></label><p className="auto-help">A saída desta etapa é passada como contexto para o próximo agente.</p></section></div><section className="auto-runs"><h3>Execuções recentes</h3>{runs.length === 0 ? <p>Nenhuma execução ainda. Salve e execute o fluxo para ver os resultados.</p> : runs.map(run => <div className="auto-run" key={run.id}><div><strong className={run.status === 'completed' ? 'success' : 'failed'}>{run.status === 'completed' ? 'Concluída' : 'Falhou'}</strong><time>{new Date(run.startedAt).toLocaleString('pt-BR')}</time></div>{run.error && <p role="alert">{run.error}</p>}{run.steps?.map(step => <details key={step.stepId}><summary>{step.agentName} · ver resposta</summary><pre>{step.output}</pre></details>)}</div>)}</section></div></> : <div className="auto-welcome"><span><GitBranch size={28}/></span><h2>Crie seu primeiro fluxo</h2><p>Conecte uma tarefa a um ou mais agentes e execute quando quiser.</p><button className="auto-primary" onClick={start}><Plus size={16}/> Novo fluxo</button></div>}</main></div></div>;
}
