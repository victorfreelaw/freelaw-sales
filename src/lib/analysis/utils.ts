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

function stripCodeFence(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return raw;
}

function extractFirstJsonBlock(raw: string): string | null {
  const firstBrace = raw.indexOf('{');
  const firstBracket = raw.indexOf('[');

  let start = -1;
  let openChar: '{' | '[' | '' = '';
  let closeChar: '}' | ']' | '' = '';

  if (firstBrace === -1 && firstBracket === -1) {
    return null;
  }

  if (firstBrace === -1 || (firstBracket !== -1 && firstBracket < firstBrace)) {
    start = firstBracket;
    openChar = '[';
    closeChar = ']';
  } else {
    start = firstBrace;
    openChar = '{';
    closeChar = '}';
  }

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i++) {
    const char = raw[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }

  return null;
}

export function parseModelJSON<T = unknown>(rawContent: string, contextLabel: string): T {
  if (!rawContent) {
    throw new Error(`Resposta vazia do modelo para ${contextLabel}`);
  }

  const trimmed = stripCodeFence(rawContent.trim());

  try {
    return JSON.parse(trimmed) as T;
  } catch (primaryError) {
    const jsonBlock = extractFirstJsonBlock(trimmed);
    if (jsonBlock) {
      try {
        return JSON.parse(jsonBlock) as T;
      } catch (secondaryError) {
        console.error(`parseModelJSON: JSON inválido em ${contextLabel}`, secondaryError);
        throw new Error(`Modelo retornou JSON inválido para ${contextLabel}`);
      }
    }

    console.error(`parseModelJSON: Conteúdo não-JSON recebido para ${contextLabel}:`, trimmed.slice(0, 200));
    throw new Error(`Modelo não retornou JSON para ${contextLabel}`);
  }
}
