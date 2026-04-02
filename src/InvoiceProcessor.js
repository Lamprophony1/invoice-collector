const ROOT_FOLDER_ID = '1s4I_IZrV6_PyEqCV2xX6fFIh_yIR9Hgy';
const SPREADSHEET_ID = '1koM-mlSu7cUsF9-VnokKfcWiqdZYKiXUkyMx8q29HeY';
const SHEET_NAME = 'Detalle';
const PROCESSED_LABEL_NAME = 'facturas/procesado';

function testConnections() {
  const folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  Logger.log('Folder name: ' + folder.getName());
  Logger.log('Spreadsheet name: ' + spreadsheet.getName());

  if (!sheet) {
    throw new Error(`Sheet \"${SHEET_NAME}\" not found.`);
  }

  Logger.log('Sheet name: ' + sheet.getName());
}
function testInvoiceEmailSearch() {
  const query = 'has:attachment (\"factura electrónica\" OR \"documento electrónico\")';
  const threads = GmailApp.search(query, 0, 10);

  Logger.log('Threads found: ' + threads.length);

  threads.forEach((thread, index) => {
    const messages = thread.getMessages();

    messages.forEach((message, msgIndex) => {
      Logger.log(
        `Thread ${index + 1}, Message ${msgIndex + 1} | Subject: ${message.getSubject()} | Date: ${message.getDate()}`
      );
    });
  });
}

function testInvoiceAttachments() {
  const query = 'has:attachment (\"factura electrónica\" OR \"factura electronica\" OR \"documento electrónico\" OR \"documento electronico\")';
  const threads = GmailApp.search(query, 0, 5);

  Logger.log('Threads found: ' + threads.length);

  threads.forEach((thread, threadIndex) => {
    const messages = thread.getMessages();

    messages.forEach((message, messageIndex) => {
      Logger.log(`--- Thread ${threadIndex + 1}, Message ${messageIndex + 1} ---`);
      Logger.log(`Subject: ${message.getSubject()}`);
      Logger.log(`Date: ${message.getDate()}`);

      const attachments = message.getAttachments();
      Logger.log(`Attachments found: ${attachments.length}`);

      attachments.forEach((attachment, attachmentIndex) => {
        Logger.log(
          `Attachment ${attachmentIndex + 1} | Name: ${attachment.getName()} | Content-Type: ${attachment.getContentType()} | Size: ${attachment.getSize()}`
        );
      });
    });
  });
}

function testReadFirstXml() {
  const query = 'has:attachment (\"factura electrónica\" OR \"factura electronica\" OR \"documento electrónico\" OR \"documento electronico\")';
  const threads = GmailApp.search(query, 0, 10);

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      const attachments = message.getAttachments();

      for (const attachment of attachments) {
        const fileName = attachment.getName().toLowerCase();

        if (fileName.endsWith('.xml')) {
          const xmlContent = attachment.getDataAsString();
          Logger.log('XML file found: ' + attachment.getName());
          Logger.log(xmlContent.substring(0, 4000));
          return;
        }
      }
    }
  }

  Logger.log('No XML attachment found.');
}

function testParseFirstXml() {
  const query = 'has:attachment (\"factura electrónica\" OR \"factura electronica\" OR \"documento electrónico\" OR \"documento electronico\")';
  const threads = GmailApp.search(query, 0, 10);

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      const attachments = message.getAttachments();

      for (const attachment of attachments) {
        const fileName = attachment.getName().toLowerCase();

        if (!fileName.endsWith('.xml')) {
          continue;
        }

        const xmlContent = attachment.getDataAsString();
        const document = XmlService.parse(xmlContent);
        const root = document.getRootElement();
        const ns = root.getNamespace();

        const de = root.getChild('DE', ns);
        if (!de) {
          throw new Error('No se encontró el nodo DE en el XML.');
        }

        const data = {
          uniqueId: de.getAttribute('Id') ? de.getAttribute('Id').getValue() : '',
          documentType: getNestedText(de, ['gTimb', 'dDesTiDE'], ns),
          timbrado: getNestedText(de, ['gTimb', 'dNumTim'], ns),
          establishment: getNestedText(de, ['gTimb', 'dEst'], ns),
          expeditionPoint: getNestedText(de, ['gTimb', 'dPunExp'], ns),
          documentNumber: getNestedText(de, ['gTimb', 'dNumDoc'], ns),
          issueDate: getNestedText(de, ['gDatGralOpe', 'dFeEmiDE'], ns),
          supplierName: getNestedText(de, ['gDatGralOpe', 'gEmis', 'dNomEmi'], ns),
          supplierRuc: buildRuc(
            getNestedText(de, ['gDatGralOpe', 'gEmis', 'dRucEm'], ns),
            getNestedText(de, ['gDatGralOpe', 'gEmis', 'dDVEmi'], ns)
          ),
          customerName: getNestedText(de, ['gDatGralOpe', 'gDatRec', 'dNomRec'], ns),
          customerRuc: buildRuc(
            getNestedText(de, ['gDatGralOpe', 'gDatRec', 'dRucRec'], ns),
            getNestedText(de, ['gDatGralOpe', 'gDatRec', 'dDVRec'], ns)
          ),
          currency: getNestedText(de, ['gDatGralOpe', 'gOpeCom', 'cMoneOpe'], ns),
          condition: getNestedText(de, ['gDtipDE', 'gCamCond', 'dDCondOpe'], ns),
          exemptAmount: getNestedText(de, ['gTotSub', 'dSubExe'], ns),
          taxed5Amount: getNestedText(de, ['gTotSub', 'dSub5'], ns),
          taxed10Amount: getNestedText(de, ['gTotSub', 'dSub10'], ns),
          vatTotal: getNestedText(de, ['gTotSub', 'dTotIVA'], ns),
          grandTotal: getNestedText(de, ['gTotSub', 'dTotGralOpe'], ns)
        };

        data.invoiceNumber = `${data.establishment}-${data.expeditionPoint}-${data.documentNumber}`;

        Logger.log(JSON.stringify(data, null, 2));
        return;
      }
    }
  }

  Logger.log('No XML attachment found.');
}

function getNestedText(element, path, namespace) {
  let current = element;

  for (const nodeName of path) {
    current = current.getChild(nodeName, namespace);
    if (!current) {
      return '';
    }
  }

  return current.getText().trim();
}

function buildRuc(ruc, dv) {
  if (!ruc) return '';
  return dv ? `${ruc}-${dv}` : ruc;
}

function testGetOrCreateMonthFolder() {
  const testIssueDate = '2026-03-11T11:28:55';
  const monthFolder = getOrCreateMonthFolder(testIssueDate);

  Logger.log('Month folder name: ' + monthFolder.getName());
  Logger.log('Month folder id: ' + monthFolder.getId());
}

function getOrCreateMonthFolder(issueDateString) {
  const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const issueDate = new Date(issueDateString);

  const year = issueDate.getFullYear();
  const month = issueDate.getMonth();

  const monthNames = [
    '01 - Enero',
    '02 - Febrero',
    '03 - Marzo',
    '04 - Abril',
    '05 - Mayo',
    '06 - Junio',
    '07 - Julio',
    '08 - Agosto',
    '09 - Septiembre',
    '10 - Octubre',
    '11 - Noviembre',
    '12 - Diciembre'
  ];

  const yearFolder = getOrCreateChildFolder(rootFolder, String(year));
  const monthFolder = getOrCreateChildFolder(yearFolder, monthNames[month]);

  return monthFolder;
}

function getOrCreateChildFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }

  return parentFolder.createFolder(folderName);
}

function testSaveFirstInvoiceFiles() {
  const query = 'has:attachment (\"factura electrónica\" OR \"factura electronica\" OR \"documento electrónico\" OR \"documento electronico\")';
  const threads = GmailApp.search(query, 0, 10);

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      const attachments = message.getAttachments();

      let xmlAttachment = null;
      let pdfAttachment = null;
      let issueDate = null;

      for (const attachment of attachments) {
        const fileName = attachment.getName().toLowerCase();

        if (fileName.endsWith('.xml')) {
          xmlAttachment = attachment;

          const xmlContent = attachment.getDataAsString();
          const document = XmlService.parse(xmlContent);
          const root = document.getRootElement();
          const ns = root.getNamespace();
          const de = root.getChild('DE', ns);

          if (!de) {
            throw new Error('No se encontró el nodo DE en el XML.');
          }

          issueDate = getNestedText(de, ['gDatGralOpe', 'dFeEmiDE'], ns);
        }

        if (fileName.endsWith('.pdf')) {
          pdfAttachment = attachment;
        }
      }

      if (xmlAttachment && issueDate) {
        const monthFolder = getOrCreateMonthFolder(issueDate);

        if (pdfAttachment) {
          const savedPdf = saveFileIfNotExists(monthFolder, pdfAttachment);
          Logger.log('PDF saved/found: ' + savedPdf.getName());
        }

        const savedXml = saveFileIfNotExists(monthFolder, xmlAttachment);
        Logger.log('XML saved/found: ' + savedXml.getName());
        Logger.log('Folder used: ' + monthFolder.getName());

        return;
      }
    }
  }

  Logger.log('No valid invoice with XML found.');
}

function saveFileIfNotExists(folder, attachment) {
  const existingFiles = folder.getFilesByName(attachment.getName());
  if (existingFiles.hasNext()) {
    return existingFiles.next();
  }

  return folder.createFile(attachment.copyBlob()).setName(attachment.getName());
}

function testAppendFirstInvoiceToSheet() {
  const query = 'has:attachment (\"factura electrónica\" OR \"factura electronica\" OR \"documento electrónico\" OR \"documento electronico\")';
  const threads = GmailApp.search(query, 0, 10);

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      const attachments = message.getAttachments();

      let xmlAttachment = null;
      let pdfAttachment = null;
      let parsedData = null;

      for (const attachment of attachments) {
        const fileName = attachment.getName().toLowerCase();

        if (fileName.endsWith('.xml')) {
          xmlAttachment = attachment;
          parsedData = parseInvoiceXml(attachment);
        }

        if (fileName.endsWith('.pdf')) {
          pdfAttachment = attachment;
        }
      }

      if (xmlAttachment && parsedData) {
        const monthFolder = getOrCreateMonthFolder(parsedData.issueDate);

        const savedPdf = pdfAttachment ? saveFileIfNotExists(monthFolder, pdfAttachment) : null;
        const savedXml = saveFileIfNotExists(monthFolder, xmlAttachment);

        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = spreadsheet.getSheetByName(SHEET_NAME);

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
        Logger.log('Row appended for invoice: ' + parsedData.invoiceNumber);
        return;
      }
    }
  }

  Logger.log('No valid invoice with XML found.');
}

function parseInvoiceXml(attachment) {
  const xmlContent = attachment.getDataAsString();
  const document = XmlService.parse(xmlContent);
  let root = document.getRootElement();

  const sifenNs = XmlService.getNamespace('http://ekuatia.set.gov.py/sifen/xsd');

  if (root.getName() === 'rLoteDE') {
    const rde = root.getChild('rDE', sifenNs);
    if (!rde) {
      throw new Error('No se encontró el nodo rDE dentro de rLoteDE.');
    }
    root = rde;
  }

  const de = root.getName() === 'DE' ? root : root.getChild('DE', sifenNs);
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

function normalizeAmount(value) {
  const number = Number(value || 0);
  return Math.round(number * 100) / 100;
}

function testAppendFirstInvoiceToSheetNoDuplicates() {
  const query = 'has:attachment (\"factura electrónica\" OR \"factura electronica\" OR \"documento electrónico\" OR \"documento electronico\")';
  const threads = GmailApp.search(query, 0, 10);

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      const attachments = message.getAttachments();

      let xmlAttachment = null;
      let pdfAttachment = null;
      let parsedData = null;

      for (const attachment of attachments) {
        const fileName = attachment.getName().toLowerCase();

        if (fileName.endsWith('.xml')) {
          xmlAttachment = attachment;
          parsedData = parseInvoiceXml(attachment);
        }

        if (fileName.endsWith('.pdf')) {
          pdfAttachment = attachment;
        }
      }

      if (xmlAttachment && parsedData) {
        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = spreadsheet.getSheetByName(SHEET_NAME);

        if (invoiceAlreadyExists(sheet, parsedData.uniqueId)) {
          Logger.log('Invoice already exists in sheet: ' + parsedData.invoiceNumber);
          return;
        }

        const monthFolder = getOrCreateMonthFolder(parsedData.issueDate);

        const savedPdf = pdfAttachment ? saveFileIfNotExists(monthFolder, pdfAttachment) : null;
        const savedXml = saveFileIfNotExists(monthFolder, xmlAttachment);

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
        Logger.log('Row appended for invoice: ' + parsedData.invoiceNumber);
        return;
      }
    }
  }

  Logger.log('No valid invoice with XML found.');
}

function invoiceAlreadyExists(sheet, uniqueId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return false;
  }

  const uniqueIdColumn = 18; // Columna R = Unique Id
  const values = sheet.getRange(2, uniqueIdColumn, lastRow - 1, 1).getValues();

  return values.some(row => String(row[0]).trim() === String(uniqueId).trim());
}

function testProcessedLabel() {
  const label = getOrCreateLabel(PROCESSED_LABEL_NAME);
  Logger.log('Label ready: ' + label.getName());
}

function getOrCreateLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);

  if (!label) {
    label = GmailApp.createLabel(labelName);
  }

  return label;
}

function testMarkFirstInvoiceEmailAsProcessed() {
  const query = 'has:attachment (\"factura electrónica\" OR \"factura electronica\" OR \"documento electrónico\" OR \"documento electronico\")';
  const threads = GmailApp.search(query, 0, 10);

  for (const thread of threads) {
    if (threadHasProcessedLabel(thread)) {
      continue;
    }

    const messages = thread.getMessages();

    for (const message of messages) {
      const attachments = message.getAttachments();
      const hasXml = attachments.some(att => att.getName().toLowerCase().endsWith('.xml'));

      if (hasXml) {
        markThreadAsProcessed(thread);
        Logger.log('Thread marked as processed: ' + message.getSubject());
        return;
      }
    }
  }

  Logger.log('No unprocessed invoice thread found.');
}

function markThreadAsProcessed(thread) {
  const label = getOrCreateLabel(PROCESSED_LABEL_NAME);
  thread.addLabel(label);
}

function threadHasProcessedLabel(thread) {
  const labels = thread.getLabels();
  return labels.some(label => label.getName() === PROCESSED_LABEL_NAME);
}

function testSearchOnlyUnprocessedInvoiceEmails() {
  const query = '-label:\"facturas/procesado\" has:attachment (\"factura electrónica\" OR \"factura electronica\" OR \"documento electrónico\" OR \"documento electronico\")';
  const threads = GmailApp.search(query, 0, 10);

  Logger.log('Unprocessed threads found: ' + threads.length);

  threads.forEach((thread, index) => {
    const messages = thread.getMessages();

    messages.forEach((message, msgIndex) => {
      Logger.log(
        `Thread ${index + 1}, Message ${msgIndex + 1} | Subject: ${message.getSubject()} | Date: ${message.getDate()}`
      );
    });
  });
}

function processPendingInvoiceEmails() {
  const query = '-label:\"facturas/procesado\" has:attachment (\"factura electrónica\" OR \"factura electronica\" OR \"documento electrónico\" OR \"documento electronico\")';
  const threads = GmailApp.search(query, 0, 20);

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  let processedCount = 0;
  let skippedDuplicates = 0;
  let skippedInvalid = 0;

  for (const thread of threads) {
    if (threadHasProcessedLabel(thread)) {
      continue;
    }

    let threadProcessed = false;
    const messages = thread.getMessages();

    for (const message of messages) {
      const attachments = message.getAttachments();

      let xmlAttachment = null;
      let pdfAttachment = null;
      let parsedData = null;

      for (const attachment of attachments) {
        const fileName = attachment.getName().toLowerCase();

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

        if (fileName.endsWith('.pdf')) {
          pdfAttachment = attachment;
        }
      }

      if (!xmlAttachment || !parsedData) {
        continue;
      }

      if (invoiceAlreadyExists(sheet, parsedData.uniqueId)) {
        markThreadAsProcessed(thread);
        skippedDuplicates++;
        threadProcessed = true;
        Logger.log('Duplicate skipped and thread marked as processed: ' + parsedData.invoiceNumber);
        break;
      }

      const monthFolder = getOrCreateMonthFolder(parsedData.issueDate);

      const savedPdf = pdfAttachment ? saveFileIfNotExists(monthFolder, pdfAttachment) : null;
      const savedXml = saveFileIfNotExists(monthFolder, xmlAttachment);

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
      markThreadAsProcessed(thread);

      processedCount++;
      threadProcessed = true;
      Logger.log('Invoice processed successfully: ' + parsedData.invoiceNumber);
      break;
    }

    if (!threadProcessed) {
      skippedInvalid++;
      Logger.log('Thread skipped: no valid XML invoice found.');
    }
  }

  Logger.log('--- Summary ---');
  Logger.log('Processed: ' + processedCount);
  Logger.log('Duplicates skipped: ' + skippedDuplicates);
  Logger.log('Invalid skipped: ' + skippedInvalid);
}
