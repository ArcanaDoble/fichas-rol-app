import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';
import Boton from './Boton';
import { rollExpression } from '../utils/dice';
import { applyDamage, parseDieValue } from '../utils/damage';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { nanoid } from 'nanoid';

const AUTO_RESOLVE_MS = 20000;

const AttackModal = ({
  isOpen,
  attacker,
  target,
  distance,
  armas = [],
  poderesCatalog = [],
  onClose,
}) => {
  const sheet = useMemo(() => {
    if (!attacker?.tokenSheetId) return null;
    const stored = localStorage.getItem('tokenSheets');
    if (!stored) return null;
    const sheets = JSON.parse(stored);
    return sheets[attacker.tokenSheetId] || null;
  }, [attacker]);

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

  const mapItem = (it, catalog) => {
    if (!it) return null;
    if (typeof it === 'string') {
      return catalog.find((c) => c.nombre === it) || { nombre: it };
    }
    return it;
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
  const [loading, setLoading] = useState(false);

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
    const formula = damage || parseDamage(itemDamage) || '1d20';
    setLoading(true);
    try {
      const result = rollExpression(formula);
      let messages = [];
      try {
        const snap = await getDoc(doc(db, 'assetSidebar', 'chat'));
        if (snap.exists()) messages = snap.data().messages || [];
      } catch (err) {
        console.error(err);
      }
      const attackerName = attacker.customName || attacker.name || 'Atacante';
      const targetName = target.customName || target.name || '';
      const text = `${attackerName} ataca a ${targetName}`;
      messages.push({ id: nanoid(), author: attackerName, text, result });
      await setDoc(doc(db, 'assetSidebar', 'chat'), { messages });
      const docRef = await addDoc(collection(db, 'attacks'), {
        attackerId: attacker.id,
        targetId: target.id,
        result,
        timestamp: serverTimestamp(),
        completed: false,
      });
      setTimeout(async () => {
        try {
          const snap = await getDoc(docRef);
          if (!snap.exists() || snap.data().completed) return;
          let lost = { armadura: 0, postura: 0, vida: 0 };
          if (target.tokenSheetId) {
            const stored = localStorage.getItem('tokenSheets');
            if (stored) {
              const sheets = JSON.parse(stored);
              const sheet = sheets[target.tokenSheetId];
              if (sheet) {
                let updated = sheet;
                let remaining = result.total;
                ['postura', 'armadura', 'vida'].forEach((stat) => {
                  const res = applyDamage(updated, remaining, stat);
                  remaining = res.remaining;
                  updated = res.sheet;
                  lost[stat] = res.blocks;
                });
                sheets[updated.id] = updated;
                localStorage.setItem('tokenSheets', JSON.stringify(sheets));
                window.dispatchEvent(
                  new CustomEvent('tokenSheetSaved', { detail: updated })
                );
              }
            }
          }
          const stat =
            lost.postura > 0
              ? 'postura'
              : lost.armadura > 0
              ? 'armadura'
              : 'vida';
          const anim = {
            tokenId: target.id,
            value: lost[stat],
            stat,
            ts: Date.now(),
          };
          window.dispatchEvent(
            new CustomEvent('damageAnimation', { detail: anim })
          );
          try {
            localStorage.setItem('damageAnimation', JSON.stringify(anim));
          } catch {}
          let msgs = [];
          try {
            const chatSnap = await getDoc(doc(db, 'assetSidebar', 'chat'));
            if (chatSnap.exists()) msgs = chatSnap.data().messages || [];
          } catch (err) {}
          const targetName = target.customName || target.name || 'Defensor';
          const vigor = parseDieValue(sheet?.atributos?.vigor);
          const destreza = parseDieValue(sheet?.atributos?.destreza);
          const diff = result.total;
          msgs.push({
            id: nanoid(),
            author: targetName,
            text: `${targetName} no se defendió. Ataque ${result.total} Defensa 0 Dif ${diff} (V${vigor} D${destreza}) Bloques A-${lost.armadura} P-${lost.postura} V-${lost.vida}`,
          });
          await setDoc(doc(db, 'assetSidebar', 'chat'), { messages: msgs });
          await updateDoc(docRef, { completed: true, auto: true });
        } catch (err) {
          console.error(err);
        }
      }, AUTO_RESOLVE_MS);
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
      title="Ataque"
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
                  <input
                    type="text"
                    value={damage}
                    onChange={(e) => setDamage(e.target.value)}
                    className="w-full mt-2 bg-gray-700 text-white px-2 py-1"
                    placeholder="Daño"
                  />
                )}
              </>
            ) : (
              <p className="text-red-400 text-sm">
                No hay ningún arma disponible al alcance
              </p>
            )
          ) : (
            <p className="text-red-400 text-sm">
              No hay armas o poderes equipados
            </p>
          )}
        </div>
        <Boton
          color="green"
          onClick={handleRoll}
          loading={loading}
          className="w-full"
          disabled={!hasAvailable}
        >
          Lanzar
        </Boton>
      </div>
    </Modal>
  );
};

AttackModal.propTypes = {
  isOpen: PropTypes.bool,
  attacker: PropTypes.object,
  target: PropTypes.object,
  distance: PropTypes.number,
  armas: PropTypes.array,
  poderesCatalog: PropTypes.array,
  onClose: PropTypes.func,
};

export default AttackModal;
