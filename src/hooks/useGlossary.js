import { useState, useCallback, useEffect } from 'react';
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { isValidHexColor, normalizeHexColor } from '../utils/color';

const DEFAULT_TERM_COLOR = '#ffff00';

const createEmptyTerm = () => ({
  word: '',
  color: DEFAULT_TERM_COLOR,
  colorInput: DEFAULT_TERM_COLOR,
  info: '',
});

export default function useGlossary() {
  const [glossary, setGlossary] = useState([]);
  const [newTerm, setNewTerm] = useState(createEmptyTerm);
  const [editingTerm, setEditingTerm] = useState(null);
  const [newTermError, setNewTermError] = useState('');

  const fetchGlossary = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'glossary'));
      setGlossary(snap.docs.map(d => d.data()));
    } catch (e) {
      // Eliminar console.error innecesarios.
    }
  }, []);

  useEffect(() => {
    fetchGlossary();
  }, [fetchGlossary]);

  const saveTerm = async () => {
    const { word, color, colorInput, info } = newTerm;
    const trimmedWord = word.trim();
    if (!trimmedWord) {
      setNewTermError('Palabra requerida');
      return;
    }
    const normalizedColor = normalizeHexColor(colorInput || color);
    if (!isValidHexColor(normalizedColor)) {
      setNewTermError('Color inválido. Usa formato #RRGGBB o #RGB');
      return;
    }
    try {
      if (editingTerm && editingTerm !== trimmedWord) {
        await deleteDoc(doc(db, 'glossary', editingTerm));
      }
      await setDoc(doc(db, 'glossary', trimmedWord), {
        word: trimmedWord,
        color: normalizedColor,
        info,
      });
      setEditingTerm(null);
      setNewTerm(createEmptyTerm());
      setNewTermError('');
      fetchGlossary();
    } catch (e) {
      // Eliminar console.error innecesarios.
      setNewTermError('Error al guardar');
    }
  };

  const startEditTerm = term => {
    setNewTerm({ ...term, colorInput: term.color || DEFAULT_TERM_COLOR });
    setNewTermError('');
    setEditingTerm(term.word);
  };

  const deleteTerm = async word => {
    await deleteDoc(doc(db, 'glossary', word));
    fetchGlossary();
  };

  return {
    glossary,
    newTerm,
    setNewTerm,
    editingTerm,
    setEditingTerm,
    newTermError,
    setNewTermError,
    saveTerm,
    startEditTerm,
    deleteTerm,
    fetchGlossary,
  };
}
