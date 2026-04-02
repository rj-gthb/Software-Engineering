export function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

export function getDateTimeRange(dateFrom, dateTo) {
  const range = {};

  if (dateFrom) {
    range.start = `${dateFrom}T00:00:00.000Z`;
  }

  if (dateTo) {
    range.end = `${dateTo}T23:59:59.999Z`;
  }

  return range;
}

export function getMonthRange(month) {
  const now = new Date();
  const [year, monthIndex] = month
    ? month.split('-').map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];

  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 1));

  return {
    month: `${year}-${String(monthIndex).padStart(2, '0')}`,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    label: start.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
  };
}
