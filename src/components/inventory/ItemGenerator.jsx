import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import Input from '../Input';
import Boton from '../Boton';
import CustomItemForm from './CustomItemForm';
import { db } from '../../firebase';

const ItemGenerator = ({ onGenerate, allowCustom = false }) => {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [suggest, setSuggest] = useState('');
  const mirrorRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const snap = await getDocs(collection(db, 'customItems'));
        const types = snap.docs.map(d => d.data().type);
        setItems(types);
      } catch {
        setItems([]);
      }
    };
    fetchItems();
  }, []);

  useEffect(() => {
    if (!query) {
      setSuggest('');
      return;
    }
    const match = items.find(i => i.startsWith(query.toLowerCase()));
    if (match && match !== query.toLowerCase()) {
      setSuggest(match.slice(query.length));
    } else {
      setSuggest('');
    }
  }, [query]);

  useEffect(() => {
    if (mirrorRef.current) {
      setOffset(mirrorRef.current.offsetWidth);
    }
  }, [query, suggest]);

  const handleGenerate = () => {
    const type = query.toLowerCase();
    if (items.includes(type)) {
      onGenerate(type);
      setQuery('');
      setSuggest('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && suggest) {
      e.preventDefault();
      setQuery(query + suggest);
      setSuggest('');
    } else if (e.key === 'Enter') {
      handleGenerate();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="relative flex-1">
        <Input
          className="w-full relative"
          placeholder="Buscar objeto"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {suggest && (

          <>
            <span
              ref={mirrorRef}
              className="absolute left-4 top-1/2 -translate-y-1/2 invisible whitespace-pre"
            >
              {query}
            </span>
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-20"
              style={{ marginLeft: offset }}
            >
              {suggest}
            </span>
          </>
        )}
      </div>
      <Boton color="blue" size="sm" onClick={handleGenerate}>
        Generar
      </Boton>
      {allowCustom && (
        <>
          <Boton color="green" size="sm" onClick={() => setShowForm(true)}>
            Nuevo
          </Boton>
          {showForm && (
            <CustomItemForm
              onSave={async (item) => {
                await setDoc(doc(db, 'customItems', item.type), item);
                setItems((prev) => [...prev, item.type]);
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          )}
        </>
      )}
    </div>
  );
};

ItemGenerator.propTypes = {
  onGenerate: PropTypes.func.isRequired,
  allowCustom: PropTypes.bool,
};

export default ItemGenerator;
