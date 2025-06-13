// src/App.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { BsDice6 } from 'react-icons/bs';
import { GiFist } from 'react-icons/gi';
import { FaFire, FaBolt, FaSnowflake, FaRadiationAlt } from 'react-icons/fa';
import Boton from './components/Boton';
import Input from './components/Input';
import Tarjeta from './components/Tarjeta';
import ResourceBar from './components/ResourceBar';
import AtributoCard from './components/AtributoCard';
import Collapsible from './components/Collapsible';
import EstadoSelector, { ESTADOS } from './components/EstadoSelector';
import Inventory from './components/inventory/Inventory';
import MasterMenu from './components/MasterMenu';
import InventoryRE4 from './components/re4/InventoryRE4';
import { ToastProvider, useToast } from './components/Toast';
import LoadingSpinner from './components/LoadingSpinner';
import Modal, { ConfirmModal, useModal } from './components/Modal';
import { Tooltip } from 'react-tooltip';
const isTouchDevice = typeof window !== 'undefined' &&
  (('ontouchstart' in window) || navigator.maxTouchPoints > 0);

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

const recursoInfo = {
  postura: 'Explicación de Postura',
  vida: 'Explicación de Vida',
  ingenio: 'Explicación de Ingenio',
  cordura: 'Explicación de Cordura',
  armadura: 'Explicación de Armadura',
};

const DADOS = ['D4', 'D6', 'D8', 'D10', 'D12'];
const RESOURCE_MAX = 20;
const CLAVE_MAX = 10;
const dadoImgUrl = dado => `/dados/${dado}.png`;

const parseCargaValue = (v) => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const match = v.match(/🔲/g);
    if (match) return match.length;
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

const cargaFisicaIcon = (v) => {
  const n = parseCargaValue(v);
  return n > 0 ? '🔲'.repeat(n) : '❌';
};

const cargaMentalIcon = (v) => {
  const n = parseCargaValue(v);
  return n > 0 ? '🧠'.repeat(n) : '❌';
};

const applyCargaPenalties = (data, armas, armaduras) => {
  let fisica = 0;
  let mental = 0;
  data.weapons?.forEach(n => {
    const w = armas.find(a => a.nombre === n);
    if (w) {
      fisica += parseCargaValue(w.cargaFisica || w.cuerpo || w.carga);
      mental += parseCargaValue(w.cargaMental || w.mente);
    }
  });
  data.armaduras?.forEach(n => {
    const a = armaduras.find(x => x.nombre === n);
    if (a) {
      fisica += parseCargaValue(a.cargaFisica || a.cuerpo || a.carga);
      mental += parseCargaValue(a.cargaMental || a.mente);
    }
  });

  const resistencia = data.stats?.vida?.total ?? 0;
  const newStats = { ...data.stats };

  if (newStats.postura) {
    const base = newStats.postura.base || 0;
    const buff = newStats.postura.buff || 0;
    const penal = Math.max(0, fisica - resistencia);
    const baseEfectiva = Math.max(0, base - penal);
    const total = Math.max(0, Math.min(baseEfectiva + buff, RESOURCE_MAX));
    newStats.postura.total = total;
    if (newStats.postura.actual > total) newStats.postura.actual = total;
  }

  if (newStats.cordura) {
    const base = newStats.cordura.base || 0;
    const buff = newStats.cordura.buff || 0;
    const penal = Math.max(0, mental - resistencia);
    const baseEfectiva = Math.max(0, base - penal);
    const total = Math.max(0, Math.min(baseEfectiva + buff, RESOURCE_MAX));
    newStats.cordura.total = total;
    if (newStats.cordura.actual > total) newStats.cordura.actual = total;
  }

  return {
    ...data,
    stats: newStats,
    cargaAcumulada: { fisica, mental }
  };
};

function App() {
  // ───────────────────────────────────────────────────────────
  // STATES
  // ───────────────────────────────────────────────────────────
  const [userType, setUserType]               = useState(null);
  const [showLogin, setShowLogin]             = useState(false);
  const [passwordInput, setPasswordInput]     = useState('');
  const [authenticated, setAuthenticated]     = useState(false);
  const [authError, setAuthError]             = useState('');
  const [armas, setArmas]                     = useState([]);
  const [armaduras, setArmaduras]             = useState([]);
  const [habilidades, setHabilidades]         = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [playerName, setPlayerName]           = useState('');
  const [nameEntered, setNameEntered]         = useState(false);
  const [existingPlayers, setExistingPlayers] = useState([]);
  const tooltipCounterRef = useRef(0);
  const [playerData, setPlayerData]           = useState({ weapons: [], armaduras: [], poderes: [], claves: [], estados: [], atributos: {}, stats: {}, cargaAcumulada: { fisica: 0, mental: 0 } });
  const [playerError, setPlayerError]         = useState('');
  const [playerInputArma, setPlayerInputArma] = useState('');
  const [playerInputArmadura, setPlayerInputArmadura] = useState('');
  const [playerArmaduraError, setPlayerArmaduraError] = useState('');
  const [playerInputPoder, setPlayerInputPoder] = useState('');
  const [playerPoderError, setPlayerPoderError] = useState('');

  // Recursos dinámicos (añadir / eliminar)
  const [resourcesList, setResourcesList] = useState(
    defaultRecursos.map(name => ({
      id: name,
      name,
      color: recursoColor[name] || '#ffffff',
      info: recursoInfo[name] || ''
    }))
  );
  const [newResName, setNewResName]   = useState('');
  const [newResColor, setNewResColor] = useState('#ffffff');
  const [newResError, setNewResError] = useState('');
  const [newAbility, setNewAbility] = useState({
    nombre: '',
    alcance: '',
    consumo: '',
    cuerpo: '',
    mente: '',
    poder: '',
    descripcion: ''
  });
  const [editingAbility, setEditingAbility] = useState(null);
  const [newAbilityError, setNewAbilityError] = useState('');
  const [showAddResForm, setShowAddResForm] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : false
  );
  const [searchTerm, setSearchTerm]   = useState('');
  const [editingInfoId, setEditingInfoId] = useState(null);
  const [editingInfoText, setEditingInfoText] = useState('');
  const [hoveredTipId, setHoveredTipId] = useState(null);
  const [pinnedTipId, setPinnedTipId] = useState(null);

  // Claves (acciones consumibles)
  const [claves, setClaves] = useState([]);
  const [showAddClaveForm, setShowAddClaveForm] = useState(false);
  const [newClaveName, setNewClaveName] = useState('');
  const [newClaveColor, setNewClaveColor] = useState('#ffffff');
  const [newClaveTotal, setNewClaveTotal] = useState(0);
  const [newClaveError, setNewClaveError] = useState('');

  // Estados del personaje
  const [estados, setEstados] = useState([]);

  // Vista elegida por el máster (inventario prototipo u opciones clásicas)
  const [chosenView, setChosenView] = useState(null);

  // Glosario de términos destacados
  const [glossary, setGlossary] = useState([]);
  const [newTerm, setNewTerm] = useState({ word: '', color: '#ffff00', info: '' });
  const [editingTerm, setEditingTerm] = useState(null);
  const [newTermError, setNewTermError] = useState('');

  // Sugerencias dinámicas para inputs de equipo
  const armaSugerencias = playerInputArma
    ? armas.filter(a =>
        a.nombre.toLowerCase().includes(playerInputArma.toLowerCase())
      ).slice(0, 5)
    : [];
  const armaduraSugerencias = playerInputArmadura
    ? armaduras.filter(a =>
        a.nombre.toLowerCase().includes(playerInputArmadura.toLowerCase())
      ).slice(0, 5)
    : [];
  const poderSugerencias = playerInputPoder
    ? habilidades.filter(h =>
        h.nombre.toLowerCase().includes(playerInputPoder.toLowerCase())
      ).slice(0, 5)
    : [];

  // ───────────────────────────────────────────────────────────
  // NAVIGATION
  // ───────────────────────────────────────────────────────────
  const volverAlMenu = () => {
    setUserType(null);
    setAuthenticated(false);
    setShowLogin(false);
    setChosenView(null);
    setNameEntered(false);
    setPlayerName('');
    setPasswordInput('');
    setPlayerData({ weapons: [], armaduras: [], poderes: [], claves: [], estados: [], atributos: {}, stats: {}, cargaAcumulada: { fisica: 0, mental: 0 } });
    setPlayerError('');
    setPlayerInputArma('');
    setPlayerInputArmadura('');
    setPlayerArmaduraError('');
    setPlayerInputPoder('');
    setPlayerPoderError('');
    setNewResError('');
    setNewResName('');
    setNewResColor('#ffffff');
    setSearchTerm('');
    setShowAddResForm(typeof window !== 'undefined' ? window.innerWidth >= 640 : false);
    setEditingInfoId(null);
    setEditingInfoText('');
    setClaves([]);
    setEstados([]);
    setShowAddClaveForm(false);
    setNewClaveName('');
    setNewClaveColor('#ffffff');
    setNewClaveTotal(0);
    setNewClaveError('');
  };
  const eliminarFichaJugador = async () => {
    if (!window.confirm(`¿Eliminar ficha de ${playerName}?`)) return;
    await deleteDoc(doc(db, 'players', playerName));
    volverAlMenu();
  };

  // ───────────────────────────────────────────────────────────
  // FETCH EXISTING PLAYERS
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (userType === 'player') {
      getDocs(collection(db, 'players')).then(snap =>
        setExistingPlayers(snap.docs.map(d => d.id))
      );
    }
  }, [userType]);

  // ───────────────────────────────────────────────────────────
  // FETCH ARMAS
  // ───────────────────────────────────────────────────────────
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
        const obj = {};
        cols.forEach((l,i) => obj[l] = r.c[i]?.v || '');
        const rasgos = obj.RASGOS
          ? (obj.RASGOS.match(/\[([^\]]+)\]/g) || []).map(s => s.replace(/[\[\]]/g, '').trim())
          : [];
        return {
          nombre: obj.NOMBRE,
          dano:    obj.DAÑO,
          alcance: obj.ALCANCE,
          consumo: obj.CONSUMO,
          carga:   obj.CARGA,
          cuerpo:  obj.CUERPO,
          mente:   obj.MENTE,
          cargaFisica:
            obj.CARGA_FISICA || obj['CARGA FISICA'] || obj.CUERPO || obj.CARGA || '',
          cargaMental:
            obj.CARGA_MENTAL || obj['CARGA MENTAL'] || obj.MENTE || '',
          rasgos,
          descripcion: obj.DESCRIPCIÓN || '',
          tipoDano:    obj.TIPO_DAÑO || obj['TIPO DAÑO'] || 'físico',
          valor:       obj.VALOR || '',
          tecnologia:  obj.TECNOLOGÍA || ''
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

  // ───────────────────────────────────────────────────────────
  // FETCH ARMADURAS
  // ───────────────────────────────────────────────────────────
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
        const obj = {};
        cols.forEach((l,i) => obj[l] = r.c[i]?.v || '');
        const rasgos = obj.RASGOS
          ? (obj.RASGOS.match(/\[([^\]]+)\]/g) || []).map(s => s.replace(/[\[\]]/g, '').trim())
          : [];
        return {
          nombre: obj.NOMBRE,
          defensa: obj.ARMADURA,
          cuerpo:  obj.CUERPO,
          mente:   obj.MENTE,
          carga:   obj.CARGA,
          cargaFisica:
            obj.CARGA_FISICA || obj['CARGA FISICA'] || obj.CUERPO || obj.CARGA || '',
          cargaMental:
            obj.CARGA_MENTAL || obj['CARGA MENTAL'] || obj.MENTE || '',
          rasgos,
          descripcion: obj.DESCRIPCIÓN || '',
          valor:       obj.VALOR || '',
          tecnologia:  obj.TECNOLOGÍA || ''
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

  // ───────────────────────────────────────────────────────────
  // FETCH HABILIDADES
  // ───────────────────────────────────────────────────────────
  const fetchHabilidades = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'abilities'));
      const datos = snap.docs.map(d => d.data());
      setHabilidades(datos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchHabilidades() }, [fetchHabilidades]);

  // ───────────────────────────────────────────────────────────
  // FETCH GLOSARIO
  // ───────────────────────────────────────────────────────────
  const fetchGlossary = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'glossary'));
      const datos = snap.docs.map(d => d.data());
      setGlossary(datos);
    } catch (e) {
      console.error(e);
    }
  }, []);
  useEffect(() => { fetchGlossary() }, [fetchGlossary]);

  const refreshCatalog = () => {
    fetchArmas();
    fetchArmaduras();
    fetchHabilidades();
    fetchGlossary();
  };

  // ───────────────────────────────────────────────────────────
  // FUNCIONES PARA CARGAR Y GUARDAR
  // ───────────────────────────────────────────────────────────

  // 1) CARGA DE PLAYER DATA
  const loadPlayer = useCallback(async () => {
    if (!nameEntered) return;
    const ref = doc(db, 'players', playerName);
    const snap = await getDoc(ref);

    // Atributos por defecto
    const baseA = {};
    atributos.forEach(k => (baseA[k] = 'D4'));

    if (snap.exists()) {
      const d = snap.data();
      const statsFromDB = d.stats || {};
      const listFromDB = d.resourcesList || [];

      // Reconstruir resourcesList: si Firestore devolvió una lista, úsala; si no, usa defaultRecursos
      const lista = listFromDB.length > 0
        ? listFromDB.map(item => ({
            ...item,
            info: item.info ?? (recursoInfo[item.id] || '')
          }))
        : defaultRecursos.map(id => ({
            id,
            name: id,
            color: recursoColor[id] || '#ffffff',
            info: recursoInfo[id] || ''
          }));

      // Para cada recurso en "lista", asegurar statsInit[id]
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

      // Guardar en estado
      setResourcesList(lista);
      setClaves(d.claves || []);
      setEstados(d.estados || []);
      const loaded = {
        weapons:   d.weapons    || [],
        armaduras: d.armaduras  || [],
        poderes:   d.poderes    || [],
        claves:    d.claves     || [],
        estados:   d.estados    || [],
        atributos: { ...baseA, ...(d.atributos || {}) },
        stats:     statsInit,
        cargaAcumulada: d.cargaAcumulada || { fisica: 0, mental: 0 }
      };
      setPlayerData(applyCargaPenalties(loaded, armas, armaduras));

    } else {
      // Si no existe en Firestore, crear con valores predeterminados
      const baseS = {};
      defaultRecursos.forEach(r => {
        baseS[r] = { base: 0, total: 0, actual: 0, buff: 0 };
      });
      const lista = defaultRecursos.map(id => ({
        id,
        name: id,
        color: recursoColor[id] || '#ffffff',
        info: recursoInfo[id] || ''
      }));
      setResourcesList(lista);
      setClaves([]);
      setEstados([]);
      const created = { weapons: [], armaduras: [], poderes: [], claves: [], estados: [], atributos: baseA, stats: baseS, cargaAcumulada: { fisica: 0, mental: 0 } };
      setPlayerData(applyCargaPenalties(created, armas, armaduras));
    }
  }, [nameEntered, playerName]);

  // useEffect que llama a loadPlayer
  useEffect(() => {
    loadPlayer();
  }, [loadPlayer]);

  // 2) savePlayer: guarda todos los datos en Firestore
  //    Acepta parámetros opcionales para recursos y claves.
  const savePlayer = async (
    data,
    listaParaGuardar = resourcesList,
    clavesParaGuardar = claves,
    estadosParaGuardar = estados
  ) => {
    const recalculated = applyCargaPenalties(data, armas, armaduras);
    const fullData = {
      ...recalculated,
      resourcesList: listaParaGuardar,
      claves: clavesParaGuardar,
      estados: estadosParaGuardar,
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
    if (id === 'postura') {
      const carga = playerData.cargaAcumulada?.fisica || 0;
      const icono = cargaFisicaIcon(carga);
      if (!window.confirm(
        `¿Estás seguro? Si eliminas Postura, tu carga física ${icono} (${carga}) quedará pendiente y ya no podrás ver penalización hasta que vuelvas a crear Postura.`
      )) return;
    }
    if (id === 'cordura') {
      const carga = playerData.cargaAcumulada?.mental || 0;
      const icono = cargaMentalIcon(carga);
      if (!window.confirm(
        `¿Estás seguro? Si eliminas Cordura, tu carga mental ${icono} (${carga}) quedará pendiente y ya no podrás ver penalización hasta que vuelvas a crear Cordura.`
      )) return;
    }
    const newStats = { ...playerData.stats };
    delete newStats[id];
    const newList = resourcesList.filter((r) => r.id !== id);
    setResourcesList(newList);
    savePlayer({ ...playerData, stats: newStats }, newList);
  };

  const agregarRecurso = () => {
    // No añadir si hay 6 o más recursos
    if (resourcesList.length >= 6) return;

    const nombre = newResName.trim();
    if (!nombre) {
      setNewResError('Nombre requerido');
      return;
    }
    if (resourcesList.some(r => r.name.toLowerCase() === nombre.toLowerCase())) {
      setNewResError('Ese nombre ya existe');
      return;
    }

    setNewResError('');

    const lower = nombre.toLowerCase();
    const nuevoId = (lower === 'postura' || lower === 'cordura') ? lower : `recurso${Date.now()}`;
    const color = lower === 'postura' ? '#34d399' : lower === 'cordura' ? '#a78bfa' : newResColor;

    // Nueva lista de recursos
    const nuevaLista = [
      ...resourcesList,
      {
        id: nuevoId,
        name: newResName || nuevoId,
        color,
        info: ''
      }
    ];

    // Inicializar stats del recurso nuevo en 0
    const nuevaStats = {
      ...playerData.stats,
      [nuevoId]: { base: 0, total: 0, actual: 0, buff: 0 }
    };

    // Actualizar estado local
    setResourcesList(nuevaLista);

    // Guardar en Firestore (se pasa la lista completa explícitamente)
    savePlayer(
      { ...playerData, stats: nuevaStats },
      nuevaLista
    );

    // Limpiar el formulario
    setNewResName('');
    setNewResColor('#ffffff');
  };

  const agregarHabilidad = async () => {
    const { nombre } = newAbility;
    if (!nombre.trim()) {
      setNewAbilityError('Nombre requerido');
      return;
    }
    try {
      if (editingAbility && editingAbility !== nombre) {
        await deleteDoc(doc(db, 'abilities', editingAbility));
      }
      await setDoc(doc(db, 'abilities', nombre), newAbility);
      setEditingAbility(null);
      setNewAbility({ nombre: '', alcance: '', consumo: '', cuerpo: '', mente: '', poder: '', descripcion: '' });
      setNewAbilityError('');
      fetchHabilidades();
    } catch (e) {
      console.error(e);
      setNewAbilityError('Error al guardar');
    }
  };

  const startEditAbility = (ability) => {
    setNewAbility(ability);
    setEditingAbility(ability.nombre);
  };

  const deleteAbility = async (name) => {
    try {
      await deleteDoc(doc(db, 'abilities', name));
      if (editingAbility === name) {
        setEditingAbility(null);
        setNewAbility({ nombre: '', alcance: '', consumo: '', cuerpo: '', mente: '', poder: '', descripcion: '' });
      }
      fetchHabilidades();
    } catch (e) {
      console.error(e);
    }
  };

  // ───────────────────────────────────────────────────────────
  // HANDLERS para Login y Equipo de objetos
  // ───────────────────────────────────────────────────────────
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
    const f = armas.find(a => a.nombre.toLowerCase().includes(playerInputArma.trim().toLowerCase()));
    if (!f) return setPlayerError('Arma no encontrada');
    if (!playerData.weapons.includes(f.nombre)) {
      savePlayer({ ...playerData, weapons: [...playerData.weapons, f.nombre] });
      setPlayerInputArma('');
      setPlayerError('');
    }
  };
  const handlePlayerUnequip = n => {
    savePlayer({ ...playerData, weapons: playerData.weapons.filter(x => x !== n) });
  };

  const handlePlayerEquipFromSuggestion = name => {
    const w = armas.find(a => a.nombre === name);
    if (!w) return setPlayerError('Arma no encontrada');
    if (!playerData.weapons.includes(w.nombre)) {
      savePlayer({ ...playerData, weapons: [...playerData.weapons, w.nombre] });
      setPlayerInputArma('');
      setPlayerError('');
    }
  };

  const handlePlayerEquipArmadura = () => {
    if (loading) return;
    const f = armaduras.find(a => a.nombre.toLowerCase().includes(playerInputArmadura.trim().toLowerCase()));
    if (!f) return setPlayerArmaduraError('Armadura no encontrada');
    if (!playerData.armaduras.includes(f.nombre)) {
      savePlayer({ ...playerData, armaduras: [...playerData.armaduras, f.nombre] });
      setPlayerInputArmadura('');
      setPlayerArmaduraError('');
    }
  };
  const handlePlayerUnequipArmadura = n => {
    savePlayer({ ...playerData, armaduras: playerData.armaduras.filter(x => x !== n) });
  };

  const handlePlayerEquipArmaduraFromSuggestion = name => {
    const a = armaduras.find(x => x.nombre === name);
    if (!a) return setPlayerArmaduraError('Armadura no encontrada');
    if (!playerData.armaduras.includes(a.nombre)) {
      savePlayer({ ...playerData, armaduras: [...playerData.armaduras, a.nombre] });
      setPlayerInputArmadura('');
      setPlayerArmaduraError('');
    }
  };

  const handlePlayerEquipPoder = () => {
    if (loading) return;
    const f = habilidades.find(h => h.nombre.toLowerCase().includes(playerInputPoder.trim().toLowerCase()));
    if (!f) return setPlayerPoderError('Poder no encontrado');
    if (!playerData.poderes.includes(f.nombre)) {
      savePlayer({ ...playerData, poderes: [...playerData.poderes, f.nombre] });
      setPlayerInputPoder('');
      setPlayerPoderError('');
    }
  };
  const handlePlayerUnequipPoder = n => {
    savePlayer({ ...playerData, poderes: playerData.poderes.filter(x => x !== n) });
  };
  const handlePlayerEquipPoderFromSuggestion = name => {
    const h = habilidades.find(x => x.nombre === name);
    if (!h) return setPlayerPoderError('Poder no encontrado');
    if (!playerData.poderes.includes(h.nombre)) {
      savePlayer({ ...playerData, poderes: [...playerData.poderes, h.nombre] });
      setPlayerInputPoder('');
      setPlayerPoderError('');
    }
  };

  // ────────────────────────────────
  // Claves handlers
  // ────────────────────────────────
  const handleClaveChange = (id, field, val) => {
    const v = parseInt(val) || 0;
    const list = claves.map(c =>
      c.id === id ? { ...c, [field]: Math.max(0, Math.min(v, CLAVE_MAX)) } : c
    );
    setClaves(list);
    savePlayer({ ...playerData, claves: list }, undefined, list);
  };

  const handleClaveIncrement = (id, delta) => {
    const list = claves.map(c => {
      if (c.id !== id) return c;
      const newActual = Math.max(
        0,
        Math.min((c.actual || 0) + delta, c.total || CLAVE_MAX)
      );
      return { ...c, actual: newActual };
    });
    setClaves(list);
    savePlayer({ ...playerData, claves: list }, undefined, list);
  };

  const handleClaveReset = id => {
    const list = claves.map(c =>
      c.id === id ? { ...c, actual: c.total } : c
    );
    setClaves(list);
    savePlayer({ ...playerData, claves: list }, undefined, list);
  };

  const handleAddClave = () => {
    const nombre = newClaveName.trim();
    if (!nombre) {
      setNewClaveError('Nombre requerido');
      return;
    }
    const nueva = {
      id: `clave${Date.now()}`,
      name: nombre,
      color: newClaveColor,
      total: Math.max(0, Math.min(parseInt(newClaveTotal) || 0, CLAVE_MAX)),
      actual: Math.max(0, Math.min(parseInt(newClaveTotal) || 0, CLAVE_MAX)),
    };
    const list = [...claves, nueva];
    setClaves(list);
    savePlayer({ ...playerData, claves: list }, undefined, list);
    setShowAddClaveForm(false);
    setNewClaveName('');
    setNewClaveColor('#ffffff');
    setNewClaveTotal(0);
    setNewClaveError('');
  };

  const handleRemoveClave = id => {
    const list = claves.filter(c => c.id !== id);
    setClaves(list);
    savePlayer({ ...playerData, claves: list }, undefined, list);
  };

  // ────────────────────────────────
  // Estados handlers
  // ────────────────────────────────
  const toggleEstado = id => {
    const list = estados.includes(id)
      ? estados.filter(e => e !== id)
      : [...estados, id];
    setEstados(list);
    savePlayer({ ...playerData, estados: list }, undefined, undefined, list);
  };

  const startEditInfo = (id, current) => {
    setPinnedTipId(null);
    setEditingInfoId(id);
    setEditingInfoText(current);
  };

  const finishEditInfo = () => {
    if (!editingInfoId) return;
    const newList = resourcesList.map(r =>
      r.id === editingInfoId ? { ...r, info: editingInfoText } : r
    );
    setResourcesList(newList);
    savePlayer(playerData, newList);
    setEditingInfoId(null);
    setEditingInfoText('');
  };

  const togglePinnedTip = id => {
    setPinnedTipId(prev => (prev === id ? null : id));
  };

  // ────────────────────────────────
  // Glosario handlers
  // ────────────────────────────────
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

  const highlightText = text => {
    if (!text) return text;
    let parts = [text];
    glossary.forEach(term => {
      const regex = new RegExp(`(${term.word})`, 'gi');
      parts = parts.flatMap(part => {
        if (typeof part !== 'string') return [part];
        return part.split(regex).map((p, i) => {
          if (p.toLowerCase() === term.word.toLowerCase()) {
            const id = `gloss-${term.word}-${tooltipCounterRef.current++}`;
            return (
              <React.Fragment key={id}>
                <span
                  style={{ color: term.color }}
                  className="font-bold cursor-help underline decoration-dotted"
                  data-tooltip-id={id}
                  data-tooltip-content={term.info}
                >
                  {p}
                </span>
                <Tooltip
                  id={id}
                  place="top"
                  className="max-w-[90vw] sm:max-w-xs whitespace-pre-line"
                  openOnClick={isTouchDevice}
                />
              </React.Fragment>
            );
          }
          return p;
        });
      });
    });
    return parts;
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

  // ───────────────────────────────────────────────────────────
  // RENDERIZADO CONDICIONAL
  // ───────────────────────────────────────────────────────────

  // MENÚ PRINCIPAL
  if (!userType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col justify-center items-center px-4 relative overflow-hidden">
        {/* Partículas de fondo animadas */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-500/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        {/* Círculos decorativos */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="w-full max-w-md rounded-2xl shadow-2xl bg-gray-800/90 backdrop-blur-sm border border-gray-700 p-8 flex flex-col gap-8 relative z-10 animate-in fade-in zoom-in-95 duration-700">
          {/* Header minimalista */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-center text-white">
              Fichas de Rol
            </h1>
            <p className="text-gray-400 text-base">
              Sistema de gestión de personajes
            </p>
            <div className="w-16 h-px bg-gray-600 mx-auto"></div>
          </div>

          {/* Pregunta principal */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-6">¿Quién eres?</h2>
          </div>

          {/* Opciones minimalistas */}
          <div className="flex flex-col gap-4">
            <Boton
              color="green"
              size="lg"
              className="py-4 rounded-lg font-semibold text-lg tracking-wide shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
              onClick={() => setUserType('player')}
            >
              <div className="flex flex-col items-center">
                <span>Soy Jugador</span>
                <span className="text-sm opacity-70 font-normal">Gestiona tu personaje</span>
              </div>
            </Boton>

            <Boton
              color="purple"
              size="lg"
              className="py-4 rounded-lg font-semibold text-lg tracking-wide shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
              onClick={() => {
                setUserType('master');
                setShowLogin(true);
              }}
            >
              <div className="flex flex-col items-center">
                <span>Soy Máster</span>
                <span className="text-sm opacity-70 font-normal">Herramientas avanzadas</span>
              </div>
            </Boton>
          </div>

          {/* Footer minimalista */}
          <div className="text-center space-y-2 border-t border-gray-700 pt-6">
            <p className="text-sm font-medium text-gray-400">Versión 2.1</p>
          </div>
        </div>
      </div>
    );
  }

  // LOGIN MÁSTER
  if (userType === 'master' && showLogin && !authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col justify-center items-center px-4 relative overflow-hidden">
        {/* Partículas de fondo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-500/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        {/* Efectos de fondo */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="w-full max-w-md rounded-2xl shadow-2xl bg-gray-800/90 backdrop-blur-sm border border-gray-700 p-8 flex flex-col gap-6 relative z-10 animate-in fade-in zoom-in-95 duration-700">
          {/* Header minimalista */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-center text-white">
              Acceso Máster
            </h2>
            <p className="text-gray-400 text-sm">
              Ingresa la contraseña para acceder a las herramientas avanzadas
            </p>
            <div className="w-16 h-px bg-gray-600 mx-auto"></div>
          </div>

          {/* Campo de contraseña */}
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Contraseña de máster"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full text-center"
              size="lg"
            />

            {authError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center animate-in fade-in duration-300">
                <p className="text-red-400 text-sm font-medium">{authError}</p>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="space-y-3">
            <Boton
              color="green"
              size="lg"
              className="w-full py-4 rounded-lg font-semibold text-lg tracking-wide shadow-lg hover:scale-105 transition-all duration-300"
              onClick={handleLogin}
            >
              Acceder al Sistema
            </Boton>

            <Boton
              color="gray"
              size="md"
              className="w-full py-3 rounded-lg font-semibold text-base tracking-wide shadow hover:scale-105 transition-all duration-300"
              onClick={volverAlMenu}
            >
              Volver al menú principal
            </Boton>
          </div>


        </div>
      </div>
    );
  }

  // SELECCIÓN JUGADOR
  if (userType === 'player' && !nameEntered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col justify-center items-center px-4 relative overflow-hidden">
        {/* Partículas de fondo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-green-500/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        {/* Efectos de fondo */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-green-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="w-full max-w-lg rounded-2xl shadow-2xl bg-gray-800/90 backdrop-blur-sm border border-gray-700 p-8 flex flex-col gap-6 relative z-10 animate-in fade-in zoom-in-95 duration-700">
          {/* Header minimalista */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-center text-white">
              Selecciona tu Personaje
            </h2>
            <p className="text-gray-400 text-sm">
              Elige un personaje existente o crea uno nuevo
            </p>
            <div className="w-16 h-px bg-gray-600 mx-auto"></div>
          </div>

          {/* Jugadores existentes */}
          {existingPlayers.length > 0 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-white mb-3">
                  Personajes Existentes
                </h3>
              </div>
              <div className="flex flex-col gap-3 max-h-48 overflow-y-auto">
                {existingPlayers.map((n, index) => (
                  <Boton
                    key={n}
                    color="blue"
                    size="md"
                    className="w-full rounded-lg font-semibold text-sm px-3 py-3 hover:scale-105 transition-all duration-300"
                    onClick={() => {
                      setPlayerName(n);
                      setTimeout(() => setNameEntered(true), 0);
                    }}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex justify-center items-center">
                      <span className="truncate">{n}</span>
                    </div>
                  </Boton>
                ))}
              </div>
            </div>
          )}

          {/* Crear nuevo personaje */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-white mb-3">
                Crear Nuevo Personaje
              </h3>
            </div>

            <Input
              placeholder="Nombre de tu personaje"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enterPlayer()}
              className="w-full text-center"
              size="lg"
              clearable
            />

            <Boton
              color="green"
              size="lg"
              className="w-full py-4 rounded-lg font-semibold text-lg tracking-wide shadow-lg hover:scale-105 transition-all duration-300"
              onClick={enterPlayer}
            >
              Crear / Entrar
            </Boton>
          </div>

          {/* Botón volver */}
          <div className="border-t border-gray-700 pt-4">
            <Boton
              color="gray"
              size="md"
              className="w-full py-3 rounded-lg font-semibold text-base tracking-wide shadow hover:scale-105 transition-all duration-300"
              onClick={volverAlMenu}
            >
              Volver al menú principal
            </Boton>
          </div>


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
          <div className="mb-4 text-center text-sm text-gray-300">
            Resistencia (Vida): {playerData.stats["vida"]?.total ?? 0}
            {'   |   '}
            Carga física total: {cargaFisicaIcon(playerData.cargaAcumulada?.fisica)} ({playerData.cargaAcumulada?.fisica || 0})
            {'   |   '}
            Carga mental total: {cargaMentalIcon(playerData.cargaAcumulada?.mental)} ({playerData.cargaAcumulada?.mental || 0})
          </div>

          {/* Botones Volver / Eliminar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 w-full justify-center">
            <Boton
              color="gray"
              className="py-3 px-6 rounded-lg font-extrabold text-base tracking-wide shadow-sm w-full sm:w-auto"
              onClick={volverAlMenu}
            >Volver al menú</Boton>
            <Boton
              color="red"
              className="py-3 px-6 rounded-lg font-extrabold text-base tracking-wide shadow-sm w-full sm:w-auto"
              onClick={eliminarFichaJugador}
            >Eliminar ficha</Boton>
          </div>

          {/* ATRIBUTOS */}
          <h2 className="text-xl font-semibold text-center mb-4">Atributos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 w-full">
            {atributos.map(attr => (
              <AtributoCard
                key={attr}
                name={attr}
                value={playerData.atributos[attr] || 'D4'}
                color={atributoColor[attr]}
                dadoImgUrl={dadoImgUrl}
                onChange={v => handleAtributoChange(attr, v)}
              />
            ))}
          </div>

          {/* ESTADÍSTICAS */}
          <h2 className="text-xl font-semibold text-center mb-2">Estadísticas</h2>
          <div className="flex flex-col gap-4 w-full mb-8">
            {resourcesList.map(({ id: r, name, color, info }) => {
              const s = playerData.stats[r] || { base: 0, total: 0, actual: 0, buff: 0 };
              const baseV = Math.min(s.base || 0, RESOURCE_MAX);
              const actualV = Math.min(s.actual || 0, RESOURCE_MAX);
              const buffV = s.buff || 0;

              const resistencia = playerData.stats["vida"]?.total ?? 0;
              const cargaFisicaTotal = playerData.cargaAcumulada?.fisica || 0;
              const cargaMentalTotal = playerData.cargaAcumulada?.mental || 0;

              let penalizacion = 0;
              let baseEfectiva = baseV;
              if (r === 'postura') {
                penalizacion = Math.max(0, cargaFisicaTotal - resistencia);
                baseEfectiva = Math.max(0, baseV - penalizacion);
              } else if (r === 'cordura') {
                penalizacion = Math.max(0, cargaMentalTotal - resistencia);
                baseEfectiva = Math.max(0, baseV - penalizacion);
              }

              const overflowBuf = Math.max(0, buffV - (RESOURCE_MAX - baseEfectiva));

              return (
                <div key={r} className="bg-gray-800 rounded-xl p-4 shadow w-full">
                  {/* Nombre centrado y X a la derecha, en la misma fila */}
                  <div className="relative flex items-center w-full mb-4 min-h-[2rem]">
                    {editingInfoId === r ? (
                      <textarea
                        value={editingInfoText}
                        onChange={e => setEditingInfoText(e.target.value)}
                        onBlur={finishEditInfo}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && finishEditInfo()}
                        className="absolute left-1/2 -translate-x-1/2 bg-gray-700 text-white p-2 rounded-lg text-sm focus:outline-none w-[90vw] sm:w-72 h-24 resize-none border border-blue-400 shadow-lg"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="absolute left-1/2 transform -translate-x-1/2 font-bold text-lg capitalize cursor-pointer"
                        data-tooltip-id={`tip-${r}`}
                        data-tooltip-content={info}
                        onClick={isTouchDevice ? undefined : () => togglePinnedTip(r)}
                        onDoubleClick={() => startEditInfo(r, info)}
                        onMouseEnter={() => setHoveredTipId(r)}
                        onMouseLeave={() => setHoveredTipId(null)}
                      >
                        {name}
                      </span>
                    )}
                    {info && editingInfoId !== r && (
                      <Tooltip
                        id={`tip-${r}`}
                        place="top"
                        openOnClick={isTouchDevice}
                        isOpen={!isTouchDevice && (hoveredTipId === r || pinnedTipId === r)}
                        className="max-w-[90vw] sm:max-w-xs whitespace-pre-line break-words"
                      />
                    )}
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
                        onChange={e => handleStatChange(r, "base", e.target.value)}
                        className="w-14 text-center"
                      />
                      <span className="font-semibold">/</span>
                      <Input
                        type="number"
                        min={0}
                        max={RESOURCE_MAX}
                        value={actualV === 0 ? "" : actualV}
                        placeholder="0"
                        onChange={e => handleStatChange(r, "actual", e.target.value)}
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

                  {/* Barra (con margen superior aumentado) */}
                  <div className="relative w-full mt-4">
                    <ResourceBar
                      color={color}
                      penalizacion={penalizacion}
                      actual={actualV}
                      base={baseV}
                      buff={buffV}
                    />
                    <div className="flex justify-center mt-1 text-xs font-semibold text-gray-300">
                      {actualV}/{baseEfectiva}
                      {buffV > 0 && (
                        <span className="ml-1 text-yellow-400">(+{buffV})</span>
                      )}
                    </div>
                    {overflowBuf > 0 && (
                      <div className="flex justify-center mt-1">
                        <span className="px-1 py-0.5 text-xs font-bold bg-yellow-500 text-gray-900 rounded">
                          +{overflowBuf}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!playerData.stats["postura"] && (
            <div className="text-center text-sm text-gray-400 mb-2">
              No tienes Postura; tu carga física {cargaFisicaIcon(playerData.cargaAcumulada?.fisica)} ({playerData.cargaAcumulada?.fisica || 0}) está pendiente sin penalizar.
            </div>
          )}
          {!playerData.stats["cordura"] && (
            <div className="text-center text-sm text-gray-400 mb-2">
              No tienes Cordura; tu carga mental {cargaMentalIcon(playerData.cargaAcumulada?.mental)} ({playerData.cargaAcumulada?.mental || 0}) está pendiente sin penalizar.
            </div>
          )}

          {/* FORMULARIO “Añadir recurso” */}
          {resourcesList.length < 6 && (
            <div className="w-full max-w-md mx-auto mb-4">
              {!showAddResForm ? (
                <Boton
                  color="green"
                  className="py-2 rounded-lg font-extrabold text-base shadow-sm w-full flex items-center justify-center gap-2"
                  onClick={() => setShowAddResForm(true)}
                >
                  + Añadir recurso
                </Boton>
              ) : (
                <div className="bg-gray-800 rounded-xl p-4 shadow flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Añadir recurso</h3>
                    <button
                      onClick={() => {
                        setShowAddResForm(false);
                        setNewResError('');
                        setNewResName('');
                        setNewResColor('#ffffff');
                      }}
                      className="text-white text-lg font-bold"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <Input
                      type="text"
                      placeholder="Nombre de la nueva estadística"
                      value={newResName}
                      onChange={e => setNewResName(e.target.value)}
                      className="w-full text-center sm:flex-1"
                    />
                    <div className="flex items-center justify-center gap-2 mt-2 sm:mt-0">
                      <label className="text-sm font-medium">Color:</label>
                      <input
                        type="color"
                        value={newResColor}
                        onChange={e => setNewResColor(e.target.value)}
                        className="w-10 h-8 border-none p-0 rounded"
                      />
                    </div>
                  </div>
                  <Boton
                    color="green"
                    className="py-2 rounded-lg font-extrabold text-base shadow-sm"
                    onClick={agregarRecurso}
                  >
                    Añadir recurso
                  </Boton>
                  {newResError && (
                    <p className="text-red-400 mt-1 text-center">{newResError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CLAVES */}
          <h2 className="text-xl font-semibold text-center mb-2">Claves</h2>
          {claves.length === 0 ? (
            <p className="text-gray-400 text-center mb-4">No tienes claves.</p>
          ) : (
            <div className="flex flex-col gap-4 w-full mb-4">
              {claves.map(c => (
                <div key={c.id} className="bg-gray-800 rounded-xl p-4 shadow w-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full inline-block"
                        style={{ background: c.color }}
                      />
                      {c.name}
                    </span>
                    <button
                      onClick={() => handleRemoveClave(c.id)}
                      className="text-red-400 hover:text-red-200 text-sm font-bold"
                      title="Eliminar clave"
                    >
                      ❌
                    </button>
                  </div>
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Boton
                      color="green"
                      className="w-8 h-8 p-0 flex items-center justify-center font-extrabold rounded"
                      onClick={() => handleClaveIncrement(c.id, 1)}
                    >
                      +
                    </Boton>
                    <Input
                      type="number"
                      min={0}
                      max={CLAVE_MAX}
                      value={c.actual}
                      onChange={e => handleClaveChange(c.id, 'actual', e.target.value)}
                      className="w-14 text-center"
                    />
                    <span className="font-semibold">/</span>
                    <Input
                      type="number"
                      min={0}
                      max={CLAVE_MAX}
                      value={c.total}
                      onChange={e => handleClaveChange(c.id, 'total', e.target.value)}
                      className="w-14 text-center"
                    />
                    <Boton
                      color="gray"
                      className="w-8 h-8 p-0 flex items-center justify-center font-extrabold rounded"
                      onClick={() => handleClaveIncrement(c.id, -1)}
                    >
                      –
                    </Boton>
                    <Boton
                      color="blue"
                      className="w-8 h-8 p-0 flex items-center justify-center font-extrabold rounded"
                      onClick={() => handleClaveReset(c.id)}
                    >
                      ↺
                    </Boton>
                  </div>
                  <ResourceBar
                    color={c.color}
                    actual={c.actual}
                    base={c.total}
                    buff={0}
                    penalizacion={0}
                    max={CLAVE_MAX}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="w-full max-w-md mx-auto mb-4">
            {!showAddClaveForm ? (
              <Boton
                color="green"
                className="py-2 rounded-lg font-extrabold text-base shadow-sm w-full flex items-center justify-center gap-2"
                onClick={() => setShowAddClaveForm(true)}
              >
                + Añadir clave
              </Boton>
            ) : (
              <div className="bg-gray-800 rounded-xl p-4 shadow flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Añadir clave</h3>
                  <button
                    onClick={() => {
                      setShowAddClaveForm(false);
                      setNewClaveError('');
                      setNewClaveName('');
                      setNewClaveColor('#ffffff');
                      setNewClaveTotal(0);
                    }}
                    className="text-white text-lg font-bold"
                  >
                    ×
                  </button>
                </div>
                <Input
                  type="text"
                  placeholder="Nombre de la clave"
                  value={newClaveName}
                  onChange={e => setNewClaveName(e.target.value)}
                  className="w-full text-center"
                />
                <div className="flex items-center justify-center gap-2">
                  <label className="text-sm font-medium">Color:</label>
                  <input
                    type="color"
                    value={newClaveColor}
                    onChange={e => setNewClaveColor(e.target.value)}
                    className="w-10 h-8 border-none p-0 rounded"
                  />
                </div>
                <Input
                  type="number"
                  min={0}
                  max={CLAVE_MAX}
                  placeholder="Total"
                  value={newClaveTotal}
                  onChange={e => setNewClaveTotal(e.target.value)}
                  className="w-full text-center"
                />
                <Boton
                  color="green"
                  className="py-2 rounded-lg font-extrabold text-base shadow-sm"
                  onClick={handleAddClave}
                >
                  Añadir clave
                </Boton>
                {newClaveError && (
                  <p className="text-red-400 mt-1 text-center">{newClaveError}</p>
                )}
              </div>
            )}
          </div>

          {/* ESTADOS */}
          <h2 className="text-xl font-semibold text-center mb-2">Estados</h2>
          <div className="mb-6 w-full">
            <EstadoSelector selected={estados} onToggle={toggleEstado} />
          </div>

          {/* INVENTARIO */}
          <h2 className="text-xl font-semibold text-center mb-2">Inventario</h2>
          <div className="mb-6 w-full">
            <Inventory playerName={playerName} />
          </div>

          {/* EQUIPAR ARMA */}
          <div className="mt-4 mb-6 flex flex-col items-center w-full relative">
            <label className="block font-semibold mb-1 text-center">Equipa un arma:</label>
            <Input
              placeholder="Busca un arma"
              value={playerInputArma}
              onChange={e => setPlayerInputArma(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePlayerEquip()}
              className="w-full max-w-md mb-1 rounded-lg bg-gray-700 border border-gray-600 text-white font-semibold text-base shadow px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-center"
            />
            {armaSugerencias.length > 0 && (
              <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full max-w-md text-left z-10">
                {armaSugerencias.map(a => (
                  <li
                    key={a.nombre}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                    onClick={() => handlePlayerEquipFromSuggestion(a.nombre)}
                  >
                    {a.nombre}
                  </li>
                ))}
              </ul>
            )}
            {playerError && <p className="text-red-400 mt-1 text-center">{playerError}</p>}
          </div>

          {/* ARMAS EQUIPADAS */}
          <h2 className="text-xl font-semibold text-center mb-2">Armas Equipadas</h2>
          {playerData.weapons.length === 0 ? (
            <p className="text-gray-400 text-center">No tienes armas equipadas.</p>
          ) : (
            <div
              className={`${
                playerData.weapons.length === 1
                  ? 'grid grid-cols-1 place-items-center'
                  : 'grid grid-cols-1 sm:grid-cols-2'
              } gap-4 w-full`}
            >
              {playerData.weapons.map((n, i) => {
                const a = armas.find(x => x.nombre === n);
                return a && (
                  <Tarjeta key={i} variant="weapon" className="w-full flex flex-col items-center text-center">
                    <p className="font-bold text-lg">{a.nombre}</p>
                    <p><strong>Daño:</strong> {dadoIcono()} {a.dano} {iconoDano(a.tipoDano)}</p>
                    <p><strong>Alcance:</strong> {a.alcance}</p>
                    <p><strong>Consumo:</strong> {a.consumo}</p>
                    <p><strong>Carga física:</strong> {parseCargaValue(a.cargaFisica ?? a.carga) > 0 ? '🔲'.repeat(parseCargaValue(a.cargaFisica ?? a.carga)) : '❌'}</p>
                    <p><strong>Carga mental:</strong> {cargaMentalIcon(a.cargaMental)}</p>
                    <p><strong>Rasgos:</strong> {a.rasgos.map((r,ri) => (
                      <React.Fragment key={ri}>
                        {highlightText(r)}{ri < a.rasgos.length-1 ? ', ' : ''}
                      </React.Fragment>
                    ))}</p>
                    {a.descripcion && <p className="italic">{highlightText(a.descripcion)}</p>}
                    <Boton
                      color="red"
                      className="py-3 px-4 rounded-lg font-extrabold text-base tracking-wide shadow-sm max-w-xs w-full mx-auto mt-4"
                      onClick={() => handlePlayerUnequip(a.nombre)}
                    >Desequipar</Boton>
                  </Tarjeta>
                );
              })}
            </div>
          )}

          {/* EQUIPAR ARMADURA */}
          <div className="mt-8 mb-6 flex flex-col items-center w-full relative">
            <label className="block font-semibold mb-1 text-center">Equipa una armadura:</label>
            <Input
              placeholder="Busca una armadura"
              value={playerInputArmadura}
              onChange={e => setPlayerInputArmadura(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePlayerEquipArmadura()}
              className="w-full max-w-md mb-1 rounded-lg bg-gray-700 border border-gray-600 text-white font-semibold text-base shadow px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-center"
            />
            {armaduraSugerencias.length > 0 && (
              <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full max-w-md text-left z-10">
                {armaduraSugerencias.map(a => (
                  <li
                    key={a.nombre}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                    onClick={() => handlePlayerEquipArmaduraFromSuggestion(a.nombre)}
                  >
                    {a.nombre}
                  </li>
                ))}
              </ul>
            )}
            {playerArmaduraError && <p className="text-red-400 mt-1 text-center">{playerArmaduraError}</p>}
          </div>

          {/* ARMADURAS EQUIPADAS */}
          <h2 className="text-xl font-semibold text-center mb-2">Armaduras Equipadas</h2>
          {playerData.armaduras.length === 0 ? (
            <p className="text-gray-400 text-center">No tienes armaduras equipadas.</p>
          ) : (
            <div
              className={`${
                playerData.armaduras.length === 1
                  ? 'grid grid-cols-1 place-items-center'
                  : 'grid grid-cols-1 sm:grid-cols-2'
              } gap-4 w-full`}
            >
              {playerData.armaduras.map((n, i) => {
                const a = armaduras.find(x => x.nombre === n);
                return a && (
                  <Tarjeta key={i} variant="armor" className="w-full flex flex-col items-center text-center">
                    <p className="font-bold text-lg">{a.nombre}</p>
                    <p><strong>Defensa:</strong> {a.defensa}</p>
                    <p><strong>Carga física:</strong> {parseCargaValue(a.cargaFisica ?? a.carga) > 0 ? '🔲'.repeat(parseCargaValue(a.cargaFisica ?? a.carga)) : '❌'}</p>
                    <p><strong>Carga mental:</strong> {cargaMentalIcon(a.cargaMental)}</p>
                    <p><strong>Rasgos:</strong> {a.rasgos.length ? a.rasgos.map((r,ri)=>(
                      <React.Fragment key={ri}>
                        {highlightText(r)}{ri < a.rasgos.length-1 ? ', ' : ''}
                      </React.Fragment>
                    )) : '❌'}</p>
                    {a.descripcion && <p className="italic">{highlightText(a.descripcion)}</p>}
                    <Boton
                      color="red"
                      className="py-3 px-4 rounded-lg font-extrabold text-base tracking-wide shadow-sm max-w-xs w-full mx-auto mt-4"
                      onClick={() => handlePlayerUnequipArmadura(a.nombre)}
                    >Desequipar</Boton>
                  </Tarjeta>
                );
              })}
            </div>
          )}

          {/* EQUIPAR PODER */}
          <div className="mt-8 mb-6 flex flex-col items-center w-full relative">
            <label className="block font-semibold mb-1 text-center">Equipa un poder:</label>
            <Input
              placeholder="Busca un poder"
              value={playerInputPoder}
              onChange={e => setPlayerInputPoder(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePlayerEquipPoder()}
              className="w-full max-w-md mb-1 rounded-lg bg-gray-700 border border-gray-600 text-white font-semibold text-base shadow px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-center"
            />
            {poderSugerencias.length > 0 && (
              <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full max-w-md text-left z-10">
                {poderSugerencias.map(a => (
                  <li
                    key={a.nombre}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                    onClick={() => handlePlayerEquipPoderFromSuggestion(a.nombre)}
                  >
                    {a.nombre}
                  </li>
                ))}
              </ul>
            )}
            {playerPoderError && <p className="text-red-400 mt-1 text-center">{playerPoderError}</p>}
          </div>

          {/* PODERES EQUIPADOS */}
          <h2 className="text-xl font-semibold text-center mb-2">Poderes Equipados</h2>
          {playerData.poderes.length === 0 ? (
            <p className="text-gray-400 text-center">No tienes poderes equipados.</p>
          ) : (
            <div
              className={`${
                playerData.poderes.length === 1
                  ? 'grid grid-cols-1 place-items-center'
                  : 'grid grid-cols-1 sm:grid-cols-2'
              } gap-4 w-full`}
            >
              {playerData.poderes.map((n, i) => {
                const p = habilidades.find(x => x.nombre === n);
                return p && (
                  <Tarjeta key={i} variant="power" className="w-full flex flex-col items-center text-center">
                    <p className="font-bold text-lg">{p.nombre}</p>
                    <p><strong>Alcance:</strong> {p.alcance}</p>
                    <p><strong>Consumo:</strong> {p.consumo}</p>
                    <p><strong>Cuerpo:</strong> {p.cuerpo}</p>
                    <p><strong>Mente:</strong> {p.mente}</p>
                    <p><strong>Poder:</strong> {p.poder}</p>
                    {p.descripcion && <p className="italic">{highlightText(p.descripcion)}</p>}
                    <Boton
                      color="red"
                      className="py-3 px-4 rounded-lg font-extrabold text-base tracking-wide shadow-sm max-w-xs w-full mx-auto mt-4"
                      onClick={() => handlePlayerUnequipPoder(p.nombre)}
                    >Desequipar</Boton>
                  </Tarjeta>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // MODO MÁSTER
  if (userType === 'master' && authenticated && !chosenView) {
    return <MasterMenu onSelect={setChosenView} />;
  }

  if (userType === 'master' && authenticated && chosenView === 're4') {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-700 z-50">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">🎒 Inventario RE4 - Modo Máster</h1>
            <Boton onClick={() => setChosenView(null)} className="bg-gray-700 hover:bg-gray-600">
              ← Volver al Menú
            </Boton>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Sistema de inventario estilo Resident Evil 4 con grid 10×8, drag & drop y rotación
          </p>
        </div>
        <InventoryRE4 playerName="master_inventory" />
      </div>
    );
  }

  if (userType === 'master' && authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
        <div className="sticky top-0 bg-gray-900 pb-2 z-10">
          <h1 className="text-2xl font-bold mb-2">Modo Máster</h1>
          <div className="flex flex-wrap gap-2 mb-2">
            <Boton onClick={volverAlMenu}>Volver al menú principal</Boton>
            <Boton onClick={refreshCatalog}>Refrescar catálogo</Boton>
          </div>
          <div className="flex justify-center">
            <Input
              placeholder="Buscar en el catálogo"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full max-w-md text-center"
            />
          </div>
        </div>

        <Collapsible title={editingTerm ? `Editar término: ${editingTerm}` : 'Añadir término destacado'} defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Palabra"
              value={newTerm.word}
              onChange={e => setNewTerm(t => ({ ...t, word: e.target.value }))}
            />
            <input
              type="color"
              value={newTerm.color}
              onChange={e => setNewTerm(t => ({ ...t, color: e.target.value }))}
              className="w-10 h-8 border-none p-0 rounded"
            />
            <textarea
              className="bg-gray-700 text-white rounded px-2 py-1 sm:col-span-2"
              placeholder="Descripción"
              value={newTerm.info}
              onChange={e => setNewTerm(t => ({ ...t, info: e.target.value }))}
            />
            <div className="sm:col-span-2 flex justify-between items-center">
              {editingTerm && (
                <Boton color="gray" onClick={() => { setEditingTerm(null); setNewTerm({ word: '', color: '#ffff00', info: '' }); }}>Cancelar</Boton>
              )}
              <Boton color="green" onClick={saveTerm}>{editingTerm ? 'Actualizar' : 'Guardar'} término</Boton>
            </div>
            {newTermError && <p className="text-red-400 text-center sm:col-span-2">{newTermError}</p>}
          </div>
        </Collapsible>

        <Collapsible title="Glosario" defaultOpen={false}>
          {glossary.length === 0 ? (
            <p className="text-gray-400">No hay términos.</p>
          ) : (
            <ul className="space-y-2">
              {glossary.map((t, i) => (
                <li key={i} className="flex justify-between items-center">
                  <span className="mr-2">
                    <span style={{ color: t.color }} className="font-bold">{t.word}</span> - {t.info}
                  </span>
                  <div className="flex gap-2">
                    <Boton color="blue" onClick={() => startEditTerm(t)} className="px-2 py-1 text-sm">Editar</Boton>
                    <Boton color="red" onClick={() => deleteTerm(t.word)} className="px-2 py-1 text-sm">Borrar</Boton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Collapsible>

        <Collapsible title={editingAbility ? `Editar habilidad: ${editingAbility}` : "Crear nueva habilidad"} defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Nombre"
              value={newAbility.nombre}
              onChange={e => setNewAbility(a => ({ ...a, nombre: e.target.value }))}
            />
            <Input
              placeholder="Alcance"
              value={newAbility.alcance}
              onChange={e => setNewAbility(a => ({ ...a, alcance: e.target.value }))}
            />
            <Input
              placeholder="Consumo"
              value={newAbility.consumo}
              onChange={e => setNewAbility(a => ({ ...a, consumo: e.target.value }))}
            />
            <Input
              placeholder="Cuerpo"
              value={newAbility.cuerpo}
              onChange={e => setNewAbility(a => ({ ...a, cuerpo: e.target.value }))}
            />
            <Input
              placeholder="Mente"
              value={newAbility.mente}
              onChange={e => setNewAbility(a => ({ ...a, mente: e.target.value }))}
            />
            <Input
              placeholder="Poder"
              value={newAbility.poder}
              onChange={e => setNewAbility(a => ({ ...a, poder: e.target.value }))}
            />
            <textarea
              className="bg-gray-700 text-white rounded px-2 py-1 sm:col-span-2"
              placeholder="Descripción"
              value={newAbility.descripcion}
              onChange={e => setNewAbility(a => ({ ...a, descripcion: e.target.value }))}
            />
            <div className="sm:col-span-2 flex justify-between items-center">
              {editingAbility && (
                <Boton color="gray" onClick={() => { setEditingAbility(null); setNewAbility({ nombre: '', alcance: '', consumo: '', cuerpo: '', mente: '', poder: '', descripcion: '' }); }}>Cancelar</Boton>
              )}
              <Boton color="green" onClick={agregarHabilidad}>{editingAbility ? 'Actualizar' : 'Guardar'} habilidad</Boton>
            </div>
            {newAbilityError && <p className="text-red-400 text-center sm:col-span-2">{newAbilityError}</p>}
          </div>
        </Collapsible>

        {loading
          ? <p>Cargando catálogo…</p>
          : (
            <>
              {/* Mostrar pestañas solo si hay búsqueda activa */}
              {searchTerm.trim() && (
                <>
                  {/* Mostrar Armas si hay coincidencias */}
                  {(() => {
                    const armasFiltradas = armas.filter(a =>
                      a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      a.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    return armasFiltradas.length > 0 && (
                      <Collapsible title={`Armas (${armasFiltradas.length})`} defaultOpen={true}>
                        {armasFiltradas.map((a, i) => (
                          <Tarjeta key={`arma-${i}`} variant="weapon">
                            <p className="font-bold text-lg">{a.nombre}</p>
                            <p><strong>Daño:</strong> {dadoIcono()} {a.dano} {iconoDano(a.tipoDano)}</p>
                            <p><strong>Alcance:</strong> {a.alcance}</p>
                            <p><strong>Consumo:</strong> {a.consumo}</p>
                            <p><strong>Carga física:</strong> {parseCargaValue(a.cargaFisica ?? a.carga) > 0 ? '🔲'.repeat(parseCargaValue(a.cargaFisica ?? a.carga)) : '❌'}</p>
                            <p><strong>Carga mental:</strong> {cargaMentalIcon(a.cargaMental)}</p>
                            <p><strong>Rasgos:</strong> {a.rasgos.length ? a.rasgos.map((r,ri)=>(
                              <React.Fragment key={ri}>
                                {highlightText(r)}{ri < a.rasgos.length-1 ? ', ' : ''}
                              </React.Fragment>
                            )) : '❌'}</p>
                            <p><strong>Valor:</strong> {a.valor}</p>
                            {a.tecnologia && <p><strong>Tecnología:</strong> {a.tecnologia}</p>}
                            {a.descripcion && <p className="italic">{highlightText(a.descripcion)}</p>}
                          </Tarjeta>
                        ))}
                      </Collapsible>
                    );
                  })()}

                  {/* Mostrar Armaduras si hay coincidencias */}
                  {(() => {
                    const armadurasFiltradas = armaduras.filter(a =>
                      a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      a.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    return armadurasFiltradas.length > 0 && (
                      <Collapsible title={`Armaduras (${armadurasFiltradas.length})`} defaultOpen={true}>
                        {armadurasFiltradas.map((a, i) => (
                          <Tarjeta key={`armadura-${i}`} variant="armor">
                            <p className="font-bold text-lg">{a.nombre}</p>
                            <p><strong>Defensa:</strong> {a.defensa}</p>
                            <p><strong>Carga física:</strong> {parseCargaValue(a.cargaFisica ?? a.carga) > 0 ? '🔲'.repeat(parseCargaValue(a.cargaFisica ?? a.carga)) : '❌'}</p>
                            <p><strong>Carga mental:</strong> {cargaMentalIcon(a.cargaMental)}</p>
                            <p><strong>Rasgos:</strong> {a.rasgos.length ? a.rasgos.map((r,ri)=>(
                              <React.Fragment key={ri}>
                                {highlightText(r)}{ri < a.rasgos.length-1 ? ', ' : ''}
                              </React.Fragment>
                            )) : '❌'}</p>
                            <p><strong>Valor:</strong> {a.valor}</p>
                            {a.tecnologia && <p><strong>Tecnología:</strong> {a.tecnologia}</p>}
                            {a.descripcion && <p className="italic">{highlightText(a.descripcion)}</p>}
                          </Tarjeta>
                        ))}
                      </Collapsible>
                    );
                  })()}

                  {/* Mostrar Habilidades si hay coincidencias */}
                  {(() => {
                    const habilidadesFiltradas = habilidades.filter(h =>
                      h.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (h.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    return habilidadesFiltradas.length > 0 && (
                      <Collapsible title={`Habilidades (${habilidadesFiltradas.length})`} defaultOpen={true}>
                        {habilidadesFiltradas.map((h, i) => (
                          <Tarjeta key={`hab-${i}`} variant="power">
                            <p className="font-bold text-lg">{h.nombre}</p>
                            <p><strong>Alcance:</strong> {h.alcance}</p>
                            <p><strong>Consumo:</strong> {h.consumo}</p>
                            <p><strong>Cuerpo:</strong> {h.cuerpo}</p>
                            <p><strong>Mente:</strong> {h.mente}</p>
                            <p><strong>Poder:</strong> {h.poder}</p>
                            {h.descripcion && <p className="italic">{highlightText(h.descripcion)}</p>}
                            <div className="flex justify-end gap-2 mt-2">
                              <Boton color="blue" onClick={() => startEditAbility(h)} className="px-2 py-1 text-sm">Editar</Boton>
                              <Boton color="red" onClick={() => deleteAbility(h.nombre)} className="px-2 py-1 text-sm">Borrar</Boton>
                            </div>
                          </Tarjeta>
                        ))}
                      </Collapsible>
                    );
                  })()}
                </>
              )}

              {/* Mostrar mensaje cuando no hay búsqueda activa */}
              {!searchTerm.trim() && (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-lg">Usa el buscador para explorar el catálogo</p>
                  <p className="text-gray-500 text-sm mt-2">Las pestañas se abrirán automáticamente cuando busques</p>
                </div>
              )}

              {/* Mostrar mensaje cuando no hay resultados */}
              {searchTerm.trim() &&
                armas.filter(a => a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || a.descripcion.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 &&
                armaduras.filter(a => a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || a.descripcion.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 &&
                habilidades.filter(h => h.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (h.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-lg">No se encontraron resultados para "{searchTerm}"</p>
                  <p className="text-gray-500 text-sm mt-2">Intenta con otros términos de búsqueda</p>
                </div>
              )}
            </>
          )
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

// Componente principal envuelto con ToastProvider
const AppWithProviders = () => {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
};

export default AppWithProviders;
