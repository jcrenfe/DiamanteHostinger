# Reglas del Proyecto: Autonomía Máxima (Diamante)

Estas reglas se aplican a cualquier agente que actúe sobre este repositorio para garantizar un flujo de trabajo autónomo, seguro y proactivo.

## 1. Autorización de Comandos y Herramientas
- **Terminal (PowerShell)**: Los agentes tienen permiso explícito para usar `mkdir`, `pip`, `npm`, `python`, `curl` y `Invoke-WebRequest` sin confirmación previa.
- **Instalación de Dependencias**: Si un script falla por falta de un paquete (ej: `requests`, `urllib`), el agente debe intentar instalarlo autónomamente (`pip install`) y reintentar la acción.
- **Navegador**: Plena autonomía para abrir pestañas, extraer DOM, desplazarse y capturar capturas de pantalla para verificar el éxito de la tarea.

## 2. Gestión de Incidencias y Errores
- **No preguntar ante errores técnicos**: Si una URL devuelve 404, un activo no se puede descargar o un selector de navegador no es válido, el agente NO debe pedir dirección al usuario.
- **Logging obligatorio**: El detalle del error debe escribirse en `C:\WEBs\Diamante\DatosIniciales\incidencias.txt` junto con un timestamp.
- **Continuar**: El agente debe pasar inmediatamente a la siguiente tarea o enlace en la cola de trabajo tras registrar la incidencia.

## 3. Persistencia de Extracción
- **Rastreo Completo**: No dar por terminada una tarea de crawling hasta haber agotado todos los enlaces internos únicos detectados en el dominio `desayunocondiamante.com`.
- **Sincronización de Datos**: Cada nueva imagen o bloque de texto debe sincronizarse inmediatamente con `mapeo_recursos.json` para evitar pérdida de datos si el entorno se reinicia.

## 4. Estética y Calidad Visual
- Al generar informes o resúmenes, utilizar formato Markdown rico (tablas, alertas, checklists) para facilitar la lectura rápida del estado del proyecto.
- Incluir imágenes o capturas de pantalla como prueba de completitud en el reporte final.
