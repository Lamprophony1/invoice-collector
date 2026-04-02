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
clasp login
clasp pull
clasp push
clasp open
```

Uso habitual:

- `clasp pull`: traer la versión actual del proyecto Apps Script al repo local.
- `clasp push`: subir los cambios locales al proyecto Apps Script.
- `clasp open`: abrir el proyecto Apps Script en el navegador.

## Permisos esperados al ejecutar el script

En la primera ejecución, Google Apps Script solicitará permisos para:

- leer correos en Gmail
- leer y etiquetar hilos en Gmail
- acceder a Google Drive
- acceder a Google Sheets

## Trigger automático

La función principal prevista para automatización periódica es:

`processPendingInvoiceEmails`

Configuración objetivo del trigger:

- Event source: `Time-driven`
- Type: `Minutes timer`
- Interval: `Every 15 minutes`

Estado actual:
- La creación efectiva del trigger quedó pendiente de confirmación.

## Estado del setup

Configuración validada manualmente:

- acceso a carpeta de Drive
- acceso a Google Sheets
- acceso a hoja `Detalle`
- búsqueda de correos en Gmail
- etiquetado de correos procesados

Pendiente por validar o cerrar:

- confirmación del trigger automático en producción
- limpieza final del script para dejar solo funciones operativas y helpers necesarios
