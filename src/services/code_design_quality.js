export function reviewGeneratedDesign({ html = '', css = '', script = '', creating = false, appProject = false }) {
  const issues = [];
  if (!creating) return issues;
  if (/body\s*\{[^}]*place-items\s*:\s*center/is.test(css)) issues.push('a página inteira está centralizada como um cartão');
  if (!appProject) {
    if (/<a\b[^>]*href\s*=\s*["']#["'][^>]*>\s*(?:<[^>]+>\s*)*(?:ver|saiba|conheça|explore|contato|abrir|acessar)\b/i.test(html)) {
      issues.push('há um link de ação que aponta apenas para #; conecte-o a uma seção real ou remova a ação');
    }
    if (/\(XX\)|\(00\)\s*0000|contato@example\.com/i.test(html)) issues.push('há dados de contato fictícios apresentados como reais');
  }
  if (appProject) {
    if (!/<(?:header|nav|aside)\b/i.test(html) || !/<main\b/i.test(html)) issues.push('o app precisa de navegação e área principal claras');
    if (/\p{Extended_Pictographic}/u.test(html)) issues.push('não use emojis como ícones; crie controles tipográficos ou ícones SVG simples');
    if (!/:(?:focus-visible|focus)\b/i.test(css)) issues.push('faltam estados de foco para teclado');
    if (!/@media\s*\(/i.test(css)) issues.push('falta layout responsivo');
    const smallRoot = /(?:\.container|\.app|\.wrapper|\.main-container)\s*\{[^}]*max-width\s*:\s*(?:[3-8]\d\d)px[^}]*\}/is.test(css);
    const floatingRoot = /(?:\.container|\.app|\.wrapper|\.main-container)\s*\{[^}]*(?:box-shadow|margin\s*:\s*(?:\d+\w*\s+)?auto)[^}]*\}/is.test(css);
    if (smallRoot && floatingRoot) issues.push('o app está preso em uma coluna estreita; use a largura disponível e regiões funcionais');
    if (/<(?:form)\b/i.test(html) && !/AgentCenter\.data\.(?:create|update)/.test(script)) issues.push('o formulário não grava dados no backend');
  }
  return issues;
}
