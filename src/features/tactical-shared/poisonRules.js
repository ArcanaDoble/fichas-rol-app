const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const list = value => Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : value ? [value] : [];
export const isPoisonStatus = value => normalize(typeof value === 'string' ? value : value?.id || value?.name || value?.label) === 'envenenado';
export const isCanvasPoisoned = token => [...list(token?.status), ...list(token?.statusEffects)].some(isPoisonStatus);
export const setCanvasPoison = (token, active) => ({ ...token,
    status: [...list(token?.status).filter(value => !isPoisonStatus(value)), ...(active ? ['envenenado'] : [])],
    ...(token?.statusEffects !== undefined ? { statusEffects: list(token.statusEffects).filter(value => !isPoisonStatus(value)) } : {}),
});
export const isPoisonTrait = value => ['veneno', 'venenosa', 'venenoso', 'envenenado', 'poison', 'poisoned'].includes(normalize(value));
export const applyAttackPoison = (token, weapon, resolution, suppressTraits = false) => {
    if (suppressTraits || !(resolution?.lifeLost > 0)) return token;
    // The resolved traits already include the manual modifier and respect range/proficiency suppression.
    const traits = list(weapon?.rasgos ?? weapon?.traits ?? weapon?.properties);
    return traits.some(isPoisonTrait) ? setCanvasPoison(token, true) : token;
};
