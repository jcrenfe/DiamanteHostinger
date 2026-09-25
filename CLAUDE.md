# Reglas de trabajo en este proyecto

## 1. Trabajar solo sobre la versión local
- Todos los cambios (código, archivos, base de datos local en Docker) se hacen únicamente en la versión local.
- **No desplegar ni tocar producción** (Hostinger: `api.thewayweb.com`, `desayuno.thewayweb.com`, su base de datos, variables de entorno, cron, Stripe, Google Cloud, Firebase) salvo que el usuario lo pida expresamente en ese mensaje.
- Cuando el usuario pide desplegar, esa petición autoriza ese despliegue concreto; no se convierte en permiso permanente.

## 2. No hacer pruebas en cada modificación
- Tras cambiar código no lanzar pruebas automáticas (`npm test`, Karma), ni peticiones `curl`, ni navegador con Playwright, ni crear pedidos o datos de prueba, salvo que el usuario lo pida expresamente («pruébalo», «verifícalo», «compruébalo»…).
- Sí es aceptable compilar o construir (`ng build`) para detectar errores de sintaxis antes de dar por terminado un cambio.
- Al terminar: explicar qué se cambió y dejar que el usuario lo pruebe y dé indicaciones.
- Si el usuario pide una prueba concreta, hacer solo esa prueba y no ampliarla por iniciativa propia.

## Notas del proyecto
- Backend: Node/Express en `backend/` (pruebas con `npm test`). Frontend: Angular en `frontend/` (pruebas con `ng test`).
- Base de datos local: contenedor Docker `diamante_mysql`, puerto 3307.
- Los volcados de la base (`backups/`) y los paquetes de despliegue (`release/`) contienen datos sensibles y no se suben a git.
