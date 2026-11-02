import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Code2, FilePlus2, Maximize2, Monitor, Play, RotateCcw, Save, Smartphone, Sparkles, Trash2, X } from 'lucide-react';
import './CodeWorkspace.css';

type ProjectFiles = Record<string, string>;
type CodeProposal = { summary: string; changes: { name: string; before: string; after: string }[]; provider: string; model: string };
type ProviderConnection = { id: string; provider: string; status: string; selected_chat_model?: string; available_models?: (string | { id: string })[] };

const STORAGE_KEY = 'agent-center-code-workspace-v1';
const HISTORY_KEY = 'agent-center-code-history-v1';
const PROJECT_ID_KEY = 'agent-center-code-project-id-v1';
const PROJECT_TYPE_KEY = 'agent-center-code-project-type-v1';
const CONVERSATION_KEY = 'agent-center-code-conversation-v1';
const MODEL_KEY = 'agent-center-code-model-v1';
type ConversationMessage = { role: 'user' | 'agent'; text: string };
function loadConversation(): ConversationMessage[] {
  try { const saved = JSON.parse(localStorage.getItem(CONVERSATION_KEY) || '[]'); return Array.isArray(saved) ? saved.filter(item => (item?.role === 'user' || item?.role === 'agent') && typeof item.text === 'string').slice(-20) : []; }
  catch { return []; }
}
function inferProjectType(prompt: string, currentType: 'site' | 'app', creating: boolean): 'site' | 'app' {
  if (!creating) return currentType;
  return /\b(app|aplicativo|sistema|dashboard|painel|cadastro|tarefas?|clientes?|agendamentos?|login|backend|banco de dados|persistente|gerenciador)\b/i.test(prompt) ? 'app' : 'site';
}
const STARTER_FILES: ProjectFiles = {
  'index.html': '<main class="card">\n  <span class="eyebrow">Agent Center</span>\n  <h1>Seu projeto começa aqui.</h1>\n  <p>Edite os arquivos ao lado. A prévia aparece automaticamente.</p>\n  <button id="hello">Testar interação</button>\n</main>',
  'styles.css': 'body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b1220; color: #f8fafc; font-family: ui-sans-serif, system-ui, sans-serif; }\n.card { max-width: 520px; padding: 48px; }\n.eyebrow { color: #22d3ee; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }\nh1 { font-size: clamp(32px, 5vw, 56px); line-height: 1.05; letter-spacing: -.04em; }\np { color: #cbd5e1; line-height: 1.6; }\nbutton { margin-top: 16px; padding: 12px 18px; border: 0; border-radius: 10px; background: #22d3ee; color: #082f49; font-weight: 700; cursor: pointer; }',
  'script.js': 'document.querySelector("#hello")?.addEventListener("click", () => {\n  document.querySelector("#hello").textContent = "Funcionou!";\n});'
};

function loadFiles(): ProjectFiles {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      const entries = Object.entries(saved).filter(([name, content]) => /^[\w.-]+\.(html|css|js|json)$/.test(name) && typeof content === 'string');
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
  const sourceHtml = files[page] || '';
  const html = sourceHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || sourceHtml.replace(/<!doctype[^>]*>/gi, '').replace(/<\/?(?:html|head|body)[^>]*>/gi, '').replace(/<title>[\s\S]*?<\/title>/gi, '');
  const css = Object.entries(files).filter(([name]) => name.endsWith('.css')).map(([, content]) => content).join('\n');
  const js = Object.entries(files).filter(([name]) => name.endsWith('.js')).map(([, content]) => content).join('\n');
  const bridge = `var originalAddEventListener=document.addEventListener.bind(document);document.addEventListener=function(type,listener,options){if(type==='DOMContentLoaded'&&document.readyState!=='loading'){queueMicrotask(function(){listener(new Event(type))});return}originalAddEventListener(type,listener,options)};function sendForm(form){if(form.checkValidity())form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));else form.reportValidity()}document.addEventListener('click',function(event){var button=event.target.closest?.('button[type="submit"]');if(button&&button.form){event.preventDefault();sendForm(button.form)}},true);document.addEventListener('keydown',function(event){if(event.key==='Enter'&&event.target.matches?.('form input:not([type="textarea"])')){event.preventDefault();sendForm(event.target.form)}},true);window.AgentCenter={data:{}};['list','create','update','remove'].forEach(function(action){window.AgentCenter.data[action]=function(collection,a,b){return new Promise(function(resolve,reject){var requestId=Math.random().toString(36).slice(2)+Date.now();var timer=setTimeout(function(){window.removeEventListener('message',onReply);reject(new Error('O backend demorou para responder.'))},10000);function onReply(event){if(event.source!==window.parent||event.data?.source!=='agent-center-data-result'||event.data.requestId!==requestId)return;clearTimeout(timer);window.removeEventListener('message',onReply);event.data.ok?resolve(event.data.data):reject(new Error(event.data.error||'Falha nos dados'))}window.addEventListener('message',onReply);window.parent.postMessage({source:'agent-center-data',requestId:requestId,action:action,collection:collection,id:action==='update'||action==='remove'?a:undefined,record:action==='create'?a:action==='update'?b:undefined},'*')})}});`;
  const audit = `window.addEventListener('load',function(){var h=document.querySelector('h1');if(!h)return;function rgb(v){var m=v.match(/[\\d.]+/g);return m&&m.length>=3?m.slice(0,3).map(Number):null}function luminance(c){var n=c.map(v=>{v=v/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*n[0]+.7152*n[1]+.0722*n[2]}var color=rgb(getComputedStyle(h).color),node=h,bg=null;while(node){var s=getComputedStyle(node);if(s.backgroundImage!=='none')break;if(s.backgroundColor&&!/rgba?\\([^)]*,\\s*0\\s*\\)$/.test(s.backgroundColor)){bg=rgb(s.backgroundColor);if(bg)break}node=node.parentElement}if(color&&bg){var a=luminance(color),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);if(ratio<3)window.parent.postMessage({source:'agent-center-preview',type:'audit',issues:['O título principal tem pouco contraste com o fundo.']},'*')}});`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'"><style>${css.replace(/<\/style/gi, '<\\/style')}</style><script>${bridge}window.addEventListener('error',function(event){window.parent.postMessage({source:'agent-center-preview',type:'error',message:event.message},'*')});window.addEventListener('unhandledrejection',function(event){window.parent.postMessage({source:'agent-center-preview',type:'error',message:String(event.reason)},'*')});${audit}<\/script></head><body>${html}<script>${js.replace(/<\/script/gi, '<\\/script')}<\/script></body></html>`;
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
  const [previewIssues, setPreviewIssues] = useState<string[]>([]);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewPage, setPreviewPage] = useState('index.html');
  const [expandedPreview, setExpandedPreview] = useState(false);
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [mode, setMode] = useState<'create' | 'edit'>(() => localStorage.getItem(STORAGE_KEY) ? 'edit' : 'create');
  const [projectType, setProjectType] = useState<'site' | 'app'>(() => localStorage.getItem(PROJECT_TYPE_KEY) === 'app' ? 'app' : 'site');
  const [projectId, setProjectId] = useState(() => { const id = localStorage.getItem(PROJECT_ID_KEY) || `project_${crypto.randomUUID()}`; localStorage.setItem(PROJECT_ID_KEY, id); return id; });
  const [conversation, setConversation] = useState<ConversationMessage[]>(loadConversation);
  const [proposalMode, setProposalMode] = useState<'create' | 'edit'>('edit');
  const [proposalType, setProposalType] = useState<'site' | 'app'>('site');
  const [backendStatus, setBackendStatus] = useState('');
  const [providers, setProviders] = useState<ProviderConnection[]>([]);
  const [providerId, setProviderId] = useState('');
  const [modelId, setModelId] = useState('');
  const previewRef = useRef<HTMLIFrameElement>(null);
  const expandedPreviewRef = useRef<HTMLIFrameElement>(null);
  const dirty = useMemo(() => JSON.stringify(files) !== JSON.stringify(previewFiles), [files, previewFiles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  }, [files]);
  useEffect(() => { localStorage.setItem(PROJECT_TYPE_KEY, projectType); }, [projectType]);
  useEffect(() => { localStorage.setItem(CONVERSATION_KEY, JSON.stringify(conversation)); }, [conversation]);
  useEffect(() => {
    if (projectType !== 'app' || !files['app.json']) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/code/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ files }) });
        const result = await response.json();
        setBackendStatus(response.ok && result.ok ? 'Dados conectados e salvos neste computador' : result.error?.message || 'Revise o app.json');
      } catch { setBackendStatus('Backend local indisponível'); }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [files, projectId, projectType]);
  useEffect(() => {
    fetch('/api/providers').then(response => response.json()).then(result => {
      const valid = (Array.isArray(result.data) ? result.data : []).filter((item: ProviderConnection) => item.status === 'valid' && item.selected_chat_model);
      setProviders(valid);
      const preferred = valid.find((item: ProviderConnection) => item.provider === 'gemini') || valid[0];
      if (preferred) {
        setProviderId(preferred.id);
        const available = (preferred.available_models || []).map((item: string | { id: string }) => typeof item === 'string' ? item : item.id);
        const savedModel = localStorage.getItem(MODEL_KEY);
        const qualityModel = preferred.provider === 'gemini' && available.includes('gemini-2.5-pro') ? 'gemini-2.5-pro' : preferred.selected_chat_model || '';
        setModelId(savedModel && available.includes(savedModel) ? savedModel : qualityModel);
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
      if (event.source !== previewRef.current?.contentWindow && event.source !== expandedPreviewRef.current?.contentWindow) return;
      if (event.data?.source === 'agent-center-preview' && event.data.type === 'error') setPreviewError(String(event.data.message).slice(0, 500));
      if (event.data?.source === 'agent-center-preview' && event.data.type === 'audit' && Array.isArray(event.data.issues)) setPreviewIssues(event.data.issues.map((issue: unknown) => String(issue).slice(0, 200)).slice(0, 3));
      if (event.data?.source !== 'agent-center-data') return;
      const { requestId, action, collection, id, record } = event.data;
      if (typeof requestId !== 'string' || !['list', 'create', 'update', 'remove'].includes(action) || !/^[a-z][a-z0-9_]{1,31}$/.test(collection || '') || (id && !/^[a-zA-Z0-9_-]{8,80}$/.test(id))) return;
      const source = event.source as Window;
      if (projectType !== 'app' || proposal && action !== 'list') {
        source.postMessage({ source: 'agent-center-data-result', requestId, ok: false, error: 'Aplique a proposta antes de alterar os dados.' }, '*');
        return;
      }
      const base = `/api/code/projects/${projectId}/collections/${collection}`;
      const method = { list: 'GET', create: 'POST', update: 'PATCH', remove: 'DELETE' }[action as 'list' | 'create' | 'update' | 'remove'];
      fetch(base + (id ? `/${id}` : ''), { method, headers: { 'Content-Type': 'application/json' }, ...(record ? { body: JSON.stringify(record) } : {}) })
        .then(async response => { const result = await response.json(); source.postMessage({ source: 'agent-center-data-result', requestId, ok: response.ok && result.ok, data: result.data, error: result.error?.message }, '*'); })
        .catch(() => source.postMessage({ source: 'agent-center-data-result', requestId, ok: false, error: 'Backend local indisponível' }, '*'));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [projectId, projectType, proposal]);
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
    if (!/^[a-zA-Z0-9_-]+\.(html|css|js)$/.test(cleanName)) {
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
    setPreviewError('');
    setPreviewIssues([]);
    setProposal(null);
    setAgentBusy(true);
    const prompt = agentPrompt.trim();
    const creating = mode === 'create' || (conversation.length === 0 && /^(crie|quero|preciso|desenvolva|monte|construa)\b/i.test(prompt)) || /\b(novo projeto|do zero|substitua o projeto)\b/i.test(prompt);
    const requestedMode = creating ? 'create' : 'edit';
    const requestedType = inferProjectType(prompt, projectType, creating);
    setConversation(previous => [...previous, { role: 'user' as const, text: prompt }].slice(-20));
    try {
      const response = await fetch('/api/code/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'workspace_123', prompt, history: conversation.slice(-8), files, mode: requestedMode, projectType: requestedType, providerConnectionId: providerId, modelId })
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error?.message || 'O agente não conseguiu preparar a alteração.');
      setProposal(body.data);
      if (body.data.model && body.data.model !== modelId) { setModelId(body.data.model); localStorage.setItem(MODEL_KEY, body.data.model); }
      setProposalMode(requestedMode);
      setProposalType(requestedType);
      setConversation(previous => [...previous, { role: 'agent' as const, text: body.data.summary }].slice(-20));
      setStatus('Proposta recebida. Revise os arquivos antes de aplicar.');
    } catch (error: any) {
      setAgentError(error.message || 'Falha ao consultar o agente de código.');
      setConversation(previous => [...previous, { role: 'agent' as const, text: error.message || 'Não consegui gerar agora. Tente novamente.' }].slice(-20));
    } finally {
      setAgentBusy(false);
    }
  };

  const repairProposal = async () => {
    if (!proposal || (!previewError && !previewIssues.length)) return;
    setAgentBusy(true);
    setAgentError('');
    const brokenFiles = { ...shownFiles };
    try {
      const response = await fetch('/api/code/assist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'workspace_123', prompt: `Corrija os problemas da prévia: ${[previewError, ...previewIssues].filter(Boolean).join(' ')}. Mantenha o projeto e a direção visual. Verifique contraste, seletores DOM, inicialização e chamadas de dados.`, files: brokenFiles, mode: 'edit', projectType: proposalType, providerConnectionId: providerId, modelId })
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error?.message || 'Não foi possível corrigir a prévia.');
      const repairedFiles = { ...brokenFiles, ...Object.fromEntries((body.data.changes as CodeProposal['changes']).map(change => [change.name, change.after])) };
      const changes = Object.entries(repairedFiles).filter(([name, content]) => content !== files[name]).map(([name, after]) => ({ name, before: files[name], after }));
      setProposal({ ...body.data, summary: `Prévia corrigida: ${body.data.summary}`, changes });
      setPreviewError('');
      setPreviewIssues([]);
      setStatus('Correção gerada. Revise a prévia antes de aplicar.');
    } catch (error: any) { setAgentError(error.message || 'Falha ao corrigir a prévia.'); }
    finally { setAgentBusy(false); }
  };

  const applyProposal = () => {
    if (!proposal) return;
    if (previewError || previewIssues.length) { setAgentError('A prévia apresentou um problema. Corrija antes de aplicar.'); return; }
    if (proposal.changes.some(change => files[change.name] !== change.before)) {
      setAgentError('Os arquivos mudaram após a proposta. Gere uma nova proposta antes de aplicar.');
      setProposal(null);
      return;
    }
    const nextFiles = { ...files, ...Object.fromEntries(proposal.changes.map(change => [change.name, change.after])) };
    if (proposalMode === 'create' && proposalType === 'site') delete nextFiles['app.json'];
    if (proposalMode === 'create') { const nextId = `project_${crypto.randomUUID()}`; localStorage.setItem(PROJECT_ID_KEY, nextId); setProjectId(nextId); }
    setProjectType(proposalType);
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
          <p className="mt-1 text-xs text-slate-600">Descreva sua ideia. O agente cria, mostra a prévia e ajusta com você.</p>
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
            <h2 className="text-sm font-bold text-slate-900">Converse sobre seu projeto</h2>
            <p className="mt-1 text-xs text-slate-600">Peça para criar, mudar ou corrigir. Revise o resultado na prévia.</p>
          </div>
          <span className="code-builder-model-badge">{selectedProvider ? `${selectedProvider.provider} · ${modelId}` : 'Conecte um modelo'}</span>
        </div>
        <div className="code-chat-feed" aria-label="Conversa do projeto">{conversation.length ? conversation.map((message, index) => <div key={index} className={`code-chat-message ${message.role}`}><strong>{message.role === 'user' ? 'Você' : 'Agent Center'}</strong><p>{message.text}</p></div>) : <div className="code-chat-empty"><Sparkles className="h-5 w-5" /><strong>O que vamos criar?</strong><p>Conte sua ideia em linguagem natural. Se precisar guardar dados, o agente prepara isso no projeto.</p></div>}{agentBusy && <div className="code-chat-message agent code-chat-thinking" role="status"><strong>Agent Center</strong><p>Definindo direção visual e construindo a prévia<span aria-hidden="true">…</span></p></div>}</div>
        {projectType === 'app' && backendStatus && <p className="text-xs text-slate-500">{backendStatus}</p>}
        <textarea aria-label="Mensagem para o agente de código" value={agentPrompt} onChange={event => setAgentPrompt(event.target.value)} rows={2} placeholder="Descreva o que quer criar ou peça uma mudança..." className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500" />
        <div className="code-builder-submit"><div><label htmlFor="code-model">Modelo</label><select id="code-model" value={modelId} onChange={event => { setModelId(event.target.value); localStorage.setItem(MODEL_KEY, event.target.value); }}>{availableModels.map(name => <option key={name} value={name}>{name}</option>)}</select></div><button type="button" onClick={requestProposal} disabled={agentBusy || agentPrompt.trim().length < 10 || !providerId || !modelId} className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{agentBusy ? 'Criando...' : <><ArrowUp className="h-4 w-4" /> Enviar</>}</button></div>
        {modelId === 'gemini-2.5-pro' && <p className="code-builder-hint">Modelo escolhido para melhor qualidade visual; usa mais cota da sua API.</p>}
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
          {(previewError || previewIssues.length > 0) && <p role="alert" className="text-xs text-red-700">A prévia precisa de ajuste: {[previewError, ...previewIssues].filter(Boolean).join(' ')}</p>}
          <div className="flex flex-wrap gap-2"><button type="button" onClick={applyProposal} disabled={!!previewError || !!previewIssues.length || agentBusy} className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Aplicar mudanças</button>{(previewError || previewIssues.length > 0) && <button type="button" onClick={repairProposal} disabled={agentBusy} className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Corrigir com agente</button>}<button type="button" onClick={() => { setProposal(null); setPreviewError(''); setPreviewIssues([]); }} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">Descartar</button></div>
        </div>}
      </section>
      <div className={`code-builder-workspace ${view === 'code' ? 'show-code' : ''}`}>
        <div className="code-builder-tabs"><div role="tablist" aria-label="Visualização do projeto"><button role="tab" aria-selected={view === 'preview'} className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}>Prévia</button><button role="tab" aria-selected={view === 'code'} className={view === 'code' ? 'active' : ''} onClick={() => setView('code')}>Código</button></div><span>{previewError || previewIssues.length ? 'Prévia precisa de ajuste' : 'Prévia local · salva automaticamente'}</span></div>
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
