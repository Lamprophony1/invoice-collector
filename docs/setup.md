# Setup

## Proposito

Guia corta para levantar, mantener y verificar el script en entorno local y GAS.

## Recursos

- Carpeta base Drive: `2- Contabilidad Rafael Garcia`
- Folder ID: `1s4I_IZrV6_PyEqCV2xX6fFIh_yIR9Hgy`
- Spreadsheet base (2026): `1koM-mlSu7cUsF9-VnokKfcWiqdZYKiXUkyMx8q29HeY`
- Carpeta anual en Drive: `2- Contabilidad Rafael Garcia/<AAAA>/`
- Libro anual: `2- Contabilidad Rafael Garcia/<AAAA>/Resumen Facturas Electronicas <AAAA>`

## Configuracion en script

Constantes principales:

```javascript
const ROOT_FOLDER_ID = '1s4I_IZrV6_PyEqCV2xX6fFIh_yIR9Hgy';
const SPREADSHEET_ID = '1koM-mlSu7cUsF9-VnokKfcWiqdZYKiXUkyMx8q29HeY';
const ANNUAL_SPREADSHEET_NAME_PREFIXES = ['Resumen Facturas Electronicas '];
const ANNUAL_SPREADSHEET_IDS_BY_YEAR = { '2026': SPREADSHEET_ID };
const DETAIL_SHEET_NAME = 'Detalle';
const SHEET_NAME = DETAIL_SHEET_NAME;
const PROCESSED_LABEL_NAME = 'facturas/procesado';
```

> Nota: la lista puede incluir variaciones de mayusculas/acentos segun archivos historicos.

## Estructura de Drive

```text
2- Contabilidad Rafael Garcia/
  2023/
    03 - Marzo/
    04 - Abril/
  2024/
    01 - Enero/
  2025/
  2026/
    02 - Febrero/
```

- Los archivos se guardan segun anio y mes de la fecha de emision XML.
- La carpeta del anio se crea si no existe.
- Cada libro anual esta dentro de su carpeta de anio.

## Estructura de Sheets

### Libro anual por anio

- Nombre: `Resumen Facturas Electronicas <AAAA>`
- Ubicacion: `2- Contabilidad Rafael Garcia/<AAAA>/Resumen Facturas Electronicas <AAAA>`
- Hojas mensuales:
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

### Columnas de detalle mensual

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

La fecha se formatea como `dd/MM/yyyy` (sin hora).

## Hoja historica (respaldo)

`Detalle` queda para respaldo y migracion de facturas historicas.

Funciones activas:

- `migrateAnnualSpreadsheetsToYearFolders()`: mueve libros anuales detectados a su carpeta anual.
- `migrateLegacyMixedMonthlySheetsByYear()`: separa filas de anios mezclados en hojas legacy.
- `migrateDetalleToMonthlySheets()`: migra filas desde `Detalle`.
- `auditDetalleToMonthlySheets()`: valida consistencia de `Unique Id` entre `Detalle` y hojas mensuales.

## Busqueda de correos

Etiqueta para evitar reprocesado:

- `facturas/procesado`

Query principal:

```text
-label:"facturas/procesado" has:attachment ("factura electronica" OR "documento electronico")
```

## Sincronizacion con clasp

```bash
clasp.cmd login
clasp.cmd pull
clasp.cmd push
clasp.cmd open
clasp.cmd status
clasp.cmd run processPendingInvoiceEmails
```

Notas:

- `clasp.cmd status` lista archivos vinculados de Apps Script.
- En algunos entornos `clasp.cmd run` depende de permisos de API.

## Triggers

- Trigger objetivo: `processPendingInvoiceEmails` (cada 1 hora).
- `testListProjectTriggers()` para revisar activos.
- `ensureHourlyInvoiceTrigger()` para crear si no existe.

## Estado operativo (2026-07-02)

- `processPendingInvoiceEmails` procesa directo a hojas mensuales.
- Los archivos y facturas ya quedaron organizados por anio.
- `migrateLegacyMixedMonthlySheetsByYear` y `auditDetalleToMonthlySheets` verifican consistencia.
