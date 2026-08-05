// Une note se lit « 4,7 » en français et « 4.7 » en anglais : le séparateur
// décimal suit la langue affichée, jamais une valeur codée en dur.
export function formatRating(value: number, locale: string): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
