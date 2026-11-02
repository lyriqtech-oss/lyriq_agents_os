import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, KeyRound, Settings2, ShieldCheck } from 'lucide-react';
import './SettingsWorkspace.css';

type Settings = { workspaceId: string; brandContext: { companyName?: string; description?: string }; agentDefaults: { defaultModel?: string; defaultProvider?: string } };
type Provider = { id: string; provider: string; status: string; selected_chat_model?: string };

export default function SettingsWorkspace({ companyName, onOpenProviders, onOpenAgents }: { companyName: string; onOpenProviders: () => void; onOpenAgents: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
      <main className="sw-panel"><div className="sw-section-icon"><Settings2 size={20}/></div><h2>Sobre seu workspace</h2><p className="sw-intro">Essas informações orientam o contexto dos agentes. Escreva apenas dados reais da sua operação.</p>
        <label>Nome da organização<input value={settings.brandContext.companyName || ''} onChange={event => setSettings(current => current && ({ ...current, brandContext: { ...current.brandContext, companyName: event.target.value } }))} placeholder="Nome da sua empresa"/></label>
        <label>O que sua organização faz<textarea rows={5} value={settings.brandContext.description || ''} onChange={event => setSettings(current => current && ({ ...current, brandContext: { ...current.brandContext, description: event.target.value } }))} placeholder="Descreva serviços, público e prioridades..."/></label>
        <h3>Modelo preferido</h3><p className="sw-note">Usado como referência para novos agentes. Cada agente pode ter um modelo próprio.</p>
        <label>Conexão validada<select value={settings.agentDefaults.defaultProvider || ''} onChange={event => { const provider = providers.find(item => item.id === event.target.value); setSettings(current => current && ({ ...current, agentDefaults: { defaultProvider: provider?.id || '', defaultModel: provider?.selected_chat_model || '' } })); }}><option value="">Selecione uma conexão</option>{providers.filter(item => item.status === 'valid').map(item => <option key={item.id} value={item.id}>{item.provider} · {item.selected_chat_model || 'Escolha um modelo'}</option>)}</select></label>
        <p className="sw-note">{settings.agentDefaults.defaultModel ? `Modelo: ${settings.agentDefaults.defaultModel}` : 'Nenhum modelo padrão selecionado.'}</p>
      </main>
      <aside className="sw-side"><section><span className="sw-side-icon"><KeyRound size={20}/></span><h2>Provedores de IA</h2><p>{providers.filter(item => item.status === 'valid').length} conexão(ões) validada(s). As chaves ficam no cofre local e não são exibidas aqui.</p><button type="button" onClick={onOpenProviders}>Gerenciar provedores <ArrowUpRight size={15}/></button></section><section><span className="sw-side-icon"><ShieldCheck size={20}/></span><h2>Agentes e permissões</h2><p>Defina funções, skills, conhecimento e acesso individualmente para cada agente.</p><button type="button" onClick={onOpenAgents}>Abrir agentes <ArrowUpRight size={15}/></button></section></aside>
    </div>}
  </div>;
}
