export function rowsToCsv(rows: Record<string, any>[], headers?: string[]): string {
  if (!rows || rows.length === 0) return ''
  const keys = headers && headers.length ? headers : Object.keys(rows[0])
  const esc = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('\n') || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const headerLine = keys.join(',')
  const lines = rows.map(r => keys.map(k => esc(r[k])).join(','))
  return [headerLine, ...lines].join('\n')
}

export default { rowsToCsv }
