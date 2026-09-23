# Control de formación obligatoria

Pequeña herramienta local para revisar, desde una sola pantalla, el estado de los cursos obligatorios de una persona en Click2Learn.

> Proyecto experimental para agilizar una comprobación manual. No envía correos ni modifica expedientes.

## Qué hace

- Abre Click2Learn en una ventana Edge controlada por Playwright.
- Permite autenticar SSO y MFA manualmente, sin guardar contraseñas.
- Consulta el expediente usando el `TargetUser` interno de Click2Learn.
- Comprueba 11 cursos obligatorios.
- Reconoce `Terminado` y `Equivalente completado` como estados válidos.
- Detecta títulos con información adicional, como fechas de sesiones.
- Muestra un resumen de cursos completados, pendientes o no encontrados.
- Identifica claramente los errores de permisos.

## Requisitos

- Node.js 24 o compatible.
- npm.
- Microsoft Edge.
- Una cuenta autorizada para consultar los expedientes correspondientes.

Playwright se ejecuta usando el Edge instalado en el equipo. No es necesario descargar Chromium.

## Puesta en marcha

```powershell
npm install
npm start
```

Configura las URLs locales en `.env`; usa `.env.example` como plantilla. Ese archivo no se versiona.

Abre [http://localhost:3000](http://localhost:3000).

1. Pulsa **Abrir sesión de Click2Learn**.
2. Completa SSO y MFA en la ventana de Edge si se solicitan.
3. Introduce el `TargetUser` interno del expediente.
4. Pulsa **Comprobar expediente**.

El número corporativo o de empleado puede ser distinto del `TargetUser`. El identificador debe proceder de una fuente autorizada de Click2Learn.

## Cursos comprobados

La lista actual incluye:

- Básicos de Seguridad
- AI for all
- ESAFÍO SOPRASTERIA IA
- APPLICATION SECURITY INTRODUCTION
- Datos de carácter personal: ¿cómo se protegen en Sopra Steria?
- Igualdad de género en el trabajo: una responsabilidad compartida
- La sostenibilidad digital
- Plan de Emergencia y Evacuación
- Prevención Riesgos Laborales (PVD)
- Recorrido Prevención de la corrupción
- SEGURIDAD DE LA INFORMACION: ¡SIEMPRE CON PRECAUCION!

## Privacidad y permisos

La herramienta no escribe credenciales, tokens ni datos de usuarios en el código. La sesión de navegador se almacena localmente en `.playwright-profile/` y puede contener cookies y datos personales del navegador; esa carpeta está excluida de Git y debe eliminarse al terminar una sesión compartida.

El proyecto respeta los permisos de Click2Learn. Si la plataforma muestra **Área restringida**, la aplicación informa de que la cuenta no tiene autorización para consultar ese expediente; no intenta evitar la restricción.

## Desarrollo

```powershell
npm test
node --check server.js
```

La aplicación usa un servidor Node.js ligero y una interfaz HTML/CSS/JavaScript sin framework. El endpoint de sesión abre el navegador y el endpoint de comprobación realiza la comparación de cursos.

## Estado del proyecto

Esta es una primera versión orientada a consultas individuales. El envío automático de correos no está implementado: cualquier comunicación debe pasar por una revisión y confirmación humana, además de contar con autorización organizativa.