const requiredCourses = 11;
const message = document.querySelector('#message');
const checkButton = document.querySelector('#checkButton');
const sessionButton = document.querySelector('#sessionButton');
const summary = document.querySelector('#summary');
const results = document.querySelector('#results');

function setBusy(button, busy, label) { button.disabled = busy; if (busy) button.dataset.label = button.textContent; button.textContent = busy ? label : button.dataset.label; }

sessionButton.addEventListener('click', async () => {
  setBusy(sessionButton, true, 'Abriendo navegador...');
  try { const response = await fetch('/api/session', { method:'POST' }); const data = await response.json(); message.textContent = data.message || data.error; }
  catch (error) { message.textContent = error.message; }
  finally { setBusy(sessionButton, false); }
});

checkButton.addEventListener('click', async () => {
  const userId = document.querySelector('#userId').value.trim();
  if (!userId) { message.textContent = 'Introduce el identificador del usuario.'; return; }
  setBusy(checkButton, true, 'Consultando...'); summary.hidden = true; results.hidden = true;
  try {
    const response = await fetch('/api/check', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ userId }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    const completed = data.results.filter(item => item.status === 'Terminado' || item.status === 'Equivalente completado').length;
    const pending = data.results.length - completed;
    summary.innerHTML = `<div class="metric"><strong>${completed}</strong><span>completados</span></div><div class="metric"><strong>${pending}</strong><span>pendientes o no encontrados</span></div><div class="metric"><strong>${data.results.length}</strong><span>revisados</span></div>`;
    results.innerHTML = `<h2>Resultado del expediente ${data.userId}</h2>${data.results.map(item => `<article class="course"><div><div class="course-name"></div><div class="course-detail"></div></div><span class="status"></span></article>`).join('')}`;
    data.results.forEach((item, index) => { const article = results.querySelectorAll('.course')[index]; article.querySelector('.course-name').textContent = item.course; article.querySelector('.course-detail').textContent = item.detail || 'No aparece en el expediente consultado.'; const status = article.querySelector('.status'); status.textContent = item.status; status.classList.add(item.status.includes('Terminado') ? 'ok' : 'warn'); });
    summary.hidden = false; results.hidden = false; message.textContent = 'Consulta completada. No se ha enviado ningún correo.';
  } catch (error) { message.textContent = error.message; }
  finally { setBusy(checkButton, false); }
});