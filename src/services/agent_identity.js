export const AGENT_PURPOSES = ['personal', 'professional'];
export const AGENT_AUTONOMY = ['suggest', 'approve', 'bounded'];

export function normalizeAgentIdentity(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const clean = key => typeof source[key] === 'string' ? source[key].trim() : '';
  return {
    purpose: AGENT_PURPOSES.includes(source.purpose) ? source.purpose : 'personal',
    audience: clean('audience'),
    tone: clean('tone'),
    outputs: clean('outputs'),
    successCriteria: clean('successCriteria'),
    autonomy: AGENT_AUTONOMY.includes(source.autonomy) ? source.autonomy : 'suggest',
  };
}

export function isValidAgentIdentity(value) {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value.purpose !== undefined && !AGENT_PURPOSES.includes(value.purpose)) return false;
  if (value.autonomy !== undefined && !AGENT_AUTONOMY.includes(value.autonomy)) return false;
  return ['audience', 'tone', 'outputs', 'successCriteria'].every(key => value[key] === undefined || (typeof value[key] === 'string' && value[key].length <= 2000));
}

export function evaluateAgentReadiness(agent, options = {}) {
  const identity = normalizeAgentIdentity(agent.identity);
  const checks = [
    { id: 'identity', label: 'Nome e função definidos', done: String(agent.name || '').trim().length >= 2 && String(agent.role || '').trim().length >= 3 },
    { id: 'mission', label: 'Missão e instruções claras', done: String(agent.instructions || '').trim().length >= 30 },
    { id: 'outputs', label: 'Entregas esperadas descritas', done: identity.outputs.length >= 10 },
    { id: 'success', label: 'Critério de sucesso definido', done: identity.successCriteria.length >= 10 },
    { id: 'boundaries', label: 'Limites de atuação definidos', done: String(agent.boundaries || '').trim().length >= 10 },
    { id: 'skills', label: 'Ao menos uma skill escolhida', done: Array.isArray(agent.installedSkills) && agent.installedSkills.length > 0 },
    { id: 'model', label: 'Modelo de IA conectado', done: !!agent.provider_connection_id && !!agent.model_id && options.providerValid !== false },
  ];
  if (identity.purpose === 'professional') checks.splice(2, 0, { id: 'audience', label: 'Público ou equipe definidos', done: identity.audience.length >= 3 });
  const prepared = checks.every(check => check.done);
  const tested = !!agent.last_tested_at;
  return { purpose: identity.purpose, checks, completed: checks.filter(check => check.done).length, total: checks.length, stage: !prepared ? 'configuring' : tested ? 'ready' : 'test', tested };
}
