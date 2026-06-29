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
