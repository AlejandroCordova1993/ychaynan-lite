type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function canonicalize(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, canonicalize(nestedValue)]),
    );
  }

  throw new TypeError('La rúbrica debe contener únicamente valores JSON válidos.');
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createRubricSnapshot(rubric: unknown): Promise<{
  snapshot: JsonValue;
  schemaVersion: string;
  hash: string;
}> {
  const snapshot = canonicalize(rubric);

  if (
    snapshot === null ||
    Array.isArray(snapshot) ||
    typeof snapshot !== 'object' ||
    typeof snapshot.schemaVersion !== 'string' ||
    snapshot.schemaVersion.length === 0
  ) {
    throw new TypeError('La rúbrica debe declarar una versión de esquema válida.');
  }

  const encoded = new TextEncoder().encode(JSON.stringify(snapshot));
  const digest = await crypto.subtle.digest('SHA-256', encoded);

  return { snapshot, schemaVersion: snapshot.schemaVersion, hash: toHex(digest) };
}
