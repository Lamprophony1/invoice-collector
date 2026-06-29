# Diseno de salida contable por hojas mensuales

## Objetivo

Convertir `invoice-collector` en una automatizacion invisible que produzca una planilla anual comoda para la contadora. La contadora debe trabajar desde las hojas mensuales, no desde una hoja tecnica maestra.

## Direccion aprobada

- La automatizacion sigue usando Gmail, Google Apps Script, Drive y Sheets.
- Drive sigue siendo el archivo documental de XML/PDF por anio y mes.
- Google Sheets pasa a ser la salida contable principal.
- La planilla anual usa una pestana por mes: `Enero`, `Febrero`, `Marzo`, `Abril`, `Mayo`, `Junio`, `Julio`, `Agosto`, `Septiembre`, `Octubre`, `Noviembre`, `Diciembre`.
- Cada hoja mensual contiene el resumen del mes y el detalle de facturas de ese mes.
- La hoja vieja `Detalle` se usa solo como fuente de migracion y respaldo temporal.
- Despues de la migracion, el procesamiento nuevo escribe directamente en hojas mensuales.

## Fuera de alcance

- No se construye panel web.
- No se usa IA para extraer datos del PDF.
- No se usa OCR.
- No se cambian labels de Gmail, IDs de Drive, IDs de Sheets ni nombres de carpetas raiz.
- No se elimina `Detalle` en la primera implementacion.
- No se limpian helpers historicos hasta validar el flujo mensual.

## Estructura de hoja mensual

Cada hoja mensual tiene una zona fija de resumen arriba y una tabla de detalle debajo.

### Resumen superior

El resumen debe incluir:

- Cantidad total de facturas.
- Total exentas.
- Total gravado 5%.
- Total gravado 10%.
- Total IVA.
- Total general.
- Totales por condicion: `Contado`, `Credito`.
- Totales por moneda.
- Totales por proveedor/RUC.

El resumen puede regenerarse desde las filas de detalle cada vez que se actualiza la hoja. No necesita conservar ediciones manuales.

### Tabla de detalle

La tabla de detalle contiene una fila por factura del mes.

Columnas:

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

Reglas de formato:

- `Fecha` se guarda como fecha real de Sheets y se muestra como `dd/MM/yyyy`.
- La hora del XML no se muestra en Sheets.
- Los importes se guardan como numeros, no como texto.
- `PDF` y `XML` son links clicables, no URLs largas pegadas.
- `Unique Id` queda visible para auditoria y control de duplicados.

## Flujo nuevo de procesamiento

Para cada correo pendiente:

1. Detectar adjuntos XML/PDF.
2. Parsear el XML.
3. Guardar XML/PDF en Drive bajo carpetas por anio y mes.
4. Determinar el mes destino usando la fecha de emision del XML.
5. Crear o reutilizar la hoja mensual correspondiente.
6. Verificar si el `Unique Id` ya existe en las hojas mensuales.
7. Si no existe, agregar la factura a la hoja del mes.
8. Regenerar o actualizar el resumen de ese mes.
9. Marcar el hilo de Gmail como procesado.

El control de duplicados usa `Unique Id` en las hojas mensuales. `Detalle` no es la fuente permanente de duplicados.

## Flujo de migracion

Las filas existentes en `Detalle` deben migrarse a las hojas mensuales.

Pasos:

1. Leer todas las filas con datos de `Detalle`.
2. Determinar el mes usando la fecha de emision (`Fecha`).
3. Crear o reutilizar la hoja mensual correspondiente.
4. Insertar cada factura en la tabla de detalle de su mes.
5. Omitir cualquier fila cuyo `Unique Id` ya exista en hojas mensuales.
6. Regenerar resumenes de todos los meses afectados.
7. Loguear conteos:
   - filas leidas desde `Detalle`
   - filas migradas
   - duplicados omitidos
   - filas omitidas por fecha invalida o ausente

`Detalle` queda en la planilla como respaldo temporal. No debe borrarse automaticamente.

## Ruta local de control de Drive

El usuario tiene la carpeta de Drive sincronizada localmente:

`D:\Mi unidad\2- Contabilidad Rafael Garcia`

Esta ruta puede usarse para inspeccionar la estructura local de carpetas y archivos al validar Drive. Esta fuera del workspace del repo, por lo que accederla puede requerir un comando con permiso elevado.

## Manejo de errores

- Un XML invalido no debe cortar todo el batch.
- Si falta XML, el hilo se omite y se loguea.
- Si falta PDF, una factura con XML valido igual puede registrarse.
- Si una fila de migracion no tiene fecha valida, se omite y se loguea.
- Si una hoja mensual no puede crearse o actualizarse, se loguea el error y no se marca el hilo como procesado.

## Validacion

Antes de usar en produccion:

1. Ejecutar la migracion en una pasada controlada.
2. Comparar filas migradas contra filas existentes en `Detalle`.
3. Comparar totales mensuales contra los datos historicos.
4. Revisar manualmente al menos una hoja mensual con varias facturas.
5. Verificar que las fechas se vean como `dd/MM/yyyy`.
6. Verificar que los links PDF/XML abran.
7. Ejecutar el procesador normal una vez y confirmar que la nueva factura cae en la hoja mensual correcta.
8. Repetir una ejecucion y confirmar que no se duplica la factura.

## Notas operativas

- El siguiente paso inmediato del proyecto sigue siendo identificar los hilos invalidos restantes de Gmail.
- El cambio a hojas mensuales debe implementarse despues de estabilizar el estado actual de parser e hilos pendientes.
- El sistema final debe correr solo por trigger y ser revisado por la contadora desde Drive y la planilla anual.
