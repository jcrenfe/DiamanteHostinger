# Utilidades de Migración de Imágenes

Esta carpeta contiene scripts para migrar las imágenes dinámicas (productos y ofertas) del Hosting estático de Firebase a Firebase Storage.

## Escenarios de Uso
Estos scripts son útiles cuando tienes imágenes servidas desde `assets/images/` y quieres moverlas a Storage para que sean editables desde el panel de administración sin necesidad de redesplegar el código.

## Instrucciones de Uso

### 1. Preparación de Seguridad (IMPORTANTE)
Antes de ejecutar los scripts, debes permitir la escritura en Storage temporalmente:
1. Modifica `storage.rules`:
   ```javascript
   allow read, write: if true;
   ```
2. Despliega las reglas: `firebase deploy --only storage`

### 2. Ejecutar Migración de Productos
1. Abre tu navegador en la sección de productos: `http://localhost:4200/admin/productos`
2. Abre la consola (F12).
3. Copia el contenido de `migrate_products_browser.js` y pégalo en la consola.
4. Pulsa Enter y espera a que termine.

### 3. Ejecutar Migración de Ofertas
1. Navega a la sección de ofertas: `http://localhost:4200/admin/ofertas`
2. Abre la consola (F12).
3. Copia el contenido de `migrate_offers_browser.js` y pégalo en la consola.
4. Pulsa Enter.

### 4. Limpieza y Seguridad
Una vez finalizada la migración:
1. Revierte los cambios en `storage.rules`:
   ```javascript
   allow read, write: if request.auth != null;
   ```
2. Despliega las reglas de nuevo.
3. Borra las imágenes físicas de `frontend/public/assets/images/` para reducir el tamaño del paquete desplegado (opcional).

---
**Nota:** Los scripts utilizan el servicio `ImageOptimizerService` de la propia aplicación de Angular para asegurar que las imágenes se guarden optimizadas en formato `.webp`.
