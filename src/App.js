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

const defaultRecursos = ['postura', 'vida', 'ingenio', 'cordura', 'armadura'];

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
  const [armaduras, setArmaduras]             = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [playerName, setPlayerName]           = useState('');
  const [nameEntered, setNameEntered]         = useState(false);
  const [existingPlayers, setExistingPlayers] = useState([]);
  const [playerData, setPlayerData]           = useState({ weapons: [], armaduras: [], atributos: {}, stats: {} });
  const [playerError, setPlayerError]         = useState('');
  const [playerInputArma, setPlayerInputArma] = useState('');
  const [playerInputArmadura, setPlayerInputArmadura] = useState('');
  const [playerArmaduraError, setPlayerArmaduraError] = useState('');

  // Recursos dinámicos (añadir / eliminar)
  const [resourcesList, setResourcesList] = useState(
    defaultRecursos.map(name => ({
      id: name,
      name,
      color: recursoColor[name] || '#ffffff'
    }))
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
    setPlayerData({ weapons: [], armaduras: [], atributos: {}, stats: {} });
    setPlayerError('');
    setPlayerInputArma('');
    setPlayerInputArmadura('');
    setPlayerArmaduraError('');
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

  // FETCH ARMADURAS
  const fetchArmaduras = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(
        'https://docs.google.com/spreadsheets/d/1Fc46hHjCWRXCEnHl3ZehzMEcxewTYaZEhd-v-dnFUjs/gviz/tq?sheet=Lista_Armaduras&tqx=out:json'
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
          defensa: obj.ARMADURA,
          cuerpo:  obj.CUERPO,
          mente:   obj.MENTE,
          carga:   obj.CARGA,
          rasgos,
          tecnologia: obj.TECNOLOGÍA || '',
        };
      });
      setArmaduras(datos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchArmaduras() }, [fetchArmaduras]);

  // ──────────────────────────────────────────────────────────────────────────────
  // FUNCIONES PARA CARGAR Y GUARDAR
  // ──────────────────────────────────────────────────────────────────────────────

  // 1) CARGA DE PLAYER DATA
  const loadPlayer = useCallback(async () => {
    if (!nameEntered) return;
    const ref = doc(db, 'players', playerName);
    const snap = await getDoc(ref);

    // 1.a) Para los atributos por defecto
    const baseA = {};
    atributos.forEach(k => (baseA[k] = 'D4'));

    if (snap.exists()) {
      const d = snap.data();
      const statsFromDB = d.stats || {};
      const listFromDB = d.resourcesList || [];

      // 1.b) Reconstruir resourcesList: si Firestore devolvió una lista, úsala; si no, toma defaultRecursos
      const lista = listFromDB.length > 0
        ? listFromDB
        : defaultRecursos.map(id => ({
            id,
            name: id,
            color: recursoColor[id] || '#ffffff'
          }));

      // 1.c) A cada recurso en "lista" (cargado o por defecto) le aseguro un objeto stats[id]:
      const statsInit = {};
      lista.forEach(({ id }) => {
        const s = statsFromDB[id] || {};
        statsInit[id] = {
          base:   s.base   ?? 0,
          total:  s.total  ?? s.base ?? 0,
          actual: s.actual ?? 0,
          buff:   s.buff   ?? 0
        };
      });

      // 1.d) Guardar en el estado
      setResourcesList(lista);
      setPlayerData({
        weapons:  d.weapons    || [],
        armaduras: d.armaduras || [],
        atributos: { ...baseA, ...(d.atributos || {}) },
        stats:     statsInit
      });

    } else {
      // 1.e) Si no existe aún en Firestore, creo una ficha nueva con valores predeterminados
      const baseS = {};
      defaultRecursos.forEach(r => {
        baseS[r] = { base: 0, total: 0, actual: 0, buff: 0 };
      });

      const lista = defaultRecursos.map(id => ({
        id,
        name: id,
        color: recursoColor[id] || '#ffffff'
      }));

      setResourcesList(lista);
      setPlayerData({ weapons: [], armaduras: [], atributos: baseA, stats: baseS });
    }
  }, [nameEntered, playerName]);

  // 1.b) useEffect que llama a loadPlayer
  useEffect(() => {
    loadPlayer();
  }, [loadPlayer]);

  // 2) savePlayer: guarda todos los datos (weapons, atributos, stats y resourcesList) en Firestore
  //    Acepta un parámetro opcional `listaParaGuardar`.
  const savePlayer = async (data, listaParaGuardar = resourcesList) => {
    const fullData = {
      ...data,
      resourcesList: listaParaGuardar,
      updatedAt: new Date(),
    };
    setPlayerData(fullData);
    await setDoc(doc(db, 'players', playerName), fullData);
  };

  // 3) HANDLERS para atributos, stats, buff, nerf, eliminar y añadir recurso
  const handleAtributoChange = (k, v) => {
    const newAtributos = { ...playerData.atributos, [k]: v };
    savePlayer({ ...playerData, atributos: newAtributos });
  };

  const handleStatChange = (r, field, val) => {
    let v = parseInt(val) || 0;
    v = Math.max(0, Math.min(v, RESOURCE_MAX));
    const s = { ...playerData.stats[r] };

    if (field === 'base') {
      s.base = v;
      s.total = v;
      if (s.actual > v) s.actual = v;
    }
    if (field === 'actual') {
      s.actual = Math.min(v, s.total + s.buff, RESOURCE_MAX);
    }

    const newStats = { ...playerData.stats, [r]: s };
    savePlayer({ ...playerData, stats: newStats });
  };

  const handleAddBuff = (r) => {
    const s = { ...playerData.stats[r] };
    s.buff = (s.buff || 0) + 1;
    const newStats = { ...playerData.stats, [r]: s };
    savePlayer({ ...playerData, stats: newStats });
  };

  const handleNerf = (r) => {
    const s = { ...playerData.stats[r] };
    if (s.buff > 0) {
      s.buff--;
    } else {
      s.actual = Math.max(0, s.actual - 1);
    }
    const newStats = { ...playerData.stats, [r]: s };
    savePlayer({ ...playerData, stats: newStats });
  };

  const eliminarRecurso = (id) => {
    const newStats = { ...playerData.stats };
    delete newStats[id];
    const newList = resourcesList.filter((r) => r.id !== id);
    setResourcesList(newList);
    savePlayer({ ...playerData, stats: newStats }, newList);
  };

  const agregarRecurso = () => {
    // Si ya hay 6 o más recursos, no añadimos
    if (resourcesList.length >= 6) return;

    // Generar un ID único para el recurso nuevo
    const nuevoId = `recurso${Date.now()}`;

    // Armar la nueva lista de recursos
    const nuevaLista = [
      ...resourcesList,
      {
        id: nuevoId,
        name: newResName || nuevoId,
        color: newResColor
      }
    ];

    // Inicializar las stats de ese recurso en 0
    const nuevaStats = {
      ...playerData.stats,
      [nuevoId]: { base: 0, total: 0, actual: 0, buff: 0 }
    };

    // Actualizar el estado local de resourcesList
    setResourcesList(nuevaLista);

    // Guardar en Firestore pasando explícitamente la lista completa
    savePlayer(
      { ...playerData, stats: nuevaStats },
      nuevaLista
    );

    // Limpiar el formulario
    setNewResName('');
    setNewResColor('#ffffff');
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Terminan las funciones de carga/guardado y handlers
  // ──────────────────────────────────────────────────────────────────────────────

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

  const handlePlayerEquipArmadura = () => {
    if (loading) return;
    const f = armaduras.find(a => a.nombre.toLowerCase().includes(playerInputArmadura.trim().toLowerCase()));
    if (!f) return setPlayerArmaduraError('Armadura no encontrada');
    if (!playerData.armaduras.includes(f.nombre)) {
      savePlayer({ ...playerData, armaduras:[...playerData.armaduras, f.nombre] });
      setPlayerInputArmadura(''); setPlayerArmaduraError('');
    }
  };
  const handlePlayerUnequipArmadura = n => {
    savePlayer({ ...playerData, armaduras: playerData.armaduras.filter(x => x !== n) });
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
              const val = playerData.atributos[attr] || 'D4';
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
{/* ESTADÍSTICAS */}
<h2 className="text-xl font-semibold text-center mb-2">Estadísticas</h2>
<div className="flex flex-col gap-4 w-full mb-8">
  {resourcesList.map(({ id: r, name, color }, index) => {
    const s = playerData.stats[r] || { base: 0, total: 0, actual: 0, buff: 0 };
    const baseV = Math.min(s.base || 0, RESOURCE_MAX);
    const actualV = Math.min(s.actual || 0, RESOURCE_MAX);
    const buffV = s.buff || 0;
    const overflowBuf = Math.max(0, buffV - (RESOURCE_MAX - baseV));

    const cells = Array.from({ length: RESOURCE_MAX }).map((_, i) => {
      let bg;
      if (i < actualV) bg = color;
      else if (i < baseV) bg = color + "55";
      else if (i < baseV + buffV) bg = "#facc15";
      else bg = "#374151";

      return (
        <div
          key={i}
          className="rounded-lg"
          style={{
            width: "16px",
            height: "16px",
            background: bg,
            transition: "background 0.2s",
          }}
        />
      );
    });

    return (
      <div
        key={r}
        className="bg-gray-800 rounded-xl p-4 shadow w-full"
      >
        {/* Nombre centrado y X a la derecha, en la misma fila */}
        <div className="relative flex items-center w-full mb-4 h-8">
          {/* Nombre absoluto centrado con tamaño mayor */}
          <span className="absolute left-1/2 transform -translate-x-1/2 font-bold text-lg capitalize">
            {name}
          </span>
          {/* Botón eliminar recurso en la esquina derecha */}
          <button
            onClick={() => eliminarRecurso(r)}
            className="absolute right-0 text-red-400 hover:text-red-200 text-sm font-bold"
            title="Eliminar esta estadística"
          >
            ❌
          </button>
        </div>

        {/* Inputs y botones */}
        <div className="w-full flex justify-center mb-2">
          <div className="flex items-center gap-2 max-w-fit">
            <Input
              type="number"
              min={0}
              max={RESOURCE_MAX}
              value={baseV === 0 ? "" : baseV}
              placeholder="0"
              onChange={(e) => handleStatChange(r, "base", e.target.value)}
              className="w-14 text-center"
            />
            <span className="font-semibold">/</span>
            <Input
              type="number"
              min={0}
              max={RESOURCE_MAX}
              value={actualV === 0 ? "" : actualV}
              placeholder="0"
              onChange={(e) => handleStatChange(r, "actual", e.target.value)}
              className="w-14 text-center"
            />
            <Boton
              color="green"
              className="w-8 h-8 p-0 flex items-center justify-center font-extrabold rounded"
              onClick={() => handleAddBuff(r)}
            >
              +
            </Boton>
            <Boton
              color="gray"
              className="w-8 h-8 p-0 flex items-center justify-center font-extrabold rounded"
              onClick={() => handleNerf(r)}
            >
              –
            </Boton>
          </div>
        </div>

        {/* Barra (añadido mayor margen superior) */}
        <div className="relative w-full mt-4">
          {/* Móvil */}
          <div
            className="grid gap-[2px] sm:hidden w-full"
            style={{
              gridTemplateColumns: `repeat(${RESOURCE_MAX}, minmax(0, 1fr))`,
            }}
          >
            {cells}
          </div>
          {overflowBuf > 0 && (
            <div className="sm:hidden flex justify-center mt-1">
              <span className="px-1 py-0.5 text-xs font-bold bg-yellow-500 text-gray-900 rounded">
                +{overflowBuf}
              </span>
            </div>
          )}

          {/* PC */}
          <div className="hidden sm:flex flex-wrap gap-[2px] justify-center w-full mt-2">
            {cells.map((cell, idx) => (
              <div
                key={idx}
                className="w-4 h-4 rounded-lg"
                style={{ background: cell.props.style.background }}
              />
            ))}
            {overflowBuf > 0 && (
              <span className="ml-2 px-1 py-0.5 text-xs font-bold bg-yellow-500 text-gray-900 rounded">
                +{overflowBuf}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  })}
</div>



          {/* FORMULARIO “Añadir recurso” */}
          {resourcesList.length < 6 && (
            <div className="bg-gray-800 rounded-xl p-4 shadow flex flex-col gap-4 w-full max-w-md mx-auto mb-4">
              <h3 className="text-lg font-semibold text-center">Añadir recurso</h3>
              <Input
                type="text"
                placeholder="Nombre de la nueva estadística"
                value={newResName}
                onChange={e => setNewResName(e.target.value)}
                className="w-full text-center"
              />
              <div className="flex items-center justify-center gap-2">
                <label className="text-sm font-medium">Color:</label>
                <input
                  type="color"
                  value={newResColor}
                  onChange={e => setNewResColor(e.target.value)}
                  className="w-10 h-8 border-none p-0 rounded"
                />
              </div>
              <Boton
                color="green"
                className="mt-2 py-2 rounded-lg font-extrabold text-base shadow-sm"
                onClick={agregarRecurso}
              >
                Añadir recurso
              </Boton>
            </div>
          )}

          {/* EQUIPAR ARMA */}
          <div className="mt-4 mb-6 flex flex-col items-center w-full">
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

          {/* EQUIPAR ARMADURA */}
          <div className="mt-8 mb-6 flex flex-col items-center w-full">
            <label className="block font-semibold mb-1 text-center">Equipa una armadura:</label>
            <Input
              placeholder="Escribe nombre de la armadura y pulsa Enter"
              value={playerInputArmadura}
              onChange={e=>setPlayerInputArmadura(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handlePlayerEquipArmadura()}
              className="w-full max-w-md mb-1 rounded-lg bg-gray-700 border border-gray-600 text-white font-semibold text-base shadow px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-center"
            />
            {playerArmaduraError && <p className="text-red-400 mt-1 text-center">{playerArmaduraError}</p>}
          </div>

          {/* ARMADURAS EQUIPADAS */}
          <h2 className="text-xl font-semibold text-center mb-2">Armaduras Equipadas</h2>
          {playerData.armaduras.length===0 ? (
            <p className="text-gray-400 text-center">No tienes armaduras equipadas.</p>
          ) : (
            <div className="flex flex-col items-center space-y-4 w-full">
              {playerData.armaduras.map((n,i)=>{
                const a = armaduras.find(x=>x.nombre===n);
                return a && (
                  <div key={i} className="bg-gray-800 rounded-xl shadow-md p-4 w-full max-w-md flex flex-col items-center text-center">
                    <p className="font-bold text-lg">{a.nombre}</p>
                    <p><strong>Defensa:</strong> {a.defensa}</p>
                    <p><strong>Cuerpo:</strong> {a.cuerpo}</p>
                    <p><strong>Mente:</strong> {a.mente}</p>
                    <p><strong>Carga:</strong> {a.carga}</p>
                    <p><strong>Rasgos:</strong> {a.rasgos.join(', ')}</p>
                    <Boton
                      color="red"
                      className="py-3 px-4 rounded-lg font-extrabold text-base tracking-wide shadow-sm max-w-xs w-full mx-auto mt-4"
                      onClick={()=>handlePlayerUnequipArmadura(a.nombre)}
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
          <Boton onClick={fetchArmas}>Refrescar armas</Boton>
          <Boton onClick={fetchArmaduras}>Refrescar armaduras</Boton>
        </div>
        {loading
          ? <p>Cargando catálogo…</p>
          : (<>
            <h2 className="text-xl font-semibold mb-2">Armas</h2>
            {armas.map((a,i)=>(<Tarjeta key={i}>
              <p className="font-bold text-lg">{a.nombre}</p>
              <p><strong>Daño:</strong> {dadoIcono()} {a.dano} {iconoDano(a.tipoDano)}</p>
              <p><strong>Alcance:</strong> {a.alcance}</p>
              <p><strong>Consumo:</strong> {a.consumo}</p>
              <p><strong>Carga:</strong> {a.carga}</p>
              <p><strong>Rasgos:</strong> {a.rasgos.join(', ')}</p>
              {a.descripcion && <p className="italic">{a.descripcion}</p>}
            </Tarjeta>))}
            <h2 className="text-xl font-semibold mt-6 mb-2">Armaduras</h2>
            {armaduras.map((a,i)=>(<Tarjeta key={i}>
              <p className="font-bold text-lg">{a.nombre}</p>
              <p><strong>Defensa:</strong> {a.defensa}</p>
              <p><strong>Cuerpo:</strong> {a.cuerpo}</p>
              <p><strong>Mente:</strong> {a.mente}</p>
              <p><strong>Carga:</strong> {a.carga}</p>
              <p><strong>Rasgos:</strong> {a.rasgos.join(', ')}</p>
            </Tarjeta>))}
          </>)
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
