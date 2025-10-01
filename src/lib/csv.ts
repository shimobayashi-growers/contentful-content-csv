import Papa from 'papaparse';

export interface CsvRow {
  [key: string]: string | number | boolean | null | undefined;
}

export function convertToCSV(data: Record<string, any>[]): string {
  if (data.length === 0) {
    return '';
  }

  const flattenedData = data.map((item) => flattenObject(item));
  return Papa.unparse(flattenedData);
}

export function parseCSV(csvString: string): CsvRow[] {
  const result = Papa.parse<CsvRow>(csvString, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (result.errors.length > 0) {
    throw new Error(
      `CSV parsing errors: ${result.errors.map((e) => e.message).join(', ')}`
    );
  }

  return result.data;
}

export function downloadCSV(csvString: string, filename: string) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      flattened[newKey] = '';
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      if (value.sys && value.sys.id) {
        // Contentful reference
        flattened[newKey] = value.sys.id;
      } else {
        // Nested object - flatten it
        Object.assign(flattened, flattenObject(value, newKey));
      }
    } else if (Array.isArray(value)) {
      // Convert array to JSON string
      flattened[newKey] = JSON.stringify(value);
    } else if (value instanceof Date) {
      flattened[newKey] = value.toISOString();
    } else {
      flattened[newKey] = value;
    }
  });

  return flattened;
}

export function unflattenObject(flat: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  Object.keys(flat).forEach((key) => {
    const keys = key.split('.');
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k]) {
        current[k] = {};
      }
      current = current[k];
    }

    const lastKey = keys[keys.length - 1];
    let value = flat[key];

    // Try to parse JSON arrays
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      try {
        value = JSON.parse(value);
      } catch {
        // Keep as string if parsing fails
      }
    }

    current[lastKey] = value;
  });

  return result;
}
