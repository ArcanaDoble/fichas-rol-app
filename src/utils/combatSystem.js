import { rollExpression, parseAndRollFormula, rollExpressionCritical } from './dice';
import { parseDieValue } from './damage';

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
    if (!val) return '';
    return String(val).split(/[ (]/)[0];
};

export const rollAttack = (weapon, attributes) => {
    const itemDamage = weapon?.dano ?? weapon?.poder ?? weapon?.damage ?? '';
    const baseFormula = parseDamage(itemDamage) || '1d20';

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
    const hasCritical = traitsArray.some((r) => typeof r === 'string' && r.toLowerCase().includes('crítico'));

    // 1. Roll Base Damage
    let baseRes;
    if (hasCritical) {
        baseRes = rollExpressionCritical(baseFormula);
    } else {
        baseRes = rollExpression(baseFormula);
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

        let attrRes;
        if (hasCritical) attrRes = rollExpressionCritical(normalizedDie);
        else attrRes = rollExpression(normalizedDie);

        extraTotal += attrRes.total;

        // Tag ALL details with the attribute so the UI can color them
        attrRes.details.forEach(d => {
            extraDetails.push({ ...d, matchedAttr: attr.toLowerCase() });
        });
    });

    const formula = attrDiceArray.length > 0
        ? `${baseFormula} + ${attrDiceArray.map(d => d.dieStr).join(' + ')}`
        : baseFormula;

    return {
        formula,
        total: baseRes.total + extraTotal,
        details: [...baseRes.details, ...extraDetails],
    };
};

export const getSpeedConsumption = (equipment) => {
    if (!equipment) return 0;
    const consumo = equipment.consumo || '';
    const yellowDotCount = (consumo.match(/🟡/g) || []).length;
    if (yellowDotCount) return yellowDotCount;
    const parsed = parseInt(consumo, 10);
    return isNaN(parsed) ? 0 : parsed;
};
