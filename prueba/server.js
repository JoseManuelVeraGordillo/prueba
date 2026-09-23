const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PROFILE_DIR = path.join(ROOT, '.playwright-profile');
const EDGE_PATHS = [
  process.env.PLAYWRIGHT_BROWSER,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);
const TRANSCRIPT_URL = 'https://soprasteria.csod.com/phnx/driver.aspx?routename=Social/UniversalProfile/Transcript&TargetUser=';

const REQUIRED_COURSES = [
  'Básicos de Seguridad',
  'AI for all',
  'ESAFÍO SOPRASTERIA IA',
  'APPLICATION SECURITY INTRODUCTION',
  'Datos de carácter personal: ¿cómo se protegen en Sopra Steria?',
  'Igualdad de género en el trabajo: una responsabilidad compartida',
  'La sostenibilidad digital',
  'Plan de Emergencia y Evacuación',
  'Prevención Riesgos Laborales (PVD)',
  'Recorrido Prevención de la corrupción',
  'SEGURIDAD DE LA INFORMACION: ¡SIEMPRE CON PRECAUCION!',
];

let browserContext;

async function getContext() {
  if (browserContext) {
    try {
      const browser = browserContext.browser();
      if (!browser || !browser.isConnected()) browserContext = undefined;
    } catch {
      browserContext = undefined;
    }
  }
  if (!browserContext) {
    const executablePath = EDGE_PATHS.find(fs.existsSync);
    const launchOptions = {
      headless: false,
      viewport: { width: 1440, height: 1000 },
    };
    if (executablePath) launchOptions.executablePath = executablePath;
    browserContext = await chromium.launchPersistentContext(PROFILE_DIR, launchOptions);
    browserContext.once('close', () => { browserContext = undefined; });
  }
  return browserContext;
}

async function openLogin() {
  const context = await getContext();
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://soprasteria.csod.com/samldefault.aspx?ouid=2&returnurl=%252fDeepLink%252fProcessRedirect.aspx%253fmodule%253d22', { waitUntil: 'domcontentloaded' });
  return { message: 'Navegador abierto. Completa el inicio de sesión si lo solicita.' };
}

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

async function checkUser(userId) {
  if (!/^\d+$/.test(userId)) {
    throw new Error('El identificador debe ser numérico, como el TargetUser de Click2Learn.');
  }

  const context = await getContext();
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://soprasteria.csod.com/ui/lms-learner-home/home', { waitUntil: 'domcontentloaded' });
  const homeUrl = page.url();

  const loginVisible = await page.getByRole('heading', { name: /sign in|welcome|iniciar sesión/i }).count();
  if (loginVisible) {
    throw new Error('Click2Learn no está autenticado en el perfil de Playwright. Pulsa "Abrir sesión" y autentícate manualmente.');
  }

  await page.goto(`${TRANSCRIPT_URL}${userId}`, { waitUntil: 'domcontentloaded' });

  const pageText = await page.locator('body').innerText().catch(() => '');
  if (/área restringida|no tiene el permiso necesario|forbidden|permission/i.test(pageText)) {
    throw new Error(`Click2Learn ha denegado el acceso al expediente ${userId}. La cuenta autenticada no tiene permisos para consultar ese usuario.`);
  }

  try {
    const results = [];
    const searchBox = page.getByRole('textbox', { name: 'Buscar por palabra clave' });
    if (!await searchBox.count()) {
      throw new Error(`No se encontró el expediente para ${userId}. La sesión llegó a "${await page.title()}" (${page.url()}); la página inicial era ${homeUrl}. Comprueba permisos de consulta para ese usuario.`);
    }

    for (const course of REQUIRED_COURSES) {
      await searchBox.fill(course);
      await searchBox.press('Enter');
      const escapedCourse = course.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exactLink = page.getByRole('link', { name: new RegExp(`^${escapedCourse}(?:\\s+\\([^)]*\\))? Details$`, 'i') });
      try {
        await exactLink.first().waitFor({ state: 'visible', timeout: 7000 });
      } catch {
        // The search can return no exact match; the result is recorded below.
      }

      const record = exactLink.first().locator('xpath=ancestor::li[1]');
      const text = await record.count() ? (await record.innerText()).replace(/\s+/g, ' ').trim() : '';
      const completed = /Estado de la formación\s*:\s*Terminado/i.test(text);
      const equivalent = /Equivalente completado/i.test(text);
      results.push({ course, status: text ? (completed ? (equivalent ? 'Equivalente completado' : 'Terminado') : 'Pendiente o no terminado') : 'No encontrado', detail: text });
    }

    return { userId, checkedAt: new Date().toISOString(), results };
  } finally {
    await browserContext?.close();
    browserContext = undefined;
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function serveFile(response, fileName, contentType) {
  fs.readFile(path.join(ROOT, 'public', fileName), (error, data) => {
    if (error) return sendJson(response, 404, { error: 'Not found' });
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(data);
  });
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'GET' && request.url === '/') return serveFile(response, 'index.html', 'text/html; charset=utf-8');
    if (request.method === 'GET' && request.url === '/styles.css') return serveFile(response, 'styles.css', 'text/css; charset=utf-8');
    if (request.method === 'GET' && request.url === '/app.js') return serveFile(response, 'app.js', 'text/javascript; charset=utf-8');
    if (request.method === 'POST' && request.url === '/api/session') return sendJson(response, 200, await openLogin());
    if (request.method === 'POST' && request.url === '/api/check') {
      let body = '';
      request.on('data', chunk => { body += chunk; });
      request.on('end', async () => {
        try {
          const input = JSON.parse(body || '{}');
          sendJson(response, 200, await checkUser(String(input.userId || '').trim()));
        } catch (error) {
          sendJson(response, 400, { error: error.message });
        }
      });
      return;
    }
    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

server.listen(PORT, () => console.log(`Course checker: http://localhost:${PORT}`));

process.on('SIGINT', async () => {
  if (browserContext) await browserContext.close();
  server.close(() => process.exit(0));
});