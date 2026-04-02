# Automation Checkpoint — 2026-04-02

## Summary

This checkpoint documents the first functional build of the invoice automation project for `invoice-collector`.

The solution was implemented in Google Apps Script and validated step by step against real Gmail, Google Drive, and Google Sheets resources. The core flow already works in manual execution mode: candidate invoice emails are found in Gmail, XML and PDF attachments are identified, data is extracted from the XML, files are stored in Google Drive by year and month, records are appended to Google Sheets, duplicates are prevented, and processed emails are labeled in Gmail.

At the end of the validated run, the project successfully processed a real batch of invoices and left the automation function ready to be scheduled with a time-driven trigger.

## Objective

Automate the collection and registration of electronic invoices received by email.

The target flow is:

1. Search invoice emails in Gmail.
2. Detect XML and PDF attachments.
3. Use the XML as the main source of structured fiscal data.
4. Store XML and PDF files in Google Drive under year/month folders.
5. Register invoice data in Google Sheets.
6. Prevent duplicates.
7. Mark processed emails in Gmail.

## Confirmed Resources

### Google Drive root folder
- Name: `2- Contabilidad Rafael Garcia`
- Folder ID: `1s4I_IZrV6_PyEqCV2xX6fFIh_yIR9Hgy`

### Google Sheets file
- Name: `Resumen Facturas Electrónicas 2026`
- Spreadsheet ID: `1koM-mlSu7cUsF9-VnokKfcWiqdZYKiXUkyMx8q29HeY`
- Sheet name: `Detalle`

### Gmail label
- Label name: `facturas/procesado`

## Confirmed Sheet Structure

The `Detalle` sheet was defined with these columns:

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

## Functional Decisions Already Taken

### XML as the main source of truth
The XML is the primary data source for invoice parsing. It contains structured fields such as issue date, supplier, supplier RUC, timbrado, invoice number, currency, tax bases, VAT, total amount, and document identifier.

### PDF as documentary backup
The PDF is stored in Drive as backup and human-readable support, but not used as the main parsing source.

### Detection by file extension, not MIME type
Real test emails showed valid XML and PDF attachments arriving with inconsistent MIME types, including values such as:
- `application/octet-stream`
- `application/xhtml+xml`

Because of that, attachment detection was based on file extension:
- `.xml`
- `.pdf`

### Folder destination based on XML issue date
The month folder is determined from the XML issue date, not from email receipt date.

### Duplicate control by Unique Id
The spreadsheet duplicate check uses the invoice unique identifier extracted from the XML.

### Processed email tracking by Gmail label
Processed threads are labeled with:
- `facturas/procesado`

Future searches exclude already processed threads.

## Tested and Validated Steps

The implementation was built incrementally with explicit validations at each stage.

### 1. Drive and Sheets connection
A first test confirmed the script could reach:
- the Drive folder
- the Spreadsheet
- the `Detalle` sheet

Confirmed log:
- Folder name: `2- Contabilidad Rafael Garcia`
- Spreadsheet name: `Resumen Facturas Electrónicas 2026`
- Sheet name: `Detalle`

### 2. Gmail candidate search
A query was validated against real emails using invoice-related terms in subject or body:

- `factura electrónica`
- `factura electronica`
- `documento electrónico`
- `documento electronico`

with:
- `has:attachment`

This returned real candidate invoice messages.

### 3. Attachment inspection
Real emails were inspected and confirmed to include combinations of:
- XML + PDF
- different naming conventions
- inconsistent MIME types

Examples seen during validation:
- `01800863631001001000020622026031112896089493.xml`
- `01800863631001001000020622026031112896089493.pdf`
- `KuDE_4152533779999615468.pdf`
- `RDE_7839452954985545237.xml`
- `e6060267fb109edb52e022692612e333.pdf`
- `e6060267fb109edb52e022692612e333.xml`

### 4. XML read test
The script successfully read XML contents directly from Gmail attachments.

A real sample confirmed access to SIFEN XML nodes such as:
- `DE`
- `gTimb`
- `gDatGralOpe`
- `gEmis`
- `gDatRec`
- `gTotSub`

### 5. XML parsing test
The script extracted structured data from a real XML.

Example of real parsed output:
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

### 6. Drive month folder logic
The script was validated to create or reuse folders in this structure:

```text
2- Contabilidad Rafael Garcia/
  2026/
    03 - Marzo/
```

Confirmed folder output:
- Month folder name: `03 - Marzo`
- Month folder ID: `1jXqBvf4tl0cBsfVAMXE28GOddt-Zn_8b`

### 7. File save test
A real test saved both XML and PDF into the month folder without duplicating existing files.

Confirmed log showed:
- PDF saved/found
- XML saved/found
- folder used: `03 - Marzo`

### 8. First append to Google Sheets
A real invoice row was appended successfully to the `Detalle` sheet.

Confirmed log:
- `Row appended for invoice: 001-001-0000206`

### 9. Duplicate protection in Sheets
The duplicate control was tested after the first row was inserted.

Confirmed log:
- `Invoice already exists in sheet: 001-001-0000206`

### 10. Gmail processed label
The label `facturas/procesado` was validated as ready and usable.

### 11. Marking a thread as processed
A real thread was labeled successfully.

Confirmed log:
- `Thread marked as processed: Documento Electronico Generado - H . P GROUP SOCIEDAD ANONIMA`

### 12. Search excluding processed emails
A search excluding processed labels was validated. The already labeled thread no longer appeared in results.

### 13. Single-thread end-to-end process
A full single-thread process was executed successfully.

Confirmed log:
- `Invoice processed successfully: 001-001-6582539`

Validation confirmed:
1. a new row was added in Sheets,
2. XML and PDF existed in the correct Drive month folder,
3. the Gmail thread had the processed label.

### 14. Batch processing function
The main batch function was executed over pending threads.

Confirmed final summary:
- Processed: `19`
- Duplicates skipped: `0`
- Invalid skipped: `1`

This confirmed the main flow already worked against a real pending batch.

## Main Function State

The main operational function at the end of this checkpoint is:

- `processPendingInvoiceEmails`

Expected responsibilities:
- search pending invoice email threads,
- parse invoice XML,
- detect and keep PDF backup,
- create or reuse Drive month folders,
- save files,
- append rows to Sheets,
- skip duplicates,
- mark processed threads.

## Utility Functions Mentioned During Build

The incremental build included tests and helpers such as:
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

Helpers included:
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

## Known Pending Items at This Checkpoint

### Trigger creation
The next intended step was creating a time-driven trigger for:
- `processPendingInvoiceEmails`

Suggested schedule:
- every 15 minutes

Status at this checkpoint:
- **not confirmed yet**

### Invalid candidate email
One thread matched the search but was skipped as invalid during batch execution.

Status at this checkpoint:
- **pending review**

### Script cleanup
Because the project was built incrementally, test functions and production functions were still mixed in the Apps Script project.

Status at this checkpoint:
- **pending cleanup and consolidation**

## Overall Status

At the end of this checkpoint, the invoice collector project was already functional in manual mode and close to production readiness.

Confirmed working pieces:
- Gmail search
- XML/PDF detection
- XML parsing
- Drive storage by year and month
- Google Sheets registration
- duplicate prevention
- Gmail processed labeling
- batch processing of pending invoices

Main remaining actions after this checkpoint:
1. confirm or create the automatic trigger,
2. review the invalid skipped thread,
3. clean up the script structure,
4. continue with production hardening.
