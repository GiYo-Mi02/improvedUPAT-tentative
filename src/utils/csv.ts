export function toCSV(rows: any[], headers?: { key: string; label: string }[]): string {
  if (!rows || rows.length === 0) return '';
  const keys = headers?.map(h => h.key) || Object.keys(rows[0]);
  const head = (headers || keys.map(k => ({ key: k, label: k }))).map(h => escape(h.label)).join(',');
  const body = rows.map(r => keys.map(k => escape(r[k])).join(',')).join('\n');
  return head + '\n' + body;
}

function escape(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
