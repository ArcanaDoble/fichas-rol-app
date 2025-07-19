import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { nanoid } from 'nanoid';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Modal from './Modal';
import Input from './Input';
import Boton from './Boton';
import { rollExpression } from '../utils/dice';

const DoorCheckModal = ({ isOpen, onClose, playerName = '', difficulty = 1 }) => {
  const [formula, setFormula] = useState('1d20');
  const [loading, setLoading] = useState(false);

  const handleRoll = async () => {
    setLoading(true);
    try {
      const result = rollExpression(formula);
      const success = result.total >= difficulty;
      let messages = [];
      try {
        const snap = await getDoc(doc(db, 'assetSidebar', 'chat'));
        if (snap.exists()) messages = snap.data().messages || [];
      } catch (err) {
        console.error(err);
      }
      const author = playerName || 'Jugador';
      const text = `${author} intenta abrir una puerta. ${success ? 'Superado' : 'No superado'}`;
      messages.push({ id: nanoid(), author, text, result, doorCheck: true, success });
      await setDoc(doc(db, 'assetSidebar', 'chat'), { messages });
      setLoading(false);
      onClose(result.total);
    } catch (e) {
      setLoading(false);
      alert('Fórmula inválida');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(null)} title="Tirada de puerta" size="sm">
      <div className="space-y-4">
        <Input label="Fórmula" value={formula} onChange={e => setFormula(e.target.value)} />
        <Boton color="green" onClick={handleRoll} loading={loading} className="w-full">
          Lanzar
        </Boton>
      </div>
    </Modal>
  );
};

DoorCheckModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  playerName: PropTypes.string,
  difficulty: PropTypes.number,
};

export default DoorCheckModal;
