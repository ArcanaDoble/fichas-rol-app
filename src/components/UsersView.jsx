import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { FiSearch, FiUser, FiCalendar, FiPlus, FiMinus, FiKey, FiTrash2, FiCompass, FiCheck } from 'react-icons/fi';
import Boton from './Boton';
import Modal from './Modal';
import { deleteDoc } from 'firebase/firestore';
import {
    normalizeRogueliteAccess,
    setRogueliteEnabled,
    toggleRogueliteClass,
    withRogueliteAccess,
} from '../features/roguelite/access';
import { mergeRogueliteClassCatalogs } from '../features/roguelite/classDefinition';
import { normalizeRogueliteProfileLevel } from '../features/roguelite/profileClass';
import {
    describeRogueliteLevelEffect,
    getRogueliteLevelEffects,
} from '../features/roguelite/progression';

const getProfileClassKey = (playerId, classId) => `${playerId}::${classId}`;

const getClassMaximumLevel = (classItem) => Math.max(
    1,
    Array.isArray(classItem?.classLevels) ? classItem.classLevels.length : 10,
);

const UsersView = ({ onBack }) => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [rogueliteClasses, setRogueliteClasses] = useState([]);
    const [rogueliteClassesLoading, setRogueliteClassesLoading] = useState(true);
    const [rogueliteProfileLevels, setRogueliteProfileLevels] = useState({});
    const [pendingLevelChange, setPendingLevelChange] = useState(null);
    const [savingProfileLevel, setSavingProfileLevel] = useState('');

    const [isCreating, setIsCreating] = useState(false);
    const [editingPasswordFor, setEditingPasswordFor] = useState(null);
    const [formData, setFormData] = useState({ name: '', passcode: '' });

    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                const snap = await getDocs(collection(db, 'players'));
                const data = snap.docs.map(doc => {
                    const d = doc.data();
                    return {
                        id: doc.id,
                        ...d,
                        stats: d.stats || {},
                        name: d.name || doc.id
                    };
                });
                setPlayers(data);

                const profileLevelEntries = await Promise.all(data.map(async (player) => {
                    try {
                        const profileSnapshot = await getDocs(collection(
                            db,
                            'players',
                            player.id,
                            'rogueliteClasses',
                        ));
                        return profileSnapshot.docs.map((profileDoc) => [
                            getProfileClassKey(player.id, profileDoc.id),
                            normalizeRogueliteProfileLevel(profileDoc.data()?.level),
                        ]);
                    } catch (profileError) {
                        console.error(`Error fetching roguelite levels for ${player.id}:`, profileError);
                        return [];
                    }
                }));
                setRogueliteProfileLevels(Object.fromEntries(profileLevelEntries.flat()));
            } catch (error) {
                console.error("Error fetching players:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlayers();

        const fetchRogueliteClasses = async () => {
            try {
                const [legacyResult, rogueliteResult] = await Promise.allSettled([
                    getDocs(collection(db, 'classes')),
                    getDocs(collection(db, 'rogueliteClasses')),
                ]);
                const mapSnapshot = (snapshot) => snapshot.docs.map((classDoc) => ({
                    ...classDoc.data(),
                    id: classDoc.id,
                }));
                const legacyClasses = legacyResult.status === 'fulfilled'
                    ? mapSnapshot(legacyResult.value)
                    : [];
                const dedicatedClasses = rogueliteResult.status === 'fulfilled'
                    ? mapSnapshot(rogueliteResult.value)
                    : [];

                if (legacyResult.status === 'rejected') {
                    console.error('Error fetching legacy classes:', legacyResult.reason);
                }
                if (rogueliteResult.status === 'rejected') {
                    console.error('Error fetching dedicated roguelite classes:', rogueliteResult.reason);
                }
                setRogueliteClasses(mergeRogueliteClassCatalogs(
                    legacyClasses,
                    dedicatedClasses,
                ));
            } catch (error) {
                console.error('Error fetching roguelite classes:', error);
            } finally {
                setRogueliteClassesLoading(false);
            }
        };
        fetchRogueliteClasses();
    }, []);

    const handleCreateUser = async () => {
        if (!formData.name.trim()) return alert("El nombre es obligatorio");
        if (!formData.passcode.trim()) return alert("La contraseña es obligatoria");

        // Check if name already exists
        const exists = players.some(p => p.name.toLowerCase() === formData.name.trim().toLowerCase());
        if (exists) return alert("Ya existe un jugador con este nombre");

        try {
            await setDoc(doc(db, 'players', formData.name.trim()), {
                name: formData.name.trim(),
                passcode: formData.passcode.trim(),
                createdAt: new Date(),
                permissions: {},
                gameAccess: {
                    roguelite: {
                        enabled: false,
                        unlockedClassIds: [],
                    },
                },
                // Inicializar datos de juego por defecto para evitar errores
                atributos: {
                    destreza: 0,
                    vigor: 0,
                    intelecto: 0,
                    voluntad: 0
                },
                stats: {
                    vida: { base: 10, total: 10, actual: 10 },
                    postura: { base: 10, total: 10, actual: 10 },
                    cordura: { base: 10, total: 10, actual: 10 },
                    ingenio: { base: 5, total: 5, actual: 5 },
                    armadura: { base: 0, total: 0, actual: 0 }
                },
                weapons: [],
                armaduras: [],
                poderes: [],
                claves: [],
                estados: [],
                resourcesList: [
                    { id: 'postura', name: 'postura', color: '#34d399', info: 'Explicación de Postura' },
                    { id: 'vida', name: 'vida', color: '#f87171', info: 'Explicación de Vida' },
                    { id: 'ingenio', name: 'ingenio', color: '#60a5fa', info: 'Explicación de Ingenio' },
                    { id: 'cordura', name: 'cordura', color: '#a78bfa', info: 'Explicación de Cordura' },
                    { id: 'armadura', name: 'armadura', color: '#9ca3af', info: 'Explicación de Armadura' }
                ]
            });

            // Update local state
            const newPlayer = {
                id: formData.name.trim(),
                name: formData.name.trim(),
                passcode: formData.passcode.trim(),
                permissions: {},
                gameAccess: {
                    roguelite: {
                        enabled: false,
                        unlockedClassIds: [],
                    },
                },
                stats: {}
            };
            setPlayers([...players, newPlayer]);
            setIsCreating(false);
            setFormData({ name: '', passcode: '' });
        } catch (error) {
            console.error("Error creating user:", error);
            alert("Error al crear el usuario");
        }
    };

    const handleUpdatePassword = async () => {
        if (!editingPasswordFor) return;
        if (!formData.passcode.trim()) return alert("La contraseña no puede estar vacía");

        try {
            await setDoc(doc(db, 'players', editingPasswordFor.id), {
                passcode: formData.passcode.trim()
            }, { merge: true });

            const updatedPlayers = players.map(p =>
                p.id === editingPasswordFor.id ? { ...p, passcode: formData.passcode.trim() } : p
            );
            setPlayers(updatedPlayers);
            setEditingPasswordFor(null);
            setFormData({ name: '', passcode: '' });
        } catch (error) {
            console.error("Error updating password:", error);
            alert("Error al actualizar la contraseña");
        }
    };

    const handleDeleteUser = async (playerId) => {
        if (!window.confirm("¿Seguro que quieres eliminar este usuario? Se perderán todos sus datos.")) return;
        try {
            await deleteDoc(doc(db, 'players', playerId));
            setPlayers(players.filter(p => p.id !== playerId));
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Error al eliminar el usuario");
        }
    };

    const filteredPlayers = players.filter(p =>
        (p.name || p.id).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const togglePermission = async (player, permissionKey) => {
        if (!player || !player.id) return;

        // Determine current state (default to true if undefined)
        const currentVal = player.permissions ? player.permissions[permissionKey] : undefined;
        // If undefined, it means they have access (backward compatibility), so toggling means setting to false.
        // If it is explicitly true, toggle to false.
        // If it is explicitly false, toggle to true.
        // We can simplify: default is true.
        const effectiveVal = currentVal !== false;
        const newVal = !effectiveVal;

        // Optimistic update
        const updatedPlayers = players.map(p => {
            if (p.id === player.id) {
                return {
                    ...p,
                    permissions: {
                        ...(p.permissions || {}),
                        [permissionKey]: newVal
                    }
                };
            }
            return p;
        });
        setPlayers(updatedPlayers);

        try {
            await setDoc(doc(db, 'players', player.id), {
                permissions: {
                    [permissionKey]: newVal
                }
            }, { merge: true });
        } catch (error) {
            console.error("Error updating permissions:", error);
            // Revert changes if needed (not implemented for simplicity, but good practice)
        }
    };

    const persistRogueliteAccess = async (player, nextAccess) => {
        if (!player?.id) return;
        const previousAccess = normalizeRogueliteAccess(player);

        setPlayers((currentPlayers) => currentPlayers.map((currentPlayer) => (
            currentPlayer.id === player.id
                ? withRogueliteAccess(currentPlayer, nextAccess)
                : currentPlayer
        )));

        try {
            await updateDoc(doc(db, 'players', player.id), {
                'gameAccess.roguelite': nextAccess,
            });
        } catch (error) {
            console.error('Error updating roguelite access:', error);
            setPlayers((currentPlayers) => currentPlayers.map((currentPlayer) => (
                currentPlayer.id === player.id
                    ? withRogueliteAccess(currentPlayer, previousAccess)
                    : currentPlayer
            )));
            alert('No se pudo actualizar el acceso al modo Roguelite.');
        }
    };

    const handleRogueliteEnabledChange = (player) => {
        const currentAccess = normalizeRogueliteAccess(player);
        persistRogueliteAccess(player, setRogueliteEnabled(player, !currentAccess.enabled));
    };

    const requestProfileLevelChange = (player, classItem, direction) => {
        const profileKey = getProfileClassKey(player.id, classItem.id);
        const maximumLevel = getClassMaximumLevel(classItem);
        const currentLevel = normalizeRogueliteProfileLevel(
            rogueliteProfileLevels[profileKey] ?? 1,
            maximumLevel,
        );
        const nextLevel = Math.min(maximumLevel, Math.max(1, currentLevel + direction));
        if (nextLevel === currentLevel) return;

        const changedLevelNumber = direction > 0 ? nextLevel : currentLevel;
        const changedLevel = classItem.classLevels?.[changedLevelNumber - 1] || {};
        const resourceName = classItem.resource?.name
            || classItem.roguelite?.resource?.name
            || 'Recurso';

        setPendingLevelChange({
            profileKey,
            playerId: player.id,
            playerName: player.name || player.id,
            classId: classItem.id,
            className: classItem.name || 'Clase',
            currentLevel,
            nextLevel,
            direction,
            changedLevelTitle: changedLevel.title || `Nivel ${changedLevelNumber}`,
            effectDescriptions: getRogueliteLevelEffects(
                changedLevel,
                changedLevelNumber - 1,
                classItem.classLevels || [],
            ).map((effect) => describeRogueliteLevelEffect(effect, resourceName)),
        });
    };

    const confirmProfileLevelChange = async () => {
        if (!pendingLevelChange) return;
        const change = pendingLevelChange;
        setSavingProfileLevel(change.profileKey);

        try {
            await setDoc(doc(
                db,
                'players',
                change.playerId,
                'rogueliteClasses',
                change.classId,
            ), {
                id: change.classId,
                templateId: change.classId,
                owner: change.playerId,
                profileType: 'rogueliteClass',
                level: change.nextLevel,
            }, { merge: true });
            setRogueliteProfileLevels((currentLevels) => ({
                ...currentLevels,
                [change.profileKey]: change.nextLevel,
            }));
            setPendingLevelChange(null);
        } catch (error) {
            console.error('Error updating personal roguelite level:', error);
            alert('No se pudo actualizar el nivel de esta clase.');
        } finally {
            setSavingProfileLevel('');
        }
    };

    const handleRogueliteClassToggle = (player, classId) => {
        persistRogueliteAccess(player, toggleRogueliteClass(player, classId));
    };

    const PLAYER_PERMISSIONS = [
        { key: 'canViewInitiative', label: 'Iniciativa', icon: '⚡' },
        { key: 'canViewReflexesGame', label: 'Minijuego Reflejos', icon: '🔒' },
        { key: 'canViewDiceCalculator', label: 'Calculadora Dados', icon: '🎲' },
        { key: 'canViewMinimap', label: 'Minimapa', icon: '⌚️' },
    ];

    const MASTER_PERMISSIONS = [
        { key: 'canViewBestiary', label: 'Bestiario', icon: '👹', default: false },
        { key: 'canViewClasses', label: 'Lista de Clases', icon: '📜', default: false },
    ];

    return (
        <div className="min-h-screen bg-[#0b1120] text-gray-100 p-4 md:p-8 font-['Lato']">
            {/* Background similar to MasterMenu */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#0b1120] via-transparent to-[#0b1120]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#c8aa6e]/20 pb-6">
                    <div>
                        <h1 className="font-['Cinzel'] text-3xl md:text-4xl font-bold text-[#f0e6d2]">
                            Fichas de Jugadores
                        </h1>
                        <p className="text-slate-400 mt-2 text-sm uppercase tracking-wide">
                            Gestión de accesos y perfiles de jugadores
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex gap-4">
                            <Boton
                                color="green"
                                onClick={() => {
                                    setFormData({ name: '', passcode: '' });
                                    setIsCreating(true);
                                }}
                                className="flex items-center gap-2"
                            >
                                <FiPlus /> Crear Jugador
                            </Boton>
                            <Boton color="gray" onClick={onBack}>
                                ← Volver al Menú
                            </Boton>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        className="w-full bg-[#161f32] border border-gray-700/50 rounded-lg py-2 pl-10 pr-4 text-gray-200 focus:border-[#c8aa6e]/50 focus:outline-none transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-[#1a1b26] h-64 rounded-lg border border-gray-800"></div>
                        ))}
                    </div>
                ) : filteredPlayers.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 bg-[#161f32]/50 rounded-lg border border-gray-800 border-dashed">
                        <FiUser className="mx-auto text-4xl mb-4 opacity-50" />
                        No se encontraron jugadores.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPlayers.map((player, index) => (
                            <motion.div
                                key={player.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-[#1a1b26] border border-gray-800 hover:border-[#c8aa6e]/30 p-6 rounded-lg transition-all group relative overflow-hidden hover:shadow-lg hover:shadow-[#c8aa6e]/5"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                    <FiUser size={120} />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <h2 className="text-xl font-bold text-[#f0e6d2] font-['Cinzel'] truncate pr-2">
                                            {player.name}
                                        </h2>
                                        {player.nivel && (
                                            <span className="text-xs bg-[#c8aa6e]/10 text-[#c8aa6e] px-2 py-1 rounded font-bold uppercase tracking-wider">
                                                Nvl {player.nivel}
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs text-slate-500 font-mono mb-6 uppercase tracking-wider flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${player.hp > 0 ? 'bg-emerald-500' : 'bg-gray-600'}`}></span>
                                        {player.clase?.name || 'Clase no definida'}
                                    </p>

                                    {/* Stats (Compact) */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-6 opacity-80">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Vida</span>
                                            <span className="text-emerald-400 font-mono">{player.stats?.vida?.actual ?? 0}/{player.stats?.vida?.total ?? 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Cordura</span>
                                            <span className="text-purple-400 font-mono">{player.stats?.cordura?.actual ?? 0}/{player.stats?.cordura?.total ?? 0}</span>
                                        </div>
                                    </div>

                                    {/* Permissions Toggles */}
                                    <div className="border-t border-gray-800/50 pt-4 space-y-4">

                                        {/* Herramientas de Jugador */}
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Herramientas Básicas</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {PLAYER_PERMISSIONS.map(perm => {
                                                    let hasAccess;
                                                    if (player.permissions && player.permissions[perm.key] !== undefined) {
                                                        hasAccess = player.permissions[perm.key];
                                                    } else {
                                                        hasAccess = perm.default !== false;
                                                    }

                                                    return (
                                                        <button
                                                            key={perm.key}
                                                            onClick={() => togglePermission(player, perm.key)}
                                                            className={`
                                                                flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-all border
                                                                ${hasAccess
                                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                                                    : 'bg-red-500/5 border-red-500/20 text-red-500/50 hover:bg-red-500/10 hover:text-red-400'
                                                                }
                                                            `}
                                                            title={`Click para ${hasAccess ? 'revocar' : 'conceder'} acceso`}
                                                        >
                                                            <span className="text-base">{perm.icon}</span>
                                                            <span className="truncate">{perm.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Acceso independiente al modo Roguelite */}
                                        <div className="rounded-lg border border-[#c8aa6e]/20 bg-[#0b1120]/45 p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c8aa6e]/30 bg-[#c8aa6e]/10 text-[#c8aa6e]">
                                                        <FiCompass />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-['Cinzel'] text-xs font-bold uppercase tracking-wider text-[#f0e6d2]">
                                                            Modo Roguelite
                                                        </p>
                                                        <p className="text-[10px] text-slate-500">
                                                            Clases y aventuras del Canvas
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRogueliteEnabledChange(player)}
                                                    aria-pressed={normalizeRogueliteAccess(player).enabled}
                                                    className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${normalizeRogueliteAccess(player).enabled
                                                        ? 'border-emerald-400/50 bg-emerald-500/25'
                                                        : 'border-slate-600 bg-slate-800'
                                                        }`}
                                                    title={`${normalizeRogueliteAccess(player).enabled ? 'Desactivar' : 'Activar'} modo Roguelite`}
                                                >
                                                    <span className={`absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full transition-all ${normalizeRogueliteAccess(player).enabled
                                                        ? 'left-6 bg-emerald-400 text-emerald-950'
                                                        : 'left-1 bg-slate-500 text-slate-900'
                                                        }`}>
                                                        {normalizeRogueliteAccess(player).enabled && <FiCheck className="h-3 w-3" />}
                                                    </span>
                                                </button>
                                            </div>

                                            {normalizeRogueliteAccess(player).enabled && (
                                                <div className="mt-3 border-t border-[#c8aa6e]/10 pt-3">
                                                    <p className="mb-2 font-['Cinzel'] text-[9px] font-bold uppercase tracking-widest text-[#c8aa6e]/70">
                                                        Clases desbloqueadas
                                                    </p>
                                                    {rogueliteClassesLoading ? (
                                                        <p className="text-[10px] text-slate-500">Cargando clases...</p>
                                                    ) : rogueliteClasses.length === 0 ? (
                                                        <p className="rounded border border-dashed border-slate-700 px-2 py-2 text-[10px] leading-relaxed text-slate-500">
                                                            Aún no hay clases creadas en la Lista de Clases.
                                                        </p>
                                                    ) : (
                                                        <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                                                            {rogueliteClasses.map((classItem) => {
                                                                const isUnlocked = normalizeRogueliteAccess(player).unlockedClassIds.includes(classItem.id);
                                                                const profileKey = getProfileClassKey(player.id, classItem.id);
                                                                const maximumLevel = getClassMaximumLevel(classItem);
                                                                const currentLevel = normalizeRogueliteProfileLevel(
                                                                    rogueliteProfileLevels[profileKey] ?? 1,
                                                                    maximumLevel,
                                                                );
                                                                const nextLevel = classItem.classLevels?.[currentLevel];
                                                                const isSaving = savingProfileLevel === profileKey;
                                                                const isConfirming = pendingLevelChange?.profileKey === profileKey;
                                                                return (
                                                                    <div key={classItem.id} className="py-2" data-player-class={profileKey}>
                                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRogueliteClassToggle(player, classItem.id)}
                                                                                aria-pressed={isUnlocked}
                                                                                className={`flex min-h-9 min-w-0 items-center gap-2 border-l-2 px-2 text-left font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${isUnlocked
                                                                                    ? 'border-l-[#c8aa6e] text-[#e7cf9a]'
                                                                                    : 'border-l-slate-700 text-slate-500 hover:border-l-[#c8aa6e]/50 hover:text-slate-300'
                                                                                    }`}
                                                                            >
                                                                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center border ${isUnlocked ? 'border-[#c8aa6e]/60 text-[#c8aa6e]' : 'border-slate-700 text-transparent'}`}>
                                                                                    <FiCheck className="h-3 w-3" />
                                                                                </span>
                                                                                <span className="truncate">{classItem.name}</span>
                                                                            </button>

                                                                            {isUnlocked && (
                                                                                <div
                                                                                    className="flex h-10 shrink-0 items-stretch border border-[#c8aa6e]/20 bg-[#080c17]"
                                                                                    aria-label={`Nivel de ${classItem.name} para ${player.name || player.id}`}
                                                                                >
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => requestProfileLevelChange(player, classItem, -1)}
                                                                                        disabled={currentLevel <= 1 || isSaving}
                                                                                        className="flex w-10 touch-manipulation items-center justify-center border-r border-[#c8aa6e]/15 text-slate-500 transition hover:text-[#c8aa6e] disabled:cursor-not-allowed disabled:opacity-20"
                                                                                        aria-label={`Bajar ${classItem.name} de ${player.name || player.id} al nivel ${Math.max(1, currentLevel - 1)}`}
                                                                                    >
                                                                                        <FiMinus className="h-3.5 w-3.5" />
                                                                                    </button>
                                                                                    <div className="flex min-w-[76px] flex-col items-center justify-center px-2 leading-none">
                                                                                        <span className="font-['Cinzel'] text-[8px] font-bold uppercase tracking-[0.16em] text-slate-600">Nivel</span>
                                                                                        <span className="mt-1 font-mono text-xs font-bold text-[#e2d5b5]">{currentLevel} / {maximumLevel}</span>
                                                                                    </div>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => requestProfileLevelChange(player, classItem, 1)}
                                                                                        disabled={currentLevel >= maximumLevel || isSaving}
                                                                                        className="flex w-10 touch-manipulation items-center justify-center border-l border-[#c8aa6e]/15 text-[#9b8556] transition hover:bg-[#c8aa6e]/5 hover:text-[#e2d5b5] disabled:cursor-not-allowed disabled:opacity-20"
                                                                                        aria-label={`Subir ${classItem.name} de ${player.name || player.id} al nivel ${Math.min(maximumLevel, currentLevel + 1)}`}
                                                                                    >
                                                                                        <FiPlus className="h-3.5 w-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {isUnlocked && nextLevel && !isConfirming && (
                                                                            <p className="mt-1 pl-8 text-[10px] leading-relaxed text-slate-600">
                                                                                Próximo: <span className="text-slate-400">{nextLevel.title || `Nivel ${currentLevel + 1}`}</span>
                                                                            </p>
                                                                        )}

                                                                        {isUnlocked && isConfirming && (
                                                                            <div className="mt-2 border-l-2 border-[#c8aa6e]/55 bg-[#0d1422] px-3 py-2.5" data-level-confirmation={profileKey}>
                                                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                                                    <div className="min-w-0 flex-1">
                                                                                        <p className="font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.12em] text-[#e2d5b5]">
                                                                                            {pendingLevelChange.direction > 0 ? 'Subir de nivel' : 'Bajar de nivel'} · {pendingLevelChange.currentLevel} → {pendingLevelChange.nextLevel}
                                                                                        </p>
                                                                                        <p className="mt-1 text-[10px] text-slate-500">{pendingLevelChange.changedLevelTitle}</p>
                                                                                        {pendingLevelChange.effectDescriptions.length > 0 && (
                                                                                            <ul className="mt-1.5 space-y-0.5 text-[10px] text-[#c8aa6e]/75">
                                                                                                {pendingLevelChange.effectDescriptions.map((description) => (
                                                                                                    <li key={description}>{pendingLevelChange.direction > 0 ? '+' : '−'} {description}</li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex shrink-0 gap-2">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setPendingLevelChange(null)}
                                                                                            disabled={isSaving}
                                                                                            className="h-9 border border-slate-700 px-3 font-['Cinzel'] text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 transition hover:text-slate-300 disabled:opacity-40"
                                                                                        >
                                                                                            Cancelar
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={confirmProfileLevelChange}
                                                                                            disabled={isSaving}
                                                                                            className="h-9 border border-[#c8aa6e]/45 px-3 font-['Cinzel'] text-[9px] font-bold uppercase tracking-[0.12em] text-[#c8aa6e] transition hover:bg-[#c8aa6e]/10 hover:text-[#f0e6d2] disabled:opacity-40"
                                                                                        >
                                                                                            {isSaving ? 'Guardando…' : 'Confirmar'}
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2 flex justify-end">
                                            <button
                                                onClick={() => {
                                                    setFormData({ name: player.name, passcode: player.passcode || '' });
                                                    setEditingPasswordFor(player);
                                                }}
                                                className="text-xs text-slate-500 hover:text-[#c8aa6e] flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-[#c8aa6e]/10"
                                                title="Cambiar contraseña"
                                            >
                                                <FiKey /> {player.passcode ? '******' : 'Sin contraseña'}
                                            </button>
                                        </div>

                                        {/* Herramientas de Master (Privilegiadas) */}
                                        <div>
                                            <p className="text-[10px] text-amber-500/70 uppercase tracking-widest font-bold mb-2">Accesos de Master</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {MASTER_PERMISSIONS.map(perm => {
                                                    let hasAccess;
                                                    if (player.permissions && player.permissions[perm.key] !== undefined) {
                                                        hasAccess = player.permissions[perm.key];
                                                    } else {
                                                        hasAccess = perm.default !== false;
                                                    }

                                                    return (
                                                        <button
                                                            key={perm.key}
                                                            onClick={() => togglePermission(player, perm.key)}
                                                            className={`
                                                                flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-all border
                                                                ${hasAccess
                                                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                                                    : 'bg-red-500/5 border-red-500/20 text-red-500/50 hover:bg-red-500/10 hover:text-red-400'
                                                                }
                                                            `}
                                                            title={`Click para ${hasAccess ? 'revocar' : 'conceder'} acceso de Master`}
                                                        >
                                                            <span className="text-base">{perm.icon}</span>
                                                            <span className="truncate">{perm.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                    </div>

                                    <div className="pt-4 mt-4 border-t border-gray-800/50 flex justify-between items-center text-xs text-slate-500">
                                        <span className="flex items-center gap-1.5" title="Última actualización">
                                            <FiCalendar className="text-slate-600" />
                                            {player.updatedAt?.seconds
                                                ? new Date(player.updatedAt.seconds * 1000).toLocaleDateString()
                                                : 'Sin actividad'}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
            {/* Modal Crear Usuario */}
            <Modal
                isOpen={isCreating}
                onClose={() => setIsCreating(false)}
                title="Crear Nuevo Jugador"
                footer={
                    <>
                        <Boton color="gray" onClick={() => setIsCreating(false)}>Cancelar</Boton>
                        <Boton color="green" onClick={handleCreateUser}>Crear Usuario</Boton>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del Personaje</label>
                        <input
                            type="text"
                            className="w-full bg-[#0b1120] border border-gray-700 rounded p-2 text-white focus:border-[#c8aa6e] focus:outline-none"
                            placeholder="Ej. Arthas"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Contraseña de Acceso</label>
                        <input
                            type="text"
                            className="w-full bg-[#0b1120] border border-gray-700 rounded p-2 text-white focus:border-[#c8aa6e] focus:outline-none"
                            placeholder="Contraseña"
                            value={formData.passcode}
                            onChange={e => setFormData({ ...formData, passcode: e.target.value })}
                        />
                        <p className="text-xs text-slate-500 mt-1">Esta será la contraseña que usará el jugador para entrar.</p>
                    </div>
                </div>
            </Modal>

            {/* Modal Editar Contraseña */}
            <Modal
                isOpen={!!editingPasswordFor}
                onClose={() => setEditingPasswordFor(null)}
                title={`Contraseña para ${editingPasswordFor?.name}`}
                footer={
                    <>
                        <Boton color="gray" onClick={() => setEditingPasswordFor(null)}>Cancelar</Boton>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    handleDeleteUser(editingPasswordFor.id);
                                    setEditingPasswordFor(null);
                                }}
                                className="px-4 py-2 bg-red-900/30 text-red-500 rounded hover:bg-red-900/50 flex items-center gap-2 border border-red-900/50"
                            >
                                <FiTrash2 /> Eliminar Usuario
                            </button>
                            <Boton color="green" onClick={handleUpdatePassword}>Guardar</Boton>
                        </div>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nueva Contraseña</label>
                        <input
                            type="text"
                            className="w-full bg-[#0b1120] border border-gray-700 rounded p-2 text-white focus:border-[#c8aa6e] focus:outline-none"
                            placeholder="Nueva contraseña"
                            value={formData.passcode}
                            onChange={e => setFormData({ ...formData, passcode: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default UsersView;
