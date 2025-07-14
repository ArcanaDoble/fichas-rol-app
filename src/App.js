// src/App.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import fetchSheetData from './utils/fetchSheetData';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { BsDice6 } from 'react-icons/bs';
import { GiFist } from 'react-icons/gi';
import { FaFire, FaBolt, FaSnowflake, FaRadiationAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import Boton from './components/Boton';
import Input from './components/Input';
import Tarjeta from './components/Tarjeta';
import ResourceBar from './components/ResourceBar';
import AtributoCard, { DADOS } from './components/AtributoCard';
import Collapsible from './components/Collapsible';
import EstadoSelector from './components/EstadoSelector';
import Inventory from './components/inventory/Inventory';
import MasterMenu from './components/MasterMenu';
import { ToastProvider } from './components/Toast';
import DiceCalculator from './components/DiceCalculator';
import BarraReflejos from './components/BarraReflejos';
import InitiativeTracker from './components/InitiativeTracker';
import MapCanvas from './components/MapCanvas';
import EnemyViewModal from './components/EnemyViewModal';
import AssetSidebar from './components/AssetSidebar';
import sanitize from './utils/sanitize';
import PageSelector from './components/PageSelector';
import { nanoid } from 'nanoid';
import useConfirm from './hooks/useConfirm';
import useResourcesHook from './hooks/useResources';
import useGlossary from './hooks/useGlossary';
import {
  uploadDataUrl,
  getOrUploadFile,
  releaseFile,
} from './utils/storage';

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

const defaultStats = defaultRecursos.reduce((acc, r) => {
  acc[r] = { base: 0, buff: 0, total: 0, actual: 0 };
  return acc;
}, {});

const defaultResourcesList = defaultRecursos.map(name => ({
  id: name,
  name,
  color: recursoColor[name] || '#ffffff',
  info: recursoInfo[name] || ''
}));

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
const normalizeName = (name) =>
  name
    ? name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '')
    : '';
const ALVARO_KEY = 'alvaro';
const applyCargaPenalties = (data, armas, armaduras, currentPlayerName = '') => {
  let fisica = 0;
  let mental = 0;
  data.weapons?.forEach(n => {
    const w = armas.find(a => a && a.nombre === n);
    if (w) {
      fisica += parseCargaValue(w.cargaFisica || w.cuerpo || w.carga);
      mental += parseCargaValue(w.cargaMental || w.mente);
    }
  });
  data.armaduras?.forEach(n => {
    const a = armaduras.find(x => x && x.nombre === n);
    if (a) {
      fisica += parseCargaValue(a.cargaFisica || a.cuerpo || a.carga);
      mental += parseCargaValue(a.cargaMental || a.mente);
    }
  });
  
  const isAlvaro = normalizeName(currentPlayerName).includes(ALVARO_KEY);
  const rfId = data.resistenciaFisica || 'vida';
  const rmId = data.resistenciaMental || 'ingenio';
  const newStats = { ...data.stats };
  const rfBase = newStats[rfId]?.base || 0;
  const rmBase = newStats[rmId]?.base || 0;

  if (isAlvaro) {
    if (newStats[rfId]) {
      const base = newStats[rfId].base || 0;
      const buff = newStats[rfId].buff || 0;
      const total = Math.min(base + buff, RESOURCE_MAX);
      newStats[rfId].total = total;
      if (newStats[rfId].actual > total) newStats[rfId].actual = total;
    }
    if (newStats[rmId]) {
      const base = newStats[rmId].base || 0;
      const buff = newStats[rmId].buff || 0;
      const total = Math.min(base + buff, RESOURCE_MAX);
      newStats[rmId].total = total;
      if (newStats[rmId].actual > total) newStats[rmId].actual = total;
    }
  }
  const resistenciaFisica = isAlvaro
    ? (newStats[rfId]?.total || 0)
    : rfBase;
  const resistenciaMental = isAlvaro
    ? (newStats[rmId]?.total || 0)
    : rmBase;
  if (newStats.postura) {
    const base = newStats.postura.base || 0;
    const buff = newStats.postura.buff || 0;
    const penal = Math.max(0, fisica - resistenciaFisica);
    const baseEfectiva = Math.max(0, base - penal);
    const extraBuff =
      !isAlvaro && (rfId === 'postura' || rmId === 'postura') ? 0 : buff;
    const total = Math.max(
      0,
      Math.min(baseEfectiva + extraBuff, RESOURCE_MAX)
    );
    newStats.postura.total = total;
    if (newStats.postura.actual > total) newStats.postura.actual = total;
  }
  if (newStats.cordura) {
    const base = newStats.cordura.base || 0;
    const buff = newStats.cordura.buff || 0;
    const penal = Math.max(0, mental - resistenciaMental);
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
  const confirm = useConfirm();
  const [userType, setUserType]               = useState(null);
  const [showLogin, setShowLogin]             = useState(false);
  const [passwordInput, setPasswordInput]     = useState('');
  const [authenticated, setAuthenticated]     = useState(false);
  const [authError, setAuthError]             = useState('');

  const handleLogin = () => {
    if (passwordInput === MASTER_PASSWORD) {
      setAuthenticated(true);
      setShowLogin(false);
      setAuthError('');
    } else {
      setAuthError('Contraseña incorrecta');
    }
  };

  const resetLogin = () => {
    setUserType(null);
    setShowLogin(false);
    setPasswordInput('');
    setAuthenticated(false);
    setAuthError('');
  };
  const [armas, setArmas]                     = useState([]);
  const [armaduras, setArmaduras]             = useState([]);
  const [habilidades, setHabilidades]         = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [playerName, setPlayerName]           = useState('');
  const [nameEntered, setNameEntered]         = useState(false);
  const [existingPlayers, setExistingPlayers] = useState([]);
  const tooltipCounterRef = useRef(0);
  const [playerData, setPlayerData]           = useState({
    weapons: [],
    armaduras: [],
    poderes: [],
    claves: [],
    estados: [],
    atributos: {},
    stats: {},
    cargaAcumulada: { fisica: 0, mental: 0 },
    resistenciaFisica: 'vida',
    resistenciaMental: 'ingenio',
  });
  const [playerError, setPlayerError]         = useState('');
  const [playerInputArma, setPlayerInputArma] = useState('');
  const [playerInputArmadura, setPlayerInputArmadura] = useState('');
  const [playerArmaduraError, setPlayerArmaduraError] = useState('');
  const [playerInputPoder, setPlayerInputPoder] = useState('');
  const [playerPoderError, setPlayerPoderError] = useState('');
  
  // Google Sheets ID
  const sheetId = process.env.REACT_APP_GOOGLE_SHEETS_ID || '1Fc46hHjCWRXCEnHl3ZehzMEcxewTYaZEhd-v-dnFUjs';
  
  // Datos de prueba temporales mientras arreglamos Google Sheets
  const datosPruebaArmas = React.useMemo(() => [
    { nombre: 'Espada', dano: '1D6', alcance: 'Cuerpo a cuerpo', consumo: '0', carga: '0', cuerpo: '0', mente: '0', cargaFisica: '0', cargaMental: '0', rasgos: [], descripcion: 'Espada básica', tipoDano: 'físico', valor: '10', tecnologia: 'Baja' },
    { nombre: 'Daga', dano: '1D4', alcance: 'Cuerpo a cuerpo', consumo: '0', carga: '0', cuerpo: '0', mente: '0', cargaFisica: '0', cargaMental: '0', rasgos: [], descripcion: 'Daga pequeña', tipoDano: 'físico', valor: '5', tecnologia: 'Baja' },
    { nombre: 'Pistola', dano: '1D8', alcance: 'Media', consumo: '1', carga: '0', cuerpo: '0', mente: '0', cargaFisica: '0', cargaMental: '0', rasgos: [], descripcion: 'Pistola básica', tipoDano: 'físico', valor: '50', tecnologia: 'Media' }
  ], []);
  
  const datosPruebaArmaduras = React.useMemo(() => [
    { nombre: 'Armadura de Cuero', defensa: '1', cuerpo: '0', mente: '0', carga: '0', cargaFisica: '0', cargaMental: '0', rasgos: [], descripcion: 'Armadura ligera de cuero', valor: '20', tecnologia: 'Baja' },
    { nombre: 'Armadura de Malla', defensa: '2', cuerpo: '0', mente: '0', carga: '0', cargaFisica: '0', cargaMental: '0', rasgos: [], descripcion: 'Armadura de malla metálica', valor: '40', tecnologia: 'Baja' },
    { nombre: 'Armadura Completa', defensa: '3', cuerpo: '0', mente: '0', carga: '0', cargaFisica: '0', cargaMental: '0', rasgos: [], descripcion: 'Armadura completa de metal', valor: '100', tecnologia: 'Baja' }
  ], []);
  // Recursos dinámicos (añadir / eliminar)
  const {
    resourcesList,
    setResourcesList,
    showAddResForm,
    setShowAddResForm,
    newResName,
    setNewResName,
    newResColor,
    setNewResColor,
    newResError,
    setNewResError,
    agregarRecurso,
    eliminarRecurso,
  } = useResourcesHook(
    defaultResourcesList,
    (data, list) => savePlayer(data, list),
    playerData
  );
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
  // Estados para fichas de enemigos
  const [enemies, setEnemies] = useState([]);
  const [selectedEnemy, setSelectedEnemy] = useState(null);
  const [showEnemyForm, setShowEnemyForm] = useState(false);
  const [editingEnemy, setEditingEnemy] = useState(null);
  const [newEnemy, setNewEnemy] = useState({
    name: '',
    portrait: '',
    description: '',
    weapons: [],
    armaduras: [],
    poderes: [],
    atributos: {},
    stats: {},
    nivel: 1,
    experiencia: 0,
    dinero: 0,
    notas: '',
    estados: []
  });
  // Estados para equipar items a enemigos
  const [enemyInputArma, setEnemyInputArma] = useState('');
  const [enemyInputArmadura, setEnemyInputArmadura] = useState('');
  const [enemyInputPoder, setEnemyInputPoder] = useState('');
  const [enemyArmaError, setEnemyArmaError] = useState('');
  const [enemyArmaduraError, setEnemyArmaduraError] = useState('');
  const [enemyPoderError, setEnemyPoderError] = useState('');
  // Vista elegida por el máster (inventario prototipo u opciones clásicas)
  const [chosenView, setChosenView] = useState(null);
  // Glosario de términos destacados
  const {
    glossary,
    newTerm,
    setNewTerm,
    editingTerm,
    setEditingTerm,
    newTermError,
    saveTerm,
    startEditTerm,
    deleteTerm,
  } = useGlossary();

  // Calculadora de dados
  const [showDiceCalculator, setShowDiceCalculator] = useState(false);
  // Minijuego Barra-Reflejos
  const [showBarraReflejos, setShowBarraReflejos] = useState(false);
  // Sistema de Iniciativa
  const [showInitiativeTracker, setShowInitiativeTracker] = useState(false);
  // Páginas para el Mapa de Batalla
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  // Tokens para el Mapa de Batalla
  const [canvasTokens, setCanvasTokens] = useState([]);
  // Líneas dibujadas en el mapa de batalla
  const [canvasLines, setCanvasLines] = useState([]);
  const [tokenSheets, setTokenSheets] = useState(() => {
    const stored = localStorage.getItem('tokenSheets');
    return stored ? JSON.parse(stored) : {};
  });
  const [canvasBackground, setCanvasBackground] = useState(null);
  // Configuración de la cuadrícula del mapa de batalla
  const [gridSize, setGridSize] = useState(100);
  const [gridCells, setGridCells] = useState(30);
  const [gridOffsetX, setGridOffsetX] = useState(0);
  const [gridOffsetY, setGridOffsetY] = useState(0);

  // Cargar páginas desde Firebase al iniciar
  useEffect(() => {
    const loadPages = async () => {
      const snap = await getDocs(collection(db, 'pages'));
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (loaded.length === 0) {
        const defaultPage = {
          id: nanoid(),
          name: 'Página 1',
          background: null,
          gridSize: 100,
          gridCells: 30,
          gridOffsetX: 0,
          gridOffsetY: 0,
          tokens: [],
          lines: [],
        };
        await setDoc(doc(db, 'pages', defaultPage.id), sanitize(defaultPage));
        setPages([defaultPage]);
      } else {
        setPages(loaded.map(p => ({ lines: [], ...p })));
      }
    };
    loadPages();
  }, []);

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Preview locally while uploading
    const localUrl = URL.createObjectURL(file);
    setCanvasBackground(localUrl);
    try {
      const { url, hash } = await getOrUploadFile(file);
      URL.revokeObjectURL(localUrl);
      setCanvasBackground(url);
      const pageId = pages[currentPage]?.id;
      if (pageId) {
        const prevHash = pages[currentPage]?.backgroundHash;
        const newPage = {
          ...pages[currentPage],
          background: url,
          backgroundHash: hash,
        };
        await setDoc(doc(db, 'pages', pageId), sanitize(newPage));
        setPages((ps) =>
          ps.map((p, i) => (i === currentPage ? newPage : p))
        );
        if (prevHash && prevHash !== hash) {
          await releaseFile(prevHash);
        }
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Sincronizar página actual con estados locales
  useEffect(() => {
    const p = pages[currentPage];
    if (!p) return;
    setCanvasTokens(p.tokens || []);
    setCanvasLines(p.lines || []);
    setCanvasBackground(p.background || null);
    setGridSize(p.gridSize || 1);
    setGridCells(p.gridCells || 1);
    setGridOffsetX(p.gridOffsetX || 0);
    setGridOffsetY(p.gridOffsetY || 0);
  }, [currentPage, pages]);

  useEffect(() => {
    setPages(ps => ps.map((pg, i) => i === currentPage ? { ...pg, tokens: canvasTokens } : pg));
  }, [canvasTokens]);

  useEffect(() => {
    setPages(ps => ps.map((pg, i) => i === currentPage ? { ...pg, lines: canvasLines } : pg));
  }, [canvasLines]);

  useEffect(() => {
    setPages(ps => ps.map((pg, i) => i === currentPage ? { ...pg, background: canvasBackground } : pg));
  }, [canvasBackground]);

  useEffect(() => {
    setPages(ps => ps.map((pg, i) => i === currentPage ? { ...pg, gridSize, gridCells, gridOffsetX, gridOffsetY } : pg));
  }, [gridSize, gridCells, gridOffsetX, gridOffsetY]);

  useEffect(() => {
    const syncPages = async () => {
      const updated = await Promise.all(
        pages.map(async (p) => {
          let changed = false;
          const tokens = await Promise.all(
            (p.tokens || []).map(async (t) => {
              if (t.url && t.url.startsWith('data:')) {
                const url = await uploadDataUrl(
                  t.url,
                  `canvas-tokens/${t.id}`
                );
                changed = true;
                return { ...t, url };
              }
              return t;
            })
          );
          let bg = p.background;
          if (bg && bg.startsWith('data:')) {
            bg = await uploadDataUrl(bg, `Mapas/${p.id}`);
            changed = true;
          }
          if (bg && bg.startsWith('blob:')) {
            return p; // no guardar hasta que termine la subida
          }
          const newPage = changed
            ? { ...p, tokens, background: bg }
            : { ...p };
          newPage.lines = p.lines || [];
          await setDoc(doc(db, 'pages', newPage.id), sanitize(newPage));
          return newPage;
        })
      );
      const changedPages = updated.some((u, i) => u !== pages[i]);
      if (changedPages) setPages(updated);
    };
    syncPages();
  }, [pages]);

  const addPage = () => {
    const newPage = {
      id: nanoid(),
      name: `Página ${pages.length + 1}`,
      background: null,
      backgroundHash: null,
      gridSize: 100,
      gridCells: 30,
      gridOffsetX: 0,
      gridOffsetY: 0,
      tokens: [],
      lines: [],
    };
    setPages((ps) => [...ps, newPage]);
    setCurrentPage(pages.length);
  };

  const updatePage = (index, data) => {
    setPages((ps) => ps.map((p, i) => (i === index ? { ...p, ...data } : p)));
    if (index === currentPage) {
      if (data.gridSize !== undefined) setGridSize(data.gridSize);
      if (data.gridCells !== undefined) setGridCells(data.gridCells);
      if (data.gridOffsetX !== undefined) setGridOffsetX(data.gridOffsetX);
      if (data.gridOffsetY !== undefined) setGridOffsetY(data.gridOffsetY);
      if (data.background !== undefined) setCanvasBackground(data.background);
      if (data.tokens !== undefined) setCanvasTokens(data.tokens);
      if (data.lines !== undefined) setCanvasLines(data.lines);
    }
  };

  const deletePage = async (index) => {
    const p = pages[index];
    if (!p) return;
    if (!(await confirm(`¿Eliminar ${p.name}?`))) return;
    if (p.backgroundHash) {
      await releaseFile(p.backgroundHash);
    }
    await deleteDoc(doc(db, 'pages', p.id));
    setPages((ps) => ps.filter((_, i) => i !== index));
    setCurrentPage((cp) => {
      if (cp > index) return cp - 1;
      if (cp === index) return Math.max(0, cp - 1);
      return cp;
    });
  };
  // Sugerencias dinámicas para inputs de equipo
  const armaSugerencias = playerInputArma
    ? armas.filter(a =>
        a && a.nombre && a.nombre.toLowerCase().includes(playerInputArma.toLowerCase())
      ).slice(0, 5)
    : [];
  const armaduraSugerencias = playerInputArmadura
    ? armaduras.filter(a =>
        a && a.nombre && a.nombre.toLowerCase().includes(playerInputArmadura.toLowerCase())
      ).slice(0, 5)
    : [];
  const poderSugerencias = playerInputPoder
    ? habilidades.filter(h =>
        h && h.nombre && h.nombre.toLowerCase().includes(playerInputPoder.toLowerCase())
      ).slice(0, 5)
    : [];
  // Sugerencias dinámicas para inputs de equipo de enemigos
  const enemyArmaSugerencias = enemyInputArma
    ? armas.filter(a =>
        a && a.nombre && a.nombre.toLowerCase().includes(enemyInputArma.toLowerCase())
      ).slice(0, 5)
    : [];
  const enemyArmaduraSugerencias = enemyInputArmadura
    ? armaduras.filter(a =>
        a && a.nombre && a.nombre.toLowerCase().includes(enemyInputArmadura.toLowerCase())
      ).slice(0, 5)
    : [];
  const enemyPoderSugerencias = enemyInputPoder
    ? habilidades.filter(h =>
        h && h.nombre && h.nombre.toLowerCase().includes(enemyInputPoder.toLowerCase())
      ).slice(0, 5)
    : [];
  // ───────────────────────────────────────────────────────────
  // NAVIGATION
  // ───────────────────────────────────────────────────────────
  const volverAlMenu = () => {
    resetLogin();
    setChosenView(null);
    setNameEntered(false);
    setPlayerName('');
    setPlayerData({
      weapons: [],
      armaduras: [],
      poderes: [],
      claves: [],
      estados: [],
      atributos: {},
      stats: {},
      cargaAcumulada: { fisica: 0, mental: 0 },
      resistenciaFisica: 'vida',
      resistenciaMental: 'ingenio',
    });
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
    setShowDiceCalculator(false);
    setShowBarraReflejos(false);
    setShowInitiativeTracker(false);
  };
  const eliminarFichaJugador = async () => {
    if (!(await confirm(`¿Eliminar ficha de ${playerName}?`))) return;
    await deleteDoc(doc(db, 'players', playerName));
    await deleteDoc(doc(db, 'inventory', playerName));
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(`player_${playerName}_backup`);
    }
    volverAlMenu();
  };
  const guardarDatosFicha = async () => {
    if (typeof window === 'undefined') return;
    const invSnap = await getDoc(doc(db, 'inventory', playerName));
    const snapshot = {
      playerData,
      resourcesList,
      claves,
      estados,
      inventory: invSnap.exists() ? invSnap.data() : null,
    };
    window.localStorage.setItem(
      `player_${playerName}_backup`,
      JSON.stringify(snapshot)
    );
  };
  const resetearFichaDesdeBackup = async () => {
    if (typeof window === 'undefined') return;
    const backup = window.localStorage.getItem(`player_${playerName}_backup`);
    if (backup) {
      const data = JSON.parse(backup);
      await savePlayer(
        data.playerData,
        data.resourcesList,
        data.claves,
        data.estados
      );
      setResourcesList(data.resourcesList || []);
      setClaves(data.claves || []);
      setEstados(data.estados || []);
      if (data.inventory) {
        await setDoc(doc(db, 'inventory', playerName), data.inventory);
      }
    }
  };
  // ───────────────────────────────────────────────────────────
  // FETCH EXISTING PLAYERS
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userType) return;
    getDocs(collection(db, 'players'))
      .then(snap => {
        const players = snap.docs.map(d => d.id);
        setExistingPlayers(players);
      })
      .catch(error => {
        // Error cargando jugadores
      });
  }, [userType]);
  // ───────────────────────────────────────────────────────────
  // FETCH ARMAS
  // ───────────────────────────────────────────────────────────
  const [fetchArmasError, setFetchArmasError] = useState(false);
  const fetchArmas = useCallback(async () => {
    if (fetchArmasError) return;
    setLoading(true);
    try {
      const rows = await fetchSheetData(sheetId, 'Lista_Armas');
      let datos;
      if (rows && rows.length > 0) {
        datos = rows.map((obj) => {
          const rasgos = obj.RASGOS
            ? (obj.RASGOS.match(/\[[^\]]+\]/g) || []).map((s) => s.replace(/[[\]]/g, '').trim())
            : [];
          return {
            nombre: obj.NOMBRE,
            dano: obj.DAÑO,
            alcance: obj.ALCANCE,
            consumo: obj.CONSUMO,
            carga: obj.CARGA,
            cuerpo: obj.CUERPO,
            mente: obj.MENTE,
            cargaFisica: obj.CARGA_FISICA || obj['CARGA FISICA'] || obj.CUERPO || obj.CARGA || '',
            cargaMental: obj.CARGA_MENTAL || obj['CARGA MENTAL'] || obj.MENTE || '',
            rasgos,
            descripcion: obj.DESCRIPCIÓN || '',
            tipoDano: obj.TIPO_DAÑO || obj['TIPO DAÑO'] || 'físico',
            valor: obj.VALOR || '',
            tecnologia: obj.TECNOLOGÍA || '',
          };
        });
      } else {
        datos = datosPruebaArmas;
      }
      setArmas(datos);
    } catch (e) {
      setArmas(datosPruebaArmas);
      setFetchArmasError(true);
    } finally {
      setLoading(false);
    }
  }, [sheetId, datosPruebaArmas, fetchArmasError]);
  useEffect(() => { 
    fetchArmas(); 
  }, [fetchArmas]);
  // ───────────────────────────────────────────────────────────
  // FETCH ARMADURAS
  // ───────────────────────────────────────────────────────────
  const [fetchArmadurasError, setFetchArmadurasError] = useState(false);
  const fetchArmaduras = useCallback(async () => {
    if (fetchArmadurasError) return;
    setLoading(true);
    try {
      const rows = await fetchSheetData(sheetId, 'Lista_Armaduras');
      let datos;
      if (rows && rows.length > 0) {
        datos = rows.map((obj) => {
          const rasgos = obj.RASGOS
            ? (obj.RASGOS.match(/\[[^\]]+\]/g) || []).map((s) => s.replace(/[[\]]/g, '').trim())
            : [];
          return {
            nombre: obj.NOMBRE,
            defensa: obj.ARMADURA,
            cuerpo: obj.CUERPO,
            mente: obj.MENTE,
            carga: obj.CARGA,
            cargaFisica: obj.CARGA_FISICA || obj['CARGA FISICA'] || obj.CUERPO || obj.CARGA || '',
            cargaMental: obj.CARGA_MENTAL || obj['CARGA MENTAL'] || obj.MENTE || '',
            rasgos,
            descripcion: obj.DESCRIPCIÓN || '',
            valor: obj.VALOR || '',
            tecnologia: obj.TECNOLOGÍA || '',
          };
        });
      } else {
        datos = datosPruebaArmaduras;
      }
      setArmaduras(datos);
    } catch (e) {
      setArmaduras(datosPruebaArmaduras);
      setFetchArmadurasError(true);
    } finally {
      setLoading(false);
    }
  }, [sheetId, datosPruebaArmaduras, fetchArmadurasError]);
  useEffect(() => { 
    fetchArmaduras(); 
  }, [fetchArmaduras]);
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
      // Error cargando habilidades
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchHabilidades() }, [fetchHabilidades]);
  // ───────────────────────────────────────────────────────────
  // FETCH ENEMIGOS
  // ───────────────────────────────────────────────────────────
  const fetchEnemies = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'enemies'));
      const datos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEnemies(datos);
    } catch (e) {
      // Error cargando enemigos
    }
  }, []);
  useEffect(() => { fetchEnemies() }, [fetchEnemies]);
  const refreshCatalog = () => {
    fetchArmas();
    fetchArmaduras();
    fetchHabilidades();
    fetchEnemies();
  };
  // ───────────────────────────────────────────────────────────
  // FUNCIONES PARA CARGAR Y GUARDAR
  // ───────────────────────────────────────────────────────────
  // 1) CARGA DE PLAYER DATA
  const loadPlayer = useCallback(async () => {
    if (!playerName) return;
    
    try {
      const docRef = doc(db, 'players', playerName);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const recalculated = applyCargaPenalties(
          data,
          armas,
          armaduras,
          playerName
        );
        setPlayerData(recalculated);
        setResourcesList(recalculated.resourcesList || []);
        setClaves(recalculated.claves || []);
        setEstados(recalculated.estados || []);
      } else {
        const defaultData = {
          weapons: [],
          armaduras: [],
          poderes: [],
          claves: [],
          estados: [],
          atributos: {
            fuerza: 0,
            destreza: 0,
            constitucion: 0,
            inteligencia: 0,
            sabiduria: 0,
            carisma: 0,
          },
          stats: { ...defaultStats },
          cargaAcumulada: { fisica: 0, mental: 0 },
          resistenciaFisica: 'vida',
          resistenciaMental: 'ingenio',
          resourcesList: defaultResourcesList,
          updatedAt: new Date(),
        };
        setPlayerData(defaultData);
        setResourcesList(defaultResourcesList);
        setClaves([]);
        setEstados([]);
      }
    } catch (error) {
      // Error cargando jugador
      const defaultData = {
        weapons: [],
        armaduras: [],
        poderes: [],
        claves: [],
        estados: [],
        atributos: {
          fuerza: 0,
          destreza: 0,
          constitucion: 0,
          inteligencia: 0,
          sabiduria: 0,
          carisma: 0,
        },
        stats: { ...defaultStats },
        cargaAcumulada: { fisica: 0, mental: 0 },
        resistenciaFisica: 'vida',
        resistenciaMental: 'ingenio',
        resourcesList: defaultResourcesList,
        updatedAt: new Date(),
      };
      setPlayerData(defaultData);
      setResourcesList(defaultResourcesList);
      setClaves([]);
      setEstados([]);
    }
  }, [playerName, armas, armaduras, setResourcesList]);

  // useEffect que llama a loadPlayer
  useEffect(() => {
    loadPlayer();
  }, [loadPlayer]);

  // Debug: Monitorear cambios en playerData
  useEffect(() => {
    // playerData actualizado
  }, [playerData]);

  // Debug: Monitorear cambios en armas y armaduras
  useEffect(() => {
    // armas actualizadas
  }, [armas]);

  useEffect(() => {
    // armaduras actualizadas
  }, [armaduras]);
  // 2) savePlayer: guarda todos los datos en Firestore
  //    Acepta parámetros opcionales para recursos y claves.
  const savePlayer = async (
    data,
    listaParaGuardar = resourcesList,
    clavesParaGuardar = claves,
    estadosParaGuardar = estados
  ) => {
    const recalculated = applyCargaPenalties(
      data,
      armas,
      armaduras,
      playerName
    );
    const fullData = {
      ...recalculated,
      resourcesList: listaParaGuardar,
      claves: clavesParaGuardar,
      estados: estadosParaGuardar,
      updatedAt: new Date(),
    };
    setPlayerData(fullData);
    try {
      await setDoc(doc(db, 'players', playerName), fullData);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`player_${playerName}`, JSON.stringify(fullData));
      }
    } catch (e) {
      // Error guardando en Firestore
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`player_${playerName}`, JSON.stringify(fullData));
      }
    }
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
  const handleIncrease = (r) => {
    const s = { ...playerData.stats[r] };
    const maxBase = Math.min(
      RESOURCE_MAX,
      (s.total || 0) - (s.buff || 0)
    );
    s.actual = Math.min(s.actual + 1, maxBase);
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
  const handleResistenciaChange = (tipo, statId) => {
    const newData =
      tipo === 'fisica'
        ? { ...playerData, resistenciaFisica: statId }
        : { ...playerData, resistenciaMental: statId };
    savePlayer(newData);
  };
  const handleEliminarRecurso = async (id) => {
    if (id === 'postura') {
      const carga = playerData.cargaAcumulada?.fisica || 0;
      const icono = cargaFisicaIcon(carga);
      if (!(await confirm(
        `¿Estás seguro? Si eliminas Postura, tu carga física ${icono} (${carga}) quedará pendiente y ya no podrás ver penalización hasta que vuelvas a crear Postura.`
      ))) return;
    }
    if (id === 'cordura') {
      const carga = playerData.cargaAcumulada?.mental || 0;
      const icono = cargaMentalIcon(carga);
      if (!(await confirm(
        `¿Estás seguro? Si eliminas Cordura, tu carga mental ${icono} (${carga}) quedará pendiente y ya no podrás ver penalización hasta que vuelvas a crear Cordura.`
      ))) return;
    }

    eliminarRecurso(id);
  };


  // Funciones para reordenar estadísticas
  const moveStatUp = (index) => {
    if (index === 0) return; // Ya está en la primera posición
    const newList = [...resourcesList];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;
    setResourcesList(newList);
    savePlayer(playerData, newList);
  };
  const moveStatDown = (index) => {
    if (index === resourcesList.length - 1) return; // Ya está en la última posición
    const newList = [...resourcesList];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;
    setResourcesList(newList);
    savePlayer(playerData, newList);
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
    }
  };
  // ───────────────────────────────────────────────────────────
  // FUNCIONES PARA ENEMIGOS
  // ───────────────────────────────────────────────────────────
  const saveEnemy = async (enemyData) => {
    try {
      const enemyId = enemyData.id || `enemy_${Date.now()}`;
      const dataToSave = {
        ...enemyData,
        id: enemyId,
        updatedAt: new Date()
      };
      await setDoc(doc(db, 'enemies', enemyId), dataToSave);
      fetchEnemies();
      return enemyId;
    } catch (e) {
      throw e;
    }
  };
  const deleteEnemy = async (enemyId) => {
    try {
      await deleteDoc(doc(db, 'enemies', enemyId));
      fetchEnemies();
      if (selectedEnemy?.id === enemyId) {
        setSelectedEnemy(null);
      }
    } catch (e) {
    }
  };
  const createNewEnemy = () => {
    const baseAtributos = {};
    atributos.forEach(k => (baseAtributos[k] = 'D4'));
    const baseStats = { ...defaultStats };
    setNewEnemy({
      name: '',
      portrait: '',
      description: '',
      weapons: [],
      armaduras: [],
      poderes: [],
      atributos: baseAtributos,
      stats: baseStats,
      // Campos adicionales como jugador
      nivel: 1,
      experiencia: 0,
      dinero: 0,
      notas: '',
      estados: []
    });
    setEditingEnemy(null);
    setShowEnemyForm(true);
  };
  const editEnemy = (enemy) => {
    setNewEnemy(enemy);
    setEditingEnemy(enemy.id);
    setSelectedEnemy(null); // Close preview when switching to edit mode
    setShowEnemyForm(true);
  };

  const updateEnemyFromToken = async (enemy) => {
    await saveEnemy(enemy);
    setEnemies((prev) => prev.map((e) => (e.id === enemy.id ? enemy : e)));
    setCanvasTokens((prev) =>
      prev.map((t) =>
        t.enemyId === enemy.id ? { ...t, url: enemy.portrait || t.url, name: enemy.name } : t
      )
    );
  };
  const handleSaveEnemy = async () => {
    if (!newEnemy.name.trim()) {
      alert('El nombre del enemigo es requerido');
      return;
    }
    try {
      // Si estamos editando, usar el ID existente; si no, generar uno nuevo
      const enemyToSave = {
        ...newEnemy,
        id: editingEnemy || `enemy_${Date.now()}`
      };
      await saveEnemy(enemyToSave);
      setShowEnemyForm(false);
      setNewEnemy({
        name: '',
        portrait: '',
        description: '',
        weapons: [],
        armaduras: [],
        poderes: [],
        atributos: {},
        stats: {},
        nivel: 1,
        experiencia: 0,
        dinero: 0,
        notas: '',
        estados: []
      });
      setEditingEnemy(null);
      setEnemyInputArma('');
      setEnemyInputArmadura('');
      setEnemyInputPoder('');
      setEnemyArmaError('');
      setEnemyArmaduraError('');
      setEnemyPoderError('');
    } catch (e) {
      alert('Error al guardar el enemigo: ' + e.message);
    }
  };
  const resizeImage = (file, maxWidth = 300, maxHeight = 300, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo proporción
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        // Convertir a base64 con calidad reducida
        const resizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(resizedDataUrl);
      };
      img.src = URL.createObjectURL(file);
    });
  };
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        // Verificar que sea una imagen
        if (!file.type.startsWith('image/')) {
          alert('Por favor selecciona un archivo de imagen válido');
          return;
        }
        // Verificar tamaño del archivo (máximo 10MB antes de procesar)
        if (file.size > 10 * 1024 * 1024) {
          alert('La imagen es demasiado grande. Por favor selecciona una imagen menor a 10MB');
          return;
        }
        // Redimensionar imagen
        const resizedImage = await resizeImage(file);
        // Verificar que el resultado no sea demasiado grande para Firestore
        if (resizedImage.length > 900000) { // ~900KB para dejar margen
          // Si aún es muy grande, reducir más la calidad
          const smallerImage = await resizeImage(file, 200, 200, 0.5);
          setNewEnemy({ ...newEnemy, portrait: smallerImage });
        } else {
          setNewEnemy({ ...newEnemy, portrait: resizedImage });
        }
      } catch (error) {
        alert('Error al procesar la imagen. Por favor intenta con otra imagen.');
      }
    }
  };
  // ───────────────────────────────────────────────────────────
  // FUNCIONES PARA EQUIPAR ITEMS A ENEMIGOS
  // ───────────────────────────────────────────────────────────
  const handleEnemyEquipWeapon = () => {
      if (loading) return;
      const f = armas.find(a => a && a.nombre.toLowerCase().includes(enemyInputArma.trim().toLowerCase()));
      if (!f) return setEnemyArmaError('Arma no encontrada');
      if (showEnemyForm) {
        if (!newEnemy.weapons.some(w => w.nombre === f.nombre)) {
          setNewEnemy({ ...newEnemy, weapons: [...newEnemy.weapons, f] });
          setEnemyInputArma('');
          setEnemyArmaError('');
        }
      } else if (selectedEnemy && !selectedEnemy.weapons.some(w => w.nombre === f.nombre)) {
        setSelectedEnemy({ ...selectedEnemy, weapons: [...selectedEnemy.weapons, f] });
        setEnemyInputArma('');
        setEnemyArmaError('');
      }
    };
  const handleEnemyEquipWeaponFromSuggestion = (name) => {
      const w = armas.find(a => a && a.nombre === name);
      if (!w) return setEnemyArmaError('Arma no encontrada');
      if (showEnemyForm) {
        if (!newEnemy.weapons.some(weapon => weapon.nombre === w.nombre)) {
          setNewEnemy({ ...newEnemy, weapons: [...newEnemy.weapons, w] });
          setEnemyInputArma('');
          setEnemyArmaError('');
        }
      } else if (selectedEnemy && !selectedEnemy.weapons.some(weapon => weapon.nombre === w.nombre)) {
        setSelectedEnemy({ ...selectedEnemy, weapons: [...selectedEnemy.weapons, w] });
        setEnemyInputArma('');
        setEnemyArmaError('');
      }
    };
  const handleEnemyEquipArmor = () => {
      if (loading) return;
      const f = armaduras.find(a => a && a.nombre.toLowerCase().includes(enemyInputArmadura.trim().toLowerCase()));
      if (!f) return setEnemyArmaduraError('Armadura no encontrada');
      if (showEnemyForm) {
        if (!newEnemy.armaduras.some(a => a.nombre === f.nombre)) {
          setNewEnemy({ ...newEnemy, armaduras: [...newEnemy.armaduras, f] });
          setEnemyInputArmadura('');
          setEnemyArmaduraError('');
        }
      } else if (selectedEnemy && !selectedEnemy.armaduras.some(a => a.nombre === f.nombre)) {
        setSelectedEnemy({ ...selectedEnemy, armaduras: [...selectedEnemy.armaduras, f] });
        setEnemyInputArmadura('');
        setEnemyArmaduraError('');
      }
    };
  const handleEnemyEquipArmorFromSuggestion = (name) => {
      const a = armaduras.find(x => x && x.nombre === name);
      if (!a) return setEnemyArmaduraError('Armadura no encontrada');
      if (showEnemyForm) {
        if (!newEnemy.armaduras.some(armor => armor.nombre === a.nombre)) {
          setNewEnemy({ ...newEnemy, armaduras: [...newEnemy.armaduras, a] });
          setEnemyInputArmadura('');
          setEnemyArmaduraError('');
        }
      } else if (selectedEnemy && !selectedEnemy.armaduras.some(armor => armor.nombre === a.nombre)) {
        setSelectedEnemy({ ...selectedEnemy, armaduras: [...selectedEnemy.armaduras, a] });
        setEnemyInputArmadura('');
        setEnemyArmaduraError('');
      }
    };
  const handleEnemyEquipPower = () => {
      if (loading) return;
      const f = habilidades.find(h => h && h.nombre && h.nombre.toLowerCase().includes(enemyInputPoder.trim().toLowerCase()));
      if (!f) return setEnemyPoderError('Poder no encontrado');
      if (showEnemyForm) {
        if (!newEnemy.poderes.some(p => p.nombre === f.nombre)) {
          setNewEnemy({ ...newEnemy, poderes: [...newEnemy.poderes, f] });
          setEnemyInputPoder('');
          setEnemyPoderError('');
        }
      } else if (selectedEnemy && !selectedEnemy.poderes.some(p => p.nombre === f.nombre)) {
        setSelectedEnemy({ ...selectedEnemy, poderes: [...selectedEnemy.poderes, f] });
        setEnemyInputPoder('');
        setEnemyPoderError('');
      }
    };
  const handleEnemyEquipPowerFromSuggestion = (name) => {
      const h = habilidades.find(x => x && x.nombre === name);
      if (!h) return setEnemyPoderError('Poder no encontrado');
      if (showEnemyForm) {
        if (!newEnemy.poderes.some(power => power.nombre === h.nombre)) {
          setNewEnemy({ ...newEnemy, poderes: [...newEnemy.poderes, h] });
          setEnemyInputPoder('');
          setEnemyPoderError('');
        }
      } else if (selectedEnemy && !selectedEnemy.poderes.some(power => power.nombre === h.nombre)) {
        setSelectedEnemy({ ...selectedEnemy, poderes: [...selectedEnemy.poderes, h] });
        setEnemyInputPoder('');
        setEnemyPoderError('');
      }
    };
  const unequipEnemyWeapon = (index) => {
      if (showEnemyForm) {
        const updatedWeapons = newEnemy.weapons.filter((_, i) => i !== index);
        setNewEnemy({ ...newEnemy, weapons: updatedWeapons });
      } else if (selectedEnemy) {
        const updatedWeapons = selectedEnemy.weapons.filter((_, i) => i !== index);
        setSelectedEnemy({ ...selectedEnemy, weapons: updatedWeapons });
      }
    };
  const unequipEnemyArmor = (index) => {
      if (showEnemyForm) {
        const updatedArmors = newEnemy.armaduras.filter((_, i) => i !== index);
        setNewEnemy({ ...newEnemy, armaduras: updatedArmors });
      } else if (selectedEnemy) {
        const updatedArmors = selectedEnemy.armaduras.filter((_, i) => i !== index);
        setSelectedEnemy({ ...selectedEnemy, armaduras: updatedArmors });
      }
    };
  const unequipEnemyPower = (index) => {
      if (showEnemyForm) {
        const updatedPowers = newEnemy.poderes.filter((_, i) => i !== index);
        setNewEnemy({ ...newEnemy, poderes: updatedPowers });
      } else if (selectedEnemy) {
        const updatedPowers = selectedEnemy.poderes.filter((_, i) => i !== index);
        setSelectedEnemy({ ...selectedEnemy, poderes: updatedPowers });
      }
    };
  // ───────────────────────────────────────────────────────────
  // HANDLERS para Login y Equipo de objetos
  // ───────────────────────────────────────────────────────────
  const enterPlayer = () => {
    if (playerName.trim()) setNameEntered(true);
  };
  const handlePlayerEquip = () => {
    if (loading) return;
    const nombreArma = playerInputArma.trim();
    if (!nombreArma) return setPlayerError('Nombre de arma requerido');
    
    const f = armas.find(a => a && a.nombre && a.nombre.toLowerCase().includes(nombreArma.toLowerCase()));
    if (!f) {
      return setPlayerError('Arma no encontrada');
    }
    
    // Agregar el arma si no está ya equipada
    if (!playerData.weapons.includes(f.nombre)) {
      const newWeapons = [...playerData.weapons, f.nombre];
      savePlayer({ ...playerData, weapons: newWeapons });
      setPlayerInputArma('');
      setPlayerError('');
    } else {
      setPlayerError('Arma ya equipada');
    }
  };
  const handlePlayerUnequip = n => {
    savePlayer({ ...playerData, weapons: playerData.weapons.filter(x => x !== n) });
  };
  const handlePlayerEquipFromSuggestion = name => {
    const w = armas.find(a => a && a.nombre === name);
    if (!w) return setPlayerError('Arma no encontrada');
    
    if (!playerData.weapons.includes(w.nombre)) {
      const newWeapons = [...playerData.weapons, w.nombre];
      savePlayer({ ...playerData, weapons: newWeapons });
      setPlayerInputArma('');
      setPlayerError('');
    } else {
      setPlayerError('Arma ya equipada');
    }
  };
  const handlePlayerEquipArmadura = () => {
    if (loading) return;
    const nombreArmadura = playerInputArmadura.trim();
    if (!nombreArmadura) return setPlayerArmaduraError('Nombre de armadura requerido');
    
    const f = armaduras.find(a => a && a.nombre && a.nombre.toLowerCase().includes(nombreArmadura.toLowerCase()));
    if (!f) {
      return setPlayerArmaduraError('Armadura no encontrada');
    }
    
    // Agregar la armadura si no está ya equipada
    if (!playerData.armaduras.includes(f.nombre)) {
      const newArmaduras = [...playerData.armaduras, f.nombre];
      savePlayer({ ...playerData, armaduras: newArmaduras });
      setPlayerInputArmadura('');
      setPlayerArmaduraError('');
    } else {
      setPlayerArmaduraError('Armadura ya equipada');
    }
  };
  const handlePlayerUnequipArmadura = n => {
    savePlayer({ ...playerData, armaduras: playerData.armaduras.filter(x => x !== n) });
  };
  const handlePlayerEquipArmaduraFromSuggestion = name => {
    const a = armaduras.find(x => x && x.nombre === name);
    if (!a) return setPlayerArmaduraError('Armadura no encontrada');
    
    
    if (!playerData.armaduras.includes(a.nombre)) {
      const newArmaduras = [...playerData.armaduras, a.nombre];
      savePlayer({ ...playerData, armaduras: newArmaduras });
      setPlayerInputArmadura('');
      setPlayerArmaduraError('');
    } else {
      setPlayerArmaduraError('Armadura ya equipada');
    }
  };
  const handlePlayerEquipPoder = () => {
    if (loading) return;
    const f = habilidades.find(h => h && h.nombre && h.nombre.toLowerCase().includes(playerInputPoder.trim().toLowerCase()));
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
    const h = habilidades.find(x => x && x.nombre === name);
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
  // (ahora gestionados por el hook useGlossary)

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

  // Renderizar tooltips por separado para evitar errores de hidratación
  const renderTooltips = () => {
    return glossary.map(term => {
      const id = `gloss-${term.word}-${tooltipCounterRef.current++}`;
      return (
        <Tooltip
          key={id}
          id={id}
          place="top"
          className="max-w-[90vw] sm:max-w-xs whitespace-pre-line"
          openOnClick={isTouchDevice}
        />
      );
    });
  };

  const dadoIcono = () => <BsDice6 className="inline" />;
  const iconoDano = tipo => {
    if (!tipo) return null;
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
            <h2 className="text-xl font-semibold text-white mb-2">¿Quién eres?</h2>
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
            <p className="text-sm font-medium text-gray-400">Versión 2.1.9</p>
            <p className="text-xs text-gray-500">Animación de dados mejorada.</p>
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
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {existingPlayers.map((n) => (
                  <Boton
                    key={n}
                    color="gray"
                    size="md"
                    className="w-full rounded-lg font-semibold text-base px-4 py-2 transition-colors duration-200"
                    onClick={() => {
                      setPlayerName(n);
                      setTimeout(() => setNameEntered(true), 0);
                    }}
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
  // CALCULADORA DE DADOS
  if (userType === 'player' && nameEntered && showDiceCalculator) {
    return <DiceCalculator playerName={playerName} onBack={() => setShowDiceCalculator(false)} />;
  }
  // MINIJUEGO BARRA-REFLEJOS
  if (userType === 'player' && nameEntered && showBarraReflejos) {
    return <BarraReflejos playerName={playerName} onBack={() => setShowBarraReflejos(false)} />;
  }
  // SISTEMA DE INICIATIVA
  if (userType === 'player' && nameEntered && showInitiativeTracker) {
    return <InitiativeTracker 
      playerName={playerName} 
      isMaster={authenticated} 
      glossary={glossary}
      playerEquipment={{
        weapons: playerData.weapons,
        armaduras: playerData.armaduras,
        poderes: playerData.poderes
      }}
      armas={armas}
      armaduras={armaduras}
      habilidades={habilidades}
      onBack={() => setShowInitiativeTracker(false)} 
    />;
  }
  // FICHA JUGADOR
  if (userType === 'player' && nameEntered) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 px-2 py-4">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <h1 className="text-2xl font-bold text-center mb-2">Ficha de {playerName}</h1>
          {/* Botones de herramientas */}
          <div className="mb-4 flex gap-3 justify-center">
            {/* Botón de calculadora de dados */}
            <Boton
              onClick={() => setShowDiceCalculator(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-lg flex items-center justify-center text-xl"
            >
              🎲
            </Boton>
            {/* Botón de minijuego reflejos */}
            <Boton
              onClick={() => setShowBarraReflejos(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white w-12 h-12 rounded-lg flex items-center justify-center text-xl"
            >
              🔒
            </Boton>
            {/* Botón de sistema de iniciativa */}
            <Boton
              onClick={() => setShowInitiativeTracker(true)}
              className="bg-green-600 hover:bg-green-700 text-white w-12 h-12 rounded-lg flex items-center justify-center text-xl"
            >
              ⚡
            </Boton>
          </div>
          <div className="mb-4 text-center text-sm text-gray-300 flex flex-col gap-1">
            <span className="flex flex-wrap justify-center items-center gap-2">
              Res. Física:
              <select
                value={playerData.resistenciaFisica}
                onChange={e => handleResistenciaChange('fisica', e.target.value)}
                className="bg-gray-700 text-white px-1 rounded"
              >
                {resourcesList.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              ({playerData.stats[playerData.resistenciaFisica]?.total ?? 0})
              {'   |   '}
              Res. Mental:
              <select
                value={playerData.resistenciaMental}
                onChange={e => handleResistenciaChange('mental', e.target.value)}
                className="bg-gray-700 text-white px-1 rounded"
              >
                {resourcesList.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              ({playerData.stats[playerData.resistenciaMental]?.total ?? 0})
            </span>
            <span>
              Carga física total: {cargaFisicaIcon(playerData.cargaAcumulada?.fisica)} ({playerData.cargaAcumulada?.fisica || 0})
              {'   |   '}
              Carga mental total: {cargaMentalIcon(playerData.cargaAcumulada?.mental)} ({playerData.cargaAcumulada?.mental || 0})
            </span>
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
          <div className="flex flex-col sm:flex-row gap-4 mb-6 w-full justify-center">
            <Boton
              color="blue"
              className="py-3 px-6 rounded-lg font-extrabold text-base tracking-wide shadow-sm w-full sm:w-auto"
              onClick={guardarDatosFicha}
            >Guardar datos</Boton>
            <Boton
              color="yellow"
              className="py-3 px-6 rounded-lg font-extrabold text-base tracking-wide shadow-sm w-full sm:w-auto"
              onClick={resetearFichaDesdeBackup}
            >RESET</Boton>
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
            {resourcesList.map(({ id: r, name, color, info }, index) => {
              const s = playerData.stats[r] || { base: 0, total: 0, actual: 0, buff: 0 };
              const baseV = Math.min(s.base || 0, RESOURCE_MAX);
              const actualV = Math.min(s.actual || 0, RESOURCE_MAX);
              const buffV = s.buff || 0;
              const resistenciaFisica =
                playerData.stats[playerData.resistenciaFisica]?.total ?? 0;
              const resistenciaMental =
                playerData.stats[playerData.resistenciaMental]?.total ?? 0;
              const cargaFisicaTotal = playerData.cargaAcumulada?.fisica || 0;
              const cargaMentalTotal = playerData.cargaAcumulada?.mental || 0;
              let penalizacion = 0;
              let baseEfectiva = baseV;
              if (r === 'postura') {
                penalizacion = Math.max(0, cargaFisicaTotal - resistenciaFisica);
                baseEfectiva = Math.max(0, baseV - penalizacion);
              } else if (r === 'cordura') {
                penalizacion = Math.max(0, cargaMentalTotal - resistenciaMental);
                baseEfectiva = Math.max(0, baseV - penalizacion);
              }
              const overflowBuf = Math.max(0, buffV - (RESOURCE_MAX - baseEfectiva));
              return (
                <motion.div
                  key={r}
                  layout="position"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="bg-gray-800 rounded-xl p-4 shadow w-full"
                >
                  {/* Nombre centrado y controles a la derecha, en la misma fila */}
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
                    {/* Controles de reordenamiento y eliminación */}
                    <div className="absolute right-0 flex items-center gap-1">
                      {/* Botón subir */}
                      <button
                        onClick={() => moveStatUp(index)}
                        disabled={index === 0}
                        className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded transition-all duration-200 ${
                          index === 0
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-blue-400 hover:text-blue-200 hover:bg-blue-900/30'
                        }`}
                        title="Mover hacia arriba"
                      >
                        ↑
                      </button>
                      {/* Botón bajar */}
                      <button
                        onClick={() => moveStatDown(index)}
                        disabled={index === resourcesList.length - 1}
                        className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded transition-all duration-200 ${
                          index === resourcesList.length - 1
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-blue-400 hover:text-blue-200 hover:bg-blue-900/30'
                        }`}
                        title="Mover hacia abajo"
                      >
                        ↓
                      </button>
                      {/* Botón eliminar */}
                      <button
                        onClick={() => handleEliminarRecurso(r)}
                        className="w-6 h-6 flex items-center justify-center text-xs font-bold text-red-400 hover:text-red-200 hover:bg-red-900/30 rounded transition-all duration-200"
                        title="Eliminar esta estadística"
                      >
                        ❌
                      </button>
                    </div>
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
                        onClick={() => handleIncrease(r)}
                      >
                        +
                      </Boton>
                      <Boton
                        color="yellow"
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
                </motion.div>
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
          {/* FORMULARIO "Añadir recurso" */}
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
            <div className="flex justify-center w-full">
              <div className="relative w-full max-w-md">
                <Input
                  placeholder="Busca un arma"
                  value={playerInputArma}
                  onChange={e => setPlayerInputArma(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePlayerEquip()}
                  className="w-full mb-1 rounded-lg bg-gray-700 border border-gray-600 text-white font-semibold text-base shadow px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-center"
                />
                {armaSugerencias.length > 0 && (
                  <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full text-left z-10">
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
              </div>
            </div>
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
            <div className="flex justify-center w-full">
              <div className="relative w-full max-w-md">
                <Input
                  placeholder="Busca una armadura"
                  value={playerInputArmadura}
                  onChange={e => setPlayerInputArmadura(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePlayerEquipArmadura()}
                  className="w-full mb-1 rounded-lg bg-gray-700 border border-gray-600 text-white font-semibold text-base shadow px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-center"
                />
                {armaduraSugerencias.length > 0 && (
                  <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full text-left z-10">
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
              </div>
            </div>
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
            <div className="flex justify-center w-full">
              <div className="relative w-full max-w-md">
                <Input
                  placeholder="Busca un poder"
                  value={playerInputPoder}
                  onChange={e => setPlayerInputPoder(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePlayerEquipPoder()}
                  className="w-full mb-1 rounded-lg bg-gray-700 border border-gray-600 text-white font-semibold text-base shadow px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 transition text-center"
                />
                {poderSugerencias.length > 0 && (
                  <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full text-left z-10">
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
              </div>
            </div>
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
        {renderTooltips()}
      </div>
    );
  }
  // MODO MÁSTER
  if (userType === 'master' && authenticated && !chosenView) {
    return <MasterMenu onSelect={setChosenView} onBackToMain={volverAlMenu} />;
  }
  if (userType === 'master' && authenticated && chosenView === 'initiative') {
    return <InitiativeTracker 
      playerName="Master" 
      isMaster={true} 
      enemies={enemies}
      glossary={glossary}
      onBack={() => setChosenView(null)} 
    />;
  }
  if (userType === 'master' && authenticated && chosenView === 'enemies') {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
        <div className="sticky top-0 bg-gray-900 pb-2 z-10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">👹 Fichas de Enemigos</h1>
            <div className="flex gap-2">
              <Boton color="indigo" onClick={() => setChosenView('canvas')}>Mapa de Batalla</Boton>
              <Boton color="purple" onClick={() => setChosenView('tools')}>Herramientas</Boton>
              <Boton onClick={() => setChosenView(null)} className="bg-gray-700 hover:bg-gray-600">
                ← Volver al Menú
              </Boton>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Boton color="green" onClick={createNewEnemy}>Crear Nuevo Enemigo</Boton>
            <Boton onClick={refreshCatalog}>Refrescar</Boton>
          </div>
        </div>
        {/* Lista de enemigos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {enemies.map((enemy) => (
            <Tarjeta key={enemy.id} variant="magic" className="p-0 overflow-visible bg-gradient-to-br from-yellow-100/10 to-purple-900/30 border-4 border-yellow-900/40 shadow-2xl">
              <div className="flex flex-col h-full">
                {/* Imagen tipo Magic */}
                <div className="w-full aspect-[4/3] bg-gray-900 rounded-t-xl overflow-hidden flex items-center justify-center border-b-2 border-yellow-900/30">
                  {enemy.portrait ? (
                    <img
                      src={enemy.portrait}
                      alt={enemy.name}
                      className="w-full h-full object-contain object-center"
                      style={{ background: '#222' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-gray-700">👹</div>
                  )}
                </div>
                {/* Nombre y descripción */}
                <div className="flex-1 flex flex-col px-4 pt-3 pb-2">
                  <h3 className="text-2xl font-extrabold text-yellow-200 drop-shadow mb-1 text-center uppercase tracking-wider" style={{ textShadow: '0 2px 8px #000a' }}>{enemy.name}</h3>
                  {enemy.description && (
                    <p className="text-gray-200 text-sm mb-2 text-center line-clamp-2 italic">{enemy.description}</p>
                  )}
                </div>
                {/* Acciones */}
                <div className="flex gap-2 px-4 pb-4 pt-2 justify-center border-t border-yellow-900/20">
                  <Boton
                    color="blue"
                    size="sm"
                    onClick={() => editEnemy(enemy)}
                    className="flex-1"
                  >
                    Editar
                  </Boton>
                  <Boton
                    color="purple"
                    size="sm"
                    onClick={() => setSelectedEnemy(enemy)}
                    className="flex-1"
                  >
                    Ver Ficha
                  </Boton>
                  <Boton
                    color="red"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar a ${enemy.name}?`)) {
                        deleteEnemy(enemy.id);
                      }
                    }}
                  >
                    🗑️
                  </Boton>
                </div>
              </div>
            </Tarjeta>
          ))}
        </div>
        {enemies.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-lg">No hay enemigos creados</p>
            <p className="text-gray-500 text-sm mt-2">Crea tu primer enemigo para empezar</p>
          </div>
        )}
        {/* Modal para crear/editar enemigo */}
        {showEnemyForm && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowEnemyForm(false);
              setEditingEnemy(null);
              setEnemyInputArma('');
              setEnemyInputArmadura('');
              setEnemyInputPoder('');
              setEnemyArmaError('');
              setEnemyArmaduraError('');
              setEnemyPoderError('');
            }}
          >
            <div
              className="bg-gray-800 rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-4">
                {editingEnemy ? 'Editar Enemigo' : 'Crear Nuevo Enemigo'}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Columna izquierda: Información básica */}
                <div className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre</label>
                    <Input
                      value={newEnemy.name}
                      onChange={(e) => setNewEnemy({...newEnemy, name: e.target.value})}
                      placeholder="Nombre del enemigo"
                      className="w-full"
                    />
                  </div>
                  {/* Retrato */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Retrato</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                    {newEnemy.portrait && (
                      <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden bg-gray-700 flex items-center justify-center">
                        <img
                          src={newEnemy.portrait}
                          alt="Preview"
                          className="w-full h-full object-contain object-center rounded-lg shadow border border-gray-800"
                          style={{ background: '#222' }}
                        />
                      </div>
                    )}
                  </div>
                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Descripción</label>
                    <textarea
                      value={newEnemy.description}
                      onChange={(e) => setNewEnemy({...newEnemy, description: e.target.value})}
                      placeholder="Descripción del enemigo"
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-20 resize-none"
                    />
                  </div>
                  {/* Nivel y Experiencia */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nivel</label>
                      <Input
                        type="number"
                        value={newEnemy.nivel}
                        onChange={(e) => setNewEnemy({...newEnemy, nivel: parseInt(e.target.value) || 1})}
                        min="1"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Experiencia</label>
                      <Input
                        type="number"
                        value={newEnemy.experiencia}
                        onChange={(e) => setNewEnemy({...newEnemy, experiencia: parseInt(e.target.value) || 0})}
                        min="0"
                        className="w-full"
                      />
                    </div>
                  </div>
                  {/* Dinero */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Dinero</label>
                    <Input
                      type="number"
                      value={newEnemy.dinero}
                      onChange={(e) => setNewEnemy({...newEnemy, dinero: parseInt(e.target.value) || 0})}
                      min="0"
                      className="w-full"
                    />
                  </div>
                  {/* Notas */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Notas</label>
                    <textarea
                      value={newEnemy.notas}
                      onChange={(e) => setNewEnemy({...newEnemy, notas: e.target.value})}
                      placeholder="Notas adicionales sobre el enemigo"
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-16 resize-none"
                    />
                  </div>
                </div>
                {/* Columna derecha: Atributos y Estadísticas */}
                <div className="space-y-4">
                  {/* Atributos */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Atributos</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {atributos.map(attr => (
                        <div key={attr} className="flex items-center gap-2">
                          <label className="text-sm font-medium w-16">{attr}:</label>
                          <select
                            value={newEnemy.atributos[attr] || 'D4'}
                            onChange={(e) => {
                              const newAtributos = { ...newEnemy.atributos, [attr]: e.target.value };
                              const updatedEnemy = { ...newEnemy, atributos: newAtributos };
                              setNewEnemy(updatedEnemy);
                            }}
                            className="flex-1 p-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          >
                            {DADOS.map(dado => (
                              <option key={dado} value={dado}>{dado}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Estadísticas */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Estadísticas</h3>
                    <div className="space-y-3">
                      {defaultRecursos.map(recurso => {
                        const stat = newEnemy.stats[recurso] || { base: 0, total: 0, actual: 0, buff: 0 };
                        const color = recursoColor[recurso] || '#ffffff';
                        return (
                          <div key={recurso} className="space-y-2">
                            {/* Línea minimalista como en fichas de jugador */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium capitalize" style={{ color }}>{recurso}</span>
                              <div className="flex gap-2 text-xs">
                                <span className="text-gray-400">Base: {stat.base}</span>
                                <span className="text-green-400">+{stat.buff}</span>
                                <span className="text-blue-400">= {stat.total}</span>
                                <span className="text-yellow-400">({stat.actual})</span>
                              </div>
                            </div>
                            {/* Controles de edición */}
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                type="number"
                                placeholder="Base"
                                value={stat.base}
                                onChange={(e) => {
                                  const newStats = { ...newEnemy.stats };
                                  if (!newStats[recurso]) newStats[recurso] = { base: 0, total: 0, actual: 0, buff: 0 };
                                  newStats[recurso].base = parseInt(e.target.value) || 0;
                                  newStats[recurso].total = newStats[recurso].base + newStats[recurso].buff;
                                  if (newStats[recurso].actual === 0) {
                                    newStats[recurso].actual = newStats[recurso].total;
                                  }
                                  setNewEnemy({ ...newEnemy, stats: newStats });
                                }}
                                className="text-sm"
                              />
                              <Input
                                type="number"
                                placeholder="Buff"
                                value={stat.buff}
                                onChange={(e) => {
                                  const newStats = { ...newEnemy.stats };
                                  if (!newStats[recurso]) newStats[recurso] = { base: 0, total: 0, actual: 0, buff: 0 };
                                  newStats[recurso].buff = parseInt(e.target.value) || 0;
                                  newStats[recurso].total = newStats[recurso].base + newStats[recurso].buff;
                                  setNewEnemy({ ...newEnemy, stats: newStats });
                                }}
                                className="text-sm"
                              />
                              <Input
                                type="number"
                                placeholder="Actual"
                                value={stat.actual}
                                onChange={(e) => {
                                  const newStats = { ...newEnemy.stats };
                                  if (!newStats[recurso]) newStats[recurso] = { base: 0, total: 0, actual: 0, buff: 0 };
                                  newStats[recurso].actual = parseInt(e.target.value) || 0;
                                  setNewEnemy({ ...newEnemy, stats: newStats });
                                }}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              {/* Sección de Equipo */}
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold">Equipo</h3>
                {/* Armas Equipadas */}
                <div>
                  <h4 className="font-medium mb-2">Armas Equipadas</h4>
                  <div className="grid grid-cols-1 gap-2 mb-2">
                    {newEnemy.weapons.map((weapon, index) => (
                      <Tarjeta key={index} variant="weapon" className="text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">⚔️</span>
                              <p className="font-bold">{weapon.nombre}</p>
                            </div>
                            <p className="text-xs mb-1">
                              <span className="font-medium">Daño:</span> {dadoIcono()} {weapon.dano} {iconoDano(weapon.tipoDano)}
                            </p>
                            <p className="text-xs mb-1">
                              <span className="font-medium">Alcance:</span> {weapon.alcance}
                            </p>
                            <p className="text-xs mb-1">
                              <span className="font-medium">Consumo:</span> {weapon.consumo}
                            </p>
                            {weapon.rasgos && weapon.rasgos.length > 0 && (
                              <p className="text-xs mb-1">
                                <span className="font-medium">Rasgos:</span> {highlightText(weapon.rasgos.join(', '))}
                              </p>
                            )}
                            {weapon.descripcion && (
                              <p className="text-xs text-gray-300">
                                <span className="font-medium">Descripción:</span> {highlightText(weapon.descripcion)}
                              </p>
                            )}
                          </div>
                          <Boton
                            color="red"
                            size="sm"
                            onClick={() => unequipEnemyWeapon(index)}
                            className="text-xs px-2 py-1 ml-2"
                          >
                            ✕
                          </Boton>
                        </div>
                      </Tarjeta>
                    ))}
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Buscar arma para equipar"
                      value={enemyInputArma}
                      onChange={(e) => setEnemyInputArma(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEnemyEquipWeapon()}
                      className="flex-1 text-sm"
                    />
                    {enemyArmaSugerencias.length > 0 && (
                      <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full text-left z-10">
                        {enemyArmaSugerencias.map(a => (
                          <li
                            key={a.nombre}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                            onClick={() => handleEnemyEquipWeaponFromSuggestion(a.nombre)}
                          >
                            {a.nombre}
                          </li>
                        ))}
                      </ul>
                    )}
                    {enemyArmaError && <p className="text-red-400 text-xs mt-1">{enemyArmaError}</p>}
                  </div>
                </div>
                {/* Armaduras Equipadas */}
                <div>
                  <h4 className="font-medium mb-2">Armaduras Equipadas</h4>
                  <div className="grid grid-cols-1 gap-2 mb-2">
                    {newEnemy.armaduras.map((armor, index) => (
                      <Tarjeta key={index} variant="armor" className="text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">🛡️</span>
                              <p className="font-bold">{armor.nombre}</p>
                            </div>
                            <p className="text-xs mb-1">
                              <span className="font-medium">Defensa:</span> {armor.defensa}
                            </p>
                            {armor.rasgos && armor.rasgos.length > 0 && (
                              <p className="text-xs mb-1">
                                <span className="font-medium">Rasgos:</span> {highlightText(armor.rasgos.join(', '))}
                              </p>
                            )}
                            {armor.descripcion && (
                              <p className="text-xs text-gray-300">
                                <span className="font-medium">Descripción:</span> {highlightText(armor.descripcion)}
                              </p>
                            )}
                          </div>
                          <Boton
                            color="red"
                            size="sm"
                            onClick={() => unequipEnemyArmor(index)}
                            className="text-xs px-2 py-1 ml-2"
                          >
                            ✕
                          </Boton>
                        </div>
                      </Tarjeta>
                    ))}
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Buscar armadura para equipar"
                      value={enemyInputArmadura}
                      onChange={(e) => setEnemyInputArmadura(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEnemyEquipArmor()}
                      className="flex-1 text-sm"
                    />
                    {enemyArmaduraSugerencias.length > 0 && (
                      <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full text-left z-10">
                        {enemyArmaduraSugerencias.map(a => (
                          <li
                            key={a.nombre}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                            onClick={() => handleEnemyEquipArmorFromSuggestion(a.nombre)}
                          >
                            {a.nombre}
                          </li>
                        ))}
                      </ul>
                    )}
                    {enemyArmaduraError && <p className="text-red-400 text-xs mt-1">{enemyArmaduraError}</p>}
                  </div>
                </div>
                {/* Poderes Equipados */}
                <div>
                  <h4 className="font-medium mb-2">Poderes Equipados</h4>
                  <div className="grid grid-cols-1 gap-2 mb-2">
                    {newEnemy.poderes.map((power, index) => (
                      <Tarjeta key={index} variant="power" className="text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">💪</span>
                              <p className="font-bold">{power.nombre}</p>
                            </div>
                            <p className="text-xs mb-1">
                              <span className="font-medium">Alcance:</span> {power.alcance}
                            </p>
                            <p className="text-xs mb-1">
                              <span className="font-medium">Consumo:</span> {power.consumo}
                            </p>
                            <p className="text-xs mb-1">
                              <span className="font-medium">Poder:</span> {power.poder}
                            </p>
                            {power.descripcion && (
                              <p className="text-xs text-gray-300">
                                <span className="font-medium">Descripción:</span> {highlightText(power.descripcion)}
                              </p>
                            )}
                          </div>
                          <Boton
                            color="red"
                            size="sm"
                            onClick={() => unequipEnemyPower(index)}
                            className="text-xs px-2 py-1 ml-2"
                          >
                            ✕
                          </Boton>
                        </div>
                      </Tarjeta>
                    ))}
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Buscar poder para equipar"
                      value={enemyInputPoder}
                      onChange={(e) => setEnemyInputPoder(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEnemyEquipPower()}
                      className="flex-1 text-sm"
                    />
                    {enemyPoderSugerencias.length > 0 && (
                      <ul className="absolute top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow max-h-48 overflow-y-auto w-full text-left z-10">
                        {enemyPoderSugerencias.map(a => (
                          <li
                            key={a.nombre}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                            onClick={() => handleEnemyEquipPowerFromSuggestion(a.nombre)}
                          >
                            {a.nombre}
                          </li>
                        ))}
                      </ul>
                    )}
                    {enemyPoderError && <p className="text-red-400 text-xs mt-1">{enemyPoderError}</p>}
                  </div>
                </div>
              </div>
              {/* Botones */}
              <div className="flex gap-2 pt-6 border-t border-gray-700 mt-6">
                <Boton
                  color="green"
                  onClick={handleSaveEnemy}
                  className="flex-1"
                >
                  {editingEnemy ? 'Actualizar' : 'Crear'} Enemigo
                </Boton>
                <Boton
                  color="gray"
                  onClick={() => {
                    setShowEnemyForm(false);
                    setEditingEnemy(null);
                    setEnemyInputArma('');
                    setEnemyInputArmadura('');
                    setEnemyInputPoder('');
                    setEnemyArmaError('');
                    setEnemyArmaduraError('');
                    setEnemyPoderError('');
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Boton>
              </div>
            </div>
          </div>
        )}
        {/* Modal para ver ficha completa */}
        {selectedEnemy && (
          <EnemyViewModal
            enemy={selectedEnemy}
            onClose={() => setSelectedEnemy(null)}
            onEdit={editEnemy}
            highlightText={highlightText}
          />
        )}
      </div>
    );
  }
  if (userType === 'master' && authenticated && chosenView === 'canvas') {
    return (
      <div className="h-screen flex flex-col bg-gray-900 text-gray-100 p-4 pl-16 overflow-hidden">
        <div className="sticky top-0 bg-gray-900 z-10 h-14 flex items-center justify-between mb-4 mr-80">
          <h1 className="text-2xl font-bold">🗺️ Mapa de Batalla</h1>
          <div className="flex flex-wrap gap-2">
              <Boton
                size="sm"
                onClick={() => setChosenView(null)}
                className="bg-gray-700 hover:bg-gray-600"
              >
                ← Menú Máster
              </Boton>
            <Boton
              size="sm"
              color="red"
              onClick={() => setChosenView('enemies')}
            >
              Fichas de Enemigos
            </Boton>
            <Boton
              size="sm"
              color="blue"
              onClick={() => setChosenView('initiative')}
            >
              Sistema de Velocidad
            </Boton>
            <Boton
              size="sm"
              color="purple"
              onClick={() => setChosenView('tools')}
            >
              Herramientas
            </Boton>
          </div>
        </div>
        <div className="mb-4 mr-80">
          <input type="file" accept="image/*" onChange={handleBackgroundUpload} />
        </div>
        <div className="mr-80">
          <PageSelector
            pages={pages}
            current={currentPage}
            onSelect={setCurrentPage}
            onAdd={addPage}
            onUpdate={updatePage}
            onDelete={deletePage}
          />
        </div>
        <div className="relative pt-14 flex-1 overflow-hidden">
          <div className="h-full mr-80">
            <MapCanvas
              backgroundImage={canvasBackground || 'https://via.placeholder.com/800x600'}
              gridSize={gridSize}
              gridCells={gridCells}
              gridOffsetX={gridOffsetX}
              gridOffsetY={gridOffsetY}
              tokens={canvasTokens}
              onTokensChange={setCanvasTokens}
              lines={canvasLines}
              onLinesChange={setCanvasLines}
              enemies={enemies}
              onEnemyUpdate={updateEnemyFromToken}
              players={existingPlayers}
              armas={armas}
              armaduras={armaduras}
              habilidades={habilidades}
              highlightText={highlightText}
              userType={userType}
              playerName={playerName}
            />
          </div>
          <AssetSidebar isMaster={authenticated} playerName={playerName} />
        </div>
      </div>
    );
  }
  if (userType === 'master' && authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
        <div className="sticky top-0 bg-gray-900 pb-2 z-10">
          <h1 className="text-2xl font-bold mb-2">Modo Máster</h1>
          <div className="flex flex-wrap gap-2 mb-2">
            <Boton onClick={() => setChosenView(null)}>
              ← Menú Máster
            </Boton>
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
