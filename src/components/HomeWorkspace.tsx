import { useEffect, useState } from 'react';
import { ArrowRight, Bot, Code2, GitBranch, MessageSquare, Plus, Sparkles } from 'lucide-react';
import './HomeWorkspace.css';

type Agent = { id: string; name: string; role?: string; status?: string | boolean; agentStatus?: string; description?: string };
type Flow = { id: string; kind?: string; name: string; description?: string; status?: string; steps?: unknown[] };
type Destination = 'agents' | 'automation_builder' | 'code' | 'chat';

export default function HomeWorkspace({ name, activity, onNavigate }: { name: string; activity: { id: string; agent: string; action: string; time: string }[]; onNavigate: (destination: Destination) => void }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/agents').then(response => { if (!response.ok) throw new Error('agents'); return response.json(); }),
      fetch('/api/automations?workspaceId=workspace_123').then(response => { if (!response.ok) throw new Error('automations'); return response.json(); }),
    ]).then(([agentResult, flowResult]) => {
      if (!active) return;
      setAgents(Array.isArray(agentResult.data) ? agentResult.data : []);
      setFlows(Array.isArray(flowResult.data) ? flowResult.data.filter((item: Flow) => item.kind === 'agent_flow') : []);
    }).catch(() => active && setError('Não foi possível carregar o resumo. Tente atualizar a página.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const firstName = name.trim().split(/\s+/)[0] || 'você';
  const actions: { title: string; detail: string; icon: typeof Bot; destination: Destination }[] = [
    { title: 'Criar agente', detail: 'Defina identidade, skills e permissões.', icon: Plus, destination: 'agents' },
    { title: 'Nova automação', detail: 'Conecte um gatilho aos seus agentes.', icon: GitBranch, destination: 'automation_builder' },
    { title: 'Abrir Agent Center Code', detail: 'Crie e teste um projeto com IA.', icon: Code2, destination: 'code' },
    { title: 'Conversar com agente', detail: 'Continue uma tarefa ou comece outra.', icon: MessageSquare, destination: 'chat' },
  ];

  return <div className="ac-home">
    <div className="ac-home-intro">
      <div><span className="ac-home-kicker"><Sparkles size={15} /> Seu espaço de trabalho</span><h1>Olá, <em>{firstName}</em></h1><p>Gerencie agentes, automações e projetos em um só lugar.</p></div>
      <div className="ac-home-orbit" aria-hidden="true"><span /></div>
    </div>

    <div className="ac-home-actions" aria-label="Ações rápidas">
      {actions.map(({ title, detail, icon: Icon, destination }) => <button key={destination} type="button" onClick={() => onNavigate(destination)}>
        <span className="ac-home-action-icon"><Icon size={22} /></span><span className="ac-home-action-copy"><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={17} className="ac-home-action-arrow" />
      </button>)}
    </div>

    {error && <p className="ac-home-error" role="alert">{error}</p>}
    <div className="ac-home-grid">
      <section className="ac-home-panel ac-home-agents">
        <div className="ac-home-panel-head"><h2><Bot size={20} /> Meus agentes</h2><button type="button" onClick={() => onNavigate('agents')}>Ver todos <ArrowRight size={15} /></button></div>
        {loading ? <p className="ac-home-empty">Carregando agentes…</p> : agents.length ? <div className="ac-home-rows">{agents.slice(0, 5).map(agent => { const isActive = agent.agentStatus === 'active' || agent.status === 'active' || agent.status === true; return <button className="ac-home-row" type="button" key={agent.id} onClick={() => onNavigate('agents')}><span className="ac-home-row-icon"><Bot size={19} /></span><span className="ac-home-row-copy"><strong>{agent.name}</strong><small>{agent.role || agent.description || 'Agente configurado'}</small></span><span className={`ac-home-state ${isActive ? 'is-on' : ''}`}>{isActive ? 'Ativo' : 'Em preparação'}</span></button>; })}</div> : <p className="ac-home-empty">Ainda não há agentes. Crie o primeiro para começar.</p>}
      </section>

      <div className="ac-home-stack">
        <section className="ac-home-panel"><div className="ac-home-panel-head"><h2><GitBranch size={20} /> Automações</h2><button type="button" onClick={() => onNavigate('automation_builder')}>Ver todas <ArrowRight size={15} /></button></div>{loading ? <p className="ac-home-empty">Carregando fluxos…</p> : flows.length ? <div className="ac-home-rows">{flows.slice(0, 3).map(flow => <button className="ac-home-row" type="button" key={flow.id} onClick={() => onNavigate('automation_builder')}><span className="ac-home-row-icon"><GitBranch size={18} /></span><span className="ac-home-row-copy"><strong>{flow.name}</strong><small>{flow.description || `${flow.steps?.length || 0} etapas`}</small></span><span className={`ac-home-state ${flow.status === 'active' ? 'is-on' : ''}`}>{flow.status === 'active' ? 'Ativa' : 'Rascunho'}</span></button>)}</div> : <p className="ac-home-empty">Nenhum fluxo criado ainda. Monte uma automação com agente.</p>}</section>
        <button type="button" className="ac-home-code" onClick={() => onNavigate('code')}><span className="ac-home-code-icon"><Code2 size={25} /></span><span><strong>Agent Center Code</strong><small>Descreva sua ideia, gere arquivos e veja a prévia.</small></span><span className="ac-home-code-cta">Abrir Code <ArrowRight size={15} /></span></button>
      </div>
    </div>
    <section className="ac-home-panel ac-home-activity"><div className="ac-home-panel-head"><h2><Sparkles size={20} /> Atividade recente</h2></div>{activity.length ? <div className="ac-home-rows">{activity.slice(0, 4).map(item => <div className="ac-home-row" key={item.id}><span className="ac-home-row-icon"><Sparkles size={17} /></span><span className="ac-home-row-copy"><strong>{item.action}</strong><small>{item.agent}</small></span><span className="ac-home-state">{item.time}</span></div>)}</div> : <p className="ac-home-empty">A atividade dos agentes aparecerá aqui quando houver execuções.</p>}</section>
  </div>;
}
