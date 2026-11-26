// A decimal string keeps the shared reserve exact without a gameplay cap.
export const normalizeYermo = (value) => {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return '0';
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? text.replace(/^0+(?=\d)/, '') : '0';
};

export const adjustYermo = (value, amount) => {
  const next = BigInt(normalizeYermo(value)) + BigInt(amount);
  return String(next < 0n ? 0n : next);
};

export const getYermoScale = (value) => {
  const total = BigInt(normalizeYermo(value));
  let unit = 1n;
  while (total > unit * 100n) unit *= 10n;
  const multiplier = [1n, 2n, 5n, 10n].find((step) => total <= unit * step * 10n);
  const step = unit * multiplier;
  return {
    step: String(step),
    segments: Array.from({ length: 10 }, (_, index) => {
      const remaining = total - BigInt(index) * step;
      const filled = remaining < 0n ? 0n : remaining > step ? step : remaining;
      return Number(filled * 10000n / step) / 100;
    }),
  };
};
