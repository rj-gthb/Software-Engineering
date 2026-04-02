function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function buildCsv(columns, rows) {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((column) => escapeCsvValue(typeof column.value === 'function' ? column.value(row) : row[column.value]))
      .join(','),
  );

  return [header, ...lines].join('\n');
}
