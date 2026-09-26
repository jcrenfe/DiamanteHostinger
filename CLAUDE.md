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
- Backend: Node/Express en `backend/`. Frontend: Angular en `frontend/` (pruebas con `ng test`).
- Base de datos: TODO el acceso pasa por Prisma 7 (`backend/src/config/prisma.js`, adaptador MariaDB, válido para el MySQL local y el MariaDB de producción). No usar `mysql2` ni SQL a mano en la aplicación. Las operaciones que no pueden solaparse (reservar hora, confirmar pagos) usan `withLock(nombre, async (tx) => …)` y hacen todas sus consultas con `tx`.
- Cambios de estructura: editar `backend/prisma/schema.prisma` y crear una migración en `backend/prisma/migrations/` (`npx prisma migrate dev --create-only` o `prisma migrate diff`). En producción se aplican con `npx prisma migrate deploy`. Nunca `prisma migrate reset` sin permiso expreso del usuario.
- Base de datos local: contenedor Docker `diamante_mysql`, puerto 3307 (base `diamante_db`).
- Pruebas del backend (`npm test`): se ejecutan contra la base `diamante_test` del mismo contenedor; `npm run test:mariadb` repite la batería en el contenedor `diamante_mariadb_test` (MariaDB 11.8, puerto 3308), el motor de producción. `tests/golden.test.js` compara las respuestas de todos los endpoints con `tests/__snapshots__/golden.json`; si un cambio de comportamiento es intencionado, regenerar con `UPDATE_SNAPSHOTS=1`.
- Hostinger necesita Node 22 para Prisma 7 (`engines` en `backend/package.json`; si un despliegue por archivo elige Node 20, relanzar la compilación con Node 22).
- Los volcados de la base (`backups/`) y los paquetes de despliegue (`release/`) contienen datos sensibles y no se suben a git.
