import { rollExpression, parseAndRollFormula, rollExpressionCritical } from './dice';
import { parseDieValue } from './damage';

export const normalizeCombatTraitId = (trait = '') => {
    const normalized = trait
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const compact = normalized.replace(/[\s_-]+/g, '');

    if (!normalized) return '';
    if (normalized === 'derribado' || normalized === 'derribar' || normalized === 'derribo') return 'derribo';
    if (compact === 'singuardia') return 'sin guardia';
    return normalized;
};

export const getCombatTraitIds = (equipment) => {
    const rawTraits =
        equipment?.rasgos ||
        equipment?.traits ||
        equipment?.trait ||
        equipment?.properties ||
        [];

    const traitList = Array.isArray(rawTraits)
        ? rawTraits
        : rawTraits.toString().split(',');

    return traitList
        .map((trait) => normalizeCombatTraitId(trait))
        .filter(Boolean);
};

export const hasCombatTrait = (equipment, traitId) => {
    const normalizedTraitId = normalizeCombatTraitId(traitId);
    if (!normalizedTraitId) return false;
    return getCombatTraitIds(equipment).includes(normalizedTraitId);
};

export const getManualCombatTraitIds = (equipment) => {
    const rawTraits = equipment?.manualCombatTraits || equipment?._manualCombatTraits || [];
    const traitList = Array.isArray(rawTraits)
        ? rawTraits
        : String(rawTraits || '').split(',');

    return traitList
        .map((trait) => normalizeCombatTraitId(trait))
        .filter(Boolean);
};

export const hasManualCombatTrait = (equipment, traitId) => {
    const normalizedTraitId = normalizeCombatTraitId(traitId);
    if (!normalizedTraitId) return false;
    return getManualCombatTraitIds(equipment).includes(normalizedTraitId);
};

export const hasNativeCombatTrait = (equipment, traitId) => {
    const normalizedTraitId = normalizeCombatTraitId(traitId);
    if (!normalizedTraitId) return false;

    const manualTraitIds = new Set(getManualCombatTraitIds(equipment));
    return getCombatTraitIds(equipment)
        .filter((trait) => !manualTraitIds.has(trait))
        .includes(normalizedTraitId);
};

export const getCombatItemKey = (equipment) => {
    if (!equipment) return '';

    const explicitId =
        equipment.id ||
        equipment._id ||
        equipment.itemId ||
        equipment.item_id ||
        equipment.uuid;

    if (explicitId) return String(explicitId);

    const name = String(equipment.nombre || equipment.name || equipment.label || 'item').trim().toLowerCase();
    const type = String(equipment.type || equipment.category || 'item').trim().toLowerCase();
    const damage = String(equipment.dano || equipment.damage || '').trim().toLowerCase();
    const range = String(
        equipment.alc ??
        equipment.alcance ??
        equipment.range ??
        equipment.Alcance ??
        equipment.Range ??
        ''
    ).trim().toLowerCase();
    const speed = getSpeedConsumption(equipment);

    return [type, name, damage, range, speed].join('|');
};

export const parseAttrBonuses = (rasgos = []) => {
    const result = [];
    const traitsArray = Array.isArray(rasgos) ? rasgos : rasgos.toString().split(',');
    traitsArray.forEach((r) => {
        if (!r) return;
        const s = String(r).toLowerCase();
        const match = s.match(/(vigor|destreza|intelecto|voluntad|dexterity|intellect|willpower)\s*(?:\(x?(\d+)\))?/);
        if (match) {
            let attr = match[1];
            // Normalize to Spanish internal keys
            if (attr === 'dexterity') attr = 'destreza';
            if (attr === 'intellect') attr = 'intelecto';
            if (attr === 'willpower') attr = 'voluntad';
            result.push({ attr, mult: parseInt(match[2], 10) || 1 });
        }
    });
    return result;
};

export const parseDamage = (val) => {
    if (val === undefined || val === null) return '';
    const normalized = String(val).trim();
    if (!normalized) return '';
    return normalized.split(/[ (]/)[0];
};

export const rollAttack = (weapon, attributes) => {
    const itemDamage = weapon?.dano ?? weapon?.poder ?? weapon?.damage ?? '';
    const parsedBaseDamage = parseDamage(itemDamage);
    const hasExplicitZeroBase =
        parsedBaseDamage === '0' ||
        /^(\d*)d0$/i.test(parsedBaseDamage);
    let baseFormula = hasExplicitZeroBase ? '' : parsedBaseDamage;
    if (!baseFormula && !hasExplicitZeroBase) {
        baseFormula = '1d20';
    }

    let rolledBaseFormula = baseFormula;
    if (weapon?.extraDamageString) {
        rolledBaseFormula = rolledBaseFormula
            ? `${rolledBaseFormula} + ${weapon.extraDamageString}`
            : weapon.extraDamageString;
    }

    const allTraits = weapon?.rasgos || weapon?.traits || weapon?.trait || weapon?.properties || [];

    const parsedBonuses = parseAttrBonuses(allTraits);

    const attrDiceArray = [];
    const attrs = attributes || {};

    parsedBonuses.forEach(({ attr, mult }) => {
        const lowerAttr = attr.toLowerCase();

        // Exhaustive lookup for the die string (e.g. 'd8')
        let dieStr = null;

        const findInObj = (obj) => {
            if (!obj || typeof obj !== 'object') return null;

            // Check direct properties first
            let val = obj[lowerAttr]
                || obj[lowerAttr.charAt(0).toUpperCase() + lowerAttr.slice(1)]
                || obj[lowerAttr.toUpperCase()]
                || (lowerAttr === 'destreza' ? (obj.dexterity || obj.Dexterity) : null)
                || (lowerAttr === 'vigor' ? (obj.vigor || obj.Vigor || obj.VIGOR) : null)
                || (lowerAttr === 'intelecto' ? (obj.intellect || obj.Intellect) : null)
                || (lowerAttr === 'voluntad' ? (obj.willpower || obj.Willpower) : null);

            if (val && typeof val === 'string' && val.toLowerCase().startsWith('d')) return val;

            // Check if nested in some common containers without infinite recursion
            if (obj.attributes && obj.attributes !== obj) {
                const nested = findInObj(obj.attributes);
                if (nested) return nested;
            }
            if (obj.atributos && obj.atributos !== obj) {
                const nested = findInObj(obj.atributos);
                if (nested) return nested;
            }
            if (obj.payload && obj.payload !== obj) {
                const nested = findInObj(obj.payload);
                if (nested) return nested;
            }

            return null;
        };

        // Deep search in the provided attributes object, then the weapon as emergency fallback
        dieStr = findInObj(attrs) || findInObj(attributes) || findInObj(weapon);

        if (dieStr) {
            for (let i = 0; i < mult; i++) {
                attrDiceArray.push({ dieStr, attr: lowerAttr });
            }
        }
    });

    const traitsArray = Array.isArray(allTraits) ? allTraits : allTraits.toString().split(',');

    // Check for critical hit trait, ignoring case and accents
    const hasCritical = traitsArray.some((r) => {
        if (typeof r !== 'string') return false;
        const normalized = r.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalized.includes('critico');
    });

    // 1. Roll Base Damage
    let baseRes = { formula: rolledBaseFormula || '', total: 0, details: [] };
    if (rolledBaseFormula) {
        if (hasCritical) {
            baseRes = rollExpressionCritical(rolledBaseFormula);
        } else {
            baseRes = rollExpression(rolledBaseFormula);
        }
    }

    // 2. Roll Attribute Dice individually to tag them
    let extraTotal = 0;
    const extraDetails = [];

    attrDiceArray.forEach(({ dieStr, attr }) => {
        // Normalize "d6" → "1d6" so rollExpression recognizes it as a die roll
        let normalizedDie = dieStr.trim().toLowerCase();
        if (/^d\d+$/.test(normalizedDie)) {
            normalizedDie = '1' + normalizedDie;
        }

        // Los dados de atributos NUNCA tienen capacidad de crítico (explosión)
        const attrRes = rollExpression(normalizedDie);

        extraTotal += attrRes.total;

        // Tag ALL details with the attribute so the UI can color them
        attrRes.details.forEach(d => {
            extraDetails.push({ ...d, matchedAttr: attr.toLowerCase() });
        });
    });

    const formulaParts = [];
    if (rolledBaseFormula) {
        formulaParts.push(rolledBaseFormula);
    }
    if (attrDiceArray.length > 0) {
        formulaParts.push(attrDiceArray.map(d => d.dieStr).join(' + '));
    }
    const formula = formulaParts.join(' + ');

    return {
        formula,
        total: baseRes.total + extraTotal,
        details: [...baseRes.details, ...extraDetails],
    };
};

export const getSpeedConsumption = (equipment) => {
    if (!equipment) return 0;
    // Check all possible fields for either dots or numbers (consumo, consumption, velocidad, vel, cost, coste)
    const rawValue = String(
        equipment.consumo ||
        equipment.consumption ||
        equipment.velocidad ||
        equipment.vel ||
        equipment.cost ||
        equipment.coste ||
        ''
    );
    const yellowDotCount = (rawValue.match(/🟡/g) || []).length;
    if (yellowDotCount) return yellowDotCount;
    const parsed = parseInt(rawValue, 10);
    return isNaN(parsed) ? 0 : parsed;
};
