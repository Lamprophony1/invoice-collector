# Contexto activo del proyecto

Ultima actualizacion: 2026-07-02.

Este documento es la referencia canonica para retomar el trabajo. Si hay duda entre docs, priorizar este archivo y luego validar contra repo y Apps Script.

## Proposito

Automatizar facturas electronicas desde Gmail:

1. Buscar correos candidatos.
2. Detectar adjuntos `.xml` y `.pdf`.
3. Parsear XML.
4. Guardar XML/PDF en Google Drive por anio y mes de emision.
5. Registrar la factura en Google Sheets por anio y mes.
6. Evitar duplicados por `Unique Id`.
7. Marcar hilos como `facturas/procesado`.

## Recursos fijos

- Repo: `Lamprophony1/invoice-collector`
- Carpeta Drive base: `2- Contabilidad Rafael Garcia`
- Folder ID: `1s4I_IZrV6_PyEqCV2xX6fFIh_yIR9Hgy`
- Hoja base por anio (2026): `Resumen Facturas Electronicas 2026`
- Hoja por anio en Sheets: `Resumen Facturas Electronicas AAAA`, dentro de `2- Contabilidad Rafael Garcia/AAAA`
- Spreadsheet ID base: `1koM-mlSu7cUsF9-VnokKfcWiqdZYKiXUkyMx8q29HeY`
- Label Gmail: `facturas/procesado`
- Root local del script: `src/`
- Funcion principal: `processPendingInvoiceEmails`

No cambiar IDs, nombres de hojas, carpeta base ni etiqueta sin validar.

## Estado del código (`src/InvoiceProcessor.js`)

- `parseInvoiceXml(attachment)` soporta variantes de XML: `DE`, `rLoteDE->rDE->DE`, `rDE->DE`, `Envelope->Body->rEnviDe->xDE->rDE->DE`.
- Normaliza BOM y declara UTF-16 a UTF-8 para parseo robusto.
- Logging operativo con `Revisando thread: ...`.
- Guardado de archivos en Drive por fecha:
  - `2- Contabilidad Rafael Garcia/<AAAA>/<MM - Mes>/`
- Libros anuales ubicados en:
  - `2- Contabilidad Rafael Garcia/<AAAA>/Resumen Facturas Electronicas <AAAA>`
- Registro contable principal:
  - hoja anual por año + 12 hojas mensuales (`Enero` a `Diciembre`).
  - resumen mensual arriba + detalle abajo en cada hoja.
  - fecha sin hora en formato `dd/MM/yyyy`.
- `Detalle` queda como respaldo y migración histórica.
- Control de duplicados:
  - por `Unique Id`.
  - sobre hojas mensuales del libro anual.

### Funciones operativas relevantes

- `getOrCreateYearFolder` + `getOrCreateMonthFolder`: estructura de carpetas.
- `getOrCreateAnnualSpreadsheetForYear` + `ensureAnnualSpreadsheetInYearFolder`: manejo de libros por anio.
- `migrateAnnualSpreadsheetsToYearFolders`: reubica libros anuales viejos a folders por anio.
- `buildMonthlyProcessingTarget`: define objetivo anio/sheet para cada factura.
- `appendInvoiceToMonthlySheet`: inserta fila en la hoja del mes.
- `migrateDetalleToMonthlySheets`: migra desde `Detalle`.
- `auditDetalleToMonthlySheets`: auditora consistencia con `Unique Id`.
- `migrateLegacyMixedMonthlySheetsByYear` + `migrateLegacyMixedMonthlySheetsByYearLegacy`: limpieza de legacy mezclado por anio.
- `testListProjectTriggers`: lista triggers del proyecto.
- `ensureHourlyInvoiceTrigger`: crea trigger horario para `processPendingInvoiceEmails`.

## Estado operativo verificado

- `clasp.cmd --version` => `3.3.0`.
- `clasp.cmd status` muestra `src/appsscript.json` y `src/InvoiceProcessor.js`.
- `processPendingInvoiceEmails` corre en modo mensual sin excepciones.
- `migrateDetalleToMonthlySheets` / `auditDetalleToMonthlySheets` muestran consistencia con 219 `Unique Ids` (segun logs).

## Siguiente paso unico recomendado

Consolidar cierre operativo:

1. Confirmar desde Drive que cada anio tenga su libro anual en su folder (`2023`, `2024`, `2025`, `2026`, etc.).
2. Confirmar visualmente que cada hoja mensual muestra resumen + detalle.
3. Mantener `docs/context.md` como unico estado vivo y luego pasar a ajustes solicitados por contadora.

## Mapa documental

- `docs/context.md`: estado activo.
- `docs/overview.md`: panorama funcional.
- `docs/setup.md`: comandos, recursos y configuracion operativa.
- `docs/decisions.md`: decisiones técnicas.
- `docs/history/`: historicos y handoffs.
