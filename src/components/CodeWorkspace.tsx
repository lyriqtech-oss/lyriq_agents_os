import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Code2, FilePlus2, Maximize2, Monitor, Play, RotateCcw, Save, Smartphone, Trash2, X } from 'lucide-react';
import './CodeWorkspace.css';

type ProjectFiles = Record<string, string>;
type CodeProposal = { summary: string; changes: { name: string; before: string; after: string }[]; provider: string; model: string };
type ProviderConnection = { id: string; provider: string; status: string; selected_chat_model?: string; available_models?: (string | { id: string })[] };

const STORAGE_KEY = 'agent-center-code-workspace-v1';
const HISTORY_KEY = 'agent-center-code-history-v1';
const STARTER_FILES: ProjectFiles = {
  'index.html': '<main class="card">\n  <span class="eyebrow">Agent Center</span>\n  <h1>Seu projeto começa aqui.</h1>\n  <p>Edite os arquivos ao lado. A prévia aparece automaticamente.</p>\n  <button id="hello">Testar interação</button>\n</main>',
  'styles.css': 'body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b1220; color: #f8fafc; font-family: Inter, Arial, sans-serif; }\n.card { max-width: 520px; padding: 48px; }\n.eyebrow { color: #22d3ee; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }\nh1 { font-size: clamp(32px, 5vw, 56px); line-height: 1.05; letter-spacing: -.04em; }\np { color: #cbd5e1; line-height: 1.6; }\nbutton { margin-top: 16px; padding: 12px 18px; border: 0; border-radius: 10px; background: #22d3ee; color: #082f49; font-weight: 700; cursor: pointer; }',
  'script.js': 'document.querySelector("#hello")?.addEventListener("click", () => {\n  document.querySelector("#hello").textContent = "Funcionou!";\n});'
};

function loadFiles(): ProjectFiles {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      const entries = Object.entries(saved).filter(([name, content]) => /^[\w.-]+\.(html|css|js)$/.test(name) && typeof content === 'string');
      if (entries.length > 0) return Object.fromEntries(entries) as ProjectFiles;
    }
  } catch {
    // Invalid local data falls back to the starter project.
  }
  return { ...STARTER_FILES };
}

function loadHistory(): ProjectFiles[] {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(item => item && typeof item === 'object' && typeof item['index.html'] === 'string').slice(-10) : [];
  } catch { return []; }
}

function buildPreview(files: ProjectFiles, page = 'index.html'): string {
  const html = files[page] || '';
  const css = Object.entries(files).filter(([name]) => name.endsWith('.css')).map(([, content]) => content).join('\n');
  const js = Object.entries(files).filter(([name]) => name.endsWith('.js')).map(([, content]) => content).join('\n');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'"><style>${css.replace(/<\/style/gi, '<\\/style')}</style><script>window.addEventListener('error',function(event){window.parent.postMessage({source:'agent-center-preview',type:'error',message:event.message},'*')});window.addEventListener('unhandledrejection',function(event){window.parent.postMessage({source:'agent-center-preview',type:'error',message:String(event.reason)},'*')});<\/script></head><body>${html}<script>${js.replace(/<\/script/gi, '<\\/script')}<\/script></body></html>`;
}

export default function CodeWorkspace() {
  const [files, setFiles] = useState<ProjectFiles>(loadFiles);
  const [history, setHistory] = useState<ProjectFiles[]>(loadHistory);
  const [activeFile, setActiveFile] = useState('index.html');
  const [previewFiles, setPreviewFiles] = useState<ProjectFiles>(() => loadFiles());
  const [status, setStatus] = useState('Projeto pronto');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [proposal, setProposal] = useState<CodeProposal | null>(null);
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentError, setAgentError] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewPage, setPreviewPage] = useState('index.html');
  const [expandedPreview, setExpandedPreview] = useState(false);
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [mode, setMode] = useState<'create' | 'edit'>(() => localStorage.getItem(STORAGE_KEY) ? 'edit' : 'create');
  const [providers, setProviders] = useState<ProviderConnection[]>([]);
  const [providerId, setProviderId] = useState('');
  const [modelId, setModelId] = useState('');
  const previewRef = useRef<HTMLIFrameElement>(null);
  const expandedPreviewRef = useRef<HTMLIFrameElement>(null);
  const dirty = useMemo(() => JSON.stringify(files) !== JSON.stringify(previewFiles), [files, previewFiles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  }, [files]);
  useEffect(() => {
    fetch('/api/providers').then(response => response.json()).then(result => {
      const valid = (Array.isArray(result.data) ? result.data : []).filter((item: ProviderConnection) => item.status === 'valid' && item.selected_chat_model);
      setProviders(valid);
      const preferred = valid.find((item: ProviderConnection) => item.provider === 'gemini') || valid[0];
      if (preferred) {
        setProviderId(preferred.id);
        setModelId(preferred.selected_chat_model || '');
      }
    }).catch(() => setAgentError('Não foi possível carregar os modelos. Verifique a API local.'));
  }, []);
  const selectedProvider = providers.find(item => item.id === providerId);
  const availableModels = (selectedProvider?.available_models || []).map(item => typeof item === 'string' ? item : item.id).filter(name => /^(gemini-(2\.5-(flash|pro)|3(\.1)?-(flash|pro)|flash-latest|pro-latest)|gpt-|claude-|llama-|meta\/)/i.test(name) && !/tts|image|embedding|transcribe|robotics|computer-use/i.test(name));
  const shownFiles = proposal ? { ...previewFiles, ...Object.fromEntries(proposal.changes.map(change => [change.name, change.after])) } : previewFiles;
  useEffect(() => {
    if (!dirty) return;
    const timeout = window.setTimeout(() => { setPreviewFiles({ ...files }); setPreviewError(''); setStatus('Prévia atualizada automaticamente.'); }, 650);
    return () => window.clearTimeout(timeout);
  }, [files, dirty]);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if ((event.source === previewRef.current?.contentWindow || event.source === expandedPreviewRef.current?.contentWindow) && event.data?.source === 'agent-center-preview' && event.data.type === 'error') setPreviewError(String(event.data.message).slice(0, 500));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  useEffect(() => {
    if (!expandedPreview) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpandedPreview(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [expandedPreview]);

  const addFile = () => {
    const name = window.prompt('Nome do arquivo (.html, .css ou .js):');
    if (name === null) return;
    const cleanName = name.trim();
    if (!/^[\w.-]+\.(html|css|js)$/.test(cleanName) || cleanName.includes('..')) {
      setStatus('Use um nome simples terminado em .html, .css ou .js.');
      return;
    }
    if (files[cleanName] !== undefined) {
      setStatus('Já existe um arquivo com esse nome.');
      return;
    }
    setFiles(previous => ({ ...previous, [cleanName]: '' }));
    setActiveFile(cleanName);
    setStatus(`Arquivo ${cleanName} criado.`);
  };

  const removeFile = () => {
    if (['index.html', 'styles.css', 'script.js'].includes(activeFile)) {
      setStatus('Os três arquivos principais não podem ser removidos.');
      return;
    }
    if (!window.confirm(`Remover ${activeFile} deste projeto local?`)) return;
    setFiles(previous => {
      const next = { ...previous };
      delete next[activeFile];
      return next;
    });
    setActiveFile('index.html');
    if (activeFile === previewPage) setPreviewPage('index.html');
    setStatus('Arquivo removido.');
  };

  const run = () => {
    setPreviewFiles({ ...files });
    setPreviewError('');
    setStatus('Prévia atualizada. HTML, CSS e JavaScript executados no navegador.');
  };

  const requestProposal = async () => {
    setAgentError('');
    setProposal(null);
    setAgentBusy(true);
    try {
      const response = await fetch('/api/code/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'workspace_123', prompt: agentPrompt, files, mode, providerConnectionId: providerId, modelId })
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error?.message || 'O agente não conseguiu preparar a alteração.');
      setProposal(body.data);
      setStatus('Proposta recebida. Revise os arquivos antes de aplicar.');
    } catch (error: any) {
      setAgentError(error.message || 'Falha ao consultar o agente de código.');
    } finally {
      setAgentBusy(false);
    }
  };

  const applyProposal = () => {
    if (!proposal) return;
    if (proposal.changes.some(change => files[change.name] !== change.before)) {
      setAgentError('Os arquivos mudaram após a proposta. Gere uma nova proposta antes de aplicar.');
      setProposal(null);
      return;
    }
    const nextFiles = { ...files, ...Object.fromEntries(proposal.changes.map(change => [change.name, change.after])) };
    const nextHistory = [...history, { ...files }].slice(-10);
    setHistory(nextHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    setFiles(nextFiles);
    setPreviewFiles(nextFiles);
    setPreviewError('');
    setActiveFile(proposal.changes[0].name);
    setView('preview');
    setProposal(null);
    setMode('edit');
    setAgentPrompt('');
    setStatus('Alterações aplicadas. Prévia atualizada.');
  };

  const undo = () => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    const remaining = history.slice(0, -1);
    setHistory(remaining);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(remaining));
    setFiles(previous);
    setPreviewFiles(previous);
    setProposal(null);
    setStatus('Versão anterior restaurada.');
  };

  return (
    <div className="code-builder text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-950"><Code2 className="h-5 w-5 text-cyan-600" /> Agent Center Code</h1>
          <p className="mt-1 text-xs text-slate-600">Edite seu projeto web e veja a prévia automaticamente. Os arquivos ficam salvos neste navegador.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={undo} disabled={!history.length} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Desfazer versão</button>
          <button type="button" onClick={() => { setFiles({ ...STARTER_FILES }); setActiveFile('index.html'); setStatus('Projeto inicial restaurado. A prévia será atualizada.'); }} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RotateCcw className="h-3.5 w-3.5" /> Restaurar exemplo</button>
          <button type="button" onClick={run} className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"><Play className="h-3.5 w-3.5" /> Executar</button>
        </div>
      </div>
      <section className="code-builder-prompt rounded-xl bg-white p-4 shadow-sm" aria-label="Agente de programação">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Pedir alteração ao agente</h2>
            <p className="mt-1 text-xs text-slate-600">O código do projeto será enviado ao provedor de IA que você configurar. Nenhuma mudança é aplicada sem sua revisão.</p>
          </div>
          <span className="code-builder-model-badge">{selectedProvider ? `${selectedProvider.provider} · ${modelId}` : 'Conecte um modelo'}</span>
        </div>
        <div className="code-builder-mode" role="group" aria-label="Tipo de tarefa"><button type="button" className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>Criar projeto</button><button type="button" className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>Editar projeto</button></div>
        <textarea aria-label="Instrução para o agente de código" value={agentPrompt} onChange={event => setAgentPrompt(event.target.value)} rows={2} placeholder="Ex.: Transforme a página em um portfólio pessoal com botão de contato." className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500" />
        <p className="code-builder-hint">{mode === 'create' ? 'O novo site substitui o projeto atual somente depois da sua revisão.' : 'O agente mantém o site atual e altera o que você pedir.'}</p>
        <div className="code-builder-submit"><div><label htmlFor="code-model">Modelo</label><select id="code-model" value={modelId} onChange={event => setModelId(event.target.value)}>{availableModels.map(name => <option key={name} value={name}>{name}</option>)}</select></div><button type="button" onClick={requestProposal} disabled={agentBusy || agentPrompt.trim().length < 10 || !providerId || !modelId} className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{agentBusy ? 'Criando...' : <><ArrowUp className="h-4 w-4" /> Gerar site</>}</button></div>
        {agentError && <p role="alert" className="mt-2 text-xs text-red-700">{agentError}</p>}
        {proposal && <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          <p className="text-sm font-semibold text-slate-900">{proposal.summary}</p>
          <p className="text-xs text-slate-600">Proposta de {proposal.provider} / {proposal.model}. A prévia ao lado mostra o resultado antes de aplicar.</p>
          {proposal.changes.map(change => <details key={change.name} className="rounded-lg border border-slate-200 p-3 text-xs">
            <summary className="cursor-pointer font-semibold text-slate-900">{change.name} — ver antes e depois</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div><p className="mb-1 font-semibold text-slate-600">Antes</p><pre className="max-h-48 overflow-auto rounded bg-slate-100 p-2 whitespace-pre-wrap">{change.before}</pre></div>
              <div><p className="mb-1 font-semibold text-slate-600">Depois</p><pre className="max-h-48 overflow-auto rounded bg-slate-100 p-2 whitespace-pre-wrap">{change.after}</pre></div>
            </div>
          </details>)}
          <div className="flex gap-2"><button type="button" onClick={applyProposal} className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950">Aplicar mudanças</button><button type="button" onClick={() => setProposal(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">Descartar</button></div>
        </div>}
      </section>
      <div className={`code-builder-workspace ${view === 'code' ? 'show-code' : ''}`}>
        <div className="code-builder-tabs"><div role="tablist" aria-label="Visualização do projeto"><button role="tab" aria-selected={view === 'preview'} className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}>Prévia</button><button role="tab" aria-selected={view === 'code'} className={view === 'code' ? 'active' : ''} onClick={() => setView('code')}>Código</button></div><span>{previewError ? 'Erro no JavaScript' : 'Prévia local · salva automaticamente'}</span></div>
        {view === 'code' && <>
        <aside className="border-b border-slate-800 p-4 text-slate-200 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Arquivos</span>
            <button type="button" onClick={addFile} title="Novo arquivo" aria-label="Novo arquivo" className="rounded p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"><FilePlus2 className="h-4 w-4" /></button>
          </div>
          <p className="mt-3 text-xs font-semibold text-cyan-300">agent-center-project</p>
          <div className="mt-2 flex flex-col gap-1">
            {Object.keys(files).map(name => (
              <button key={name} type="button" onClick={() => setActiveFile(name)} className={`rounded px-2 py-1.5 text-left font-mono text-xs ${activeFile === name ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>{name}</button>
            ))}
          </div>
          <p className="mt-6 text-[11px] leading-5 text-slate-400">Prévia isolada. Esta versão executa HTML, CSS e JavaScript no navegador. O agente de código depende de um modelo configurado.</p>
        </aside>
        <section className="flex min-h-[350px] flex-col border-b border-slate-800 lg:border-b-0 lg:border-r" aria-label="Editor de código">
          <div className="flex h-11 items-center justify-between border-b border-slate-800 px-4 text-xs text-slate-300">
            <span className="font-mono">{activeFile}{dirty && <span className="ml-2 text-amber-300">● prévia desatualizada</span>}</span>
            <div className="flex gap-2">
              <span title="Salvo automaticamente" className="flex items-center gap-1 text-slate-400"><Save className="h-3.5 w-3.5" /> Salvo</span>
              <button type="button" onClick={removeFile} title="Remover arquivo" aria-label="Remover arquivo" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <textarea aria-label={`Conteúdo de ${activeFile}`} spellCheck={false} value={files[activeFile] || ''} onChange={event => setFiles(previous => ({ ...previous, [activeFile]: event.target.value }))} className="min-h-[300px] flex-1 resize-none bg-transparent p-4 font-mono text-xs leading-6 text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400" />
          <div role="status" className="border-t border-slate-800 px-4 py-2 text-[11px] text-slate-300">{status}</div>
        </section>
        </>}
        <section className="flex min-h-[350px] flex-col bg-white" aria-label="Prévia do projeto">
          <div className="flex h-11 items-center justify-between gap-2 border-b border-slate-200 px-4 text-xs font-semibold text-slate-700"><span>Prévia {proposal && <span className="text-cyan-700">· proposta para revisão</span>}{dirty && !proposal && <span className="text-amber-700">· atualizando</span>}</span><div className="flex items-center gap-2"><select aria-label="Página da prévia" value={previewPage} onChange={event => setPreviewPage(event.target.value)} className="max-w-32 rounded border border-slate-200 bg-white px-1 py-1 text-[11px]">{Object.keys(shownFiles).filter(name => name.endsWith('.html')).map(name => <option key={name} value={name}>{name}</option>)}</select><button type="button" onClick={() => setDevice('desktop')} aria-label="Prévia desktop" title="Desktop" className={`rounded p-1 ${device === 'desktop' ? 'bg-slate-200 text-slate-900' : 'text-slate-400'}`}><Monitor className="h-4 w-4" /></button><button type="button" onClick={() => setDevice('mobile')} aria-label="Prévia celular" title="Celular" className={`rounded p-1 ${device === 'mobile' ? 'bg-slate-200 text-slate-900' : 'text-slate-400'}`}><Smartphone className="h-4 w-4" /></button><button type="button" onClick={() => setExpandedPreview(true)} aria-label="Ampliar prévia" title="Ampliar prévia" className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-950"><Maximize2 className="h-4 w-4" /></button></div></div>
          <div className="flex min-h-[300px] flex-1 justify-center overflow-auto bg-slate-100 p-2"><iframe ref={previewRef} key={buildPreview(shownFiles, previewPage)} title="Prévia isolada do projeto" sandbox="allow-scripts" srcDoc={buildPreview(shownFiles, previewPage)} className={`min-h-[300px] flex-1 border-0 bg-white ${device === 'mobile' ? 'max-w-[375px]' : 'w-full'}`} /></div>
          {previewError && <p role="alert" className="border-t border-red-200 bg-red-50 px-3 py-2 font-mono text-[11px] text-red-800">Erro na prévia: {previewError}</p>}
        </section>
      </div>
      {expandedPreview && <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950" role="dialog" aria-modal="true" aria-label="Prévia ampliada do projeto">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-5 py-3 text-white"><div><strong className="text-sm">Prévia ampliada</strong><span className="ml-3 text-xs text-slate-300">{previewPage} · {device === 'mobile' ? 'celular' : 'desktop'}</span></div><div className="flex items-center gap-2"><button type="button" onClick={() => setDevice('desktop')} className={`rounded px-3 py-2 text-xs ${device === 'desktop' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-white'}`}>Desktop</button><button type="button" onClick={() => setDevice('mobile')} className={`rounded px-3 py-2 text-xs ${device === 'mobile' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-white'}`}>Celular</button><button type="button" onClick={() => setExpandedPreview(false)} aria-label="Fechar prévia ampliada" className="ml-2 rounded p-2 text-slate-200 hover:bg-slate-800"><X className="h-5 w-5" /></button></div></div>
        <div className="flex min-h-0 flex-1 justify-center overflow-auto p-4"><iframe ref={expandedPreviewRef} key={buildPreview(shownFiles, previewPage)} title="Prévia ampliada isolada" sandbox="allow-scripts" srcDoc={buildPreview(shownFiles, previewPage)} className={`h-full min-h-[500px] border-0 bg-white shadow-xl ${device === 'mobile' ? 'w-full max-w-[375px]' : 'w-full max-w-[1440px]'}`} /></div>
        {previewError && <p role="alert" className="bg-red-950 px-5 py-2 font-mono text-xs text-red-100">Erro na prévia: {previewError}</p>}
      </div>}
    </div>
  );
}
