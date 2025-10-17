const clampCount = (count) => {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.min(count, 20));
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildLabelRegex = (label, icon) =>
  new RegExp(
    `(${label}\\s*:)(\\s*)(\\d+)(\\s*${escapeRegExp(icon)}+)?`,
    'gi',
  );

export const convertNumericStringToIcons = (
  value,
  icon,
  labels = [],
  { repeatIcon = true } = {},
) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return '';

  const iconPattern = escapeRegExp(icon);
  const numericMatch = trimmed.match(new RegExp(`^(\\d+)(\\s*${iconPattern}+)?$`));
  if (numericMatch) {
    const count = clampCount(parseInt(numericMatch[1], 10));
    if (count === 0) return '';
    return repeatIcon ? icon.repeat(count) : `${count}${icon}`;
  }

  let result = value;

  labels.forEach((label) => {
    result = result.replace(
      buildLabelRegex(label, icon),
      (match, prefix, spacing, digits) => {
        const count = clampCount(parseInt(digits, 10));
        if (count === 0) return `${prefix}${spacing}`;
        const converted = repeatIcon ? icon.repeat(count) : `${count}${icon}`;
        return `${prefix}${spacing}${converted}`;
      },
    );
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
    next.tecnologia = convertNumericStringToIcons(
      next.tecnologia,
      '🛠️',
      ['Tecnología', 'Tecnologia'],
      { repeatIcon: false },
    );
  }

  if (typeof next.cargaFisica === 'string') {
    next.cargaFisica = convertNumericStringToIcons(next.cargaFisica, '🔲', ['Carga física', 'Carga fisica']);
  }

  if (typeof next.cargaMental === 'string') {
    next.cargaMental = convertNumericStringToIcons(next.cargaMental, '🧠', ['Carga mental']);
  }

  if (typeof next.valor === 'string') {
    next.valor = convertNumericStringToIcons(next.valor, '⚫', ['Valor'], { repeatIcon: false });
  }

  return next;
};
