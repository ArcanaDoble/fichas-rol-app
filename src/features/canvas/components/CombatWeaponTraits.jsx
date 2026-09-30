import React from 'react';
import { normalizeGlossaryWord } from '../../../utils/glossary';
import { getCanvasWeaponTraits } from '../combat/canvasAttackRules';

const CombatWeaponTraits = ({ traits, glossary = [], as: Container = 'div' }) => traits.length > 0 && (
  <Container className="noma-loadout-traits">{traits.map(trait => {
    const separator = trait.indexOf(':');
    const label = separator >= 0 ? trait.slice(0, separator).trim() : trait;
    const detail = separator >= 0 ? trait.slice(separator + 1).trim() : '';
    // A specifically defined variant takes precedence over its base trait.
    const words = [trait, label, label.replace(/\s*\([x×]\s*\d+\)\s*$/i, '')].map(word => normalizeGlossaryWord(word.trim()));
    const traitIds = new Set(getCanvasWeaponTraits({ rasgos: words }));
    const entry = words.map(word => glossary.find(item => normalizeGlossaryWord(item.word?.trim()) === word)).find(Boolean)
      || glossary.find(item => getCanvasWeaponTraits({ rasgos: [item.word] }).some(id => traitIds.has(id)));
    const color = entry?.color || entry?.hex;
    return <span key={trait} className="noma-loadout-trait" style={color ? { color } : undefined}>{label}{detail && <span className="noma-loadout-trait__detail">: {detail}</span>}</span>;
  })}</Container>
);


export default CombatWeaponTraits;
