export function stabilizeGeneratedSiteScript(script = '') {
  return script
    .replace(/([A-Za-z_$][\w$]*)\.style\.strokeDashoffset\s*=\s*[^;]+;/g, '$1.style.strokeDashoffset = 0;')
    .replace(/(\.style\.opacity\s*=\s*)['"]0['"]/g, '$1"1"');
}

export function reviewGeneratedDesign({ html = '', css = '', script = '', prompt = '', creating = false, appProject = false }) {
  const issues = [];
  if (!creating) return issues;
  if (/body\s*\{[^}]*place-items\s*:\s*center/is.test(css)) issues.push('a página inteira está centralizada como um cartão');
  if (!appProject) {
    if (/strokeDashoffset\s*=\s*(?:length|[^;]*getTotalLength\s*\()/i.test(script)) {
      issues.push('o desenho SVG começa invisível; mantenha a ilustração visível sem rolagem ou JavaScript');
    }
    if (/\.style\.opacity\s*=\s*['"]0['"]/i.test(script) && /IntersectionObserver|scroll/i.test(script)) {
      issues.push('conteúdo importante começa invisível até rolar; mantenha as seções legíveis antes da animação');
    }
    if (/<a\b[^>]*href\s*=\s*["']#["'][^>]*>\s*(?:<[^>]+>\s*)*(?:ver|saiba|conheça|explore|contato|abrir|acessar)\b/i.test(html)) {
      issues.push('há um link de ação que aponta apenas para #; conecte-o a uma seção real ou remova a ação');
    }
    if (/\(XX\)|\(00\)\s*0000|contato@example\.com/i.test(html)) issues.push('há dados de contato fictícios apresentados como reais');
    const inventedEmail = [...html.matchAll(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi)].map(match => match[0]).find(email => !prompt.toLocaleLowerCase().includes(email.toLocaleLowerCase()));
    if (inventedEmail) issues.push('há um e-mail de contato que o usuário não forneceu; não invente dados de contato');
    const contactSection = html.match(/<(?:section|footer)\b[^>]*\bid=["']contato["'][^>]*>([\s\S]*?)<\/(?:section|footer)>/i)?.[1];
    if (contactSection && !/\b(?:mailto:|tel:|<form\b|https?:\/\/)/i.test(contactSection)) {
      issues.push('a seção de contato não oferece um canal funcional; remova a chamada para contato se o usuário não forneceu um canal');
    }
    for (const section of html.matchAll(/<section\b[^>]*\bid=["']([^"']+)["'][^>]*>([\s\S]*?)<\/section>/gi)) {
      const [, sectionId, sectionHtml] = section;
      for (const anchor of sectionHtml.matchAll(/<a\b[^>]*\bhref=["']#([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
        const label = anchor[2].replace(/<[^>]+>/g, '').trim();
        if (anchor[1] === sectionId && /\b(detalhes?|iniciar|conversar|di[aá]logo|fale|solicitar|enviar|contato)\b/i.test(label)) {
          issues.push(`a ação "${label.slice(0, 40)}" volta para a mesma seção; conecte-a a um destino útil ou remova-a`);
        }
      }
    }
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
