import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';
import Boton from './Boton';
import { rollExpression } from '../utils/dice';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { nanoid } from 'nanoid';

const DefenseModal = ({
  isOpen,
  attacker,
  target,
  distance,
  attackResult,
  armas = [],
  poderesCatalog = [],
  onClose,
}) => {
  const sheet = useMemo(() => {
    if (!target?.tokenSheetId) return null;
    const stored = localStorage.getItem('tokenSheets');
    if (!stored) return null;
    const sheets = JSON.parse(stored);
    return sheets[target.tokenSheetId] || null;
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
    const item = [...weapons, ...powers].find(i => i.nombre === choice);
    const formula = item?.dano || '1d20';
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
      const success = result.total >= (attackResult?.total || 0);
      const text = `${target.name || 'Defensor'} se defiende ${success ? 'con exito' : 'sin exito'}`;
      messages.push({ id: nanoid(), author: target.name || 'Defensor', text, result });
      await setDoc(doc(db, 'assetSidebar', 'chat'), { messages });

      if (sheet && attackResult) {
        let dmg = Math.max(0, attackResult.total - result.total);
        const order = ['armadura', 'postura', 'vida'];
        const updated = { ...sheet, stats: { ...sheet.stats } };
        order.forEach(stat => {
          if (!updated.stats[stat]) return;
          const current = updated.stats[stat].actual ?? 0;
          const newVal = Math.max(0, current - dmg);
          dmg -= current - newVal;
          updated.stats[stat].actual = newVal;
        });
        const stored = localStorage.getItem('tokenSheets');
        const sheets = stored ? JSON.parse(stored) : {};
        sheets[updated.id] = updated;
        localStorage.setItem('tokenSheets', JSON.stringify(sheets));
        window.dispatchEvent(new CustomEvent('tokenSheetSaved', { detail: updated }));
      }

      setLoading(false);
      onClose(result);
    } catch (e) {
      setLoading(false);
      alert('Fórmula inválida');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(null)} title="Defensa" size="sm">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-300 mb-1">Distancia: {distance} casillas</p>
          {hasEquip ? (
            hasAvailable ? (
              <select
                value={choice}
                onChange={e => setChoice(e.target.value)}
                className="w-full bg-gray-700 text-white"
              >
                <option value="">Selecciona arma o poder</option>
                {weapons.map(w => (
                  <option key={`w-${w.nombre}`} value={w.nombre}>{w.nombre}</option>
                ))}
                {powers.map(p => (
                  <option key={`p-${p.nombre}`} value={p.nombre}>{p.nombre}</option>
                ))}
              </select>
            ) : (
              <p className="text-red-400 text-sm">No hay ningún arma disponible al alcance</p>
            )
          ) : (
            <p className="text-red-400 text-sm">No hay armas o poderes equipados</p>
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

DefenseModal.propTypes = {
  isOpen: PropTypes.bool,
  attacker: PropTypes.object,
  target: PropTypes.object,
  distance: PropTypes.number,
  attackResult: PropTypes.object,
  armas: PropTypes.array,
  poderesCatalog: PropTypes.array,
  onClose: PropTypes.func,
};

export default DefenseModal;
