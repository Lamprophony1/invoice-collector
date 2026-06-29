const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadInvoiceProcessor() {
  const sourcePath = path.join(__dirname, '..', 'src', 'InvoiceProcessor.js');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const sandbox = {
    console,
    Logger: { log() {} }
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'InvoiceProcessor.js' });
  return sandbox;
}

test('monthly date helpers return month sheet names and strip time', () => {
  const app = loadInvoiceProcessor();

  assert.equal(typeof app.getMonthSheetNameFromIssueDate, 'function');
  assert.equal(typeof app.getDateOnlyForSheet, 'function');

  assert.equal(app.getMonthSheetNameFromIssueDate('2026-03-11T11:28:55'), 'Marzo');
  assert.equal(app.getMonthSheetNameFromIssueDate('05/01/2026'), 'Enero');

  const dateOnly = app.getDateOnlyForSheet('2026-03-11T11:28:55');
  assert.equal(dateOnly.getFullYear(), 2026);
  assert.equal(dateOnly.getMonth(), 2);
  assert.equal(dateOnly.getDate(), 11);
  assert.equal(dateOnly.getHours(), 0);
});

test('monthly row builder returns accountant-friendly detail row', () => {
  const app = loadInvoiceProcessor();
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

  assert.equal(typeof app.buildMonthlyInvoiceRow, 'function');

  const row = app.buildMonthlyInvoiceRow(
    parsedData,
    'Factura.pdf',
    'https://example.com/pdf',
    'Factura.xml',
    'https://example.com/xml'
  );

  assert.equal(row.length, 15);
  assert.equal(row[1], 'H . P GROUP SOCIEDAD ANONIMA');
  assert.equal(row[4], '001-001-0000206');
  assert.equal(row[6], 9639168);
  assert.equal(row[8], 1314432);
  assert.equal(row[11], 'Credito');
  assert.equal(row[12], '=HYPERLINK("https://example.com/pdf","Factura.pdf")');
  assert.equal(row[13], '=HYPERLINK("https://example.com/xml","Factura.xml")');
  assert.equal(row[14], '01800863631001001000020622026031112896089493');
});

test('monthly processing target returns target sheet and row for processor append', () => {
  const app = loadInvoiceProcessor();
  const parsedData = {
    issueDate: '2026-04-02T09:30:00',
    supplierName: 'Proveedor Mensual',
    supplierRuc: '80000004-4',
    timbrado: '18300000',
    invoiceNumber: '001-001-0000004',
    currency: 'PYG',
    exemptAmount: '0',
    taxed5Amount: '0',
    taxed10Amount: '500',
    vatTotal: '50',
    grandTotal: '500',
    condition: 'Contado',
    uniqueId: 'uid-target'
  };

  assert.equal(typeof app.buildMonthlyProcessingTarget, 'function');

  const target = app.buildMonthlyProcessingTarget(
    parsedData,
    'Factura.pdf',
    'https://example.com/pdf',
    'Factura.xml',
    'https://example.com/xml'
  );

  assert.equal(target.sheetName, 'Abril');
  assert.equal(target.row[0].getMonth(), 3);
  assert.equal(target.row[1], 'Proveedor Mensual');
  assert.equal(target.row[12], '=HYPERLINK("https://example.com/pdf","Factura.pdf")');
  assert.equal(target.row[14], 'uid-target');
});

test('monthly summary builder aggregates totals by condition, currency, and supplier', () => {
  const app = loadInvoiceProcessor();
  const rows = [
    [new Date(2026, 2, 11), 'Proveedor A', '80000001-1', '100', '001-001-0000001', 'PYG', 100, 200, 300, 50, 600, 'Contado', '', '', 'uid-1'],
    [new Date(2026, 2, 12), 'Proveedor A', '80000001-1', '100', '001-001-0000002', 'PYG', 0, 0, 400, 40, 400, 'Credito', '', '', 'uid-2'],
    [new Date(2026, 2, 13), 'Proveedor B', '80000002-2', '101', '001-001-0000003', 'USD', 10, 20, 30, 5, 60, 'Contado', '', '', 'uid-3']
  ];

  assert.equal(typeof app.calculateMonthlySummary, 'function');

  const summary = app.calculateMonthlySummary(rows);

  assert.equal(summary.count, 3);
  assert.equal(summary.exemptTotal, 110);
  assert.equal(summary.taxed5Total, 220);
  assert.equal(summary.taxed10Total, 730);
  assert.equal(summary.vatTotal, 95);
  assert.equal(summary.grandTotal, 1060);
  assert.equal(summary.byCondition.Contado.total, 660);
  assert.equal(summary.byCurrency.PYG.count, 2);
  assert.equal(summary.bySupplier['Proveedor A|80000001-1'].total, 1000);
});

test('monthly sheet values render summary before detail rows', () => {
  const app = loadInvoiceProcessor();
  const rows = [
    [new Date(2026, 2, 11), 'Proveedor A', '80000001-1', '100', '001-001-0000001', 'PYG', 100, 200, 300, 50, 600, 'Contado', '', '', 'uid-1']
  ];

  assert.equal(typeof app.buildMonthlySheetValues, 'function');
  assert.equal(typeof app.findMonthlyDetailHeaderRow, 'function');

  const values = app.buildMonthlySheetValues(rows);
  const headerRow = app.findMonthlyDetailHeaderRow(values);
  const expectedHeaders = [
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

  assert.equal(values[0][0], 'Resumen mensual');
  assert.deepEqual(Array.from(values[1].slice(0, 2)), ['Concepto', 'Valor']);
  assert.deepEqual(Array.from(values[2].slice(0, 2)), ['Cantidad de facturas', 1]);
  assert.equal(values[headerRow - 2][0], 'Detalle');
  assert.deepEqual(Array.from(values[headerRow - 1]), expectedHeaders);
  assert.equal(values[headerRow][14], 'uid-1');
});

test('monthly duplicate detection finds unique ids in monthly sheets', () => {
  const app = loadInvoiceProcessor();
  const values = app.buildMonthlySheetValues([
    [new Date(2026, 2, 11), 'Proveedor A', '80000001-1', '100', '001-001-0000001', 'PYG', 100, 200, 300, 50, 600, 'Contado', '', '', 'uid-test']
  ]);
  const formulas = values.map(row => row.map(() => ''));
  const sheet = {
    getDataRange() {
      return {
        getValues() {
          return values;
        },
        getFormulas() {
          return formulas;
        }
      };
    }
  };

  assert.equal(typeof app.invoiceAlreadyExistsInSheets, 'function');

  assert.equal(app.invoiceAlreadyExistsInSheets([sheet], 'uid-test'), true);
  assert.equal(app.invoiceAlreadyExistsInSheets([sheet], 'uid-missing'), false);
  assert.equal(app.invoiceAlreadyExistsInSheets([sheet], ''), false);
});

test('detail migration groups rows by invoice issue month and skips duplicates', () => {
  const app = loadInvoiceProcessor();
  const headers = [
    'Received At',
    'Fecha',
    'Proveedor',
    'RUC Proveedor',
    'Timbrado',
    'Nro Factura',
    'Currency',
    'Exentas (Gs)',
    'Gravado 5% (Gs)',
    'Gravado 10% (Gs)',
    'IVA Total (Gs)',
    'Total (Gs)',
    'Condici\u00F3n',
    'PDF File Name',
    'XML File Name',
    'PDF Drive Link',
    'XML Drive Link',
    'Unique Id',
    'Status',
    'Archivo'
  ];
  const detailRows = [
    ['2026-06-29T12:00:00', '2026-03-11T11:28:55', 'Proveedor A', '80000001-1', '100', '001-001-0000001', 'PYG', 100, 200, 300, 50, 600, 'Credito', 'Factura A.pdf', 'Factura A.xml', 'https://example.com/a.pdf', 'https://example.com/a.xml', 'uid-existing', 'Processed', 'Factura A.pdf'],
    ['2026-06-29T12:00:00', '2026-04-02T09:00:00', 'Proveedor B', '80000002-2', '101', '001-001-0000002', 'PYG', 0, 0, 400, 40, 400, 'Contado', 'Factura B.pdf', 'Factura B.xml', 'https://example.com/b.pdf', 'https://example.com/b.xml', 'uid-new', 'Processed', 'Factura B.pdf'],
    ['2026-06-29T12:00:00', 'fecha mala', 'Proveedor C', '80000003-3', '102', '001-001-0000003', 'PYG', 0, 0, 100, 10, 100, 'Contado', 'Factura C.pdf', 'Factura C.xml', 'https://example.com/c.pdf', 'https://example.com/c.xml', 'uid-bad-date', 'Processed', 'Factura C.pdf']
  ];
  const existingRowsBySheet = {
    Marzo: [
      [new Date(2026, 2, 11), 'Proveedor A', '80000001-1', '100', '001-001-0000001', 'PYG', 100, 200, 300, 50, 600, 'Credito', '', '', 'uid-existing']
    ]
  };

  assert.equal(typeof app.buildMonthlyMigrationFromDetailRows, 'function');

  const migration = app.buildMonthlyMigrationFromDetailRows(headers, detailRows, existingRowsBySheet);

  assert.equal(migration.migrated, 1);
  assert.equal(migration.duplicateSkipped, 1);
  assert.equal(migration.invalidDateSkipped, 1);
  assert.equal(migration.monthlyRowsBySheet.Marzo.length, 1);
  assert.equal(migration.monthlyRowsBySheet.Abril.length, 1);
  assert.equal(migration.monthlyRowsBySheet.Abril[0][0].getMonth(), 3);
  assert.equal(migration.affectedSheetNames.Abril, true);
});

test('monthly migration audit reports detail ids missing from monthly sheets', () => {
  const app = loadInvoiceProcessor();
  const headers = ['Fecha', 'Proveedor', 'Unique Id'];
  const detailRows = [
    ['2026-03-11', 'Proveedor A', 'uid-a'],
    ['2026-04-02', 'Proveedor B', 'uid-b']
  ];
  const monthlyRowsBySheet = {
    Marzo: [
      [new Date(2026, 2, 11), 'Proveedor A', '', '', '', '', 0, 0, 0, 0, 0, '', '', '', 'uid-a']
    ],
    Abril: [
      [new Date(2026, 3, 2), 'Proveedor Extra', '', '', '', '', 0, 0, 0, 0, 0, '', '', '', 'uid-extra']
    ]
  };

  assert.equal(typeof app.buildMonthlyMigrationAudit, 'function');

  const audit = app.buildMonthlyMigrationAudit(headers, detailRows, monthlyRowsBySheet);

  assert.equal(audit.detailRows, 2);
  assert.equal(audit.monthlyRows, 2);
  assert.equal(audit.detailUniqueIds, 2);
  assert.equal(audit.monthlyUniqueIds, 2);
  assert.equal(audit.matchedDetailUniqueIds, 1);
  assert.deepEqual(Array.from(audit.missingFromMonthly), ['uid-b']);
  assert.equal(audit.bySheet.Marzo.rows, 1);
});
