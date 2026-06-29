# CODEX HANDOFF — invoice-collector — actualizado al 2026-06-29

Este archivo consolida el handoff original `invoice-collector-new-chat-handoff.md` y el avance posterior hecho en el chat nuevo.

Objetivo: pegar este archivo en el repo local o pasárselo a Codex para continuar el proyecto exactamente desde el estado actual, sin perder decisiones, recursos, errores resueltos ni el próximo paso pendiente.

---

## 0) Instrucciones operativas para Codex

Trabajar estrictamente así:

- Avanzar paso a paso.
- Un solo paso a la vez.
- No proponer una re-arquitectura salvo que haya una causa real.
- No cambiar IDs, nombres de carpetas, nombres de hojas, labels de Gmail ni estructura de repo sin validarlo.
- Primero identificar la causa real antes de cambiar código.
- En debugging, agregar logs mínimos y temporales.
- Antes de modificar, revisar el estado real del repo local.
- Después de cada cambio, pedir una validación concreta.
- No limpiar helpers ni funciones de prueba todavía salvo que sea el paso acordado.

---

## 1) Estado actualizado después del handoff original

### Trigger automático

Ya se verificó que **no existía** trigger automático.

Luego se creó correctamente un trigger en Apps Script para:

- Función: `processPendingInvoiceEmails`
- Tipo de implementación: `Head`
- Origen del evento: `Basado en tiempo`
- Tipo: `Temporizador por hora`

Estado: **trigger creado correctamente**.

---

## 2) Problema detectado después de crear el trigger

Al ejecutar manualmente `processPendingInvoiceEmails`, falló inicialmente con:

```text
Error: No se encontró el nodo DE en el XML.
parseInvoiceXml @ InvoiceProcessor.gs:361
processPendingInvoiceEmails @ InvoiceProcessor.gs:585
```

Causa real inicial:

- El parser abortaba toda la corrida cuando encontraba un XML inválido o con estructura no contemplada.
- `parseInvoiceXml(...)` se ejecutaba dentro del loop de adjuntos sin `try/catch`.
- Por eso no se alcanzaba el conteo de inválidos ni continuaba el batch.

---

## 3) Cambio aplicado en `processPendingInvoiceEmails`

En el loop de adjuntos, el bloque XML debe quedar con log y `try/catch` para que un XML inválido no corte toda la corrida.

Bloque actual esperado:

```javascript
if (fileName.endsWith('.xml')) {
  xmlAttachment = attachment;
  Logger.log('Procesando XML adjunto: ' + attachment.getName());

  try {
    parsedData = parseInvoiceXml(attachment);
  } catch (error) {
    Logger.log('XML inválido: ' + attachment.getName() + ' -> ' + error.message);
    Logger.log('Primeros 300 chars XML: ' + attachment.getDataAsString().substring(0, 300));
    parsedData = null;
  }
}
```

Nota:

- El log `Primeros 300 chars XML` fue útil para debugging.
- Puede dejarse temporalmente mientras se revisan los inválidos restantes.
- Más adelante conviene limpiar o reducir logs, pero no todavía si se sigue depurando.

---

## 4) XML inválidos reales encontrados y causas

### Caso A — XML con raíz `rLoteDE`

Archivos ejemplo:

```text
fac_001-001-0515461_231134071.xml_01800337220001001051546122026040116571935526.xml
fac_001-001-4719887_263646185.xml_01800840860001001471988722025081018544216630.xml
fac_001-001-4324792_321766498.xml_01800840860001001432479222025043012912429163.xml
```

Primeros caracteres observados:

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<rLoteDE><rDE xmlns="http://ekuatia.set.gov.py/sifen/xsd" ...>
    <dVerFor>150</dVerFor>
    <DE Id="...">
```

Causa real:

- `rLoteDE` viene sin namespace.
- `rDE` viene con namespace SIFEN.
- El parser anterior usaba `root.getNamespace()` y fallaba al buscar `rDE`.

Solución aplicada:

- Usar explícitamente `XmlService.getNamespace('http://ekuatia.set.gov.py/sifen/xsd')`.
- Contemplar ruta `rLoteDE -> rDE -> DE`.

Resultado confirmado:

- Estos `fac_...xml...` pasaron a procesarse correctamente.
- Ejemplos procesados:
  - `001-001-0515461`
  - `001-001-4719887`
  - `001-001-4324792`
  - `001-001-3964244`

---

### Caso B — XML `UTF-16` dentro de SOAP Envelope

Archivos ejemplo:

```text
01800318080018001000302522026032610768449149.xml
01800318080018001000302622026032610458727990.xml
01800318080018001000056422024102814205000967.xml
01800318080018001000049822024100810055252159.xml
```

Error inicial:

```text
Caught SAXException: org.xml.sax.SAXParseException; lineNumber: 1; columnNumber: 40; Content is not allowed in prolog.
```

Primeros caracteres observados:

```xml
<?xml version="1.0" encoding="UTF-16"?>
<env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope">
    <env:Header/>
    <env:Body>
        <rEnviDe xmlns="http://ekuatia.set.gov.py/sifen/xsd">
            <dId>1</dId>
            <xDE>
                <rDE ...>
```

Causas reales:

1. Apps Script ya estaba entregando el texto como string, pero el XML declaraba `encoding="UTF-16"`, lo que provocaba fallo de parseo.
2. Después de corregir la declaración de encoding, el parser fallaba porque `DE` no estaba en la raíz, sino dentro de:

```text
Envelope -> Body -> rEnviDe -> xDE -> rDE -> DE
```

Solución aplicada:

- Remover BOM si aparece.
- Reemplazar declaración `encoding="UTF-16"` por `encoding="UTF-8"` antes de `XmlService.parse`.
- Contemplar estructura SOAP.

Resultado confirmado:

- Estos XML pasaron a procesarse correctamente.
- Ejemplos procesados:
  - `018-001-0003025`
  - `018-001-0003026`
  - `018-001-0000564`
  - `018-001-0000498`

---

## 5) Función `parseInvoiceXml` actual esperada

Esta es la versión final confirmada en el chat, con soporte para:

- raíz directa `DE`
- `rLoteDE -> rDE -> DE`
- `SOAP Envelope -> Body -> rEnviDe -> xDE -> rDE -> DE`
- raíz `rDE -> DE`

```javascript
function parseInvoiceXml(attachment) {
  let xmlContent = attachment.getDataAsString();

  xmlContent = xmlContent.replace(/^﻿/, '');
  xmlContent = xmlContent.replace(/encoding="UTF-16"/i, 'encoding="UTF-8"');

  const document = XmlService.parse(xmlContent);
  let root = document.getRootElement();

  const sifenNs = XmlService.getNamespace('http://ekuatia.set.gov.py/sifen/xsd');
  const soapNs = XmlService.getNamespace('http://www.w3.org/2003/05/soap-envelope');

  let de = null;

  // Caso 1: raíz directa DE
  if (root.getName() === 'DE') {
    de = root;
  }

  // Caso 2: rLoteDE -> rDE -> DE
  else if (root.getName() === 'rLoteDE') {
    const rde = root.getChild('rDE', sifenNs);
    if (!rde) {
      throw new Error('No se encontró el nodo rDE dentro de rLoteDE.');
    }

    de = rde.getName() === 'DE' ? rde : rde.getChild('DE', sifenNs);
  }

  // Caso 3: SOAP Envelope -> Body -> rEnviDe -> xDE -> rDE -> DE
  else if (root.getName() === 'Envelope') {
    const body = root.getChild('Body', soapNs);
    if (!body) {
      throw new Error('No se encontró el nodo Body dentro de Envelope.');
    }

    const rEnviDe = body.getChild('rEnviDe', sifenNs);
    if (!rEnviDe) {
      throw new Error('No se encontró el nodo rEnviDe dentro de Body.');
    }

    const xDE = rEnviDe.getChild('xDE', sifenNs);
    if (!xDE) {
      throw new Error('No se encontró el nodo xDE dentro de rEnviDe.');
    }

    const rde = xDE.getChild('rDE', sifenNs);
    if (!rde) {
      throw new Error('No se encontró el nodo rDE dentro de xDE.');
    }

    de = rde.getChild('DE', sifenNs);
  }

  // Caso 4: raíz rDE -> DE
  else if (root.getName() === 'rDE') {
    de = root.getChild('DE', sifenNs);
  }

  // Caso genérico
  if (!de) {
    de = root.getChild('DE', sifenNs);
  }

  if (!de) {
    throw new Error('No se encontró el nodo DE en el XML.');
  }

  const data = {
    uniqueId: de.getAttribute('Id') ? de.getAttribute('Id').getValue() : '',
    documentType: getNestedText(de, ['gTimb', 'dDesTiDE'], sifenNs),
    timbrado: getNestedText(de, ['gTimb', 'dNumTim'], sifenNs),
    establishment: getNestedText(de, ['gTimb', 'dEst'], sifenNs),
    expeditionPoint: getNestedText(de, ['gTimb', 'dPunExp'], sifenNs),
    documentNumber: getNestedText(de, ['gTimb', 'dNumDoc'], sifenNs),
    issueDate: getNestedText(de, ['gDatGralOpe', 'dFeEmiDE'], sifenNs),
    supplierName: getNestedText(de, ['gDatGralOpe', 'gEmis', 'dNomEmi'], sifenNs),
    supplierRuc: buildRuc(
      getNestedText(de, ['gDatGralOpe', 'gEmis', 'dRucEm'], sifenNs),
      getNestedText(de, ['gDatGralOpe', 'gEmis', 'dDVEmi'], sifenNs)
    ),
    customerName: getNestedText(de, ['gDatGralOpe', 'gDatRec', 'dNomRec'], sifenNs),
    customerRuc: buildRuc(
      getNestedText(de, ['gDatGralOpe', 'gDatRec', 'dRucRec'], sifenNs),
      getNestedText(de, ['gDatGralOpe', 'gDatRec', 'dDVRec'], sifenNs)
    ),
    currency: getNestedText(de, ['gDatGralOpe', 'gOpeCom', 'cMoneOpe'], sifenNs),
    condition: getNestedText(de, ['gDtipDE', 'gCamCond', 'dDCondOpe'], sifenNs),
    exemptAmount: getNestedText(de, ['gTotSub', 'dSubExe'], sifenNs),
    taxed5Amount: getNestedText(de, ['gTotSub', 'dSub5'], sifenNs),
    taxed10Amount: getNestedText(de, ['gTotSub', 'dSub10'], sifenNs),
    vatTotal: getNestedText(de, ['gTotSub', 'dTotIVA'], sifenNs),
    grandTotal: getNestedText(de, ['gTotSub', 'dTotGralOpe'], sifenNs)
  };

  data.invoiceNumber = `${data.establishment}-${data.expeditionPoint}-${data.documentNumber}`;
  return data;
}
```

---

## 6) Última corrida confirmada

Después de aplicar soporte para SOAP/UTF-16, la ejecución manual de `processPendingInvoiceEmails` completó con:

```text
Processed: 17
Duplicates skipped: 0
Invalid skipped: 3
```

Durante esa corrida se confirmó que los XML problemáticos `0180031808...` ya se procesaron correctamente.

---

## 7) Punto exacto pendiente al retomar

Quedan `3` hilos inválidos.

La hipótesis actual, basada en logs, es que ya no son XML con formato roto, sino hilos sin XML válido o sin adjunto XML detectable.

El siguiente paso acordado era identificar esos 3 hilos agregando este log al inicio del loop de threads dentro de `processPendingInvoiceEmails`:

```javascript
for (const thread of threads) {
  Logger.log('Revisando thread: ' + thread.getFirstMessageSubject());

  if (threadHasProcessedLabel(thread)) {
    continue;
  }
```

Luego ejecutar una sola vez `processPendingInvoiceEmails` y revisar solo las líneas:

```text
Revisando thread: ...
Thread skipped: no valid XML invoice found.
```

Objetivo del próximo paso:

- Identificar los 3 hilos inválidos restantes.
- Decidir si deben ignorarse, marcarse como procesados, excluirse por query, o manejarse con otro criterio.
- No hacer limpieza general antes de confirmar esto.

---

## 8) Prompt recomendado para Codex local

Pegá esto en Codex después de abrir el repo local `invoice-collector`:

```text
Leé primero el archivo CODEX_HANDOFF_invoice_collector_2026-06-29.md completo.

Quiero continuar exactamente desde ese estado.

Reglas:
- trabajemos paso a paso
- un solo paso a la vez
- no propongas una re-arquitectura
- no cambies IDs, nombres de hojas, labels, carpetas ni estructura del repo sin validarlo
- primero identificá la causa real antes de tocar código
- no limpies helpers ni funciones de prueba todavía

Punto exacto pendiente:
quedan 3 hilos inválidos después de haber corregido parseInvoiceXml para rLoteDE y SOAP/UTF-16.
El siguiente paso es agregar el log del subject del thread al inicio del loop de processPendingInvoiceEmails, ejecutar una corrida y detectar cuáles son esos 3 hilos.

Primero inspeccioná el estado actual de src/InvoiceProcessor.js y confirmame si el código local ya contiene:
1. try/catch alrededor de parseInvoiceXml en processPendingInvoiceEmails
2. parseInvoiceXml con soporte para rLoteDE
3. parseInvoiceXml con soporte para SOAP Envelope
4. el trigger ya fue creado en Apps Script, así que no hay que crearlo de nuevo

Después proponé solo el próximo cambio mínimo.
```

---

## 9) Cómo ubicar este archivo en el repo local

Recomendado:

```text
invoice-collector/
  docs/
    history/
      2026-06-29-codex-handoff.md
```

También puede dejarse temporalmente en la raíz como:

```text
CODEX_HANDOFF_invoice_collector_2026-06-29.md
```

Si se deja en raíz, luego puede moverse a `docs/history/` cuando el estado esté estabilizado.

---

# HANDOFF ORIGINAL EMBEBIDO

A continuación se incluye el contenido completo del handoff original para preservar el contexto base.

---

# NEW CHAT HANDOFF — invoice-collector

Este archivo está pensado para abrir un chat nuevo y continuar este proyecto sin perder el contexto importante.

---

## 1) Cómo quiero que trabajemos en el nuevo chat

Regla de oro del usuario:

- Avanzar estrictamente **paso a paso**
- **Un solo paso a la vez**
- No dar tutoriales completos de una vez
- No adelantarse al siguiente paso hasta cerrar el actual
- En debugging o trabajo técnico, primero identificar la **causa real**
- Evitar múltiples caminos hipotéticos que confundan
- Preferencia por un enfoque de trabajo claro, incremental y validado

Esto debe respetarse en todo momento.

---

## 2) Proyecto actual

### Nombre del repo
`invoice-collector`

### Repo GitHub
`Lamprophony1/invoice-collector`

### Objetivo del proyecto
Automatizar el procesamiento de facturas electrónicas recibidas por correo usando:

- Gmail
- Google Apps Script
- Google Drive
- Google Sheets

### Flujo funcional deseado
1. Buscar correos candidatos en Gmail
2. Detectar adjuntos XML y PDF
3. Usar el XML como fuente principal de datos
4. Guardar XML y PDF en Google Drive organizados por año/mes
5. Registrar cada factura en Google Sheets
6. Evitar duplicados
7. Marcar el correo como procesado con una etiqueta Gmail

---

## 3) Recursos reales confirmados

### Google Drive
Carpeta raíz:
`2- Contabilidad Rafael Garcia`

Folder ID:
`1s4I_IZrV6_PyEqCV2xX6fFIh_yIR9Hgy`

### Google Sheets
Archivo:
`Resumen Facturas Electrónicas 2026`

Spreadsheet ID:
`1koM-mlSu7cUsF9-VnokKfcWiqdZYKiXUkyMx8q29HeY`

Hoja:
`Detalle`

### Gmail
Etiqueta de correos procesados:
`facturas/procesado`

---

## 4) Columnas confirmadas en Google Sheets

La hoja `Detalle` usa esta estructura:

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

---

## 5) Decisiones técnicas ya tomadas

### XML como fuente principal
El XML es la fuente oficial para extraer:
- fecha de emisión
- proveedor
- RUC proveedor
- timbrado
- número de factura
- moneda
- condición
- importes
- identificador único

### PDF como respaldo
El PDF se conserva como soporte documental, pero no es la fuente principal de parsing.

### Detección de archivos por extensión
No confiar solo en MIME type.
Se detecta:
- PDF por `.pdf`
- XML por `.xml`

Esto fue necesario porque en pruebas reales aparecieron MIME types inconsistentes, como:
- `application/octet-stream`
- `application/xhtml+xml`

### Carpeta mensual definida por la fecha del XML
La carpeta destino en Drive se determina por la fecha de emisión del XML, no por la fecha de recepción del correo.

### Duplicados controlados por Unique Id
La planilla no debe insertar una fila si el `Unique Id` ya existe.

### Correos procesados marcados por etiqueta Gmail
Los hilos tratados se marcan con:
`facturas/procesado`

### La búsqueda no depende solo del asunto
Se definió que Gmail debe buscar correos candidatos usando términos relacionados con facturación electrónica en contenido indexado por Gmail, no solo en subject.

Términos usados:
- `factura electrónica`
- `factura electronica`
- `documento electrónico`
- `documento electronico`

---

## 6) Función principal actual del script

Función principal:
`processPendingInvoiceEmails`

Responsabilidad:
- buscar correos pendientes
- detectar XML/PDF
- parsear XML
- crear/reusar carpeta del mes en Drive
- guardar archivos
- insertar fila en Sheets
- evitar duplicados
- marcar hilos como procesados

---

## 7) Estado funcional confirmado

Se validó paso a paso lo siguiente:

### Conexiones
- acceso a la carpeta de Drive
- acceso al archivo de Google Sheets
- acceso a la hoja `Detalle`

### Gmail
- búsqueda de correos candidatos
- detección de adjuntos XML y PDF
- lectura de XML
- marcado de hilos como procesados
- exclusión de hilos ya procesados

### XML
- lectura correcta
- parsing correcto de campos clave

### Drive
- creación/reutilización de carpetas por año y mes
- guardado de XML y PDF sin duplicar por nombre

### Sheets
- inserción real de filas
- prevención de duplicados por `Unique Id`

### Procesamiento batch
Se ejecutó una corrida real con resultado:

- Processed: `19`
- Duplicates skipped: `0`
- Invalid skipped: `1`

---

## 8) Ejemplo real de parsing validado

Se validó un XML real con salida como esta:

- uniqueId: `01800863631001001000020622026031112896089493`
- documentType: `Factura electrónica`
- timbrado: `18231131`
- establishment: `001`
- expeditionPoint: `001`
- documentNumber: `0000206`
- issueDate: `2026-03-11T11:28:55`
- supplierName: `H . P GROUP SOCIEDAD ANONIMA`
- supplierRuc: `80086363-1`
- customerName: `RAFAEL NICOLAS GARCIA BRITOS`
- customerRuc: `4379480-7`
- currency: `PYG`
- condition: `Crédito`
- exemptAmount: `9639168`
- taxed5Amount: `0`
- taxed10Amount: `1314431.99999999`
- vatTotal: `119493.81818181`
- grandTotal: `10953599.99999999`
- invoiceNumber: `001-001-0000206`

---

## 9) Estructura actual del repo

La estructura fue reordenada para usar `src/`.

### Estructura actual esperada
```text
invoice-collector/
  .clasp.json
  .gitignore
  README.md
  docs/
    overview.md
    setup.md
    decisions.md
    history/
      2026-04-02-automation-checkpoint.md
  src/
    appsscript.json
    InvoiceProcessor.js
```

### Cambio estructural realizado
Se hizo el reordenamiento desde una estructura anterior donde el código estaba en raíz y el archivo principal se llamaba `Código.js`.

Ahora quedó:
- `src/appsscript.json`
- `src/InvoiceProcessor.js`

---

## 10) Estado actual de clasp

### `.clasp.json`
Quedó ajustado para usar:

- `rootDir: "src"`

### Validaciones realizadas
Se ejecutó:

- `clasp push`
- `clasp status`

Resultado final confirmado:
- `src/appsscript.json`
- `src/InvoiceProcessor.js`

sin archivos extra pendientes en `clasp status`.

### Incidente resuelto durante la migración
Después de un `clasp pull`, reapareció localmente `src/Código.js` como archivo no trackeado porque el Apps Script remoto todavía tenía el estado viejo.

La causa real fue:
- GitHub ya había sido reorganizado
- Apps Script remoto todavía no

Se resolvió así:
1. limpiar el archivo viejo local
2. hacer `clasp push`
3. validar con `clasp status`

---

## 11) Estado actual de Git/GitHub

### Commit de documentación
Se agregó la documentación base del proyecto.

### Commit de reorganización estructural
Se aplicó el commit:

`5d89ad421dc24a2eec4e63c92cc8dad0344ba02a`

Descripción:
- mover manifest a `src/`
- renombrar `Código.js` a `src/InvoiceProcessor.js`
- ajustar `.clasp.json` a `rootDir: "src"`

### Validación local
Se hizo:
- `git pull --ff-only`

Resultado:
- `Already up to date.`

---

## 12) Documentación ya agregada al repo

Archivos agregados:

- `README.md`
- `docs/overview.md`
- `docs/setup.md`
- `docs/decisions.md`
- `docs/history/2026-04-02-automation-checkpoint.md`

Y el `README.md` ya quedó enlazando esos documentos.

---

## 13) Funciones auxiliares mencionadas durante la construcción

Helpers y funciones de soporte mencionadas o usadas durante la construcción:

- `testConnections`
- `testInvoiceEmailSearch`
- `testInvoiceAttachments`
- `testReadFirstXml`
- `testParseFirstXml`
- `testGetOrCreateMonthFolder`
- `testSaveFirstInvoiceFiles`
- `testAppendFirstInvoiceToSheet`
- `testAppendFirstInvoiceToSheetNoDuplicates`
- `testProcessedLabel`
- `testMarkFirstInvoiceEmailAsProcessed`
- `testSearchOnlyUnprocessedInvoiceEmails`
- `getNestedText`
- `buildRuc`
- `getOrCreateMonthFolder`
- `getOrCreateChildFolder`
- `saveFileIfNotExists`
- `parseInvoiceXml`
- `normalizeAmount`
- `invoiceAlreadyExists`
- `getOrCreateLabel`
- `markThreadAsProcessed`
- `threadHasProcessedLabel`
- `processPendingInvoiceEmails`

No se debe asumir que ya se limpió el script. Puede seguir habiendo funciones de prueba y producción mezcladas.

---

## 14) Punto exacto donde quedó el trabajo

El siguiente paso pendiente en el chat original era:

### Verificar si existe el trigger automático
Había que abrir Apps Script y comprobar si existe un trigger para:

`processPendingInvoiceEmails`

La instrucción pendiente era:
1. abrir con `clasp open`
2. ir a Triggers / Activadores
3. verificar si existe un trigger para `processPendingInvoiceEmails`

### Respuesta esperada en el siguiente chat
- `sí, existe`
o
- `no, no existe`

Ese es el punto exacto donde quedó pausado el trabajo.

---

## 15) Pendientes importantes actuales

### Pendiente 1
Confirmar si el trigger automático existe o no.

### Pendiente 2
Revisar el `1` hilo inválido de la corrida batch:
- `Invalid skipped: 1`

### Pendiente 3
Eventualmente limpiar el script para separar:
- funciones de prueba
- helpers
- flujo principal

Pero **no hacer eso todavía sin validarlo paso a paso**.

---

## 16) Criterios operativos que el nuevo chat debe respetar

- No reinventar arquitectura
- No cambiar IDs ni nombres sin validar
- No tocar estructura de repo/clasp otra vez salvo necesidad real
- Respetar que el usuario no quiere sobreexplicación masiva
- Trabajar siempre en modo incremental
- Primero confirmar estado actual, después cambiar

---

## 17) Prompt sugerido para pegar al inicio del nuevo chat

Podés pegar esto al arrancar el nuevo chat:

---

Quiero continuar este proyecto exactamente desde el estado del handoff adjunto.

Reglas:
- trabajemos estrictamente paso a paso
- un solo paso a la vez
- no me des un tutorial completo de una vez
- primero identificá la causa real antes de proponer cambios
- no inventes contexto que no esté en el handoff

El punto exacto donde quedó el trabajo es este:
tenemos que verificar si existe el trigger automático para `processPendingInvoiceEmails` en Apps Script.

Tomá el handoff como fuente principal de contexto y continuemos desde ahí.

---

## 18) Nota honesta

Este handoff está diseñado para conservar el contexto técnico y operativo importante del proyecto. No es literalmente cada palabra del chat original, pero sí contiene el estado, decisiones, recursos, estructura, validaciones, incidentes resueltos y el próximo paso exacto para retomar sin perder el hilo.

