let errorShown = false;
export default async function fetchSheetData(sheetId, sheetName) {
  if (process.env.NODE_ENV === 'test') return [];
  
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${sheetName}&tqx=out:json`;
  
  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      if (!errorShown) {
        errorShown = true;
        console.error('❌ Response not ok:', res.status, res.statusText);
      }
      return [];
    }
    
    const text = await res.text();
    
    if (!text || text.length === 0) {
      if (!errorShown) {
        errorShown = true;
        console.error('❌ Response text is empty');
      }
      return [];
    }
    
    if (!text.includes('(') || !text.includes(')')) {
      if (!errorShown) {
        errorShown = true;
        console.error('❌ Response text does not contain expected format');
      }
      return [];
    }
    
    const json = JSON.parse(text.slice(text.indexOf('(') + 1, text.lastIndexOf(')')));
    
    if (!json.table || !json.table.cols) {
      if (!errorShown) {
        errorShown = true;
        console.error('❌ JSON does not contain expected table structure');
      }
      return [];
    }
    
    const cols = json.table.cols.map((c) => c.label || c.id);
    
    const rows = (json.table.rows || []).map((r) => {
      const obj = {};
      cols.forEach((l, i) => (obj[l] = r.c[i]?.v || ''));
      return obj;
    });
    
    return rows;
  } catch (error) {
    if (!errorShown) {
      errorShown = true;
      console.error('❌ Error in fetchSheetData:', error);
    }
    return [];
  }
}
