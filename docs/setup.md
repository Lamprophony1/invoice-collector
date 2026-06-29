# Setup

## Propósito

Este documento describe la configuración mínima necesaria para ejecutar y mantener la automatización de facturas electrónicas en Google Apps Script.

## Recursos utilizados

### Google Drive

Carpeta raíz compartida:
`2- Contabilidad Rafael Garcia`

Folder ID:
`1s4I_IZrV6_PyEqCV2xX6fFIh_yIR9Hgy`

### Google Sheets

Archivo:
`Resumen Facturas Electrónicas 2026`

Spreadsheet ID:
`1koM-mlSu7cUsF9-VnokKfcWiqdZYKiXUkyMx8q29HeY`

Hoja de trabajo:
`Detalle`

### Gmail

Etiqueta de correos procesados:
`facturas/procesado`

## Constantes del script

La configuración base esperada en el código es:

```javascript
const ROOT_FOLDER_ID = '1s4I_IZrV6_PyEqCV2xX6fFIh_yIR9Hgy';
const SPREADSHEET_ID = '1koM-mlSu7cUsF9-VnokKfcWiqdZYKiXUkyMx8q29HeY';
const SHEET_NAME = 'Detalle';
const PROCESSED_LABEL_NAME = 'facturas/procesado';
```

## Encabezados esperados en Google Sheets

La hoja `Detalle` debe tener estas columnas en la fila 1:

- Received At
- Fecha
- Proveedor
- RUC Proveedor
- Timbrado
- Nro Factura
- Currency
- Exentas (Gs)
- Gravado 5% (Gs)
- Gravado 10% (Gs)
- IVA Total (Gs)
- Total (Gs)
- Condición
- PDF File Name
- XML File Name
- PDF Drive Link
- XML Drive Link
- Unique Id
- Status
- Archivo

## Búsqueda de correos

La búsqueda funcional validada para encontrar correos candidatos fue:

```text
-label:"facturas/procesado" has:attachment ("factura electrónica" OR "factura electronica" OR "documento electrónico" OR "documento electronico")
```

## Estructura esperada en Drive

Las facturas se guardan bajo la carpeta raíz, organizadas por año y mes según la fecha de emisión del XML.

Ejemplo:

```text
2- Contabilidad Rafael Garcia/
  2026/
    03 - Marzo/
    04 - Abril/
```

## Requisitos funcionales ya definidos

- El XML es la fuente principal de datos.
- El PDF se guarda como respaldo documental.
- La identificación de archivos se hace por extensión (`.xml`, `.pdf`).
- La fecha de emisión del XML define la carpeta mensual.
- El `Unique Id` evita duplicados en la planilla.
- La etiqueta `facturas/procesado` evita reprocesar correos.

## Sincronización con clasp

Este proyecto fue vinculado a Google Apps Script usando `clasp`.

Comandos típicos de trabajo:

```bash
clasp.cmd login
clasp.cmd pull
clasp.cmd push
clasp.cmd open
```

Uso habitual:

- `clasp pull`: traer la versión actual del proyecto Apps Script al repo local.
- `clasp push`: subir los cambios locales al proyecto Apps Script.
- `clasp open`: abrir el proyecto Apps Script en el navegador.

Estado local verificado el 2026-06-29:

- `clasp.cmd --version` respondió `3.3.0`.
- `clasp.cmd status` listó `src/appsscript.json` y `src/InvoiceProcessor.js`.
- `clasp.cmd status` no mostró archivos extra no trackeados.
- El pull de Apps Script ya fue realizado y actualizó `src/InvoiceProcessor.js`.

## Permisos esperados al ejecutar el script

En la primera ejecución, Google Apps Script solicitará permisos para:

- leer correos en Gmail
- leer y etiquetar hilos en Gmail
- acceder a Google Drive
- acceder a Google Sheets

## Trigger automático

La función principal prevista para automatización periódica es:

`processPendingInvoiceEmails`

Configuración reportada en el handoff del 2026-06-29:

- Event source: `Time-driven`
- Type: `Hour timer`
- Interval: `Every hour`

Estado actual:
- El handoff reporta que el trigger fue creado correctamente.
- No crear otro trigger sin verificar primero en Apps Script.

## Estado del setup

Configuración validada manualmente:

- acceso a carpeta de Drive
- acceso a Google Sheets
- acceso a hoja `Detalle`
- búsqueda de correos en Gmail
- etiquetado de correos procesados

Pendiente por validar o cerrar:

- confirmación del trigger automático en Apps Script remoto
- corrida manual para identificar los hilos inválidos restantes
- limpieza final del script para dejar solo funciones operativas y helpers necesarios
