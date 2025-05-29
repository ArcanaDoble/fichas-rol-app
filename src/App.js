import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { BsDice6 } from 'react-icons/bs';
import { GiFist } from 'react-icons/gi';
import { FaFire, FaBolt, FaSnowflake, FaRadiationAlt } from 'react-icons/fa';
import Boton from './components/Boton';
import Input from './components/Input';
import Tarjeta from './components/Tarjeta';

const MASTER_PASSWORD = '0904';

const atributos = ['destreza', 'vigor', 'intelecto', 'voluntad'];
const atributoColor = {
  destreza: '#34d399',   // emerald-400, verde brillante pero agradable
  vigor:    '#f87171',   // rose-400, rojo bonito, no agresivo
  intelecto:'#60a5fa',   // blue-400, azul moderno
  voluntad: '#a78bfa',   // purple-400, morado claro pero vivo
};
const recursos = ['postura', 'vida', 'ingenio', 'cordura', 'armadura'];
const recursoColor = {
  postura: '#34d399',    // verde
  vida:    '#f87171',    // rojo
  ingenio: '#60a5fa',    // azul
  cordura: '#a78bfa',    // morado
  armadura:'#9ca3af',    // gray-400, metálico
};
const DADOS = ['D4', 'D6', 'D8', 'D10', 'D12'];
const dadoImgUrl = dado => `/dados/${dado}.png`;

function App() {
  const [userType, setUserType] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [armas, setArmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [nameEntered, setNameEntered] = useState(false);
  const [existingPlayers, setExistingPlayers] = useState([]);
  const [playerData, setPlayerData] = useState({ weapons: [], atributos: {}, stats: {} });
  const [playerError, setPlayerError] = useState('');
  const [playerInputArma, setPlayerInputArma] = useState('');

  const volverAlMenu = () => {
    setUserType(null);
    setAuthenticated(false);
    setShowLogin(false);
    setNameEntered(false);
    setPlayerName('');
    setPasswordInput('');
    setPlayerData({ weapons: [], atributos: {}, stats: {} });
    setPlayerError('');
    setPlayerInputArma('');
  };

  const eliminarFichaJugador = async () => {
    if (!window.confirm(`¿Eliminar ficha de ${playerName}?`)) return;
    await deleteDoc(doc(db, 'players', playerName));
    volverAlMenu();
  };

  useEffect(() => {
    if (userType === 'player') {
      getDocs(collection(db, 'players')).then(snap =>
        setExistingPlayers(snap.docs.map(d => d.id))
      );
    }
  }, [userType]);

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
        cols.forEach((l, i) => (obj[l] = r.c[i]?.v || ''));
        const rasgos = obj.RASGOS
          ? (obj.RASGOS.match(/\[([^\]]+)\]/g) || []).map(s =>
              s.replace(/[\[\]]/g, '').trim()
            )
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

  const loadPlayer = useCallback(async () => {
    if (!nameEntered) return;
    const ref = doc(db, 'players', playerName);
    const snap = await getDoc(ref);
    const baseA = {};
    atributos.forEach(k => (baseA[k] = 'D4'));
    const baseS = {};
    recursos.forEach(r => {
      baseS[r] = { base: 0, total: 0, actual: 0, buff: 0 };
    });
    if (snap.exists()) {
      const d = snap.data();
      setPlayerData({
        weapons: d.weapons || [],
        atributos: { ...baseA, ...(d.atributos || {}) },
        stats: { ...baseS, ...(d.stats || {}) },
      });
    } else {
      setPlayerData({ weapons: [], atributos: baseA, stats: baseS });
    }
  }, [nameEntered, playerName]);
  useEffect(() => {
    loadPlayer();
  }, [loadPlayer]);

  const savePlayer = async data => {
    setPlayerData(data);
    await setDoc(doc(db, 'players', playerName), { ...data, updatedAt: new Date() });
  };

  const handleAtributoChange = (k, v) => {
    savePlayer({
      ...playerData,
      atributos: { ...playerData.atributos, [k]: v },
    });
  };
  const handleStatChange = (r, field, val) => {
    let v = parseInt(val) || 0;
    if (v < 0) v = 0;
    if (v > 100) v = 100;
    const st = { ...playerData.stats[r] };
    if (field === 'base') {
      st.base = v;
      st.total = v;
      if (st.actual > v) st.actual = v;
    }
    if (field === 'actual') {
      st.actual = Math.min(v, st.total + st.buff);
    }
    savePlayer({
      ...playerData,
      stats: { ...playerData.stats, [r]: st },
    });
  };
  const handleAddBuff = (r, amount) => {
    const st = { ...playerData.stats[r] };
    st.buff = Math.min(100 - st.total, st.buff + amount);
    savePlayer({
      ...playerData,
      stats: { ...playerData.stats, [r]: st },
    });
  };
  const handleNerf = r => {
    const st = { ...playerData.stats[r] };
    if (st.buff > 0) {
      st.buff--;
    } else {
      st.actual = Math.max(0, st.actual - 1);
    }
    savePlayer({
      ...playerData,
      stats: { ...playerData.stats, [r]: st },
    });
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
    const f = armas.find(a =>
      a.nombre.toLowerCase().includes(playerInputArma.trim().toLowerCase())
    );
    if (!f) return setPlayerError('Arma no encontrada');
    if (!playerData.weapons.includes(f.nombre)) {
      savePlayer({
        ...playerData,
        weapons: [...playerData.weapons, f.nombre],
      });
      setPlayerInputArma('');
      setPlayerError('');
    }
  };
  const handlePlayerUnequip = n => {
    savePlayer({
      ...playerData,
      weapons: playerData.weapons.filter(x => x !== n),
    });
  };

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

// MENÚ PRINCIPAL
if (!userType) {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-xs rounded-xl shadow-xl bg-gray-800 p-8 flex flex-col gap-8">
        <h1 className="text-2xl font-bold text-center text-white mb-2">¿Quién eres?</h1>
        <div className="flex flex-col gap-4">
          <Boton
            color="green"
            className="py-3 rounded-lg font-extrabold text-base tracking-wide shadow hover:scale-105 active:scale-95 transition"
            onClick={() => setUserType('player')}
          >
            Soy Jugador
          </Boton>
          <Boton
            color="purple"
            className="py-3 rounded-lg font-extrabold text-base tracking-wide shadow hover:scale-105 active:scale-95 transition"
            onClick={() => {
              setUserType('master');
              setShowLogin(true);
            }}
          >
            Soy Máster
          </Boton>
        </div>
      </div>
    </div>
  );
}


  // LOGIN MÁSTER
if (userType === 'master' && showLogin && !authenticated) {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-xs rounded-xl shadow-xl bg-gray-800 p-8 flex flex-col gap-6">
        <h2 className="text-xl font-bold text-center text-white">Acceso Máster</h2>
        <Input
          type="password"
          placeholder="Contraseña"
          value={passwordInput}
          onChange={e => setPasswordInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          className="mb-2 w-full text-center"
        />
        <Boton
          color="green"
          className="py-3 rounded-lg font-extrabold text-base tracking-wide shadow w-full"
          onClick={handleLogin}
        >
          Entrar
        </Boton>
        {authError && <p className="text-red-400 text-center mt-2">{authError}</p>}
      </div>
    </div>
  );
}


  // SELECCIÓN JUGADOR
if (userType === 'player' && !nameEntered) {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-xs rounded-xl shadow-xl bg-gray-800 p-8 flex flex-col gap-6">
        <h2 className="text-xl font-bold text-center text-white">Selecciona tu jugador</h2>
        {existingPlayers.length > 0 && (
          <div>
            <p className="font-semibold text-white mb-2 text-center">Jugadores existentes:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {existingPlayers.map(n => (
                <Boton
                  key={n}
                  color="gray"
                  className="rounded-lg font-bold text-base px-3 py-2"
                  onClick={() => {
                    setPlayerName(n);
                    setTimeout(() => setNameEntered(true), 0);
                  }}
                >
                  {n}
                </Boton>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="font-semibold text-white mb-1 text-center">O crea uno nuevo:</p>
          <Input
            placeholder="Tu nombre"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enterPlayer()}
            className="mb-2 w-full text-center"
          />
          <Boton
            color="green"
            className="w-full py-3 rounded-lg font-extrabold text-base tracking-wide shadow"
            onClick={enterPlayer}
          >
            Crear / Entrar
          </Boton>
        </div>
        <Boton
          color="gray"
          className="w-full py-3 rounded-lg font-extrabold text-base tracking-wide shadow"
          onClick={volverAlMenu}
        >
          Volver al menú principal
        </Boton>
      </div>
    </div>
  );
}


  // FICHA JUGADOR
if (userType === 'player' && nameEntered) {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 px-2 py-4">
      <div className="max-w-2xl mx-auto flex flex-col items-center">
        <h1 className="text-2xl font-bold text-center mb-4">Ficha de {playerName}</h1>

        <div className="flex flex-col sm:flex-row gap-4 mb-6 w-full justify-center">
          <Boton
            color="gray"
            className="py-3 px-6 rounded-lg font-extrabold text-base tracking-wide shadow-sm w-full sm:w-auto"
            onClick={volverAlMenu}
          >
            Volver al menú
          </Boton>
          <Boton
            color="red"
            className="py-3 px-6 rounded-lg font-extrabold text-base tracking-wide shadow-sm w-full sm:w-auto"
            onClick={eliminarFichaJugador}
          >
            Eliminar ficha
          </Boton>
        </div>

        {/* ATRIBUTOS */}
        <h2 className="text-xl font-semibold text-center mb-4">Atributos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 w-full">
          {atributos.map(attr => {
            const val = playerData.atributos[attr];
            return (
              <div
                key={attr}
                className="flex items-center justify-center p-3 rounded-xl shadow w-full"
                style={{ backgroundColor: atributoColor[attr] }}
              >
                <label className="w-28 font-bold capitalize text-gray-800 text-center">{attr}</label>
                <select
                  value={val}
                  onChange={e => handleAtributoChange(attr, e.target.value)}
                  className="bg-gray-700 text-white border border-gray-500 rounded px-2 py-1 w-24 mr-4 text-center"
                >
                  {DADOS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <img src={dadoImgUrl(val)} alt={val} className="w-10 h-10 object-contain" />
              </div>
            );
          })}
        </div>

        {/* ESTADÍSTICAS */}
        <h2 className="text-xl font-semibold text-center mb-2">Estadísticas</h2>
        <div className="flex flex-col items-center overflow-x-auto mb-8 w-full">
          <table className="w-full max-w-2xl text-sm text-left border-collapse rounded-xl overflow-hidden shadow">
            <thead>
              <tr className="bg-gray-800 text-center">
                <th className="px-2 py-1 text-center">Recurso</th>
                <th className="text-center">Base</th>
                <th className="text-center">Total</th>
                <th className="text-center">Actual</th>
                <th className="text-center">Buff</th>
                <th className="text-center">Nerf</th>
                <th className="text-center">Barra</th>
              </tr>
            </thead>
            <tbody>
              {recursos.map(r => {
                const s = playerData.stats[r] || { base: 0, total: 0, actual: 0, buff: 0 };
                const { base: b, total: t, actual: a, buff: bf } = s;
                const totalEff = t + bf;
                const cols = Math.max(1, Math.ceil(totalEff / 3));
                return (
                  <tr key={r} style={{ background: recursoColor[r] + '33' }}>
                    <td className="px-2 py-1 font-semibold capitalize text-center">{r}</td>
                    <td className="text-center">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={b}
                        onChange={e => handleStatChange(r, 'base', e.target.value)}
                        className="w-16 text-center"
                      />
                    </td>
                    <td className="text-center font-bold">{t}</td>
                    <td className="text-center">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={a}
                        onChange={e => handleStatChange(r, 'actual', e.target.value)}
                        className="w-16 text-center"
                      />
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => {
                          const amt = parseInt(prompt('¿Cuánto buff? (1–50)'), 10);
                          if (amt > 0) handleAddBuff(r, amt);
                        }}
                        className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 rounded font-bold"
                      >+Buff</button>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleNerf(r)}
                        className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold"
                      >-Nerf</button>
                    </td>
                    <td>
                      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cols}, 16px)` }}>
                        {Array(totalEff).fill().map((_, i) => (
                          <div key={i} className="w-4 h-4 rounded" style={{
                            background: i < a
                              ? recursoColor[r]
                              : i < t
                                ? recursoColor[r] + '99'
                                : '#ff0'
                          }} />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* EQUIPAR ARMA */}
        <div className="mb-6 flex flex-col items-center w-full">
          <label className="block font-semibold mb-1 text-center">Equipa un arma:</label>
          <Input
            placeholder="Escribe nombre del arma y pulsa Enter"
            value={playerInputArma}
            onChange={e => setPlayerInputArma(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePlayerEquip()}
            className="w-full max-w-md mb-1 rounded-lg bg-gray-700 border border-gray-600 text-white font-semibold text-base shadow px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-center"
          />
          {playerError && <p className="text-red-400 mt-1 text-center">{playerError}</p>}
        </div>

        {/* ARMAS EQUIPADAS */}
        <h2 className="text-xl font-semibold text-center mb-2">Armas Equipadas</h2>
        {playerData.weapons.length === 0 ? (
          <p className="text-gray-400 text-center">No tienes armas equipadas.</p>
        ) : (
          <div className="flex flex-col items-center space-y-4 w-full">
            {playerData.weapons.map((n, i) => {
              const a = armas.find(x => x.nombre === n);
              return a && (
                <div
                  key={i}
                  className="bg-gray-800 rounded-xl shadow-md p-4 w-full max-w-md flex flex-col items-center text-center"
                >
                  <p className="font-bold text-lg">{a.nombre}</p>
                  <p><strong>Daño:</strong> {dadoIcono()} {a.dano} {iconoDano(a.tipoDano)}</p>
                  <p><strong>Alcance:</strong> {a.alcance}</p>
                  <p><strong>Consumo:</strong> {a.consumo}</p>
                  <p><strong>Carga:</strong> {a.carga}</p>
                  <p><strong>Rasgos:</strong> {a.rasgos.join(', ')}</p>
                  {a.descripcion && <p className="italic">{a.descripcion}</p>}
                  <Boton
                    color="red"
                    className="py-3 px-4 rounded-lg font-extrabold text-base tracking-wide shadow-sm max-w-xs w-full mx-auto mt-4"
                    onClick={() => handlePlayerUnequip(a.nombre)}
                  >
                    Desequipar
                  </Boton>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}



  // MODO MÁSTER
  if (userType === 'master' && authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
        <h1 className="text-2xl font-bold mb-4">Modo Máster</h1>
        <div className="flex gap-2 mb-4">
          <Boton onClick={volverAlMenu}>Volver al menú principal</Boton>
          <Boton onClick={fetchArmas}>Refrescar catálogo</Boton>
        </div>
        {loading ? (
          <p>Cargando armas…</p>
        ) : (
          armas.map((a, i) => (
            <Tarjeta key={i}>
              <p className="font-bold text-lg">{a.nombre}</p>
              <p><strong>Daño:</strong> {dadoIcono()} {a.dano} {iconoDano(a.tipoDano)}</p>
              <p><strong>Alcance:</strong> {a.alcance}</p>
              <p><strong>Consumo:</strong> {a.consumo}</p>
              <p><strong>Carga:</strong> {a.carga}</p>
              <p><strong>Rasgos:</strong> {a.rasgos.join(', ')}</p>
              {a.descripcion && <p className="italic">{a.descripcion}</p>}
            </Tarjeta>
          ))
        )}
      </div>
    );
  }

  // FALLBACK
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <p>Algo salió mal. Vuelve al menú.</p>
      <Boton onClick={volverAlMenu}>Volver al menú</Boton>
    </div>
  );
}

export default App;
