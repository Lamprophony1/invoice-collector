# Overview

## Objetivo

Automatizar el procesamiento de facturas electronicas recibidas por correo, usando Google Apps Script para integrar Gmail, Google Drive y Google Sheets.

## Alcance funcional

El sistema busca correos candidatos con adjuntos de factura, identifica archivos XML y PDF, extrae los datos fiscales desde el XML, guarda los archivos en Google Drive y registra cada factura en hojas mensuales de Google Sheets.

## Flujo funcional

1. Buscar correos candidatos en Gmail.
2. Excluir correos ya procesados mediante la etiqueta `facturas/procesado`.
3. Identificar adjuntos `.xml` y `.pdf`.
4. Parsear el XML como fuente principal de datos.
5. Determinar la carpeta destino segun la fecha de emision del XML.
6. Crear o reutilizar carpeta de anio y mes en Google Drive.
7. Guardar XML y PDF en la carpeta correspondiente.
8. Verificar si la factura ya existe en las hojas mensuales de Google Sheets.
9. Registrar la factura en la hoja mensual correspondiente.
10. Marcar el hilo como procesado.

## Fuente de datos

### XML

Fuente principal para:
- fecha de emision
- proveedor
- RUC proveedor
- timbrado
- numero de factura
- moneda
- condicion
- importes
- identificador unico

### PDF

Respaldo documental conservado en Drive.

## Componentes

### Gmail

Entrada de correos y adjuntos.

### Google Apps Script

Logica de busqueda, parsing, guardado y registro.

### Google Drive

Almacenamiento documental organizado por anio y mes.

### Google Sheets

Registro contable estructurado en hojas mensuales.

## Estructura de almacenamiento en Drive

```text
2- Contabilidad Rafael Garcia/
  2026/
    03 - Marzo/
    04 - Abril/
```

## Estructura de registro en Sheets

Archivo por año:
`Resumen Facturas Electronicas AAAA` (donde `AAAA` es el anio de emision)
Ejemplo: `Resumen Facturas Electronicas 2026`

La salida contable principal usa hojas mensuales:
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

Cada hoja mensual contiene:
- resumen mensual arriba
- totales por condicion
- totales por moneda
- totales por proveedor/RUC
- detalle fila por fila abajo

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

La hoja `Detalle` queda como respaldo temporal de migracion. No es la salida contable principal.

## Funcion principal

La funcion principal esperada del flujo es:

`processPendingInvoiceEmails`

Esta funcion:
- busca correos pendientes
- procesa facturas validas
- evita duplicados en hojas mensuales
- guarda archivos
- registra filas en la hoja mensual correspondiente
- marca correos como procesados

## Estado general del flujo

El flujo fue validado paso a paso con pruebas manuales sobre:
- conexion a Google Drive
- conexion a Google Sheets
- busqueda de correos en Gmail
- deteccion de adjuntos XML y PDF
- lectura y parseo de XML
- creacion de carpetas mensuales
- guardado de archivos
- migracion desde `Detalle`
- registro en hojas mensuales
- control de duplicados por `Unique Id`
- etiquetado de correos procesados

La automatizacion quedo funcional en modo manual. El handoff del 2026-06-29 reporta que luego se creo un trigger horario para `processPendingInvoiceEmails`.

Para continuar desde el estado mas reciente, usar primero `docs/context.md`.
