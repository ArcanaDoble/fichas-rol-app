import { useState, useCallback, useEffect } from 'react';
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function useGlossary() {
  const [glossary, setGlossary] = useState([]);
  const [newTerm, setNewTerm] = useState({ word: '', color: '#ffff00', info: '' });
  const [editingTerm, setEditingTerm] = useState(null);
  const [newTermError, setNewTermError] = useState('');

  const fetchGlossary = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'glossary'));
      setGlossary(snap.docs.map(d => d.data()));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchGlossary();
  }, [fetchGlossary]);

  const saveTerm = async () => {
    const { word, color, info } = newTerm;
    if (!word.trim()) {
      setNewTermError('Palabra requerida');
      return;
    }
    try {
      if (editingTerm && editingTerm !== word.trim()) {
        await deleteDoc(doc(db, 'glossary', editingTerm));
      }
      await setDoc(doc(db, 'glossary', word.trim()), { word: word.trim(), color, info });
      setEditingTerm(null);
      setNewTerm({ word: '', color: '#ffff00', info: '' });
      setNewTermError('');
      fetchGlossary();
    } catch (e) {
      console.error(e);
      setNewTermError('Error al guardar');
    }
  };

  const startEditTerm = term => {
    setNewTerm(term);
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
    saveTerm,
    startEditTerm,
    deleteTerm,
    fetchGlossary,
  };
}
