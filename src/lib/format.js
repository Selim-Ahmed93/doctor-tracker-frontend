/** Small presentation helpers shared by the doctors and patients views. */

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";

  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    number
  );
}

export function formatText(value, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}
