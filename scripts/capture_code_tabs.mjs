import fs from 'node:fs/promises';

const tabs = await fetch('http://127.0.0.1:18800/json').then((r) => r.json());
const page = tabs.find((item) => item.type === 'page');
if (!page) throw new Error('Nenhuma pagina Chromium encontrada');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let id = 0;
const pending = new Map();
ws.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const requestId = ++id;
  pending.set(requestId, { resolve, reject });
  ws.send(JSON.stringify({ id: requestId, method, params }));
});

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 980, deviceScaleFactor: 1, mobile: false });

await evaluate(`(() => {
  localStorage.setItem('lyriq_workspace_mode', 'personal');
  const profile = JSON.parse(localStorage.getItem('lyriq_company_profile') || '{}');
  localStorage.setItem('lyriq_company_profile', JSON.stringify({ ...profile, plan: 'free', setupComplete: true }));
  location.reload();
})()`);
await new Promise((resolve) => setTimeout(resolve, 1800));

await evaluate(`(() => {
  const elements = [...document.querySelectorAll('button')];
  const code = elements.find((el) => el.textContent.includes('Lyriq Code'));
  if (!code) throw new Error('Botao Lyriq Code nao encontrado');
  code.click();
})()`);
await new Promise((resolve) => setTimeout(resolve, 700));

await fs.mkdir('screenshots_code_tabs', { recursive: true });
const names = ['Code', 'Apps', 'Web', 'Games'];
for (let index = 0; index < names.length; index += 1) {
  const name = names[index];
  await evaluate(`(() => {
    const candidates = [...document.querySelectorAll('button')];
    const tab = candidates.find((el) => el.textContent.trim() === ${JSON.stringify(name)});
    if (!tab) throw new Error('Aba ${name} nao encontrada');
    tab.click();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(`screenshots_code_tabs/0${index + 1}-${name.toLowerCase()}.png`, Buffer.from(screenshot.data, 'base64'));
}

ws.close();
console.log('Capturas concluídas:', names.join(', '));
