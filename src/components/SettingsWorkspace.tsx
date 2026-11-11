import { useEffect, useState } from 'react';
import { ArrowUpRight, Bot, Check, ChevronRight, KeyRound, Settings2, ShieldCheck } from 'lucide-react';
import './SettingsWorkspace.css';

type Settings = { workspaceId: string; brandContext: { companyName?: string; description?: string }; agentDefaults: { defaultModel?: string; defaultProvider?: string } };
type Provider = { id: string; provider: string; status: string; selected_chat_model?: string };

export default function SettingsWorkspace({ companyName, onOpenProviders, onOpenAgents }: { companyName: string; onOpenProviders: () => void; onOpenAgents: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [section, setSection] = useState<'general' | 'models' | 'agents'>('general');

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/workspaces/workspace_123/settings').then(response => response.json()),
      fetch('/api/providers').then(response => response.json()),
    ]).then(([settingsResult, providersResult]) => {
      if (!active) return;
      if (!settingsResult.ok) throw new Error(settingsResult.error?.message || 'Falha ao carregar configurações.');
      const loaded = settingsResult.data as Settings;
      const providerList = Array.isArray(providersResult.data) ? providersResult.data as Provider[] : [];
      setSettings({ ...loaded, brandContext: { ...loaded.brandContext, companyName: !loaded.brandContext?.companyName || loaded.brandContext.companyName === 'Lyriq Tech' ? companyName : loaded.brandContext.companyName, description: loaded.brandContext?.description === 'Plataforma de IA B2B' ? '' : loaded.brandContext?.description }, agentDefaults: providerList.some(item => item.id === loaded.agentDefaults?.defaultProvider && item.status === 'valid') ? loaded.agentDefaults : { defaultProvider: '', defaultModel: '' } });
      setProviders(providerList);
    }).catch(cause => active && setError(cause instanceof Error ? cause.message : 'Falha ao carregar configurações.'));
    return () => { active = false; };
  }, []);

  const save = async () => {
    if (!settings) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/workspaces/workspace_123/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brandContext: { companyName: settings.brandContext.companyName?.trim() || '', description: settings.brandContext.description?.trim() || '' }, agentDefaults: settings.agentDefaults }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error?.message || 'Não foi possível salvar.');
      setSettings(result.data); setMessage('Configurações salvas neste workspace.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  };

  return <div className="sw-page">
    <header className="sw-heading"><div><h1>Configurações</h1><p>Contexto do workspace, modelos e agentes em um só lugar.</p></div><button type="button" onClick={save} disabled={!settings || busy} className="sw-save"><Check size={16}/>{busy ? 'Salvando...' : 'Salvar mudanças'}</button></header>
    {error && <p role="alert" className="sw-error">{error}</p>}{message && <p role="status" className="sw-success">{message}</p>}
    {!settings ? <p className="sw-loading">Carregando configurações…</p> : <div className="sw-layout">
      <nav className="sw-nav" aria-label="Seções de configurações"><button type="button" className={section === 'general' ? 'active' : ''} onClick={() => setSection('general')}><Settings2 size={18}/> Geral <ChevronRight size={15}/></button><button type="button" className={section === 'models' ? 'active' : ''} onClick={() => setSection('models')}><KeyRound size={18}/> Modelos de IA <ChevronRight size={15}/></button><button type="button" className={section === 'agents' ? 'active' : ''} onClick={() => setSection('agents')}><Bot size={18}/> Agentes <ChevronRight size={15}/></button></nav>
      <main className="sw-panel">{section === 'general' && <><div className="sw-section-icon"><Settings2 size={20}/></div><h2>Geral</h2><p className="sw-intro">Defina o contexto que seus agentes usam para entender seu workspace.</p>
        <label>Nome da organização<input value={settings.brandContext.companyName || ''} onChange={event => setSettings(current => current && ({ ...current, brandContext: { ...current.brandContext, companyName: event.target.value } }))} placeholder="Nome da sua empresa"/></label>
        <label>O que sua organização faz<textarea rows={5} value={settings.brandContext.description || ''} onChange={event => setSettings(current => current && ({ ...current, brandContext: { ...current.brandContext, description: event.target.value } }))} placeholder="Descreva serviços, público e prioridades..."/></label>
        <div className="sw-context-note"><ShieldCheck size={18}/><p>Use informações reais. Esse contexto ajuda nas respostas, mas não concede acesso a dados ou ferramentas.</p></div></>}
        {section === 'models' && <><div className="sw-section-icon"><KeyRound size={20}/></div><h2>Modelos de IA</h2><p className="sw-intro">Escolha uma conexão validada como ponto de partida. Cada agente pode usar outro modelo.</p>
        <label>Conexão validada<select value={settings.agentDefaults.defaultProvider || ''} onChange={event => { const provider = providers.find(item => item.id === event.target.value); setSettings(current => current && ({ ...current, agentDefaults: { defaultProvider: provider?.id || '', defaultModel: provider?.selected_chat_model || '' } })); }}><option value="">Selecione uma conexão</option>{providers.filter(item => item.status === 'valid').map(item => <option key={item.id} value={item.id}>{item.provider} · {item.selected_chat_model || 'Escolha um modelo'}</option>)}</select></label>
        <p className="sw-note">{settings.agentDefaults.defaultModel ? `Modelo padrão: ${settings.agentDefaults.defaultModel}` : 'Nenhum modelo padrão selecionado.'}</p><div className="sw-provider-list">{providers.map(item => <div key={item.id}><span className="sw-provider-symbol"><KeyRound size={16}/></span><span><strong>{item.provider}</strong><small>{item.selected_chat_model || 'Modelo ainda não escolhido'}</small></span><b className={item.status === 'valid' ? 'valid' : ''}>{item.status === 'valid' ? 'Validado' : 'Pendente'}</b></div>)}</div><button className="sw-action" type="button" onClick={onOpenProviders}>Gerenciar provedores <ArrowUpRight size={15}/></button></>}
        {section === 'agents' && <><div className="sw-section-icon"><Bot size={20}/></div><h2>Agentes e permissões</h2><p className="sw-intro">Defina as funções, skills, fontes de conhecimento e limites de cada identidade.</p><div className="sw-context-note"><ShieldCheck size={18}/><p>Permissões são configuradas por agente. Ações sensíveis continuam sujeitas à aprovação.</p></div><button className="sw-action" type="button" onClick={onOpenAgents}>Abrir meus agentes <ArrowUpRight size={15}/></button></>}
      </main>
      <aside className="sw-side"><section><span className="sw-side-icon"><KeyRound size={20}/></span><h2>Provedores de IA</h2><p>{providers.filter(item => item.status === 'valid').length} conexão(ões) validada(s). As chaves ficam no cofre local e não são exibidas aqui.</p><button type="button" onClick={onOpenProviders}>Gerenciar provedores <ArrowUpRight size={15}/></button></section><section><span className="sw-side-icon"><ShieldCheck size={20}/></span><h2>Agentes e permissões</h2><p>Defina funções, skills, conhecimento e acesso individualmente para cada agente.</p><button type="button" onClick={onOpenAgents}>Abrir agentes <ArrowUpRight size={15}/></button></section></aside>
    </div>}
  </div>;
}
