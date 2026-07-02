# Decisiones tecnicas

## 1. XML como fuente principal

Se usa el XML como fuente oficial de datos de factura.

Consequence:

- Los campos fiscales se parsean desde XML.
- No dependemos de OCR ni lectura visual de PDF.

## 2. PDF como respaldo documental

Se conserva el PDF (ademas del XML) en Drive para soporte contable y revision humana.

## 3. Deteccion de adjuntos por extension

Se detectan adjuntos por nombre (`.xml`, `.pdf`) antes que por `Content-Type`.

Consequence:

- Se procesan mejor casos con MIME ambiguos.

## 4. Fecha de emision para ubicacion

La fecha de emision del XML define:

- carpeta mensual de Drive (`YYYY/MM - Mes`)
- hoja mensual de Sheets (`Enero`...`Diciembre`)
- libro anual donde se guarda la factura (`Resumen Facturas Electronicas YYYY`)

## 5. Etiquetado de hilo procesado

Se marca el hilo con `facturas/procesado` al finalizar:

- factura procesada
- o factura descartada por duplicado

Consequence:

- evita reprocesos en corridas posteriores.

## 6. Duplicados por Unique Id en libros mensuales

Se controla la duplicidad por `Unique Id` sobre las hojas mensuales del libro anual, no sobre campos variables del XML.

Consequence:

- evita inserciones repetidas aunque cambie el nombre o el orden de campos.

## 7. Registro contable por año y mes

Cada año tiene su propio libro:

- `Resumen Facturas Electronicas YYYY`
- ubicado en `2- Contabilidad Rafael Garcia/YYYY`
- con 12 pestañas mensuales fijas.

Consequence:

- no se mezclan años en un solo libro.

## 8. Hoja Detalle como backup y migracion

`Detalle` se mantiene como hoja historica y de migracion.

Consequence:

- no se usa para ingreso nuevo.
- se migran filas existentes a hojas mensuales cuando corresponde.

## 9. Limpieza de data legado mixta

Se añadieron funciones de migracion para separar/organizar data vieja:

- `migrateLegacyMixedMonthlySheetsByYear`
- `migrateAnnualSpreadsheetsToYearFolders`

Consequence:

- cada factura queda en su libro anual/mensual correcto sin perder historico.

## 10. Rollout progresivo y validado

La evolucion se hizo por fases:

- parsing y guardado
- migracion/organizacion
- ejecucion mensual
- migraciones + auditorias
- verificacion de trigger.
