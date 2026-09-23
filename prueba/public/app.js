const requiredCourses = 11;
const message = document.querySelector('#message');
const checkButton = document.querySelector('#checkButton');
const sessionButton = document.querySelector('#sessionButton');
const summary = document.querySelector('#summary');
const results = document.querySelector('#results');
const emailPanel = document.querySelector('#emailPanel');
const draftButton = document.querySelector('#draftButton');
let lastReport;

function setBusy(button, busy, label) { button.disabled = busy; if (busy) button.dataset.label = button.textContent; button.textContent = busy ? label : button.dataset.label; }

function clearPreviousReport() {
  lastReport = undefined;
  summary.hidden = true;
  results.hidden = true;
  emailPanel.hidden = true;
  document.querySelector('#recipient').value = '';
}

sessionButton.addEventListener('click', async () => {
  clearPreviousReport();
  setBusy(sessionButton, true, 'Abriendo navegador...');
  try { const response = await fetch('/api/session', { method:'POST' }); const data = await response.json(); message.textContent = data.message || data.error; }
  catch (error) { message.textContent = error.message; }
  finally { setBusy(sessionButton, false); }
});

checkButton.addEventListener('click', async () => {
  const userId = document.querySelector('#userId').value.trim();
  if (!userId) { message.textContent = 'Introduce el identificador del usuario.'; return; }
  clearPreviousReport();
  setBusy(checkButton, true, 'Consultando...');
  try {
    const response = await fetch('/api/check', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ userId }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    const completed = data.results.filter(item => item.status === 'Terminado' || item.status === 'Equivalente completado').length;
    const pending = data.results.length - completed;
    summary.innerHTML = `<div class="metric"><strong>${completed}</strong><span>completados</span></div><div class="metric"><strong>${pending}</strong><span>pendientes o no encontrados</span></div><div class="metric"><strong>${data.results.length}</strong><span>revisados</span></div>`;
    results.innerHTML = `<h2>Resultado del expediente ${data.userId}</h2>${data.results.map(item => `<article class="course"><div><div class="course-name"></div><div class="course-detail"></div></div><span class="status"></span></article>`).join('')}`;
    data.results.forEach((item, index) => { const article = results.querySelectorAll('.course')[index]; article.querySelector('.course-name').textContent = item.course; article.querySelector('.course-detail').textContent = item.detail || 'No aparece en el expediente consultado.'; const status = article.querySelector('.status'); status.textContent = item.status; status.classList.add(item.status.includes('Terminado') ? 'ok' : 'warn'); });
    lastReport = data; summary.hidden = false; results.hidden = false; emailPanel.hidden = false; message.textContent = 'Consulta completada. El navegador de Click2Learn se ha cerrado y no se ha enviado ningún correo.';
  } catch (error) { message.textContent = error.message; }
  finally { setBusy(checkButton, false); }
});

draftButton.addEventListener('click', () => {
  const recipient = document.querySelector('#recipient').value.trim();
  const emailMessage = document.querySelector('#emailMessage');
  if (!lastReport) { emailMessage.textContent = 'Primero consulta un expediente.'; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) { emailMessage.textContent = 'Introduce un correo válido.'; return; }
  const completed = lastReport.results.filter(item => item.status === 'Terminado' || item.status === 'Equivalente completado');
  const pending = lastReport.results.filter(item => !completed.includes(item));
  const subject = `Estado de formación obligatoria - ${lastReport.userId}`;
  const body = [
    'Hola,', '',
    'Te enviamos el resultado de la revisión de formación obligatoria.',
    `Cursos completados: ${completed.length} de ${lastReport.results.length}.`,
    '', 'Detalle:',
    ...lastReport.results.map(item => `- ${item.course}: ${item.status}`),
    '', 'Este mensaje se ha preparado como borrador para revisión antes del envío.',
  ].join('\n');
  const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(recipient)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(outlookUrl, '_blank', 'noopener');
  emailMessage.textContent = `Borrador preparado para ${recipient}. Revisa el contenido antes de enviarlo.`;
});