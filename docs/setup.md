# Setup

## Proposito

Este documento describe la configuracion minima necesaria para ejecutar y mantener la automatizacion de facturas electronicas en Google Apps Script.

## Recursos utilizados

### Google Drive

Carpeta raiz compartida:
`2- Contabilidad Rafael Garcia`

Folder ID:
`1s4I_IZrV6_PyEqCV2xX6fFIh_yIR9Hgy`

### Google Sheets

Los libros anuales se guardan automÃ¡ticamente en la carpeta del aÃ±o correspondiente:

```text
2- Contabilidad Rafael Garcia/
  2026/
    Resumen Facturas Electronicas 2026
  2025/
    Resumen Facturas Electronicas 2025
```

Libros anuales:
`Resumen Facturas Electronicas AAAA` (donde `AAAA` es el año de emision de la factura)
Ejemplo: `Resumen Facturas Electronicas 2026`

Spreadsheet ID:
`1koM-mlSu7cUsF9-VnokKfcWiqdZYKiXUkyMx8q29HeY`

Salida principal:
hojas mensuales `Enero` a `Diciembre` dentro del libro anual correspondiente

Respaldo temporal:
`Detalle`

### Gmail

Etiqueta de correos procesados:
`facturas/procesado`

## Constantes del script

La configuracion base esperada en el codigo es:

```javascript
const ROOT_FOLDER_ID = '1s4I_IZrV6_PyEqCV2xX6fFIh_yIR9Hgy';
const SPREADSHEET_ID = '1koM-mlSu7cUsF9-VnokKfcWiqdZYKiXUkyMx8q29HeY';
const ANNUAL_SPREADSHEET_NAME_PREFIXES = ['Resumen Facturas Electronicas '];
const ANNUAL_SPREADSHEET_IDS_BY_YEAR = { '2026': SPREADSHEET_ID };
const DETAIL_SHEET_NAME = 'Detalle';
const SHEET_NAME = DETAIL_SHEET_NAME;
const PROCESSED_LABEL_NAME = 'facturas/procesado';
```

## Hojas mensuales

La planilla anual debe tener o permitir crear estas hojas:

- Enero
- Febrero
- Marzo
- Abril
- Mayo
- Junio
- Julio
- Agosto
- Septiembre
- Octubre
- Noviembre
- Diciembre

Cada hoja mensual contiene resumen arriba y detalle abajo.

Columnas del detalle mensual:

- Fecha
- Proveedor
- RUC Proveedor
- Timbrado
- Nro Factura
- Moneda
- Exentas
- Gravado 5%
- Gravado 10%
- IVA Total
- Total
- Condicion
- PDF
- XML
- Unique Id

Las fechas se formatean como `dd/MM/yyyy`, sin hora.

## Hoja historica `Detalle`

`Detalle` queda como respaldo temporal de migracion. La funcion principal ya no escribe nuevas facturas ahi.

Funciones operativas relacionadas:

- `migrateDetalleToMonthlySheets`: migra filas existentes desde `Detalle` a los libros anuales y sus hojas mensuales.
- `auditDetalleToMonthlySheets`: valida que los `Unique Ids` de `Detalle` existan en los libros anuales y hojas mensuales.

## Busqueda de correos

La busqueda funcional validada para encontrar correos candidatos fue:

```text
-label:"facturas/procesado" has:attachment ("factura electronica" OR "documento electronico")
```

El codigo tambien mantiene variantes con acentos en la query.

## Estructura esperada en Drive

Las facturas se guardan bajo la carpeta raiz, organizadas por año y mes según la fecha de emisión del XML.

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
- La identificacion de archivos se hace por extension (`.xml`, `.pdf`).
- La fecha de emision del XML define la carpeta mensual y la hoja mensual.
- El `Unique Id` evita duplicados en hojas mensuales.
- La etiqueta `facturas/procesado` evita reprocesar correos.

## Sincronizacion con clasp

Este proyecto fue vinculado a Google Apps Script usando `clasp`.

Comandos tipicos de trabajo:

```bash
clasp.cmd login
clasp.cmd pull
clasp.cmd push
clasp.cmd open
```

Uso habitual:

- `clasp pull`: traer la version actual del proyecto Apps Script al repo local.
- `clasp push`: subir los cambios locales al proyecto Apps Script.
- `clasp open`: abrir el proyecto Apps Script en el navegador.

Nota operativa:

- `clasp.cmd run` no esta disponible en este proyecto mientras no este desplegado como API executable.
- Las funciones se ejecutan manualmente desde el editor de Apps Script.

Estado local verificado el 2026-06-29:

- `clasp.cmd --version` respondio `3.3.0`.
- `clasp.cmd status` listo `src/appsscript.json` y `src/InvoiceProcessor.js`.
- `clasp.cmd status` no mostro archivos extra no trackeados.
- El pull de Apps Script ya fue realizado y actualizo `src/InvoiceProcessor.js`.

## Permisos esperados al ejecutar el script

En la primera ejecucion, Google Apps Script solicitara permisos para:

- leer correos en Gmail
- leer y etiquetar hilos en Gmail
- acceder a Google Drive
- acceder a Google Sheets

## Trigger automatico

La funcion principal prevista para automatizacion periodica es:

`processPendingInvoiceEmails`

Configuracion reportada en el handoff del 2026-06-29:

- Event source: `Time-driven`
- Type: `Hour timer`
- Interval: `Every hour`

Estado actual:

Estado real del proyecto (verificable desde Script Editor):

- Ejecutá `testListProjectTriggers()` para confirmar qué triggers están activos.
- Ejecutá `ensureHourlyInvoiceTrigger()` para crear el trigger horario si no existe.
- El trigger objetivo para automatización es `processPendingInvoiceEmails`.

## Estado del setup

Configuracion validada manualmente:

- acceso a carpeta de Drive
- acceso a Google Sheets
- migracion de `Detalle` a hojas mensuales
- auditoria de 219 `Unique Ids` migrados, sin faltantes ni extras
- busqueda de correos en Gmail
- etiquetado de correos procesados
- ejecucion manual de `processPendingInvoiceEmails` sin excepciones despues del cambio mensual

Pendiente por validar o cerrar:

- confirmacion visual final de las hojas mensuales en Sheets
- decision posterior sobre hilos candidatos sin XML valido
- limpieza final del script para dejar solo funciones operativas y helpers necesarios
