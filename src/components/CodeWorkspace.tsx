import { useEffect, useMemo, useState } from 'react';
import { Code2, FilePlus2, Play, RotateCcw, Save, Trash2 } from 'lucide-react';

type ProjectFiles = Record<string, string>;
type CodeProposal = { summary: string; changes: { name: string; before: string; after: string }[]; provider: string; model: string };

const STORAGE_KEY = 'agent-center-code-workspace-v1';
const STARTER_FILES: ProjectFiles = {
  'index.html': '<main class="card">\n  <span class="eyebrow">Agent Center</span>\n  <h1>Seu projeto começa aqui.</h1>\n  <p>Edite os arquivos ao lado e clique em Executar.</p>\n  <button id="hello">Testar interação</button>\n</main>',
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

function buildPreview(files: ProjectFiles): string {
  const html = files['index.html'] || '';
  const css = files['styles.css'] || '';
  const js = files['script.js'] || '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'"><style>${css.replace(/<\/style/gi, '<\\/style')}</style></head><body>${html}<script>${js.replace(/<\/script/gi, '<\\/script')}<\/script></body></html>`;
}

export default function CodeWorkspace() {
  const [files, setFiles] = useState<ProjectFiles>(loadFiles);
  const [activeFile, setActiveFile] = useState('index.html');
  const [previewFiles, setPreviewFiles] = useState<ProjectFiles>(() => loadFiles());
  const [status, setStatus] = useState('Projeto pronto');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [proposal, setProposal] = useState<CodeProposal | null>(null);
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentError, setAgentError] = useState('');
  const dirty = useMemo(() => JSON.stringify(files) !== JSON.stringify(previewFiles), [files, previewFiles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  }, [files]);

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
    setStatus('Arquivo removido.');
  };

  const run = () => {
    setPreviewFiles({ ...files });
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
        body: JSON.stringify({ workspaceId: 'workspace_123', prompt: agentPrompt, files })
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
    setFiles(previous => ({ ...previous, ...Object.fromEntries(proposal.changes.map(change => [change.name, change.after])) }));
    setActiveFile(proposal.changes[0].name);
    setProposal(null);
    setStatus('Alterações aplicadas e salvas. Clique em Executar para atualizar a prévia.');
  };

  return (
    <div className="flex h-full min-h-[680px] flex-col gap-4 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-950"><Code2 className="h-5 w-5 text-cyan-600" /> Agent Center Code</h1>
          <p className="mt-1 text-xs text-slate-600">Edite e execute um projeto web local. Seus arquivos ficam salvos neste navegador.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { setFiles({ ...STARTER_FILES }); setActiveFile('index.html'); setStatus('Projeto inicial restaurado. Clique em Executar para atualizar a prévia.'); }} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RotateCcw className="h-3.5 w-3.5" /> Restaurar exemplo</button>
          <button type="button" onClick={run} className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"><Play className="h-3.5 w-3.5" /> Executar</button>
        </div>
      </div>
      <section className="rounded-xl bg-white p-4 shadow-sm" aria-label="Agente de programação">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Pedir alteração ao agente</h2>
            <p className="mt-1 text-xs text-slate-600">O código do projeto será enviado ao provedor de IA que você configurar. Nenhuma mudança é aplicada sem sua revisão.</p>
          </div>
          <button type="button" onClick={requestProposal} disabled={agentBusy || agentPrompt.trim().length < 10} className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{agentBusy ? 'Preparando proposta...' : 'Gerar proposta'}</button>
        </div>
        <textarea aria-label="Instrução para o agente de código" value={agentPrompt} onChange={event => setAgentPrompt(event.target.value)} rows={2} placeholder="Ex.: Transforme a página em um portfólio pessoal com botão de contato." className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500" />
        {agentError && <p role="alert" className="mt-2 text-xs text-red-700">{agentError}</p>}
        {proposal && <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          <p className="text-sm font-semibold text-slate-900">{proposal.summary}</p>
          <p className="text-xs text-slate-600">Proposta de {proposal.provider} / {proposal.model}. Confira antes de aplicar.</p>
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
      <div className="grid min-h-[600px] flex-1 grid-cols-1 overflow-hidden rounded-2xl bg-[#0b1020] lg:grid-cols-[190px_minmax(300px,1fr)_minmax(300px,1fr)]">
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
        <section className="flex min-h-[350px] flex-col bg-white" aria-label="Prévia do projeto">
          <div className="flex h-11 items-center justify-between border-b border-slate-200 px-4 text-xs font-semibold text-slate-700"><span>Prévia</span><span className={dirty ? 'text-amber-700' : 'text-emerald-700'}>{dirty ? 'Atualize para ver mudanças' : 'Atualizada'}</span></div>
          <iframe key={buildPreview(previewFiles)} title="Prévia isolada do projeto" sandbox="allow-scripts" srcDoc={buildPreview(previewFiles)} className="min-h-[300px] w-full flex-1 border-0" />
        </section>
      </div>
    </div>
  );
}
