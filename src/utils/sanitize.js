export default function sanitize(value) {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value && typeof value === 'object') {
    const result = {};
    Object.entries(value).forEach(([k, v]) => {
      if (v !== undefined) {
        result[k] = sanitize(v);
      }
    });
    return result;
  }
  return value;
}
