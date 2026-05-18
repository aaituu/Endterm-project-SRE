const ExcelJS = require('exceljs');
const { buildAliasMap, normalizeHeader } = require('../services/templateService');

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function cellToPlainValue(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if (value.text !== undefined) return value.text;
    if (value.result !== undefined) return value.result;
    if (value.hyperlink && value.text) return value.text;
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('');
    if (value.formula && value.result !== undefined) return value.result;
    return String(value);
  }
  return value;
}

function valueToText(value) {
  const plain = cellToPlainValue(value);
  if (plain instanceof Date) return plain.toISOString().slice(0, 10);
  if (plain === null || plain === undefined) return '';
  return String(plain).trim();
}

function rowValues(row, maxColumns) {
  const values = [];
  for (let index = 1; index <= maxColumns; index += 1) {
    values.push(cellToPlainValue(row.getCell(index).value));
  }
  return values;
}

function findHeaderRow(worksheet) {
  const rowLimit = Math.min(worksheet.rowCount, 10);
  for (let index = 1; index <= rowLimit; index += 1) {
    const row = worksheet.getRow(index);
    const nonEmpty = rowValues(row, worksheet.columnCount).filter((value) => !isBlank(value));
    if (nonEmpty.length >= 2) return index;
  }
  return 1;
}

async function parseExcelFile(filePath, definition) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    const err = new Error('Workbook does not contain any sheets');
    err.status = 400;
    throw err;
  }

  const aliasMap = buildAliasMap(definition);
  const headerRowNumber = findHeaderRow(worksheet);
  const headerRow = worksheet.getRow(headerRowNumber);
  const columnMap = new Map();
  const originalHeaders = [];
  const unsupportedHeaders = [];

  for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
    const rawHeader = valueToText(headerRow.getCell(columnIndex).value);
    if (!rawHeader) continue;
    originalHeaders.push(rawHeader);
    const mapped = aliasMap.get(normalizeHeader(rawHeader));
    if (mapped) {
      if (!columnMap.has(mapped)) columnMap.set(mapped, columnIndex);
    } else {
      unsupportedHeaders.push(rawHeader);
    }
  }

  const rows = [];
  const emptyRows = [];

  for (let rowNumber = headerRowNumber + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const rawValues = rowValues(row, worksheet.columnCount);
    if (rawValues.every((value) => isBlank(value))) {
      emptyRows.push(rowNumber);
      continue;
    }

    const data = {};
    for (const column of definition.columns) {
      const columnIndex = columnMap.get(column.key);
      data[column.key] = columnIndex ? valueToText(row.getCell(columnIndex).value) : '';
    }

    rows.push({
      row_number: rowNumber,
      data
    });
  }

  const presentColumns = Array.from(columnMap.keys());
  const missingRequiredColumns = definition.columns
    .filter((column) => column.required && !columnMap.has(column.key))
    .map((column) => column.key);

  return {
    sheet_name: worksheet.name,
    header_row: headerRowNumber,
    original_headers: originalHeaders,
    present_columns: presentColumns,
    unsupported_headers: unsupportedHeaders,
    missing_required_columns: missingRequiredColumns,
    empty_rows: emptyRows,
    rows
  };
}

module.exports = { parseExcelFile, valueToText };
