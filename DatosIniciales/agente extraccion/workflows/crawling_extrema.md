---
description: Rastreo y extracción de datos con autonomía extrema
---

// turbo-all

Este workflow automatiza la extracción de activos en la URL INDICAR URL A RASTREAR

1.  **Inicializar**: Crea la estructura de carpetas `C:\WEBs\Diamante\DatosIniciales\Imagenes` y `Textos`.
2.  **Rastreo**: Utiliza el subagente de navegación para visitar la URL objetivo y sus enlaces internos.
3.  **Extracción**: Descarga imágenes y fragmentos de texto asociados.
4.  **Procesar**: Ejecuta `python C:\WEBs\Diamante\process_data.py` para sincronizar los activos con el JSON de mapeo.
5.  **Logging**: Si ocurre cualquier incidencia (404, fallo de red), escribe el detalle en `C:\WEBs\Diamante\DatosIniciales\incidencias.txt` y **continúa** con la siguiente tarea.
6.  **Reporte**: Genera un informe breve de los recursos nuevos añadidos al finalizar.