# Contexto activo del proyecto

Ultima actualizacion: 2026-06-29.

Este es el documento canonico para retomar el trabajo en `invoice-collector`. Si hay dudas entre este archivo, el README, documentos historicos o notas de chat, partir de este archivo y luego verificar contra el repo y Apps Script.

## Proposito

Automatizar el procesamiento de facturas electronicas recibidas por Gmail:

1. Buscar correos candidatos.
2. Detectar adjuntos XML y PDF por extension.
3. Usar el XML como fuente principal de datos.
4. Guardar XML/PDF en Google Drive por anio y mes de emision.
5. Registrar la factura en Google Sheets.
6. Evitar duplicados por `Unique Id`.
7. Marcar el hilo con la etiqueta `facturas/procesado`.

## Recursos fijos

- Repo GitHub: `Lamprophony1/invoice-collector`
- Carpeta Drive: `2- Contabilidad Rafael Garcia`
- Folder ID: `1s4I_IZrV6_PyEqCV2xX6fFIh_yIR9Hgy`
- Spreadsheet: `Resumen Facturas Electronicas 2026`
- Spreadsheet ID: `1koM-mlSu7cUsF9-VnokKfcWiqdZYKiXUkyMx8q29HeY`
- Hoja: `Detalle`
- Label Gmail: `facturas/procesado`
- Apps Script root local: `src/`
- Funcion principal: `processPendingInvoiceEmails`

No cambiar IDs, nombres de hojas, carpetas, labels ni estructura del repo sin validarlo primero.

## Estado local verificado

Verificado el 2026-06-29 desde este repo:

- Rama: `main`, alineada con `origin/main` antes de los cambios documentales y el pull de Apps Script.
- `clasp.cmd --version` responde `3.3.0`.
- `clasp.cmd status` lista como trackeados solo `src/appsscript.json` y `src/InvoiceProcessor.js`.
- `clasp.cmd status` no muestra archivos extra no trackeados.
- El pull de Apps Script ya fue realizado y trajo cambios en `src/InvoiceProcessor.js`.

Estado local de `src/InvoiceProcessor.js`:

- Tiene `try/catch` alrededor de `parseInvoiceXml(attachment)` dentro de `processPendingInvoiceEmails`.
- Tiene soporte para XML con raiz directa `DE`.
- Tiene soporte para XML con raiz `rLoteDE`.
- Tiene soporte para XML con raiz `rDE`.
- Tiene soporte para SOAP Envelope: `Envelope -> Body -> rEnviDe -> xDE -> rDE -> DE`.
- Normaliza XML con BOM y declaracion `encoding="UTF-16"`.
- Tiene el log `Revisando thread: ...` al inicio del loop de threads.
- Las funciones de prueba y produccion siguen mezcladas. No limpiarlas todavia.

## Estado reportado por el handoff

El handoff historico esta guardado en `docs/history/2026-06-29-codex-handoff.md`.

Segun ese handoff:

- Ya se creo un trigger horario para `processPendingInvoiceEmails`.
- La ultima corrida manual confirmada termino con:
  - `Processed: 17`
  - `Duplicates skipped: 0`
  - `Invalid skipped: 3`
- `parseInvoiceXml` ya habia sido corregida para:
  - raiz directa `DE`
  - `rLoteDE -> rDE -> DE`
  - `SOAP Envelope -> Body -> rEnviDe -> xDE -> rDE -> DE`
  - raiz `rDE -> DE`
  - XML con declaracion `encoding="UTF-16"` normalizada a `UTF-8`

Importante: despues del pull, esa version ya esta reflejada en el archivo local actual.

## Proximo paso unico

1. Ejecutar una corrida manual de `processPendingInvoiceEmails` desde Apps Script.
2. Revisar solo estas lineas de log:
   - `Revisando thread: ...`
   - `Thread skipped: no valid XML invoice found.`
   - resumen final `Processed`, `Duplicates skipped`, `Invalid skipped`

Objetivo de ese paso: identificar los 3 hilos invalidos restantes y decidir si se ignoran, se marcan como procesados, se excluyen por query o requieren otro manejo.

## Reglas de trabajo

- Avanzar paso a paso.
- Un solo cambio funcional a la vez.
- Primero identificar la causa real antes de cambiar codigo.
- No proponer re-arquitectura sin causa concreta.
- No limpiar helpers ni funciones de prueba hasta cerrar la depuracion de los 3 hilos invalidos.
- Despues de cada cambio funcional, pedir o ejecutar una validacion concreta.

## Mapa documental

- `docs/context.md`: estado activo y proximo paso.
- `docs/setup.md`: recursos, comandos y configuracion operativa.
- `docs/overview.md`: descripcion funcional del sistema.
- `docs/decisions.md`: decisiones tecnicas ya tomadas.
- `docs/history/`: checkpoints y handoffs historicos.
