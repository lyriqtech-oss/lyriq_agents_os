import { useEffect, useMemo, useState } from 'react';
import { Bot, Plus, Search, Shield, Wrench, FileText, Save, ChevronRight, CircleHelp, Play, LockKeyhole } from 'lucide-react';
import './AgentWorkspace.css';

type AgentRecord = {
  id: string; name: string; role: string; instructions: string; status: string;
  type?: string; model_id?: string | null; provider_connection_id?: string | null; capabilities?: string[];
  permissions?: Record<string, boolean>; boundaries?: string; created_at?: string;
};
type Section = 'identity' | 'instructions' | 'functions' | 'permissions';
const capabilities = [
  { id: 'research', title: 'Pesquisar informações', description: 'Organizar e resumir informações fornecidas ao agente.' },
  { id: 'code', title: 'Escrever código', description: 'Propor mudanças de código para revisão humana.' },
  { id: 'documents', title: 'Trabalhar com documentos', description: 'Usar documentos disponíveis no espaço de trabalho.' },
  { id: 'automation', title: 'Preparar automações', description: 'Planejar rotinas e ações recorrentes.' },
];
const permissionOptions = [
  { id: 'read_workspace', title: 'Ler dados do workspace', description: 'Permite consultar informações internas disponíveis.' },
  { id: 'write_workspace', title: 'Alterar dados do workspace', description: 'Exige aprovação antes de qualquer alteração.' },
  { id: 'external_requests', title: 'Acessar serviços externos', description: 'Pode enviar dados para serviços conectados.' },
  { id: 'send_messages', title: 'Enviar mensagens', description: 'Exige aprovação antes de enviar.' },
];

export default function AgentWorkspace({ onOpenProviders }: { onOpenProviders: () => void }) {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [providers, setProviders] = useState<{ id: string; provider: string; status: string; available_models?: string[]; selected_chat_model?: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('identity');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<AgentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selected = useMemo(() => agents.find(agent => agent.id === selectedId) || null, [agents, selectedId]);
  const visible = agents.filter(agent => `${agent.name} ${agent.role}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    let live = true;
    fetch('/api/agents').then(r => r.json()).then(result => {
      if (!live) return;
      const list = Array.isArray(result.data) ? result.data as AgentRecord[] : [];
      setAgents(list);
      setSelectedId(list[0]?.id || null);
    }).catch(() => live && setError('Não foi possível carregar os agentes. Atualize a página.'));
    fetch('/api/providers').then(r => r.json()).then(result => { if (live) setProviders(Array.isArray(result.data) ? result.data.filter((provider: { status: string }) => provider.status === 'valid') : []); }).catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => { if (creating) return; setDraft(selected ? { ...selected, capabilities: [...(selected.capabilities || [])], permissions: { ...selected.permissions } } : null); }, [selected, creating]);
  const update = (change: Partial<AgentRecord>) => setDraft(current => current ? { ...current, ...change } : current);
  const create = async () => {
    if (!draft || draft.name.trim().length < 2 || draft.role.trim().length < 3 || draft.instructions.trim().length < 10) {
      setError('Preencha nome, função e instruções com pelo menos 10 caracteres.'); return;
    }
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId: 'workspace_123', name: draft.name, role: draft.role, instructions: draft.instructions }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error?.message || 'Falha ao criar agente.');
      setAgents(current => [...current, result.data]); setSelectedId(result.data.id); setCreating(false); setSection('identity'); setNotice('Agente criado como rascunho. Configure suas funções e permissões.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao criar agente.'); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!draft) return;
    if (draft.name.trim().length < 2 || draft.role.trim().length < 3 || draft.instructions.trim().length < 10) { setError('Revise nome, função e instruções antes de salvar.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(draft.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: draft.name, role: draft.role, instructions: draft.instructions, capabilities: draft.capabilities || [], permissions: draft.permissions || {}, boundaries: draft.boundaries || '', provider_connection_id: draft.provider_connection_id || null, model_id: draft.model_id || null }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error?.message || 'Falha ao salvar agente.');
      setAgents(current => current.map(agent => agent.id === draft.id ? result.data : agent)); setNotice('Configuração salva.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar agente.'); }
    finally { setBusy(false); }
  };
  const working = draft;
  const startCreate = () => { setCreating(true); setSelectedId(null); setDraft({ id: '', name: '', role: '', instructions: '', status: 'draft', type: 'specialist', capabilities: [], permissions: {} }); setSection('identity'); setError(''); setNotice(''); };
  const choose = (id: string) => { setCreating(false); setSelectedId(id); setSection('identity'); setError(''); setNotice(''); };

  return <div className="agent-workspace">
    <header className="aw-header"><div><h1>Agentes</h1><p>Crie, configure e controle o que cada agente pode fazer.</p></div><button className="aw-primary" onClick={startCreate}><Plus size={17}/> Novo agente</button></header>
    <div className="aw-shell">
      <aside className="aw-list"><div className="aw-list-head"><strong>Seu workspace</strong><span>{agents.length} agentes</span></div><label className="aw-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar agente" aria-label="Buscar agente"/></label><div className="aw-agent-list">
        {visible.map(agent => <button key={agent.id} className={`aw-agent ${selectedId === agent.id && !creating ? 'selected' : ''}`} onClick={() => choose(agent.id)}><span className="aw-avatar"><Bot size={19}/></span><span className="aw-agent-copy"><strong>{agent.name}</strong><small>{agent.role}</small></span><ChevronRight size={15}/></button>)}
        {visible.length === 0 && <p className="aw-empty-list">{query ? 'Nenhum agente encontrado.' : 'Seu primeiro agente começa aqui.'}</p>}
      </div><div className="aw-list-footer"><CircleHelp size={16}/><span>Agentes novos ficam em rascunho até a configuração do modelo.</span></div></aside>
      <main className="aw-main">{working ? <><div className="aw-agent-header"><div className="aw-agent-heading"><span className="aw-avatar large"><Bot size={24}/></span><div><div className="aw-title-row"><h2>{working.name || 'Novo agente'}</h2><span className="aw-status">{creating ? 'Novo' : working.status === 'active' ? 'Ativo' : 'Rascunho'}</span></div><p>{working.role || 'Defina a função deste agente'}</p></div></div><button className="aw-save" disabled={busy} onClick={creating ? create : save}><Save size={16}/>{busy ? 'Salvando...' : creating ? 'Criar rascunho' : 'Salvar alterações'}</button></div>
        <nav className="aw-tabs" aria-label="Configuração do agente">{([['identity','Visão geral',Bot],['instructions','Instruções',FileText],['functions','Funções',Wrench],['permissions','Permissões',Shield]] as const).map(([id,label,Icon]) => <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}><Icon size={16}/>{label}</button>)}</nav>
        <div className="aw-content">{error && <p className="aw-error" role="alert">{error}</p>}{notice && <p className="aw-notice" role="status">{notice}</p>}
          {section === 'identity' && <div className="aw-form"><div className="aw-section-head"><h3>Identidade do agente</h3><p>Defina quem ele é e qual trabalho deve assumir.</p></div><div className="aw-fields"><label>Nome<input value={working.name} onChange={event => update({ name: event.target.value })} placeholder="Ex.: Analista de pesquisa"/></label><label>Função<input value={working.role} onChange={event => update({ role: event.target.value })} placeholder="Ex.: Pesquisa e síntese"/></label></div><div className="aw-model"><div><LockKeyhole size={18}/><strong>Modelo de IA</strong><p>Vincule um modelo validado para conversar e executar automações.</p></div><button onClick={onOpenProviders}>Configurar provedor <ChevronRight size={15}/></button></div>{!creating && <div className="aw-fields"><label>Provedor<select value={working.provider_connection_id || ''} onChange={event => { const provider = providers.find(item => item.id === event.target.value); update({ provider_connection_id: provider?.id || null, model_id: provider?.selected_chat_model || provider?.available_models?.[0] || null }); }}><option value="">Selecione um provedor</option>{providers.map(provider => <option key={provider.id} value={provider.id}>{provider.provider}</option>)}</select></label><label>Modelo<select value={working.model_id || ''} onChange={event => update({ model_id: event.target.value || null })} disabled={!working.provider_connection_id}><option value="">Selecione um modelo</option>{providers.find(provider => provider.id === working.provider_connection_id)?.available_models?.map(model => <option key={model} value={model}>{model}</option>)}</select></label></div>}</div>}
          {section === 'instructions' && <div className="aw-form"><div className="aw-section-head"><h3>Instruções</h3><p>Escreva o objetivo, o modo de trabalho e o formato esperado das respostas.</p></div><label>Instrução principal<textarea rows={12} value={working.instructions} onChange={event => update({ instructions: event.target.value })} placeholder="Você é um agente que..."/></label><label>Limites de atuação<textarea rows={5} value={working.boundaries || ''} onChange={event => update({ boundaries: event.target.value })} placeholder="Ex.: Peça aprovação antes de enviar mensagens ou alterar dados."/></label></div>}
          {section === 'functions' && <div className="aw-form"><div className="aw-section-head"><h3>Funções</h3><p>Escolha as responsabilidades deste agente. Elas descrevem seu papel; integrações e ferramentas dependem da configuração do workspace.</p></div><div className="aw-options">{capabilities.map(item => <label className="aw-option" key={item.id}><input type="checkbox" checked={(working.capabilities || []).includes(item.id)} onChange={event => update({ capabilities: event.target.checked ? [...(working.capabilities || []), item.id] : (working.capabilities || []).filter(id => id !== item.id) })}/><span><strong>{item.title}</strong><small>{item.description}</small></span></label>)}</div></div>}
          {section === 'permissions' && <div className="aw-form"><div className="aw-section-head"><h3>Permissões</h3><p>Comece com acesso mínimo. As opções abaixo registram a política do agente; ações sensíveis continuam sujeitas à aprovação.</p></div><div className="aw-options">{permissionOptions.map(item => <label className="aw-option" key={item.id}><input type="checkbox" checked={!!working.permissions?.[item.id]} onChange={event => update({ permissions: { ...working.permissions, [item.id]: event.target.checked } })}/><span><strong>{item.title}</strong><small>{item.description}</small></span></label>)}</div><div className="aw-safety"><Shield size={18}/><span>Alterar uma permissão não executa ações automaticamente.</span></div></div>}
        </div></> : <div className="aw-welcome"><span className="aw-avatar large"><Bot size={27}/></span><h2>Seu espaço de agentes</h2><p>Selecione um agente para configurar ou crie um novo especialista.</p><button className="aw-primary" onClick={startCreate}><Play size={16}/> Criar agente</button></div>}</main>
    </div>
  </div>;
}
