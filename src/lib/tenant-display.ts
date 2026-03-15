/** Max character length before showing initials in nav/footer. */
const MAX_NAME_LENGTH = 20;

/**
 * Returns the display label for a tenant name: full name if short enough,
 * otherwise initials (e.g. "Royal Palace Hotel" -> "RP") for navbar/compact UI.
 */
export function getTenantDisplayLabel(name: string | undefined | null, maxLength = MAX_NAME_LENGTH): string {
  if (!name || !name.trim()) return "";
  const trimmed = name.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const a = words[0][0];
    const b = words[1][0];
    return (a + b).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}
