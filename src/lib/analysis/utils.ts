export function clampText(text: string, maxLen: number): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  // try to end on sentence boundary
  const slice = text.slice(0, maxLen);
  const lastDot = slice.lastIndexOf('.');
  if (lastDot > maxLen * 0.7) {
    return slice.slice(0, lastDot + 1) + '\n[...truncado...]';
  }
  return slice + '\n[...truncado...]';
}

