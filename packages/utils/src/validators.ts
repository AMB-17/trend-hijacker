export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/<[^>]*>/g, ""); // Remove HTML tags
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

export function isValidCuid(id: string): boolean {
  // CUID format: c + timestamp + counter + fingerprint + random
  const cuidRegex = /^c[a-z0-9]{24}$/;
  return cuidRegex.test(id);
}

export function normalizeScore(value: number, min: number, max: number): number {
  if (max === min) return 0;
  const normalized = (value - min) / (max - min);
  return Math.max(0, Math.min(1, normalized));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
