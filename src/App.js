// src/App.js
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
  destreza: '#34d399',
  vigor:    '#f87171',
  intelecto:'#60a5fa',
  voluntad: '#a78bfa',
};

const recursos = ['postura', 'vida', 'ingenio', 'cordura', 'armadura'];
const recursoColor = {
  postura: '#34d399',
  vida:    '#f87171',
  ingenio: '#60a5fa',
  cordura: '#a78bfa',
  armadura:'#9ca3af',
};

const DADOS = ['D4', 'D6', 'D8', 'D10', 'D12'];
const RESOURCE_MAX = 20;
const dadoImgUrl = dado => `/dados/${dado}.png`;

function App() {
  // STATES
  const [userType, setUserType]               = useState(null);
  const [showLogin, setShowLogin]             = useState(false);
  const [passwordInput, setPasswordInput]     = useState('');
  const [authenticated, setAuthenticated]     = useState(false);
  const [authError, setAuthError]             = useState('');
  const [armas, setArmas]                     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [playerName, setPlayerName]           = useState('');
  const [nameEntered, setNameEntered]         = useState(false);
  const [existingPlayers, setExistingPlayers] = useState([]);
  const [playerData, setPlayerData]           = useState({ weapons: [], atributos: {}, stats: {} });
  const [playerError, setPlayerError]         = useState('');
  const [playerInputArma, setPlayerInputArma] = useState('');

  // Recursos dinámicos (añadir / eliminar)
  const [resourcesList, setResourcesList] = useState(
    recursos.map(name => ({ id: name, name, color: recursoColor[name] }))
  );
  const [newResName, setNewResName]   = useState('');
  const [newResColor, setNewResColor] = useState('#ffffff');

  // NAVIGATION
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

  // FETCH EXISTING PLAYERS
  useEffect(() => {
    if (userType === 'player') {
      getDocs(collection(db, 'players')).then(snap =>
        setExistingPlayers(snap.docs.map(d => d.id))
      );
    }
  }, [userType]);

  // FETCH ARMAS
  const fetchArmas = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(
        'https://docs.google.com/spreadsheets/d/1Fc46hHjCWRXCEnHl3ZehzMEcxewTYaZEhd-v-dnFUjs/gviz/tq?sheet=Lista_Armas&tqx=out:json'
      );
      const txt  = await res.text();
      const json = JSON.parse(txt.slice(txt.indexOf('(')+1, txt.lastIndexOf(')')));
      const cols = json.table.cols.map(c => c.label || c.id);
      const datos = (json.table.rows || []).map(r => {
        const obj = {}; cols.forEach((l,i) => obj[l] = r.c[i]?.v || '');
        const rasgos = obj.RASGOS
          ? (obj.RASGOS.match(/\[([^\]]+)\]/g) || []).map(s => s.replace(/[\[\]]/g, '').trim())
          : [];
        return {
          nombre: obj.NOMBRE,
          dano:    obj.DAÑO,
          alcance: obj.ALCANCE,
          consumo: obj.CONSUMO,
          carga:   obj.CARGA,
          rasgos,
          descripcion: obj.DESCRIPCIÓN || '',
          tipoDano:    obj.TIPO_DAÑO || obj['TIPO DAÑO'] || 'físico'
        };
      });
      setArmas(datos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchArmas() }, [fetchArmas]);

  // LOAD PLAYER DATA
  const loadPlayer = useCallback(async () => {
    if (!nameEntered) return;
    const ref  = doc(db, 'players', playerName);
    const snap = await getDoc(ref);
    const baseA = {}; atributos.forEach(k => baseA[k] = 'D4');
    const baseS = {}; recursos.forEach(r => baseS[r] = { base:0, total:0, actual:0, buff:0 });
    if (snap.exists()) {
      const d = snap.data();
      setPlayerData({
        weapons:  d.weapons || [],
        atributos:{ ...baseA, ...(d.atributos || {}) },
        stats:    { ...baseS,   ...(d.stats || {}) }
      });
    } else {
      setPlayerData({ weapons: [], atributos: baseA, stats: baseS });
    }
  }, [nameEntered, playerName]);
  useEffect(() => { loadPlayer() }, [loadPlayer]);

  // SAVE PLAYER
  const savePlayer = async data => {
    setPlayerData(data);
    await setDoc(doc(db, 'players', playerName), { ...data, updatedAt: new Date() });
  };

  // HANDLERS
  const handleAtributoChange = (k, v) => {
    savePlayer({ ...playerData, atributos:{ ...playerData.atributos, [k]: v } });
  };
  const handleStatChange = (r, field, val) => {
    let v = parseInt(val) || 0;
    v = Math.max(0, Math.min(v, RESOURCE_MAX));
    const st = { ...playerData.stats[r] };
    if (field === 'base') {
      st.base = v; st.total = v;
      if (st.actual > v) st.actual = v;
    }
    if (field === 'actual') {
      st.actual = Math.min(v, st.total + st.buff, RESOURCE_MAX);
    }
    savePlayer({ ...playerData, stats:{ ...playerData.stats, [r]: st } });
  };
  const handleAddBuff = r => {
    const st = { ...playerData.stats[r] };
    st.buff = (st.buff || 0) + 1;
    savePlayer({ ...playerData, stats:{ ...playerData.stats, [r]: st } });
  };
const handleNerf = (r) => {
  const st = { ...playerData.stats[r] };
  if (st.buff > 0) {
    // Si hay buff, primero lo reduce
    st.buff--;
  } else {
    // Si no hay buff, resta 1 punto de vida actual (hasta 0)
    st.actual = Math.max(0, st.actual - 1);
  }
  savePlayer({
    ...playerData,
    stats: {
      ...playerData.stats,
      [r]: st
    }
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
  const enterPlayer = () => { if (playerName.trim()) setNameEntered(true); };
  const handlePlayerEquip = () => {
    if (loading) return;
    const f = armas.find(a => a.nombre.toLowerCase().includes(playerInputArma.trim().toLowerCase()));
    if (!f) return setPlayerError('Arma no encontrada');
    if (!playerData.weapons.includes(f.nombre)) {
      savePlayer({ ...playerData, weapons:[...playerData.weapons, f.nombre] });
      setPlayerInputArma(''); setPlayerError('');
    }
  };
  const handlePlayerUnequip = n => {
    savePlayer({ ...playerData, weapons: playerData.weapons.filter(x => x !== n) });
  };

  const dadoIcono = () => <BsDice6 className="inline" />;
  const iconoDano = tipo => {
    switch (tipo.toLowerCase()) {
      case 'físico':    return <GiFist className="inline" />;
      case 'fuego':     return <FaFire className="inline" />;
      case 'eléctrico': return <FaBolt className="inline" />;
      case 'hielo':     return <FaSnowflake className="inline" />;
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
              onClick={()=>setUserType('player')}
            >Soy Jugador</Boton>
            <Boton
              color="purple"
              className="py-3 rounded-lg font-extrabold text-base tracking-wide shadow hover:scale-105 active:scale-95 transition"
              onClick={()=>{
                setUserType('master');
                setShowLogin(true);
              }}
            >Soy Máster</Boton>
          </div>
        </div>
      </div>
    );
  }

  // LOGIN MÁSTER
  if (userType==='master' && showLogin && !authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center px-4">
        <div className="w-full max-w-xs rounded-xl shadow-xl bg-gray-800 p-8 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-center text-white">Acceso Máster</h2>
          <Input
            type="password"
            placeholder="Contraseña"
            value={passwordInput}
            onChange={e=>setPasswordInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handleLogin()}
            className="mb-2 w-full text-center"
          />
          <Boton
            color="green"
            className="py-3 rounded-lg font-extrabold text-base tracking-wide shadow w-full"
            onClick={handleLogin}
          >Entrar</Boton>
          {authError && <p className="text-red-400 text-center mt-2">{authError}</p>}
        </div>
      </div>
    );
  }

  // SELECCIÓN JUGADOR
  if (userType==='player' && !nameEntered) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center px-4">
        <div className="w-full max-w-xs rounded-xl shadow-xl bg-gray-800 p-8 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-center text-white">Selecciona tu jugador</h2>
          {existingPlayers.length>0 && (
            <div>
              <p className="font-semibold text-white mb-2 text-center">Jugadores existentes:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {existingPlayers.map(n=>(<Boton key={n} color="gray" className="rounded-lg font-bold text-base px-3 py-2" onClick={()=>{
                  setPlayerName(n); setTimeout(()=>setNameEntered(true),0);
                }}>{n}</Boton>))}
              </div>
            </div>
          )}
          <div>
            <p className="font-semibold text-white mb-1 text-center">O crea uno nuevo:</p>
            <Input
              placeholder="Tu nombre"
              value={playerName}
              onChange={e=>setPlayerName(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&enterPlayer()}
              className="mb-2 w-full text-center"
            />
            <Boton
              color="green"
              className="w-full py-3 rounded-lg font-extrabold text-base tracking-wide shadow"
              onClick={enterPlayer}
            >Crear / Entrar</Boton>
          </div>
          <Boton
            color="gray"
            className="w-full py-3 rounded-lg font-extrabold text-base tracking-wide shadow"
            onClick={volverAlMenu}
          >Volver al menú principal</Boton>
        </div>
      </div>
    );
  }

  // FICHA JUGADOR
  if (userType==='player' && nameEntered) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 px-2 py-4">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <h1 className="text-2xl font-bold text-center mb-4">Ficha de {playerName}</h1>

          {/* Botones Volver / Eliminar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 w-full justify-center">
            <Boton color="gray" className="py-3 px-6 rounded-lg font-extrabold text-base tracking-wide shadow-sm w-full sm:w-auto" onClick={volverAlMenu}>Volver al menú</Boton>
            <Boton color="red"  className="py-3 px-6 rounded-lg font-extrabold text-base tracking-wide shadow-sm w-full sm:w-auto" onClick={eliminarFichaJugador}>Eliminar ficha</Boton>
          </div>

          {/* ATRIBUTOS */}
          <h2 className="text-xl font-semibold text-center mb-4">Atributos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 w-full">
            {atributos.map(attr=>{
              const val = playerData.atributos[attr];
              return (
                <div key={attr} className="flex items-center justify-between p-3 rounded-xl shadow w-full" style={{ backgroundColor: atributoColor[attr] }}>
                  <span className="flex-1 text-lg sm:text-xl font-bold text-gray-800 text-center">{attr.charAt(0).toUpperCase()+attr.slice(1)}</span>
                  <select value={val} onChange={e=>handleAtributoChange(attr,e.target.value)} className="bg-gray-700 text-white border border-gray-500 rounded px-2 py-1 w-24 mr-2 text-center">
                    {DADOS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                  <img src={dadoImgUrl(val)} alt={val} className="w-10 h-10 object-contain"/>
                </div>
              );
            })}
          </div>

          {/* ESTADÍSTICAS */}
          <h2 className="text-xl font-semibold text-center mb-2">Estadísticas</h2>
          <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto mb-8">
            {recursos.map(r=>{
              const s       = playerData.stats[r] || { base:0,total:0,actual:0,buff:0 };
              const baseV   = Math.min(s.base||0, RESOURCE_MAX);
              const actualV = Math.min(s.actual||0, RESOURCE_MAX);
              const buffV   = s.buff||0;
              const color   = recursoColor[r];

              return (
                <div key={r} className="bg-gray-800 rounded-xl p-4 shadow flex flex-col gap-2 items-center w-full">
                  <div className="flex flex-col sm:flex-row w-full items-center justify-between gap-2">
                    <span className="font-bold capitalize text-center w-full sm:w-24">{r}</span>
                    <div className="flex gap-2 items-center">
                      <Input type="number" min={0} max={RESOURCE_MAX}
                             value={baseV===0?'':baseV}
                             placeholder="0"
                             onChange={e=>handleStatChange(r,'base',e.target.value)}
                             className="w-14 text-center"/>
                      <span className="font-semibold">/</span>
                      <Input type="number" min={0} max={RESOURCE_MAX}
                             value={actualV===0?'':actualV}
                             placeholder="0"
                             onChange={e=>handleStatChange(r,'actual',e.target.value)}
                             className="w-14 text-center"/>
                      <Boton color="green" className="px-3 py-1 text-xs rounded font-bold" onClick={()=>handleAddBuff(r)}>+Buff</Boton>
                      <Boton color="gray"  className="px-3 py-1 text-xs rounded font-bold" onClick={()=>handleNerf(r)}>-Nerf</Boton>
                    </div>
                  </div>

                  {/* Barra RPG + Badge overflow */}
                  <div className="flex items-center w-full justify-center mt-2">
                    <div className="flex gap-[2px]">
                      {Array.from({ length: RESOURCE_MAX }).map((_,i)=>{
                        let bg;
                        if      (i < actualV)           bg = color;              // vida actual
                        else if (i < baseV)             bg = color + '55';      // faltante hasta base
                        else if (i < baseV + buffV)     bg = '#facc15';         // buff
                        else                             bg = '#374151';         // vacío
                        return (
                          <div key={i}
                               className="rounded-lg"
                               style={{ width:'16px', height:'16px', background:bg, transition:'background 0.2s' }}/>
                        );
                      })}
                    </div>
                    {buffV > (RESOURCE_MAX - baseV) && (
                      <span className="ml-2 px-1 py-0.5 text-xs font-bold bg-yellow-500 text-gray-900 rounded">
                        +{buffV - (RESOURCE_MAX - baseV)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* EQUIPAR ARMA */}
          <div className="mb-6 flex flex-col items-center w-full">
            <label className="block font-semibold mb-1 text-center">Equipa un arma:</label>
            <Input
              placeholder="Escribe nombre del arma y pulsa Enter"
              value={playerInputArma}
              onChange={e=>setPlayerInputArma(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handlePlayerEquip()}
              className="w-full max-w-md mb-1 rounded-lg bg-gray-700 border border-gray-600 text-white font-semibold text-base shadow px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-center"
            />
            {playerError && <p className="text-red-400 mt-1 text-center">{playerError}</p>}
          </div>

          {/* ARMAS EQUIPADAS */}
          <h2 className="text-xl font-semibold text-center mb-2">Armas Equipadas</h2>
          {playerData.weapons.length===0 ? (
            <p className="text-gray-400 text-center">No tienes armas equipadas.</p>
          ) : (
            <div className="flex flex-col items-center space-y-4 w-full">
              {playerData.weapons.map((n,i)=>{
                const a = armas.find(x=>x.nombre===n);
                return a && (
                  <div key={i} className="bg-gray-800 rounded-xl shadow-md p-4 w-full max-w-md flex flex-col items-center text-center">
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
                      onClick={()=>handlePlayerUnequip(a.nombre)}
                    >Desequipar</Boton>
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
  if (userType==='master' && authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
        <h1 className="text-2xl font-bold mb-4">Modo Máster</h1>
        <div className="flex gap-2 mb-4">
          <Boton onClick={volverAlMenu}>Volver al menú principal</Boton>
          <Boton onClick={fetchArmas}>Refrescar catálogo</Boton>
        </div>
        {loading
          ? <p>Cargando armas…</p>
          : armas.map((a,i)=>(<Tarjeta key={i}>
              <p className="font-bold text-lg">{a.nombre}</p>
              <p><strong>Daño:</strong> {dadoIcono()} {a.dano} {iconoDano(a.tipoDano)}</p>
              <p><strong>Alcance:</strong> {a.alcance}</p>
              <p><strong>Consumo:</strong> {a.consumo}</p>
              <p><strong>Carga:</strong> {a.carga}</p>
              <p><strong>Rasgos:</strong> {a.rasgos.join(', ')}</p>
              {a.descripcion && <p className="italic">{a.descripcion}</p>}
            </Tarjeta>))
        }
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
