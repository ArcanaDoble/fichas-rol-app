export default async function fetchSheetData(sheetId, sheetName) {
  if (process.env.NODE_ENV === 'test') return [];
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${sheetName}&tqx=out:json`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.slice(text.indexOf('(') + 1, text.lastIndexOf(')')));
  const cols = json.table.cols.map((c) => c.label || c.id);
  return (json.table.rows || []).map((r) => {
    const obj = {};
    cols.forEach((l, i) => (obj[l] = r.c[i]?.v || ''));
    return obj;
  });
}
