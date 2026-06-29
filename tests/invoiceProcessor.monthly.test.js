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
