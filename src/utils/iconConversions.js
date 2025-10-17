const clampCount = (count) => {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.min(count, 20));
};

const createLabelRegex = (label) =>
  new RegExp(`(${label}\\s*:)(\\s*)(\\d+)`, 'gi');

export const convertNumericStringToIcons = (value, icon, labels = []) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^\d+$/.test(trimmed)) {
    const count = clampCount(parseInt(trimmed, 10));
    if (count === 0) return '';
    return icon.repeat(count);
  }

  let result = value;

  labels.forEach((label) => {
    result = result.replace(createLabelRegex(label), (match, prefix, spacing, digits) => {
      const count = clampCount(parseInt(digits, 10));
      if (count === 0) return `${prefix}${spacing}`;
      return `${prefix}${spacing}${icon.repeat(count)}`;
    });
  });

  return result;
};

export const applyIconConversions = (data) => {
  if (!data) return data;
  const next = { ...data };

  if (typeof next.consumo === 'string') {
    next.consumo = convertNumericStringToIcons(next.consumo, '🟡', ['Velocidad']);
  }

  if (typeof next.tecnologia === 'string') {
    next.tecnologia = convertNumericStringToIcons(next.tecnologia, '🛠️', ['Tecnología', 'Tecnologia']);
  }

  if (typeof next.cargaFisica === 'string') {
    next.cargaFisica = convertNumericStringToIcons(next.cargaFisica, '🔲', ['Carga física', 'Carga fisica']);
  }

  if (typeof next.cargaMental === 'string') {
    next.cargaMental = convertNumericStringToIcons(next.cargaMental, '🧠', ['Carga mental']);
  }

  if (typeof next.valor === 'string') {
    next.valor = convertNumericStringToIcons(next.valor, '⚫', ['Valor']);
  }

  return next;
};
