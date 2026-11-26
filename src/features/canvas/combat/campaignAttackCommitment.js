// A five-choice hash alone is guessable. A fresh 256-bit nonce keeps the zone
// private in the shared scene until the defender has irrevocably paid.
const prefix = 'noma:campaign-attack:';
const storageKey = (scenarioId, id) => `${prefix}${encodeURIComponent(scenarioId)}:${encodeURIComponent(id)}`;
const api = () => {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) throw new Error('La selección secreta requiere HTTPS o localhost.');
  return globalThis.crypto;
};
export const campaignNonce = () => [...api().getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
export const campaignChoicePayload = (zones, assignments = []) => ({ zones, assignments });
export const campaignCommitment = async (id, payload, nonce) => {
  const bytes = new TextEncoder().encode(JSON.stringify(['campaign-attack-v1', id, payload.zones, payload.assignments || [], nonce]));
  const digest = await api().subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
};
export const rememberCampaignChoice = async (scenarioId, id, payload) => {
  const key = storageKey(scenarioId, id);
  const previous = globalThis.localStorage.getItem(key);
  if (previous) {
    const saved = JSON.parse(previous);
    if (JSON.stringify(saved.payload) !== JSON.stringify(payload)) throw new Error('Este intento ya tiene una elección fijada. Reinténtalo con sus zonas originales.');
    return saved;
  }
  const nonce = campaignNonce();
  const commitment = await campaignCommitment(id, payload, nonce);
  const saved = { payload, nonce, commitment };
  globalThis.localStorage.setItem(key, JSON.stringify(saved));
  return saved;
};
export const readCampaignChoice = (scenarioId, id) => {
  try { return JSON.parse(globalThis.localStorage.getItem(storageKey(scenarioId, id)) || 'null'); }
  catch { return null; }
};
export const forgetCampaignChoice = (scenarioId, id) => {
  try { globalThis.localStorage.removeItem(storageKey(scenarioId, id)); } catch { /* A resolved public reveal needs no local secret. */ }
};
export const verifyCampaignReveal = async pending => Boolean(pending?.commitment && pending.reveal?.nonce
  && await campaignCommitment(pending.id, pending.reveal, pending.reveal.nonce) === pending.commitment);

// Both clients derive the same rolls from the revealed attack nonce and the
// defender's fresh nonce. Transaction retries never roll another weapon result.
export const campaignRandom = async seed => {
  const bytes = new Uint8Array(await api().subtle.digest('SHA-256', new TextEncoder().encode(seed)));
  let state = new DataView(bytes.buffer).getUint32(0);
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
};
