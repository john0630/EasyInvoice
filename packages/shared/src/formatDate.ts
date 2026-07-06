export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = parseDate(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function parseDate(dateStr: string): Date {
  const datePart = dateStr.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}
