import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';
import Boton from './Boton';
import {
  rollExpression,
  parseAndRollFormula,
  rollExpressionCritical,
  parseAndRollFormulaCritical,
} from '../utils/dice';
import { applyDamage, parseDieValue } from '../utils/damage';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { nanoid } from 'nanoid';
import { saveTokenSheet } from '../utils/token';
import { addSpeedForToken, consumeStatForToken } from '../utils/initiative';

const atributoColor = {
  destreza: '#34d399',
  vigor: '#f87171',
  intelecto: '#60a5fa',
  voluntad: '#a78bfa',
};
const specialTraitColor = '#ef4444';

const parseAttrBonuses = (rasgos = []) => {
  const result = [];
  rasgos.forEach((r) => {
    const match = r
      .toLowerCase()
      .match(/(vigor|destreza|intelecto|voluntad)\s*(?:\(x?(\d+)\))?/);
    if (match) {
      result.push({ attr: match[1], mult: parseInt(match[2], 10) || 1 });
    }
  });
  return result;
};

const DefenseModal = ({
  isOpen,
  attacker,
  target,
  distance,
  attackResult,
  pageId,
  armas = [],
  poderesCatalog = [],
  onClose,
}) => {
  const [sheet, setSheet] = useState(null);

  useEffect(() => {
    if (!target?.tokenSheetId) {
      setSheet(null);
      return;
    }
    const id = target.tokenSheetId;
    const load = async () => {
      const stored = localStorage.getItem('tokenSheets');
      const sheets = stored ? JSON.parse(stored) : {};
      if (sheets[id]) {
        setSheet(sheets[id]);
      } else {
        try {
          const snap = await getDoc(doc(db, 'tokenSheets', id));
          if (snap.exists()) {
            const data = snap.data();
            setSheet(data);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    load();
    const handler = (e) => {
      if (e.detail && e.detail.id === id) setSheet(e.detail);
    };
    window.addEventListener('tokenSheetSaved', handler);
    return () => window.removeEventListener('tokenSheetSaved', handler);
  }, [target]);

  const parseRange = (val) => {
    if (!val && val !== 0) return Infinity;
    const map = {
      toque: 1,
      cercano: 2,
      intermedio: 3,
      lejano: 4,
      extremo: 5,
    };
    if (typeof val === 'string') {
      const key = val.trim().toLowerCase();
      if (map[key]) return map[key];
      const n = parseInt(key, 10);
      if (!isNaN(n)) return n;
    }
    const n = parseInt(val, 10);
    return isNaN(n) ? Infinity : n;
  };
  const parseDamage = (val) => {
    if (!val) return '';
    return String(val).split(/[ (]/)[0];
  };
  const getSpeedConsumption = (equipment) => {
    if (!equipment) return 0;
    const consumo = equipment.consumo || '';
    const yellowDotCount = (consumo.match(/🟡/g) || []).length;
    if (yellowDotCount) return yellowDotCount;
    const parsed = parseInt(consumo, 10);
    return isNaN(parsed) ? 0 : parsed;
  };
  const getIngenioConsumption = (equipment) => {
    if (!equipment) return 0;
    const consumo = equipment.consumo || '';
    const blueDotCount = (consumo.match(/🔵/g) || []).length;
    return blueDotCount;
  };
  const mapItem = (it, catalog) => {
    if (!it) return null;
    const base = typeof it === 'string' ? { nombre: it } : it;
    const fromCatalog = catalog.find((c) => c.nombre === base.nombre);
    return fromCatalog ? { ...fromCatalog, ...base } : base;
  };

  const weaponObjs = useMemo(() => {
    if (!sheet) return [];
    return (sheet.weapons || []).map((w) => mapItem(w, armas));
  }, [sheet, armas]);

  const weapons = useMemo(
    () =>
      weaponObjs.filter((w) => {
        const alc = parseRange(w.alcance);
        return distance <= alc;
      }),
    [weaponObjs, distance]
  );

  const powerObjs = useMemo(() => {
    if (!sheet) return [];
    return (sheet.poderes || []).map((p) => mapItem(p, poderesCatalog));
  }, [sheet, poderesCatalog]);

  const powers = useMemo(
    () =>
      powerObjs.filter((p) => {
        const alc = parseRange(p.alcance);
        return distance <= alc;
      }),
    [powerObjs, distance]
  );

  const [choice, setChoice] = useState('');
  const [damage, setDamage] = useState('');
  const [speedCost, setSpeedCost] = useState(0);
  const [ingenioCost, setIngenioCost] = useState(0);
  const [loading, setLoading] = useState(false);

  const selectedItem = useMemo(
    () => [...weapons, ...powers].find((i) => i.nombre === choice),
    [choice, weapons, powers]
  );

  const attrBonuses = useMemo(
    () => parseAttrBonuses(selectedItem?.rasgos || []),
    [selectedItem]
  );

  const specialTraits = useMemo(
    () =>
      (selectedItem?.rasgos || []).filter((r) =>
        r.toLowerCase().includes('crítico')
      ),
    [selectedItem]
  );

  const otherTraits = useMemo(
    () =>
      (selectedItem?.rasgos || []).filter(
        (r) =>
          !r
            .toLowerCase()
            .match(/(vigor|destreza|intelecto|voluntad)/)
          && !r.toLowerCase().includes('crítico')
      ),
    [selectedItem]
  );

  const hasEquip = useMemo(() => {
    if (!sheet) return false;
    const w = sheet.weapons || [];
    const p = sheet.poderes || [];
    return w.length > 0 || p.length > 0;
  }, [sheet]);

  const hasAvailable = weapons.length > 0 || powers.length > 0;

  if (!attacker || !target) return null;

  const handleRoll = async () => {
    const item = [...weapons, ...powers].find((i) => i.nombre === choice);
    const itemDamage = item?.dano ?? item?.poder ?? '';
    const baseFormula = damage || parseDamage(itemDamage) || '1d20';
    const attrDice = parseAttrBonuses(item?.rasgos || [])
      .flatMap(({ attr, mult }) => {
        const die = sheet?.atributos?.[attr];
        if (!die) return [];
        return Array(mult).fill(die);
      })
      .join(' + ');
    const formula = attrDice ? `${baseFormula} + ${attrDice}` : baseFormula;
    const hasCritical = (item?.rasgos || []).some((r) =>
      r.toLowerCase().includes('crítico')
    );
    try {
      let result;
      if (hasCritical) {
        const baseRes = parseAndRollFormulaCritical(baseFormula);
        const attrRes = attrDice ? parseAndRollFormula(attrDice) : { total: 0, details: [] };
        result = {
          formula,
          total: baseRes.total + attrRes.total,
          details: [...baseRes.details, ...attrRes.details],
        };
      } else {
        result = rollExpression(formula);
      }
      let messages = [];
      try {
        const snap = await getDoc(doc(db, 'assetSidebar', 'chat'));
        if (snap.exists()) messages = snap.data().messages || [];
      } catch (err) {
        console.error(err);
      }
      const targetName = target.customName || target.name || 'Defensor';
      const diff = result.total - (attackResult?.total || 0);
      let lost = { armadura: 0, postura: 0, vida: 0 };
      let affectedSheet = null;
      if (diff < 0 && sheet) {
        let updated = sheet;
        let remaining = Math.abs(diff);
        ['postura', 'armadura', 'vida'].forEach((stat) => {
          const res = applyDamage(updated, remaining, stat);
          remaining = res.remaining;
          updated = res.sheet;
          lost[stat] = res.blocks;
        });
        const stored = localStorage.getItem('tokenSheets');
        const sheets = stored ? JSON.parse(stored) : {};
        sheets[updated.id] = updated;
        localStorage.setItem('tokenSheets', JSON.stringify(sheets));
        window.dispatchEvent(
          new CustomEvent('tokenSheetSaved', { detail: updated })
        );
        saveTokenSheet(updated);
        affectedSheet = updated;
      } else if (diff > 0 && attacker?.tokenSheetId) {
        const stored = localStorage.getItem('tokenSheets');
        if (stored) {
          const sheets = JSON.parse(stored);
          let atkSheet = sheets[attacker.tokenSheetId];
          if (atkSheet) {
            let remaining = diff;
            ['postura', 'armadura', 'vida'].forEach((stat) => {
              const res = applyDamage(atkSheet, remaining, stat);
              remaining = res.remaining;
              atkSheet = res.sheet;
              lost[stat] = res.blocks;
            });
            sheets[atkSheet.id] = atkSheet;
            localStorage.setItem('tokenSheets', JSON.stringify(sheets));
            window.dispatchEvent(
              new CustomEvent('tokenSheetSaved', { detail: atkSheet })
            );
            saveTokenSheet(atkSheet);
            affectedSheet = atkSheet;
          }
        }
      }

      let totalLost = 0;
      if (diff === 0) {
        const anim = { tokenId: target.id, type: 'perfect', ts: Date.now() };
        // Solo guardar en Firebase para sincronización entre navegadores
        // No disparar eventos locales para evitar duplicación
        try {
          // Obtener el pageId visible para jugadores para asegurar sincronización
          let effectivePageId = pageId;
          try {
            const visibilityDoc = await getDoc(doc(db, 'gameSettings', 'playerVisibility'));
            if (visibilityDoc.exists()) {
              effectivePageId = visibilityDoc.data().playerVisiblePageId || pageId;
            }
          } catch (err) {
            console.warn('No se pudo obtener playerVisiblePageId, usando pageId actual:', err);
          }
          addDoc(collection(db, 'damageEvents'), {
            ...anim,
            pageId: effectivePageId,
            timestamp: serverTimestamp(),
          }).catch(() => {});
        } catch {}
      } else {
        const id = diff < 0 ? target.id : attacker.id;
        if (diff > 0) {
          const anim = { tokenId: attacker.id, type: 'counter', ts: Date.now() };
          try {
            let effectivePageId = pageId;
            try {
              const visibilityDoc = await getDoc(doc(db, 'gameSettings', 'playerVisibility'));
              if (visibilityDoc.exists()) {
                effectivePageId = visibilityDoc.data().playerVisiblePageId || pageId;
              }
            } catch (err) {
              console.warn('No se pudo obtener playerVisiblePageId, usando pageId actual:', err);
            }
            addDoc(collection(db, 'damageEvents'), {
              ...anim,
              pageId: effectivePageId,
              timestamp: serverTimestamp(),
            }).catch(() => {});
          } catch {}
        }
        for (const stat of ['postura', 'armadura', 'vida']) {
          if (lost[stat] > 0) {
            const anim = {
              tokenId: id,
              value: lost[stat],
              stat,
              ts: Date.now(),
            };
            // Solo guardar en Firebase para sincronización entre navegadores
            // No disparar eventos locales para evitar duplicación
            try {
              // Obtener el pageId visible para jugadores para asegurar sincronización
              let effectivePageId = pageId;
              try {
                const visibilityDoc = await getDoc(doc(db, 'gameSettings', 'playerVisibility'));
                if (visibilityDoc.exists()) {
                  effectivePageId = visibilityDoc.data().playerVisiblePageId || pageId;
                }
              } catch (err) {
                console.warn('No se pudo obtener playerVisiblePageId, usando pageId actual:', err);
              }
              addDoc(collection(db, 'damageEvents'), {
                ...anim,
                pageId: effectivePageId,
                timestamp: serverTimestamp(),
              }).catch(() => {});
            } catch {}
          }
        }
        totalLost = lost.armadura + lost.postura + lost.vida;
        if (diff < 0 && totalLost === 0) {
          const anim = { tokenId: id, type: 'resist', ts: Date.now() };
          try {
            let effectivePageId = pageId;
            try {
              const visibilityDoc = await getDoc(doc(db, 'gameSettings', 'playerVisibility'));
              if (visibilityDoc.exists()) {
                effectivePageId = visibilityDoc.data().playerVisiblePageId || pageId;
              }
            } catch (err) {
              console.warn('No se pudo obtener playerVisiblePageId, usando pageId actual:', err);
            }
            addDoc(collection(db, 'damageEvents'), {
              ...anim,
              pageId: effectivePageId,
              timestamp: serverTimestamp(),
            }).catch(() => {});
          } catch {}
        }
      }

      const vigor = parseDieValue(affectedSheet?.atributos?.vigor);
      const destreza = parseDieValue(affectedSheet?.atributos?.destreza);
      let text;
      if (diff > 0) {
        text = `${targetName} contraataca. Ataque ${attackResult?.total || 0} Defensa ${result.total} Dif ${diff} (V${vigor} D${destreza}) Bloques A-${lost.armadura} P-${lost.postura} V-${lost.vida}`;
      } else if (diff < 0) {
        if (totalLost === 0) {
          text = `${targetName} resiste el daño. Ataque ${attackResult?.total || 0} Defensa ${result.total} Dif ${Math.abs(diff)} (V${vigor} D${destreza}) Bloques A-${lost.armadura} P-${lost.postura} V-${lost.vida}`;
        } else {
          text = `${targetName} recibe daño. Ataque ${attackResult?.total || 0} Defensa ${result.total} Dif ${Math.abs(diff)} (V${vigor} D${destreza}) Bloques A-${lost.armadura} P-${lost.postura} V-${lost.vida}`;
        }
      } else {
        text = `${targetName} bloquea el ataque. Ataque ${attackResult?.total || 0} Defensa ${result.total}`;
      }
      messages.push({ id: nanoid(), author: targetName, text, result });
      setDoc(doc(db, 'assetSidebar', 'chat'), { messages }).catch(() => {});

      await addSpeedForToken(target, speedCost);
      await consumeStatForToken(target, 'ingenio', ingenioCost, pageId);
      setLoading(false);
      onClose(result);
    } catch (e) {
      setLoading(false);
      alert('Fórmula inválida');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onClose(null)}
      title="Defensa"
      size="sm"
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-300 mb-1">
            Distancia: {distance} casillas
          </p>
          {hasEquip ? (
            hasAvailable ? (
              <>
                <select
                  value={choice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setChoice(val);
                    const item = [...weapons, ...powers].find(
                      (i) => i.nombre === val
                    );
                    const dmg = item?.dano ?? item?.poder ?? '';
                    setDamage(parseDamage(dmg));
                    setSpeedCost(getSpeedConsumption(item));
                    setIngenioCost(getIngenioConsumption(item));
                  }}
                  className="w-full bg-gray-700 text-white"
                >
                  <option value="">Selecciona arma o poder</option>
                  {weapons.map((w) => (
                    <option key={`w-${w.nombre}`} value={w.nombre}>
                      {w.nombre}
                    </option>
                  ))}
                  {powers.map((p) => (
                    <option key={`p-${p.nombre}`} value={p.nombre}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                {choice && (
                  <>
                    <input
                      type="text"
                      value={damage}
                      onChange={(e) => setDamage(e.target.value)}
                      className="w-full mt-2 bg-gray-700 text-white px-2 py-1"
                      placeholder="Daño"
                    />
                    <p className="text-sm text-gray-300 mt-1">
                      Consumo: 🟡{speedCost}
                      {ingenioCost > 0 && <> {' '}🔵{ingenioCost}</>}
                    </p>
                    {attrBonuses.length > 0 && (
                      <p className="text-sm text-gray-300 mt-1 flex flex-wrap">
                        {attrBonuses.map(({ attr, mult }) => (
                          <span
                            key={attr}
                            className="mr-2"
                            style={{ color: atributoColor[attr] }}
                          >
                            {attr} {sheet?.atributos?.[attr]}
                            {mult > 1 ? ` x${mult}` : ''}
                          </span>
                        ))}
                      </p>
                    )}
                    {specialTraits.length > 0 && (
                      <p className="text-sm text-gray-300 mt-1 flex flex-wrap">
                        {specialTraits.map((t, i) => (
                          <span key={i} className="mr-2" style={{ color: specialTraitColor }}>
                            {t}
                          </span>
                        ))}
                      </p>
                    )}
                    {otherTraits.length > 0 && (
                      <p className="text-sm text-gray-300 mt-1">
                        Rasgos: {otherTraits.join(', ')}
                      </p>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <p className="text-red-400 text-sm">
                  No hay ningún arma disponible al alcance
                </p>
                <input
                  type="text"
                  value={damage}
                  onChange={(e) => setDamage(e.target.value)}
                  className="w-full mt-2 bg-gray-700 text-white px-2 py-1"
                  placeholder="Defensa opcional"
                />
              </>
            )
          ) : (
            <>
              <p className="text-red-400 text-sm">
                No hay armas o poderes equipados
              </p>
              <input
                type="text"
                value={damage}
                onChange={(e) => setDamage(e.target.value)}
                className="w-full mt-2 bg-gray-700 text-white px-2 py-1"
                placeholder="Defensa opcional"
              />
            </>
          )}
        </div>
        <Boton
          color="green"
          onClick={handleRoll}
          loading={loading}
          className="w-full"
        >
          Lanzar
        </Boton>
      </div>
    </Modal>
  );
};

DefenseModal.propTypes = {
  isOpen: PropTypes.bool,
  attacker: PropTypes.object,
  target: PropTypes.object,
  distance: PropTypes.number,
  attackResult: PropTypes.object,
  pageId: PropTypes.string,
  armas: PropTypes.array,
  poderesCatalog: PropTypes.array,
  onClose: PropTypes.func,
};

export default DefenseModal;
