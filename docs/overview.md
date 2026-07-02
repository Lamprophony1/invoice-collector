# Visión general

## Objetivo

Automatizar el procesamiento de facturas electronicas recibidas por Gmail usando Google Apps Script, con salida de documentos en Drive y registro contable en Google Sheets por año y por mes.

## Alcance funcional

- Buscar correos con facturas electronicas/documento electronico y adjuntos.
- Detectar adjuntos `.xml` y `.pdf` por extension (nombre de archivo).
- Parsear XML como fuente oficial.
- Guardar XML/PDF en Drive en una estructura anual/mensual definida por la fecha de emision.
- Registrar cada factura en el libro anual correspondiente, hoja mensual.
- Evitar duplicados por `Unique Id`.
- Marcar los hilos procesados con la etiqueta `facturas/procesado`.

## Estructura de Drive

```text
2- Contabilidad Rafael Garcia/
  2023/
    01 - Enero/
    02 - Febrero/
    ...
  2024/
  2025/
  2026/
```

Ruta base fija:

- `ROOT_FOLDER_ID = 1s4I_IZrV6_PyEqCV2xX6fFIh_yIR9Hgy`

Cada carpeta de año también contiene el libro anual de Google Sheets:

```text
2- Contabilidad Rafael Garcia/<AAAA>/Resumen Facturas Electronicas <AAAA>
```

## Estructura de Sheets

Por cada año se mantiene un libro anual:

- `Resumen Facturas Electrónicas <AAAA>` (por ejemplo `Resumen Facturas Electronicas 2026`)

Dentro de cada libro:

- Hojas mensuales: Enero, Febrero, Marzo, Abril, Mayo, Junio, Julio, Agosto, Septiembre, Octubre, Noviembre, Diciembre.
- Cada hoja mensual incluye resumen arriba y detalle abajo (fila por fila).
- Los links a PDF/XML se escriben con formula `HYPERLINK`.
- Fecha formateada sin hora en formato `dd/MM/yyyy`.
- `Unique Id` en columna de detalle para control de duplicados.

Columna de detalle mensual:

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

## Hoja "Detalle"

`Detalle` queda como respaldo temporal y hoja de origen para migracion historica.

No es la salida contable principal.

## Flujo principal

Funcion base:

- `processPendingInvoiceEmails`

Funciones auxiliares activas:

- `migrateAnnualSpreadsheetsToYearFolders`
- `migrateLegacyMixedMonthlySheetsByYear`
- `migrateDetalleToMonthlySheets`
- `auditDetalleToMonthlySheets`
- `testListProjectTriggers`
- `ensureHourlyInvoiceTrigger`

## Estado actual

Actualizado al 2026-07-02.

- El flujo principal ya escribe directamente en hojas mensuales por año/mes.
- El control de duplicados usa `Unique Id` sobre hojas mensuales.
- La migracion desde `Detalle` ya registra y audita consistente 219 facturas (segun los logs compartidos).
