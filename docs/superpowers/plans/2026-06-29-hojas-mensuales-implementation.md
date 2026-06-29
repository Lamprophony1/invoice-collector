# Hojas Mensuales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move invoice registration from the technical `Detalle` sheet to accountant-friendly monthly sheets with summaries, row-by-row detail, readable dates, migration from existing rows, and duplicate control by `Unique Id`.

**Architecture:** Keep the Apps Script project as a single script for this phase, following the existing incremental style. Add monthly-sheet helpers around the current production flow, then switch `processPendingInvoiceEmails` to write monthly rows and add a one-time migration function from `Detalle`.

**Tech Stack:** Google Apps Script V8, GmailApp, DriveApp, SpreadsheetApp, clasp, Google Sheets formulas.

---

## File Structure

- Modify: `src/InvoiceProcessor.js`
  - Add monthly constants.
  - Add date/month helpers.
  - Add monthly row builders.
  - Add monthly sheet read/render helpers.
  - Add duplicate detection across month sheets.
  - Add migration function from `Detalle`.
  - Update `processPendingInvoiceEmails`.
  - Keep existing historical test helpers for now.
- Modify: `docs/context.md`
  - Update the active next step after implementation.
- Modify: `docs/overview.md`
  - Update the Sheets output model from `Detalle` to monthly sheets.
- Modify: `docs/setup.md`
  - Document monthly sheet names and migration function.

## Preflight Rule

Before changing the monthly output, close or explicitly defer the current invalid-thread debugging step. The current script has a temporary log line:

```javascript
Logger.log('Revisando thread: ' + thread.getFirstMessageSubject());
```

Run the current processor once, capture the remaining invalid subjects, and decide whether they are expected skips. Do not remove that log in this plan unless the user explicitly asks for cleanup.

---

### Task 1: Preflight Current Runtime State

**Files:**
- No file changes.

- [ ] **Step 1: Confirm repository is clean**

Run:

```powershell
git status --short --branch
```

Expected:

```text
## main...origin/main [ahead 1]
```

or clean equivalent. If files are modified, inspect them before continuing.

- [ ] **Step 2: Confirm clasp sees only expected Apps Script files**

Run:

```powershell
clasp.cmd status
```

Expected:

```text
Tracked files:
- src\appsscript.json
- src\InvoiceProcessor.js
Untracked files:
```

- [ ] **Step 3: Run current processor manually in Apps Script**

Run this from the Apps Script editor or with clasp if available:

```powershell
clasp.cmd run processPendingInvoiceEmails
```

Expected:

```text
No uncaught exception.
Logs include:
Revisando thread: ...
Thread skipped: no valid XML invoice found.
--- Summary ---
Processed: ...
Duplicates skipped: ...
Invalid skipped: ...
```

- [ ] **Step 4: Record invalid subjects**

Copy the subjects that appear immediately before `Thread skipped: no valid XML invoice found.` into `docs/context.md` under the current next-step notes. If all invalids are expected non-invoices, state that in `docs/context.md`.

- [ ] **Step 5: Commit context note if changed**

Run:

```powershell
git add -- docs/context.md
git commit -m "docs: registrar hilos invalidos restantes"
```

Expected:

```text
[main ...] docs: registrar hilos invalidos restantes
```

Skip this commit only if `docs/context.md` was not changed.

---

### Task 2: Add Monthly Constants And Date Helpers

**Files:**
- Modify: `src/InvoiceProcessor.js:1-5`
- Modify: `src/InvoiceProcessor.js:452-456`

- [ ] **Step 1: Add failing helper tests**

Add this block after `normalizeAmount` in `src/InvoiceProcessor.js`:

```javascript
function assertEqualForTest(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message + ' | expected: ' + expected + ' | actual: ' + actual);
  }
}

function testMonthlyDateHelpers() {
  assertEqualForTest(getMonthSheetNameFromIssueDate('2026-03-11T11:28:55'), 'Marzo', 'Month from XML timestamp');
  assertEqualForTest(getMonthSheetNameFromIssueDate(new Date(2026, 0, 5, 14, 30, 0)), 'Enero', 'Month from Date');

  const dateOnly = getDateOnlyForSheet('2026-03-11T11:28:55');
  assertEqualForTest(dateOnly.getFullYear(), 2026, 'Date year');
  assertEqualForTest(dateOnly.getMonth(), 2, 'Date month');
  assertEqualForTest(dateOnly.getDate(), 11, 'Date day');
  assertEqualForTest(dateOnly.getHours(), 0, 'Date hour stripped');

  Logger.log('testMonthlyDateHelpers passed');
}
```

- [ ] **Step 2: Push and run test to verify it fails**

Run:

```powershell
clasp.cmd push
clasp.cmd run testMonthlyDateHelpers
```

Expected:

```text
ReferenceError: getMonthSheetNameFromIssueDate is not defined
```

- [ ] **Step 3: Add constants and helper implementation**

Replace the existing top constants:

```javascript
const ROOT_FOLDER_ID = '1s4I_IZrV6_PyEqCV2xX6fFIh_yIR9Hgy';
const SPREADSHEET_ID = '1koM-mlSu7cUsF9-VnokKfcWiqdZYKiXUkyMx8q29HeY';
const SHEET_NAME = 'Detalle';
const PROCESSED_LABEL_NAME = 'facturas/procesado';
```

with:

```javascript
const ROOT_FOLDER_ID = '1s4I_IZrV6_PyEqCV2xX6fFIh_yIR9Hgy';
const SPREADSHEET_ID = '1koM-mlSu7cUsF9-VnokKfcWiqdZYKiXUkyMx8q29HeY';
const DETAIL_SHEET_NAME = 'Detalle';
const SHEET_NAME = DETAIL_SHEET_NAME;
const PROCESSED_LABEL_NAME = 'facturas/procesado';

const MONTH_SHEET_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const MONTH_DETAIL_HEADERS = [
  'Fecha',
  'Proveedor',
  'RUC Proveedor',
  'Timbrado',
  'Nro Factura',
  'Moneda',
  'Exentas',
  'Gravado 5%',
  'Gravado 10%',
  'IVA Total',
  'Total',
  'Condicion',
  'PDF',
  'XML',
  'Unique Id'
];
```

Add this block after `normalizeAmount` and before the test from Step 1:

```javascript
function parseDateValue(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return null;
  }

  const isoMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const slashMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return new Date(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1]));
  }

  const parsed = new Date(rawValue);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getDateOnlyForSheet(value) {
  const date = parseDateValue(value);
  if (!date) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getMonthSheetNameFromIssueDate(issueDateValue) {
  const date = parseDateValue(issueDateValue);
  if (!date) {
    throw new Error('Fecha de emision invalida: ' + issueDateValue);
  }

  return MONTH_SHEET_NAMES[date.getMonth()];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
clasp.cmd push
clasp.cmd run testMonthlyDateHelpers
```

Expected:

```text
testMonthlyDateHelpers passed
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add -- src/InvoiceProcessor.js
git commit -m "feat: agregar helpers de fechas mensuales"
```

Expected:

```text
[main ...] feat: agregar helpers de fechas mensuales
```

---

### Task 3: Add Monthly Row Builders

**Files:**
- Modify: `src/InvoiceProcessor.js:452-560`

- [ ] **Step 1: Add failing row-builder tests**

Add this block after `testMonthlyDateHelpers`:

```javascript
function testMonthlyRowBuilders() {
  const parsedData = {
    issueDate: '2026-03-11T11:28:55',
    supplierName: 'H . P GROUP SOCIEDAD ANONIMA',
    supplierRuc: '80086363-1',
    timbrado: '18231131',
    invoiceNumber: '001-001-0000206',
    currency: 'PYG',
    exemptAmount: '9639168',
    taxed5Amount: '0',
    taxed10Amount: '1314431.99999999',
    vatTotal: '119493.81818181',
    grandTotal: '10953599.99999999',
    condition: 'Credito',
    uniqueId: '01800863631001001000020622026031112896089493'
  };

  const row = buildMonthlyInvoiceRow(parsedData, 'Factura.pdf', 'https://example.com/pdf', 'Factura.xml', 'https://example.com/xml');

  assertEqualForTest(row.length, MONTH_DETAIL_HEADERS.length, 'Monthly row column count');
  assertEqualForTest(row[1], 'H . P GROUP SOCIEDAD ANONIMA', 'Supplier name');
  assertEqualForTest(row[4], '001-001-0000206', 'Invoice number');
  assertEqualForTest(row[6], 9639168, 'Exempt amount');
  assertEqualForTest(row[8], 1314432, 'Taxed 10 amount rounded');
  assertEqualForTest(row[11], 'Credito', 'Condition');
  assertEqualForTest(row[12], '=HYPERLINK("https://example.com/pdf","Factura.pdf")', 'PDF hyperlink formula');
  assertEqualForTest(row[14], '01800863631001001000020622026031112896089493', 'Unique Id');

  Logger.log('testMonthlyRowBuilders passed');
}
```

- [ ] **Step 2: Push and run test to verify it fails**

Run:

```powershell
clasp.cmd push
clasp.cmd run testMonthlyRowBuilders
```

Expected:

```text
ReferenceError: buildMonthlyInvoiceRow is not defined
```

- [ ] **Step 3: Add row-builder implementation**

Add this block after `testMonthlyDateHelpers`:

```javascript
function escapeFormulaText(value) {
  return String(value || '').replace(/"/g, '""');
}

function buildHyperlinkFormula(fileName, fileUrl) {
  if (!fileUrl) {
    return '';
  }

  const label = fileName || fileUrl;
  return '=HYPERLINK("' + escapeFormulaText(fileUrl) + '","' + escapeFormulaText(label) + '")';
}

function normalizeCondition(value) {
  const condition = String(value || '').trim();
  if (!condition) {
    return '';
  }

  return condition.replace('Cr\u00E9dito', 'Credito');
}

function buildMonthlyInvoiceRow(parsedData, pdfFileName, pdfUrl, xmlFileName, xmlUrl) {
  return [
    getDateOnlyForSheet(parsedData.issueDate),
    parsedData.supplierName,
    parsedData.supplierRuc,
    parsedData.timbrado,
    parsedData.invoiceNumber,
    parsedData.currency,
    normalizeAmount(parsedData.exemptAmount),
    normalizeAmount(parsedData.taxed5Amount),
    normalizeAmount(parsedData.taxed10Amount),
    normalizeAmount(parsedData.vatTotal),
    normalizeAmount(parsedData.grandTotal),
    normalizeCondition(parsedData.condition),
    buildHyperlinkFormula(pdfFileName, pdfUrl),
    buildHyperlinkFormula(xmlFileName, xmlUrl),
    parsedData.uniqueId
  ];
}

function objectFromHeaders(headers, row) {
  const object = {};

  headers.forEach((header, index) => {
    object[header] = row[index];
  });

  return object;
}

function buildMonthlyInvoiceRowFromDetailObject(detail) {
  return [
    getDateOnlyForSheet(detail['Fecha']),
    detail['Proveedor'],
    detail['RUC Proveedor'],
    detail['Timbrado'],
    detail['Nro Factura'],
    detail['Currency'],
    normalizeAmount(detail['Exentas (Gs)']),
    normalizeAmount(detail['Gravado 5% (Gs)']),
    normalizeAmount(detail['Gravado 10% (Gs)']),
    normalizeAmount(detail['IVA Total (Gs)']),
    normalizeAmount(detail['Total (Gs)']),
    normalizeCondition(detail['Condici\u00F3n'] || detail['Condicion']),
    buildHyperlinkFormula(detail['PDF File Name'], detail['PDF Drive Link']),
    buildHyperlinkFormula(detail['XML File Name'], detail['XML Drive Link']),
    detail['Unique Id']
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
clasp.cmd push
clasp.cmd run testMonthlyRowBuilders
```

Expected:

```text
testMonthlyRowBuilders passed
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add -- src/InvoiceProcessor.js
git commit -m "feat: construir filas mensuales de facturas"
```

Expected:

```text
[main ...] feat: construir filas mensuales de facturas
```

---

### Task 4: Add Monthly Sheet Rendering And Summary Helpers

**Files:**
- Modify: `src/InvoiceProcessor.js:452-611`

- [ ] **Step 1: Add failing summary tests**

Add this block after `testMonthlyRowBuilders`:

```javascript
function testMonthlySummaryBuilders() {
  const rows = [
    [new Date(2026, 2, 11), 'Proveedor A', '80000001-1', '100', '001-001-0000001', 'PYG', 100, 200, 300, 50, 600, 'Contado', '', '', 'uid-1'],
    [new Date(2026, 2, 12), 'Proveedor A', '80000001-1', '100', '001-001-0000002', 'PYG', 0, 0, 400, 40, 400, 'Credito', '', '', 'uid-2'],
    [new Date(2026, 2, 13), 'Proveedor B', '80000002-2', '101', '001-001-0000003', 'USD', 10, 20, 30, 5, 60, 'Contado', '', '', 'uid-3']
  ];

  const summary = calculateMonthlySummary(rows);

  assertEqualForTest(summary.count, 3, 'Invoice count');
  assertEqualForTest(summary.exemptTotal, 110, 'Exempt total');
  assertEqualForTest(summary.taxed5Total, 220, 'Taxed 5 total');
  assertEqualForTest(summary.taxed10Total, 730, 'Taxed 10 total');
  assertEqualForTest(summary.vatTotal, 95, 'VAT total');
  assertEqualForTest(summary.grandTotal, 1060, 'Grand total');
  assertEqualForTest(summary.byCondition['Contado'].total, 660, 'Contado total');
  assertEqualForTest(summary.byCurrency['PYG'].count, 2, 'PYG count');
  assertEqualForTest(summary.bySupplier['Proveedor A|80000001-1'].total, 1000, 'Supplier total');

  Logger.log('testMonthlySummaryBuilders passed');
}
```

- [ ] **Step 2: Push and run test to verify it fails**

Run:

```powershell
clasp.cmd push
clasp.cmd run testMonthlySummaryBuilders
```

Expected:

```text
ReferenceError: calculateMonthlySummary is not defined
```

- [ ] **Step 3: Add sheet rendering and summary implementation**

Add this block after the row-builder functions:

```javascript
function getOrCreateSheet(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  return sheet;
}

function addSummaryBucket(map, key, total) {
  const normalizedKey = String(key || 'Sin dato').trim() || 'Sin dato';
  if (!map[normalizedKey]) {
    map[normalizedKey] = { count: 0, total: 0 };
  }

  map[normalizedKey].count++;
  map[normalizedKey].total += Number(total || 0);
}

function addSupplierSummaryBucket(map, supplier, ruc, total) {
  const supplierName = String(supplier || 'Sin proveedor').trim() || 'Sin proveedor';
  const supplierRuc = String(ruc || '').trim();
  const key = supplierName + '|' + supplierRuc;

  if (!map[key]) {
    map[key] = {
      supplier: supplierName,
      ruc: supplierRuc,
      count: 0,
      total: 0
    };
  }

  map[key].count++;
  map[key].total += Number(total || 0);
}

function calculateMonthlySummary(rows) {
  const summary = {
    count: rows.length,
    exemptTotal: 0,
    taxed5Total: 0,
    taxed10Total: 0,
    vatTotal: 0,
    grandTotal: 0,
    byCondition: {},
    byCurrency: {},
    bySupplier: {}
  };

  rows.forEach(row => {
    const grandTotal = Number(row[10] || 0);

    summary.exemptTotal += Number(row[6] || 0);
    summary.taxed5Total += Number(row[7] || 0);
    summary.taxed10Total += Number(row[8] || 0);
    summary.vatTotal += Number(row[9] || 0);
    summary.grandTotal += grandTotal;

    addSummaryBucket(summary.byCondition, row[11], grandTotal);
    addSummaryBucket(summary.byCurrency, row[5], grandTotal);
    addSupplierSummaryBucket(summary.bySupplier, row[1], row[2], grandTotal);
  });

  return summary;
}

function appendSummaryMapRows(outputRows, title, headers, values) {
  outputRows.push(['']);
  outputRows.push([title]);
  outputRows.push(headers);

  values.forEach(value => {
    outputRows.push(value);
  });
}

function buildMonthlySheetValues(rows) {
  const summary = calculateMonthlySummary(rows);
  const outputRows = [
    ['Resumen mensual'],
    ['Concepto', 'Valor'],
    ['Cantidad de facturas', summary.count],
    ['Total exentas', summary.exemptTotal],
    ['Total gravado 5%', summary.taxed5Total],
    ['Total gravado 10%', summary.taxed10Total],
    ['Total IVA', summary.vatTotal],
    ['Total general', summary.grandTotal]
  ];

  appendSummaryMapRows(
    outputRows,
    'Totales por condicion',
    ['Condicion', 'Cantidad', 'Total'],
    Object.keys(summary.byCondition).sort().map(key => [key, summary.byCondition[key].count, summary.byCondition[key].total])
  );

  appendSummaryMapRows(
    outputRows,
    'Totales por moneda',
    ['Moneda', 'Cantidad', 'Total'],
    Object.keys(summary.byCurrency).sort().map(key => [key, summary.byCurrency[key].count, summary.byCurrency[key].total])
  );

  appendSummaryMapRows(
    outputRows,
    'Totales por proveedor/RUC',
    ['Proveedor', 'RUC Proveedor', 'Cantidad', 'Total'],
    Object.keys(summary.bySupplier).sort().map(key => {
      const supplier = summary.bySupplier[key];
      return [supplier.supplier, supplier.ruc, supplier.count, supplier.total];
    })
  );

  outputRows.push(['']);
  outputRows.push(['Detalle']);
  outputRows.push(MONTH_DETAIL_HEADERS);

  rows.forEach(row => outputRows.push(row));

  return outputRows;
}

function findMonthlyDetailHeaderRow(values) {
  for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];
    const matches = MONTH_DETAIL_HEADERS.every((header, index) => row[index] === header);
    if (matches) {
      return rowIndex + 1;
    }
  }

  return 0;
}

function getMonthlyDetailRows(sheet) {
  const values = sheet.getDataRange().getValues();
  const headerRow = findMonthlyDetailHeaderRow(values);
  if (!headerRow) {
    return [];
  }

  return values
    .slice(headerRow)
    .filter(row => String(row[14] || '').trim());
}

function writeMonthlySheet(sheet, rows) {
  const values = buildMonthlySheetValues(rows);
  const width = Math.max.apply(null, values.map(row => row.length));
  const normalizedValues = values.map(row => {
    const copy = row.slice();
    while (copy.length < width) {
      copy.push('');
    }
    return copy;
  });

  sheet.clear();
  sheet.getRange(1, 1, normalizedValues.length, width).setValues(normalizedValues);

  const headerRow = findMonthlyDetailHeaderRow(normalizedValues);
  if (headerRow) {
    sheet.getRange(headerRow, 1, 1, MONTH_DETAIL_HEADERS.length).setFontWeight('bold');
    const detailRowCount = rows.length;
    if (detailRowCount > 0) {
      sheet.getRange(headerRow + 1, 1, detailRowCount, 1).setNumberFormat('dd/MM/yyyy');
      sheet.getRange(headerRow + 1, 7, detailRowCount, 5).setNumberFormat('#,##0.00');
    }
  }

  sheet.autoResizeColumns(1, Math.min(width, MONTH_DETAIL_HEADERS.length));
}

function appendInvoiceToMonthlySheet(spreadsheet, sheetName, row) {
  const sheet = getOrCreateSheet(spreadsheet, sheetName);
  const rows = getMonthlyDetailRows(sheet);
  rows.push(row);
  writeMonthlySheet(sheet, rows);
}
```

- [ ] **Step 4: Run summary test to verify it passes**

Run:

```powershell
clasp.cmd push
clasp.cmd run testMonthlySummaryBuilders
```

Expected:

```text
testMonthlySummaryBuilders passed
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add -- src/InvoiceProcessor.js
git commit -m "feat: generar hojas mensuales con resumen"
```

Expected:

```text
[main ...] feat: generar hojas mensuales con resumen
```

---

### Task 5: Add Duplicate Detection Across Monthly Sheets

**Files:**
- Modify: `src/InvoiceProcessor.js:531-542`

- [ ] **Step 1: Add failing duplicate helper test**

Add this block after `testMonthlySummaryBuilders`:

```javascript
function testMonthlyDuplicateDetection() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = '_TestMensualDuplicados';
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (sheet) {
    spreadsheet.deleteSheet(sheet);
  }

  sheet = spreadsheet.insertSheet(sheetName);
  writeMonthlySheet(sheet, [
    [new Date(2026, 2, 11), 'Proveedor A', '80000001-1', '100', '001-001-0000001', 'PYG', 100, 200, 300, 50, 600, 'Contado', '', '', 'uid-test']
  ]);

  const exists = invoiceAlreadyExistsInSheets([sheet], 'uid-test');
  const missing = invoiceAlreadyExistsInSheets([sheet], 'uid-missing');

  spreadsheet.deleteSheet(sheet);

  assertEqualForTest(exists, true, 'Existing monthly Unique Id');
  assertEqualForTest(missing, false, 'Missing monthly Unique Id');
  Logger.log('testMonthlyDuplicateDetection passed');
}
```

- [ ] **Step 2: Push and run test to verify it fails**

Run:

```powershell
clasp.cmd push
clasp.cmd run testMonthlyDuplicateDetection
```

Expected:

```text
ReferenceError: invoiceAlreadyExistsInSheets is not defined
```

- [ ] **Step 3: Add duplicate helper implementation**

Add this block after `getMonthlyDetailRows`:

```javascript
function invoiceAlreadyExistsInSheets(sheets, uniqueId) {
  const targetUniqueId = String(uniqueId || '').trim();
  if (!targetUniqueId) {
    return false;
  }

  return sheets.some(sheet => {
    const rows = getMonthlyDetailRows(sheet);
    return rows.some(row => String(row[14] || '').trim() === targetUniqueId);
  });
}

function getExistingMonthlySheets(spreadsheet) {
  return MONTH_SHEET_NAMES
    .map(sheetName => spreadsheet.getSheetByName(sheetName))
    .filter(sheet => sheet);
}

function invoiceAlreadyExistsInMonthlySheets(spreadsheet, uniqueId) {
  return invoiceAlreadyExistsInSheets(getExistingMonthlySheets(spreadsheet), uniqueId);
}
```

- [ ] **Step 4: Run duplicate helper test to verify it passes**

Run:

```powershell
clasp.cmd push
clasp.cmd run testMonthlyDuplicateDetection
```

Expected:

```text
testMonthlyDuplicateDetection passed
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add -- src/InvoiceProcessor.js
git commit -m "feat: detectar duplicados en hojas mensuales"
```

Expected:

```text
[main ...] feat: detectar duplicados en hojas mensuales
```

---

### Task 6: Add Migration From Detalle To Monthly Sheets

**Files:**
- Modify: `src/InvoiceProcessor.js:531-611`

- [ ] **Step 1: Add migration function**

Add this block before `processPendingInvoiceEmails`:

```javascript
function migrateDetalleToMonthlySheets() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const detailSheet = spreadsheet.getSheetByName(DETAIL_SHEET_NAME);

  if (!detailSheet) {
    throw new Error('No se encontro la hoja ' + DETAIL_SHEET_NAME + '.');
  }

  const values = detailSheet.getDataRange().getValues();
  if (values.length < 2) {
    Logger.log('No hay filas para migrar desde ' + DETAIL_SHEET_NAME + '.');
    return;
  }

  const headers = values[0];
  const rows = values.slice(1).filter(row => row.some(value => value !== ''));
  const monthlyRowsBySheet = {};
  const existingUniqueIds = {};
  const affectedSheetNames = {};

  MONTH_SHEET_NAMES.forEach(sheetName => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      return;
    }

    const monthlyRows = getMonthlyDetailRows(sheet);
    monthlyRowsBySheet[sheetName] = monthlyRows;
    monthlyRows.forEach(row => {
      existingUniqueIds[String(row[14] || '').trim()] = true;
    });
  });

  let migrated = 0;
  let duplicateSkipped = 0;
  let invalidDateSkipped = 0;

  rows.forEach(row => {
    const detail = objectFromHeaders(headers, row);
    const uniqueId = String(detail['Unique Id'] || '').trim();

    if (uniqueId && existingUniqueIds[uniqueId]) {
      duplicateSkipped++;
      return;
    }

    const date = getDateOnlyForSheet(detail['Fecha']);
    if (!date) {
      invalidDateSkipped++;
      Logger.log('Fila omitida por fecha invalida: ' + JSON.stringify(row));
      return;
    }

    const sheetName = MONTH_SHEET_NAMES[date.getMonth()];
    if (!monthlyRowsBySheet[sheetName]) {
      monthlyRowsBySheet[sheetName] = [];
    }

    const monthlyRow = buildMonthlyInvoiceRowFromDetailObject(detail);
    monthlyRowsBySheet[sheetName].push(monthlyRow);
    if (uniqueId) {
      existingUniqueIds[uniqueId] = true;
    }

    affectedSheetNames[sheetName] = true;
    migrated++;
  });

  Object.keys(affectedSheetNames).forEach(sheetName => {
    const sheet = getOrCreateSheet(spreadsheet, sheetName);
    writeMonthlySheet(sheet, monthlyRowsBySheet[sheetName]);
  });

  Logger.log('--- Migration Summary ---');
  Logger.log('Rows read from Detalle: ' + rows.length);
  Logger.log('Rows migrated: ' + migrated);
  Logger.log('Duplicates skipped: ' + duplicateSkipped);
  Logger.log('Invalid date skipped: ' + invalidDateSkipped);
}
```

- [ ] **Step 2: Push migration function**

Run:

```powershell
clasp.cmd push
```

Expected:

```text
Pushed 2 files.
```

- [ ] **Step 3: Run migration once**

Run:

```powershell
clasp.cmd run migrateDetalleToMonthlySheets
```

Expected:

```text
--- Migration Summary ---
Rows read from Detalle: <existing row count>
Rows migrated: <number>
Duplicates skipped: <number>
Invalid date skipped: 0
```

If `Invalid date skipped` is greater than zero, inspect logs before continuing.

- [ ] **Step 4: Run migration again to verify idempotency**

Run:

```powershell
clasp.cmd run migrateDetalleToMonthlySheets
```

Expected:

```text
Rows migrated: 0
Duplicates skipped: <same as migrated count from first run, or greater if monthly sheets already had rows>
Invalid date skipped: 0
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add -- src/InvoiceProcessor.js
git commit -m "feat: migrar detalle a hojas mensuales"
```

Expected:

```text
[main ...] feat: migrar detalle a hojas mensuales
```

---

### Task 7: Switch Main Processor To Monthly Sheets

**Files:**
- Modify: `src/InvoiceProcessor.js:611-718`

- [ ] **Step 1: Replace sheet setup in `processPendingInvoiceEmails`**

In `processPendingInvoiceEmails`, replace:

```javascript
const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
const sheet = spreadsheet.getSheetByName(SHEET_NAME);
```

with:

```javascript
const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
```

- [ ] **Step 2: Replace duplicate check**

Replace:

```javascript
if (invoiceAlreadyExists(sheet, parsedData.uniqueId)) {
  markThreadAsProcessed(thread);
  skippedDuplicates++;
  threadProcessed = true;
  Logger.log('Duplicate skipped and thread marked as processed: ' + parsedData.invoiceNumber);
  break;
}
```

with:

```javascript
if (invoiceAlreadyExistsInMonthlySheets(spreadsheet, parsedData.uniqueId)) {
  markThreadAsProcessed(thread);
  skippedDuplicates++;
  threadProcessed = true;
  Logger.log('Duplicate skipped and thread marked as processed: ' + parsedData.invoiceNumber);
  break;
}
```

- [ ] **Step 3: Replace row creation and append**

Replace the current `row` array and `sheet.appendRow(row);` block:

```javascript
const row = [
  message.getDate(),
  parsedData.issueDate,
  parsedData.supplierName,
  parsedData.supplierRuc,
  parsedData.timbrado,
  parsedData.invoiceNumber,
  parsedData.currency,
  normalizeAmount(parsedData.exemptAmount),
  normalizeAmount(parsedData.taxed5Amount),
  normalizeAmount(parsedData.taxed10Amount),
  normalizeAmount(parsedData.vatTotal),
  normalizeAmount(parsedData.grandTotal),
  parsedData.condition,
  savedPdf ? savedPdf.getName() : '',
  savedXml.getName(),
  savedPdf ? savedPdf.getUrl() : '',
  savedXml.getUrl(),
  parsedData.uniqueId,
  'Processed',
  savedPdf ? savedPdf.getName() : savedXml.getName()
];

sheet.appendRow(row);
```

with:

```javascript
const sheetName = getMonthSheetNameFromIssueDate(parsedData.issueDate);
const row = buildMonthlyInvoiceRow(
  parsedData,
  savedPdf ? savedPdf.getName() : '',
  savedPdf ? savedPdf.getUrl() : '',
  savedXml.getName(),
  savedXml.getUrl()
);

appendInvoiceToMonthlySheet(spreadsheet, sheetName, row);
```

- [ ] **Step 4: Push and run a controlled processor pass**

Run:

```powershell
clasp.cmd push
clasp.cmd run processPendingInvoiceEmails
```

Expected:

```text
No uncaught exception.
If a new valid invoice is found, it is written to its month sheet.
Duplicates skipped: existing monthly invoices are not duplicated.
```

- [ ] **Step 5: Run duplicate re-check**

Run:

```powershell
clasp.cmd run processPendingInvoiceEmails
```

Expected:

```text
No duplicate row is added for an already migrated or processed invoice.
```

- [ ] **Step 6: Commit**

Run:

```powershell
git add -- src/InvoiceProcessor.js
git commit -m "feat: registrar facturas en hojas mensuales"
```

Expected:

```text
[main ...] feat: registrar facturas en hojas mensuales
```

---

### Task 8: Update Documentation

**Files:**
- Modify: `docs/context.md`
- Modify: `docs/overview.md`
- Modify: `docs/setup.md`

- [ ] **Step 1: Update `docs/context.md`**

Add this under the active state:

```markdown
Estado de salida contable:

- La salida principal de Sheets son hojas mensuales: `Enero`, `Febrero`, `Marzo`, `Abril`, `Mayo`, `Junio`, `Julio`, `Agosto`, `Septiembre`, `Octubre`, `Noviembre`, `Diciembre`.
- Cada hoja mensual tiene resumen arriba y detalle fila por fila abajo.
- `Detalle` queda como respaldo temporal de migracion.
- Las fechas en hojas mensuales se muestran como `dd/MM/yyyy`, sin hora.
```

- [ ] **Step 2: Update `docs/overview.md`**

Replace the section that describes one main `Detalle` sheet with:

```markdown
## Estructura de registro en Sheets

Archivo:
`Resumen Facturas Electronicas 2026`

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

Cada hoja mensual contiene resumen del mes y detalle fila por fila.
```

- [ ] **Step 3: Update `docs/setup.md`**

Add this under Sheets configuration:

```markdown
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

La funcion de migracion desde la hoja historica es:

`migrateDetalleToMonthlySheets`
```

- [ ] **Step 4: Verify docs**

Run:

```powershell
rg -n "Detalle|Enero|migrateDetalleToMonthlySheets|dd/MM/yyyy" docs
git diff --check
```

Expected:

```text
Docs mention monthly sheets and the migration function.
git diff --check exits 0.
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add -- docs/context.md docs/overview.md docs/setup.md
git commit -m "docs: documentar salida mensual en sheets"
```

Expected:

```text
[main ...] docs: documentar salida mensual en sheets
```

---

### Task 9: Final Verification And Push To Apps Script

**Files:**
- No code changes unless verification reveals an issue.

- [ ] **Step 1: Run local diff check**

Run:

```powershell
git diff --check
git status --short --branch
```

Expected:

```text
git diff --check exits 0.
Working tree is clean.
```

- [ ] **Step 2: Push final Apps Script state**

Run:

```powershell
clasp.cmd push
clasp.cmd status
```

Expected:

```text
Tracked files:
- src\appsscript.json
- src\InvoiceProcessor.js
Untracked files:
```

- [ ] **Step 3: Manual spreadsheet inspection**

Open `Resumen Facturas Electronicas 2026` and verify:

```text
Month sheets exist for months with migrated invoices.
Each month sheet has summary rows at top.
Each month sheet has the detail table below.
Fecha appears as dd/MM/yyyy.
PDF/XML cells are clickable.
Unique Id is present.
Detalle still exists.
```

- [ ] **Step 4: Validate Drive locally if needed**

If checking local Drive structure is needed, request elevated read access and run:

```powershell
Get-ChildItem -LiteralPath 'D:\Mi unidad\2- Contabilidad Rafael Garcia' -Directory
```

Expected:

```text
Year folders such as 2026 are visible.
```

- [ ] **Step 5: Push Git branch**

Run:

```powershell
git status --short --branch
git log --oneline -8
```

Expected:

```text
Working tree clean.
Recent commits include monthly sheets implementation and docs.
```

Ask the user before `git push` if they want the branch pushed to GitHub.

---

## Self-Review

Spec coverage:

- Monthly sheets with names `Enero` through `Diciembre`: Task 2 constants, Task 4 rendering.
- Summary above detail: Task 4.
- Detail rows per month: Task 4 and Task 7.
- Date format `dd/MM/yyyy` without time: Task 2 and Task 4.
- Numeric amounts: Task 3 and Task 4.
- Clickable PDF/XML links: Task 3.
- Duplicates by `Unique Id` in monthly sheets: Task 5 and Task 7.
- Migration from `Detalle`: Task 6.
- `Detalle` preserved as temporary backup: Task 6 and Task 8.
- Error handling for invalid dates and monthly sheet update failures: Task 6 and Task 7.
- Validation steps: Task 9.

Completeness scan:

- The plan contains no incomplete markers or unspecified implementation slots.

Type consistency:

- Monthly rows always use `MONTH_DETAIL_HEADERS`.
- `Unique Id` is consistently column index `14` in monthly row arrays.
- Date helpers return `Date` objects or `null`; month lookup throws only when a new parsed invoice has invalid issue date.
