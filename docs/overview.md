# Overview

## Objetivo

Automatizar el procesamiento de facturas electrónicas recibidas por correo, usando Google Apps Script para integrar Gmail, Google Drive y Google Sheets.

## Alcance funcional

El sistema busca correos candidatos con adjuntos de factura, identifica archivos XML y PDF, extrae los datos fiscales desde el XML, guarda los archivos en Google Drive y registra cada factura en una hoja de Google Sheets.

## Flujo funcional

1. Buscar correos candidatos en Gmail.
2. Excluir correos ya procesados mediante la etiqueta `facturas/procesado`.
3. Identificar adjuntos `.xml` y `.pdf`.
4. Parsear el XML como fuente principal de datos.
5. Determinar la carpeta destino según la fecha de emisión del XML.
6. Crear o reutilizar carpeta de año y mes en Google Drive.
7. Guardar XML y PDF en la carpeta correspondiente.
8. Verificar si la factura ya existe en Google Sheets.
9. Registrar la factura en la hoja `Detalle`.
10. Marcar el hilo como procesado.

## Fuente de datos

### XML

Fuente principal para:
- fecha de emisión
- proveedor
- RUC proveedor
- timbrado
- número de factura
- moneda
- condición
- importes
- identificador único

### PDF

Respaldo documental conservado en Drive.

## Componentes

### Gmail

Entrada de correos y adjuntos.

### Google Apps Script

Lógica de búsqueda, parsing, guardado y registro.

### Google Drive

Almacenamiento documental organizado por año y mes.

### Google Sheets

Registro estructurado de facturas procesadas.

## Estructura de almacenamiento en Drive

```text
2- Contabilidad Rafael Garcia/
  2026/
    03 - Marzo/
    04 - Abril/
```

## Estructura de registro en Sheets

Archivo:
`Resumen Facturas Electrónicas 2026`

Hoja:
`Detalle`

Columnas:
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

## Función principal

La función principal esperada del flujo es:

`processPendingInvoiceEmails`

Esta función:
- busca correos pendientes
- procesa facturas válidas
- evita duplicados
- guarda archivos
- registra filas en Sheets
- marca correos como procesados

## Estado general del flujo

El flujo fue validado paso a paso con pruebas manuales sobre:
- conexión a Google Drive
- conexión a Google Sheets
- búsqueda de correos en Gmail
- detección de adjuntos XML y PDF
- lectura y parseo de XML
- creación de carpetas mensuales
- guardado de archivos
- inserción de filas en Sheets
- control de duplicados
- etiquetado de correos procesados

La automatización quedó funcional en modo manual. El handoff del 2026-06-29 reporta que luego se creó un trigger horario para `processPendingInvoiceEmails`.

Para continuar desde el estado más reciente, usar primero `docs/context.md`.
