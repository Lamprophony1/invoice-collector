# Decisions

## Objetivo de este documento

Registrar las decisiones clave del proyecto, junto con su justificación, para mantener trazabilidad técnica y evitar rediscutir criterios ya validados.

---

## 1. El XML es la fuente principal de datos

### Decisión
Usar el archivo XML como fuente oficial para extraer los datos fiscales de cada factura.

### Justificación
El XML contiene los datos estructurados del documento electrónico y permite obtener de forma confiable campos como:
- fecha de emisión
- proveedor
- RUC proveedor
- timbrado
- número de factura
- moneda
- condición
- importes
- identificador único

### Consecuencia práctica
El flujo principal no depende de OCR, IA ni lectura visual del PDF.

---

## 2. El PDF se conserva como respaldo documental

### Decisión
Guardar el PDF junto con el XML en Google Drive.

### Justificación
Aunque el XML es la fuente principal de datos, el PDF sigue siendo útil para:
- revisión humana
- respaldo documental
- consulta rápida por parte del usuario o la contadora

### Consecuencia práctica
Cada factura válida debe intentar conservar ambos archivos: XML y PDF.

---

## 3. La detección de adjuntos se hace por extensión de archivo

### Decisión
Identificar archivos por su extensión (`.xml` y `.pdf`) en lugar de depender exclusivamente del `Content-Type`.

### Justificación
Durante las pruebas reales se detectó que varios adjuntos válidos llegaban con tipos MIME inconsistentes, por ejemplo:
- `application/octet-stream`
- `application/xhtml+xml`

### Consecuencia práctica
La lógica de detección debe basarse primero en el nombre del archivo.

---

## 4. La carpeta mensual se define por la fecha de emisión del XML

### Decisión
Determinar la carpeta destino en Drive usando la fecha de emisión (`issueDate`) extraída del XML.

### Justificación
Contablemente tiene más sentido ordenar la documentación por fecha de emisión del comprobante que por la fecha de recepción del correo.

### Consecuencia práctica
La estructura en Drive sigue el patrón:

```text
2- Contabilidad Rafael Garcia/
  YYYY/
    MM - NombreDelMes/
```

---

## 5. Los correos ya procesados se marcan con una etiqueta de Gmail

### Decisión
Aplicar la etiqueta `facturas/procesado` al hilo una vez que la factura fue tratada correctamente o identificada como duplicada.

### Justificación
Esto evita reprocesar los mismos correos en futuras ejecuciones.

### Consecuencia práctica
La búsqueda principal excluye hilos con esa etiqueta.

---

## 6. Los duplicados en Google Sheets se controlan por `Unique Id`

### Decisión
Antes de insertar una fila, verificar si el `Unique Id` ya existe en la hoja `Detalle`.

### Justificación
El nombre del archivo no es un criterio suficientemente confiable para evitar duplicados. El identificador único del documento electrónico es mucho más sólido.

### Consecuencia práctica
Si la factura ya existe en la planilla, no se agrega una nueva fila.

---

## 7. La automatización registra el resultado en una sola hoja principal

### Decisión
Usar una hoja principal llamada `Detalle` dentro del archivo `Resumen Facturas Electrónicas 2026`.

### Justificación
Una hoja única facilita:
- filtros
- búsquedas
- revisión de duplicados
- consolidación mensual
- futuras tablas dinámicas o resúmenes

### Consecuencia práctica
No se crean hojas separadas por mes en la versión actual.

---

## 8. La búsqueda de correos no depende solo del asunto

### Decisión
Buscar correos candidatos usando términos relacionados con facturación electrónica en el contenido indexado por Gmail, no solo en el asunto.

### Justificación
Se observó que muchos correos válidos no incluían "factura electrónica" o "documento electrónico" en el asunto, pero sí en el cuerpo del mensaje.

### Consecuencia práctica
La query de Gmail debe contemplar expresiones como:
- `factura electrónica`
- `factura electronica`
- `documento electrónico`
- `documento electronico`

junto con `has:attachment`.

---

## 9. El desarrollo se valida paso a paso antes de automatizar completamente

### Decisión
Construir el flujo validando primero cada bloque por separado:
- conexión con Drive
- conexión con Sheets
- búsqueda de correos
- detección de adjuntos
- lectura de XML
- parsing
- guardado de archivos
- inserción en Sheets
- etiquetado en Gmail

### Justificación
Este proyecto integra varios servicios y es fácil romper algo si se automatiza todo de golpe sin validar piezas intermedias.

### Consecuencia práctica
La solución se construyó incrementalmente y cada fase dejó evidencia en logs antes de pasar a la siguiente.

---

## 10. La extracción principal no usa IA

### Decisión
No usar IA como mecanismo principal para interpretar facturas.

### Justificación
El XML ya contiene la información estructurada necesaria y ofrece una vía más precisa, económica y mantenible.

### Consecuencia práctica
La IA queda, como mucho, para mejoras futuras, por ejemplo:
- clasificación automática de gastos
- categorización contable sugerida
- detección de inconsistencias
- resúmenes ejecutivos

No forma parte del flujo base actual.
