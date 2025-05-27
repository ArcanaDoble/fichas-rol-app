// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { BsDice6 } from 'react-icons/bs';
import { GiFist } from 'react-icons/gi';
import { FaFire, FaBolt, FaSnowflake, FaRadiationAlt } from 'react-icons/fa';

const MASTER_PASSWORD = '0904';

// Atributos y sus colores
const atributos = ['destreza', 'vigor', 'intelecto', 'voluntad'];
const atributoColor = {
  destreza: '#86efac',
  vigor: '#f87171',
  intelecto: '#60a5fa',
  voluntad: '#c084fc',
};

// Dados disponibles
const DADOS = ['D4', 'D6', 'D8', 'D10', 'D12'];

// Ahora usamos la carpeta public/dados para las imágenes
const dadoImgUrl = dado => `/dados/${dado}.png`;

function App() {
  const [userType, setUserType] = useState(null);
  const [modoOscuro, setModoOscuro] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [armas, setArmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [nameEntered, setNameEntered] = useState(false);
  const [existingPlayers, setExistingPlayers] = useState([]);
  const [playerData, setPlayerData] = useState({ weapons: [], atributos: {} });
  const [playerError, setPlayerError] = useState('');
  const [playerInputArma, setPlayerInputArma] = useState('');

  // Estilos dinámicos
  const theme = modoOscuro
    ? { bg: '#1f2937', text: '#f3f4f6', inputBg: '#374151' }
    : { bg: '#f9fafb', text: '#111827', inputBg: '#ffffff' };
  const containerStyle = { background: theme.bg, color: theme.text, minHeight: '100vh', padding: '1rem' };
  const inputStyle = {
    background: theme.inputBg,
    color: theme.text,
    border: '1px solid #ccc',
    padding: '0.5rem',
    borderRadius: '0.25rem',
    width: '100%',
    maxWidth: '20rem'
  };
  const buttonStyle = {
    padding: '0.5rem 1rem',
    margin: '0.5rem',
    borderRadius: '0.25rem',
    border: 'none',
    cursor: 'pointer'
  };
  const cardStyle = {
    background: theme.inputBg,
    padding: '0.75rem',
    borderRadius: '0.25rem',
    marginBottom: '0.75rem'
  };

  // Funciones de navegación y manejo de menú
  const volverAlMenu = () => {
    setUserType(null);
    setAuthenticated(false);
    setShowLogin(false);
    setNameEntered(false);
    setPlayerName('');
    setPasswordInput('');
    setPlayerData({ weapons: [], atributos: {} });
    setPlayerError('');
    setPlayerInputArma('');
  };

  const eliminarFichaJugador = async () => {
    if (!window.confirm(`¿Eliminar ficha de ${playerName}?`)) return;
    try {
      await deleteDoc(doc(db, 'players', playerName));
      volverAlMenu();
    } catch (err) {
      console.error('Error eliminando ficha:', err);
    }
  };

  // Carga lista de jugadores
  useEffect(() => {
    if (userType === 'player') {
      (async () => {
        try {
          const snap = await getDocs(collection(db, 'players'));
          setExistingPlayers(snap.docs.map(d => d.id));
        } catch (err) {
          console.error('Error leyendo jugadores:', err);
        }
      })();
    }
  }, [userType]);

  // Carga catálogo de armas desde Google Sheets
  const fetchArmas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        'https://docs.google.com/spreadsheets/d/1Fc46hHjCWRXCEnHl3ZehzMEcxewTYaZEhd-v-dnFUjs/gviz/tq?sheet=Lista_Armas&tqx=out:json'
      );
      const text = await res.text();
      const json = JSON.parse(text.slice(text.indexOf('(') + 1, text.lastIndexOf(')')));
      const cols = json.table.cols.map(c => c.label || c.id);
      const datos = (json.table.rows || []).map(r => {
        const obj = {};
        cols.forEach((label, i) => { obj[label] = r.c[i]?.v || ''; });
        const rasgos = obj.RASGOS
          ? (obj.RASGOS.match(/\[([^\]]+)\]/g) || []).map(s => s.replace(/\[|\]/g, '').trim())
          : [];
        return {
          nombre: obj.NOMBRE,
          dano: obj.DAÑO,
          alcance: obj.ALCANCE,
          consumo: obj.CONSUMO,
          carga: obj.CARGA,
          rasgos,
          descripcion: obj.DESCRIPCIÓN || '',
          tipoDano: obj.TIPO_DAÑO || obj['TIPO DAÑO'] || 'físico',
        };
      });
      setArmas(datos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArmas();
  }, [fetchArmas]);

  // Carga ficha de jugador
  const loadPlayer = useCallback(async () => {
    if (!nameEntered) return;
    try {
      const ref = doc(db, 'players', playerName);
      const snap = await getDoc(ref);
      const base = atributos.reduce((acc, key) => { acc[key] = 'D4'; return acc; }, {});
      if (snap.exists()) {
        const data = snap.data();
        setPlayerData({
          weapons: data.weapons || [],
          atributos: { ...base, ...(data.atributos || {}) }
        });
      } else {
        setPlayerData({ weapons: [], atributos: base });
      }
    } catch (err) {
      console.error('Error cargando ficha:', err);
    }
  }, [nameEntered, playerName]);

  useEffect(() => {
    loadPlayer();
  }, [loadPlayer]);

  // Guarda ficha de jugador
  const savePlayer = async data => {
    setPlayerData(data);
    await setDoc(doc(db, 'players', playerName), { ...data, updatedAt: new Date() });
  };

  // Manejadores
  const handleAtributoChange = (key, value) => {
    const nuevos = { ...playerData.atributos, [key]: value };
    savePlayer({ ...playerData, atributos: nuevos });
  };

  const handleLogin = () => {
    if (passwordInput === MASTER_PASSWORD) {
      setAuthenticated(true);
      setShowLogin(false);
      setAuthError('');
    } else {
      setAuthError('Contraseña incorrecta');
    }
  };

  const enterPlayer = () => {
    if (playerName.trim()) setNameEntered(true);
  };

  const handlePlayerEquip = () => {
    if (loading) return;
    const found = armas.find(a => a.nombre.toLowerCase().includes(playerInputArma.trim().toLowerCase()));
    if (!found) return setPlayerError('Arma no encontrada');
    if (!playerData.weapons.includes(found.nombre)) {
      savePlayer({ ...playerData, weapons: [...playerData.weapons, found.nombre] });
      setPlayerInputArma('');
      setPlayerError('');
    }
  };

  const handlePlayerUnequip = name => {
    const nuevas = playerData.weapons.filter(w => w !== name);
    savePlayer({ ...playerData, weapons: nuevas });
  };

  // Iconos
  const dadoIcono = () => <BsDice6 className="inline" />;
  const iconoDano = tipo => {
    switch (tipo.toLowerCase()) {
      case 'físico': return <GiFist className="inline" />;
      case 'fuego': return <FaFire className="inline" />;
      case 'eléctrico': return <FaBolt className="inline" />;
      case 'hielo': return <FaSnowflake className="inline" />;
      case 'radiación': return <FaRadiationAlt className="inline" />;
      default: return null;
    }
  };

  // Renderizado
  if (!userType) {
    return (
      <div style={containerStyle} className="flex flex-col items-center justify-center">
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>¿Quién eres?</h1>
        <button style={buttonStyle} onClick={() => setUserType('player')}>Soy Jugador</button>
        <button style={buttonStyle} onClick={() => { setUserType('master'); setShowLogin(true); }}>Soy Máster</button>
      </div>
    );
  }

  if (userType === 'master' && showLogin && !authenticated) {
    return (
      <div style={containerStyle} className="flex flex-col items-center justify-center">
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Acceso Máster</h1>
        <input
          type="password"
          placeholder="Contraseña"
          value={passwordInput}
          onChange={e => setPasswordInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={inputStyle}
        />
        <button style={buttonStyle} onClick={handleLogin}>Entrar</button>
        {authError && <p style={{ color: '#f87171' }}>{authError}</p>}
      </div>
    );
  }

  if (userType === 'player' && !nameEntered) {
    return (
      <div style={containerStyle} className="flex flex-col items-center justify-center">
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Selecciona tu jugador</h1>
        {existingPlayers.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <p><strong>Jugadores existentes:</strong></p>
            {existingPlayers.map(name => (
              <button key={name} style={buttonStyle} onClick={() => { setPlayerName(name); setTimeout(() => setNameEntered(true), 0); }}>{name}</button>
            ))}
          </div>
        )}
        <div>
          <p><strong>O crea uno nuevo:</strong></p>
          <input
            placeholder="Tu nombre"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enterPlayer()}
            style={inputStyle}
          />
          <button style={buttonStyle} onClick={enterPlayer}>Crear / Entrar</button>
        </div>
        <button style={buttonStyle} onClick={volverAlMenu}>Volver al menú principal</button>
      </div>
    );
  }

  if (userType === 'player' && nameEntered) {
    return (
      <div style={containerStyle}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Ficha de {playerName}</h1>
        <button style={buttonStyle} onClick={volverAlMenu}>Volver al menú principal</button>
        <button style={{ ...buttonStyle, backgroundColor: '#dc2626', color: 'white' }} onClick={eliminarFichaJugador}>Eliminar ficha</button>

        <div style={{ marginBottom: '1rem' }}>
          <label>Modo Oscuro</label>
          <input type="checkbox" checked={modoOscuro} onChange={() => setModoOscuro(v => !v)} />
        </div>

        <h2 style={{ fontSize: '1.25rem' }}>Atributos</h2>
        {atributos.map(attr => {
          const dadoActual = playerData.atributos?.[attr] || 'D4';
          return (
            <div
              key={attr}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '1rem',
                backgroundColor: atributoColor[attr],
                padding: '0.5rem',
                borderRadius: '0.25rem'
              }}
            >
              <label style={{ fontWeight: 'bold', textTransform: 'capitalize', width: '100px' }}>{attr}</label>
              <select
                value={dadoActual}
                onChange={e => handleAtributoChange(attr, e.target.value)}
                style={{ ...inputStyle, width: '6rem', marginRight: '1rem' }}
              >
                {DADOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <img
                src={dadoImgUrl(dadoActual)}
                alt={dadoActual}
                style={{ height: '40px', width: '40px', objectFit: 'contain' }}
              />
            </div>
          );
        })}

        <div style={{ marginBottom: '1rem' }}>
          <label>Equipa un arma:</label>
          <input
            placeholder="Escribe nombre del arma y pulsa Enter"
            value={playerInputArma}
            onChange={e => setPlayerInputArma(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePlayerEquip()}
            style={inputStyle}
          />
          {playerError && <p style={{ color: '#f87171' }}>{playerError}</p>}
        </div>

        <h2 style={{ fontSize: '1.25rem' }}>Armas Equipadas</h2>
        {playerData.weapons.length === 0 ? (
          <p>No tienes armas equipadas.</p>
        ) : (
          playerData.weapons.map((name, i) => {
            const arma = armas.find(a => a.nombre === name);
            return arma && (
              <div key={i} style={cardStyle}>
                <p><strong>{arma.nombre}</strong></p>
                <p><strong>Daño:</strong> {dadoIcono()} {arma.dano} {iconoDano(arma.tipoDano)}</p>
                <p><strong>Alcance:</strong> {arma.alcance}</p>
                <p><strong>Consumo:</strong> {arma.consumo}</p>
                <p><strong>Carga:</strong> {arma.carga}</p>
                <p><strong>Rasgos:</strong> {arma.rasgos.join(', ')}</p>
                {arma.descripcion && <p><em>{arma.descripcion}</em></p>}
                <button style={{ ...buttonStyle, backgroundColor: '#ef4444', color: 'white' }} onClick={() => handlePlayerUnequip(arma.nombre)}>Desequipar</button>
              </div>
            );
          })
        )}
      </div>
    );
  }

  if (userType === 'master' && authenticated) {
    return (
      <div style={containerStyle}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Modo Máster</h1>
        <button style={buttonStyle} onClick={volverAlMenu}>Volver al menú principal</button>
        <div style={{ marginBottom: '1rem' }}>
          <label>Modo Oscuro</label>
          <input type="checkbox" checked={modoOscuro} onChange={() => setModoOscuro(v => !v)} />
        </div>
        <button style={buttonStyle} onClick={fetchArmas}>Refrescar catálogo</button>
        {loading ? (
          <p>Cargando armas…</p>
        ) : (
          armas.map((a, i) => (
            <div key={i} style={cardStyle}>
              <p><strong>{a.nombre}</strong></p>
              <p><strong>Daño:</strong> {dadoIcono()} {a.dano} {iconoDano(a.tipoDano)}</p>
              <p><strong>Alcance:</strong> {a.alcance}</p>
              <p><strong>Consumo:</strong> {a.consumo}</p>
              <p><strong>Carga:</strong> {a.carga}</p>
              <p><strong>Rasgos:</strong> {a.rasgos.join(', ')}</p>
              {a.descripcion && <p><em>{a.descripcion}</em></p>}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <p>Algo salió mal. Vuelve al menú.</p>
      <button style={buttonStyle} onClick={volverAlMenu}>Volver al menú</button>
    </div>
  );
}

export default App;
