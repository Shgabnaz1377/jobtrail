/**
 * Minimal RFC 4180 CSV reader/writer: quoted fields, escaped quotes ("")
 * and newlines inside quotes, CRLF or LF line endings, optional UTF-8 BOM.
 */

export class CsvParseError extends Error {}

export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xFEFF ? input.slice(1) : input
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let i = 0

  const endField = () => {
    row.push(field)
    field = ''
  }
  const endRow = () => {
    endField()
    // Skip completely empty lines (e.g. a trailing newline).
    if (!(row.length === 1 && row[0] === '')) rows.push(row)
    row = []
  }

  while (i < text.length) {
    const char = text[i]!
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        quoted = false
        i += 1
        continue
      }
      field += char
      i += 1
      continue
    }

    if (char === '"' && field === '') {
      quoted = true
    }
    else if (char === ',') {
      endField()
    }
    else if (char === '\n' || char === '\r') {
      endRow()
      if (char === '\r' && text[i + 1] === '\n') i += 1
    }
    else {
      field += char
    }
    i += 1
  }

  if (quoted) throw new CsvParseError('Unterminated quoted field')
  if (field !== '' || row.length > 0) endRow()
  return rows
}

/**
 * Spreadsheet apps execute cells starting with these characters as formulas,
 * so exported text is prefixed with an apostrophe to keep it inert.
 */
const FORMULA_START = /^[=+\-@\t\r]/

function escapeField(value: unknown): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return [header, ...rows].map(row => row.map(escapeField).join(',')).join('\r\n') + '\r\n'
}
