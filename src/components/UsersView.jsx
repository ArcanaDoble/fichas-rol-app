import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import {
    FiSearch,
    FiUser,
    FiCalendar,
    FiPlus,
    FiMinus,
    FiKey,
    FiTrash2,
    FiCompass,
    FiCheck,
} from 'react-icons/fi';
import Boton from './Boton';
import Modal from './Modal';
import {
    normalizeRogueliteAccess,
    setRogueliteEnabled,
    toggleRogueliteClass,
    withRogueliteAccess,
} from '../features/roguelite/access';
import { mergeRogueliteClassCatalogs } from '../features/roguelite/classDefinition';
import { normalizeRogueliteProfileLevel } from '../features/roguelite/profileClass';
import {
    resolveRogueliteProfileSyncState,
    resolveRogueliteTemplateRevision,
} from '../features/roguelite/activeRun';
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
    const [rogueliteProfiles, setRogueliteProfiles] = useState({});
    const [pendingLevelChange, setPendingLevelChange] = useState(null);
    const [savingProfileLevel, setSavingProfileLevel] = useState('');
    const [savingProfileSync, setSavingProfileSync] = useState('');

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

                const profileEntries = await Promise.all(data.map(async (player) => {
                    try {
                        const profileSnapshot = await getDocs(collection(
                            db,
                            'players',
                            player.id,
                            'rogueliteClasses',
                        ));
                        return profileSnapshot.docs.map((profileDoc) => {
                            const profileData = profileDoc.data() || {};
                            return [getProfileClassKey(player.id, profileDoc.id), {
                                ...profileData,
                                id: profileDoc.id,
                                owner: player.id,
                            }];
                        });
                    } catch (profileError) {
                        console.error(`Error fetching roguelite levels for ${player.id}:`, profileError);
                        return [];
                    }
                }));
                const nextProfiles = Object.fromEntries(profileEntries.flat());
                setRogueliteProfiles(nextProfiles);
                setRogueliteProfileLevels(Object.fromEntries(
                    Object.entries(nextProfiles).map(([key, profile]) => [
                        key,
                        normalizeRogueliteProfileLevel(profile?.level),
                    ]),
                ));
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
        const currentVal = player.permissions ? player.permissions[permissionKey] : undefined;
        const effectiveVal = currentVal !== false;
        const newVal = !effectiveVal;

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

    const requestProfileLevelChange = (player, classItem, targetInput) => {
        const profileKey = getProfileClassKey(player.id, classItem.id);
        const maximumLevel = getClassMaximumLevel(classItem);
        const currentLevel = normalizeRogueliteProfileLevel(
            rogueliteProfileLevels[profileKey] ?? 1,
            maximumLevel,
        );

        let nextLevel;
        if (targetInput === 1 || targetInput === -1) {
            nextLevel = Math.min(maximumLevel, Math.max(1, currentLevel + targetInput));
        } else {
            nextLevel = Math.min(maximumLevel, Math.max(1, Number(targetInput)));
        }

        if (nextLevel === currentLevel) return;

        const direction = nextLevel > currentLevel ? 1 : -1;
        const changedLevelNumber = nextLevel;
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
            setRogueliteProfiles((currentProfiles) => ({
                ...currentProfiles,
                [change.profileKey]: {
                    ...(currentProfiles[change.profileKey] || {}),
                    id: change.classId,
                    templateId: change.classId,
                    owner: change.playerId,
                    profileType: 'rogueliteClass',
                    level: change.nextLevel,
                },
            }));
            setPendingLevelChange(null);
        } catch (error) {
            console.error('Error updating personal roguelite level:', error);
            alert('No se pudo actualizar el nivel de esta clase.');
        } finally {
            setSavingProfileLevel('');
        }
    };

    const resetProfileRun = async (player, classItem) => {
        if (!window.confirm(`¿Finalizar la aventura de ${player.name || player.id} con ${classItem.name}? La ficha volverá a sus valores base y conservará su nivel.`)) return;

        const profileKey = getProfileClassKey(player.id, classItem.id);
        const templateRevision = resolveRogueliteTemplateRevision(classItem);
        const storedProfile = rogueliteProfiles[profileKey] || {};
        const resetFields = {
            activeRun: null,
            appliedTemplateRevision: templateRevision,
            personalStatusTags: [],
            money: 0,
            equippedItems: { mainHand: null, offHand: null, body: null, activeWeaponSet: 0 },
        };

        setSavingProfileSync(profileKey);
        try {
            await setDoc(
                doc(db, 'players', player.id, 'rogueliteClasses', classItem.id),
                resetFields,
                { merge: true },
            );
            setRogueliteProfiles((currentProfiles) => ({
                ...currentProfiles,
                [profileKey]: { ...storedProfile, ...resetFields },
            }));
        } catch (error) {
            console.error('Error resetting personal roguelite run:', error);
            alert('No se pudo finalizar y restablecer esta aventura.');
        } finally {
            setSavingProfileSync('');
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
        <div className="min-h-screen bg-[#070b14] text-slate-200 p-4 sm:p-6 md:p-8 font-['Lato']">
            {/* Background Texture */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#070b14] via-transparent to-[#070b14]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto space-y-6 sm:space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#c8aa6e]/25 pb-5">
                    <div>
                        <h1 className="font-['Cinzel'] text-2xl sm:text-3xl md:text-4xl font-bold text-[#f0e6d2] tracking-wide">
                            Fichas de Jugadores
                        </h1>
                        <p className="text-slate-400 mt-1 text-xs sm:text-sm uppercase tracking-wider">
                            Gestión de accesos y perfiles de jugadores
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => {
                                setFormData({ name: '', passcode: '' });
                                setIsCreating(true);
                            }}
                            className="flex h-10 items-center justify-center gap-2 border border-[#c8aa6e]/60 bg-[#c8aa6e]/15 px-4 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.1em] text-[#f0e6d2] transition hover:bg-[#c8aa6e]/30 hover:border-[#c8aa6e] active:bg-[#c8aa6e]/40"
                        >
                            <FiPlus className="h-4 w-4 text-[#c8aa6e]" /> Crear Jugador
                        </button>
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex h-10 items-center justify-center gap-2 border border-slate-700/80 bg-[#121927] px-4 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.1em] text-slate-300 transition hover:border-slate-500 hover:text-white active:bg-slate-800"
                        >
                            ← Volver al Menú
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-md">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar jugador por nombre..."
                        className="w-full bg-[#121927] border border-slate-700/60 rounded-none py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-200 font-['Cinzel'] placeholder:font-['Lato'] placeholder:text-slate-500 focus:border-[#c8aa6e]/70 focus:outline-none transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Player Cards Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-[#121927] h-64 border border-slate-800"></div>
                        ))}
                    </div>
                ) : filteredPlayers.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 bg-[#121927]/60 border border-dashed border-slate-800">
                        <FiUser className="mx-auto text-4xl mb-3 opacity-40" />
                        <p className="font-['Cinzel'] text-sm uppercase tracking-wider text-slate-400">No se encontraron jugadores</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPlayers.map((player, index) => {
                            const rogueliteAccess = normalizeRogueliteAccess(player);
                            const unlockedCount = rogueliteAccess.unlockedClassIds.length;

                            return (
                                <motion.div
                                    key={player.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                    className="bg-[#121927] border border-slate-800 hover:border-[#c8aa6e]/40 p-5 sm:p-6 transition-all group relative overflow-hidden flex flex-col justify-between shadow-lg"
                                >
                                    <div className="space-y-5">
                                        {/* Card Header: Player Name + Quick Controls */}
                                        <div className="flex justify-between items-start gap-3 border-b border-slate-800/80 pb-4">
                                            <div className="min-w-0 flex-1">
                                                <h2 className="text-xl font-bold text-[#f0e6d2] font-['Cinzel'] truncate tracking-wide">
                                                    {player.name}
                                                </h2>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1" title="Última actualización">
                                                        <FiCalendar className="text-slate-600 h-3 w-3" />
                                                        {player.updatedAt?.seconds
                                                            ? new Date(player.updatedAt.seconds * 1000).toLocaleDateString()
                                                            : 'Sin actividad'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ name: player.name, passcode: player.passcode || '' });
                                                        setEditingPasswordFor(player);
                                                    }}
                                                    className="flex h-8 items-center gap-1 border border-slate-700/60 bg-[#080c17] px-2 text-[10px] font-mono text-slate-400 transition hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e]"
                                                    title="Cambiar contraseña de acceso"
                                                >
                                                    <FiKey className="h-3 w-3 text-[#c8aa6e]/70" />
                                                    <span>{player.passcode ? '••••' : 'Sin clave'}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteUser(player.id)}
                                                    className="flex h-8 w-8 items-center justify-center text-slate-600 transition hover:text-rose-400 active:text-rose-500"
                                                    title="Eliminar usuario"
                                                >
                                                    <FiTrash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Player Basic Tools Toggles */}
                                        <div>
                                            <p className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">
                                                Herramientas de Jugador
                                            </p>
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
                                                            type="button"
                                                            onClick={() => togglePermission(player, perm.key)}
                                                            className={`
                                                                flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium transition-all border
                                                                ${hasAccess
                                                                    ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/20'
                                                                    : 'bg-slate-900/60 border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400'
                                                                }
                                                            `}
                                                            title={`Click para ${hasAccess ? 'revocar' : 'conceder'} acceso`}
                                                        >
                                                            <span className="text-sm">{perm.icon}</span>
                                                            <span className="truncate text-[11px]">{perm.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Master Privileged Access Toggles */}
                                        <div>
                                            <p className="text-[10px] font-['Cinzel'] font-bold uppercase tracking-[0.18em] text-amber-500/80 mb-2">
                                                Accesos de Máster
                                            </p>
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
                                                            type="button"
                                                            onClick={() => togglePermission(player, perm.key)}
                                                            className={`
                                                                flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium transition-all border
                                                                ${hasAccess
                                                                    ? 'bg-amber-500/10 border-amber-500/35 text-amber-400 hover:bg-amber-500/20'
                                                                    : 'bg-slate-900/60 border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400'
                                                                }
                                                            `}
                                                            title={`Click para ${hasAccess ? 'revocar' : 'conceder'} acceso de máster`}
                                                        >
                                                            <span className="text-sm">{perm.icon}</span>
                                                            <span className="truncate text-[11px]">{perm.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Modo Roguelite Section */}
                                        <div className="border border-[#c8aa6e]/25 bg-[#090e1a] p-3.5 space-y-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#c8aa6e]/40 bg-[#c8aa6e]/10 text-[#c8aa6e]">
                                                        <FiCompass className="h-4 w-4" />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-['Cinzel'] text-xs font-bold uppercase tracking-wider text-[#f0e6d2]">
                                                            Modo Roguelite
                                                        </p>
                                                        <p className="text-[10px] text-slate-500">
                                                            {rogueliteAccess.enabled ? `${unlockedCount} clases activas` : 'Desactivado'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRogueliteEnabledChange(player)}
                                                    aria-pressed={rogueliteAccess.enabled}
                                                    className={`relative h-7 w-12 shrink-0 border transition-colors ${rogueliteAccess.enabled
                                                        ? 'border-emerald-400/60 bg-emerald-500/25'
                                                        : 'border-slate-700 bg-slate-850'
                                                        }`}
                                                    title={`${rogueliteAccess.enabled ? 'Desactivar' : 'Activar'} modo Roguelite`}
                                                >
                                                    <span className={`absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center transition-all ${rogueliteAccess.enabled
                                                        ? 'left-6 bg-emerald-400 text-emerald-950'
                                                        : 'left-1 bg-slate-600 text-slate-900'
                                                        }`}>
                                                        {rogueliteAccess.enabled && <FiCheck className="h-3 w-3" />}
                                                    </span>
                                                </button>
                                            </div>

                                            {/* Roguelite Class Management Matrix */}
                                            {rogueliteAccess.enabled && (
                                                <div className="border-t border-[#c8aa6e]/15 pt-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-['Cinzel'] text-[9px] font-bold uppercase tracking-widest text-[#c8aa6e]">
                                                            Gestión de Clases
                                                        </p>
                                                        <span className="text-[9px] font-mono text-slate-500">
                                                            {unlockedCount} / {rogueliteClasses.length}
                                                        </span>
                                                    </div>

                                                    {rogueliteClassesLoading ? (
                                                        <p className="text-[10px] text-slate-500 italic">Cargando catálogo de clases...</p>
                                                    ) : rogueliteClasses.length === 0 ? (
                                                        <p className="border border-dashed border-slate-800 p-2 text-[10px] text-slate-500 text-center">
                                                            Aún no existen clases en la Lista de Clases.
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                                                            {rogueliteClasses.map((classItem) => {
                                                                const isUnlocked = rogueliteAccess.unlockedClassIds.includes(classItem.id);
                                                                const profileKey = getProfileClassKey(player.id, classItem.id);
                                                                const maximumLevel = getClassMaximumLevel(classItem);
                                                                const currentLevel = normalizeRogueliteProfileLevel(
                                                                    rogueliteProfileLevels[profileKey] ?? 1,
                                                                    maximumLevel,
                                                                );
                                                                const nextLevel = classItem.classLevels?.[currentLevel];
                                                                const isSaving = savingProfileLevel === profileKey;
                                                                const storedProfile = rogueliteProfiles[profileKey] || {};
                                                                const syncState = resolveRogueliteProfileSyncState(
                                                                    classItem,
                                                                    { ...storedProfile, owner: player.id },
                                                                );
                                                                const isSyncing = savingProfileSync === profileKey;
                                                                const isConfirming = pendingLevelChange?.profileKey === profileKey;

                                                                return (
                                                                    <div
                                                                        key={classItem.id}
                                                                        className={`border transition-all p-2.5 ${isUnlocked
                                                                            ? 'border-[#c8aa6e]/30 bg-[#0d1525] border-l-2 border-l-[#c8aa6e]'
                                                                            : 'border-slate-800/80 bg-[#070c16]/80 border-l-2 border-l-slate-700/40 opacity-70 hover:opacity-90'
                                                                            }`}
                                                                        data-player-class={profileKey}
                                                                    >
                                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                                            {/* Class Unlock Toggle */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRogueliteClassToggle(player, classItem.id)}
                                                                                aria-pressed={isUnlocked}
                                                                                className="flex min-w-0 items-center gap-2 text-left transition-colors group/btn"
                                                                            >
                                                                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center border ${isUnlocked ? 'border-[#c8aa6e] bg-[#c8aa6e]/20 text-[#c8aa6e]' : 'border-slate-700 text-transparent group-hover/btn:border-slate-500'}`}>
                                                                                    <FiCheck className="h-3 w-3" />
                                                                                </span>
                                                                                <span className={`font-['Cinzel'] text-[11px] font-bold uppercase tracking-wider truncate ${isUnlocked ? 'text-[#f0e6d2]' : 'text-slate-500'}`}>
                                                                                    {classItem.name}
                                                                                </span>
                                                                            </button>

                                                                            {/* Direct Multi-Level Selector + Steppers */}
                                                                            {isUnlocked && (
                                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                                    {/* Level Display & Direct Selector */}
                                                                                    <div className="flex h-8 items-center border border-[#c8aa6e]/30 bg-[#080c17] px-2">
                                                                                        <span className="font-mono text-xs font-bold text-[#e2d5b5]">
                                                                                            {currentLevel} / {maximumLevel}
                                                                                        </span>
                                                                                        <select
                                                                                            value={currentLevel}
                                                                                            onChange={(e) => requestProfileLevelChange(player, classItem, Number(e.target.value))}
                                                                                            disabled={isSaving}
                                                                                            className="ml-1 bg-transparent text-[11px] font-['Cinzel'] text-[#c8aa6e] outline-none cursor-pointer hover:text-[#f0e6d2]"
                                                                                            aria-label={`Seleccionar nivel de ${classItem.name} para ${player.name || player.id}`}
                                                                                        >
                                                                                            {Array.from({ length: maximumLevel }, (_, i) => i + 1).map((lvl) => (
                                                                                                <option key={lvl} value={lvl} className="bg-[#0e1626] text-[#e2d5b5]">
                                                                                                    Ir a Nvl {lvl}
                                                                                                </option>
                                                                                            ))}
                                                                                        </select>
                                                                                    </div>

                                                                                    {/* Stepper Buttons for Step Increases */}
                                                                                    <div
                                                                                        className="flex h-8 shrink-0 items-stretch border border-[#c8aa6e]/30 bg-[#080c17]"
                                                                                        aria-label={`Nivel de ${classItem.name} para ${player.name || player.id}`}
                                                                                    >
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => requestProfileLevelChange(player, classItem, -1)}
                                                                                            disabled={currentLevel <= 1 || isSaving}
                                                                                            className="flex w-8 touch-manipulation items-center justify-center border-r border-[#c8aa6e]/20 text-slate-500 transition hover:text-[#c8aa6e] active:bg-white/5 disabled:cursor-not-allowed disabled:opacity-20"
                                                                                            aria-label={`Bajar ${classItem.name} de ${player.name || player.id} al nivel ${Math.max(1, currentLevel - 1)}`}
                                                                                        >
                                                                                            <FiMinus className="h-3 w-3" />
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => requestProfileLevelChange(player, classItem, 1)}
                                                                                            disabled={currentLevel >= maximumLevel || isSaving}
                                                                                            className="flex w-8 touch-manipulation items-center justify-center text-[#c8aa6e] transition hover:bg-[#c8aa6e]/10 hover:text-[#f0e6d2] active:bg-white/5 disabled:cursor-not-allowed disabled:opacity-20"
                                                                                            aria-label={`Subir ${classItem.name} de ${player.name || player.id} al nivel ${Math.min(maximumLevel, currentLevel + 1)}`}
                                                                                        >
                                                                                            <FiPlus className="h-3 w-3" />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Next Level Teaser */}
                                                                        {isUnlocked && nextLevel && !isConfirming && (
                                                                            <p className="mt-1.5 pl-6 text-[10px] leading-relaxed text-slate-500">
                                                                                Próximo perk: <span className="text-slate-300 font-['Cinzel']">{nextLevel.title || `Nivel ${currentLevel + 1}`}</span>
                                                                            </p>
                                                                        )}

                                                                        {isUnlocked && !isConfirming && (
                                                                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-2 pl-6">
                                                                                <span className={`text-[9px] uppercase tracking-[0.14em] ${syncState.hasActiveRun
                                                                                    ? 'text-sky-300/80'
                                                                                    : 'text-emerald-300/70'
                                                                                    }`}>
                                                                                    {syncState.hasActiveRun
                                                                                        ? 'Aventura activa'
                                                                                        : 'Ficha preparada'}
                                                                                </span>
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {syncState.hasActiveRun && (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => resetProfileRun(player, classItem)}
                                                                                            disabled={isSyncing}
                                                                                            className="min-h-8 border border-rose-900/50 px-2.5 font-['Cinzel'] text-[8px] font-bold uppercase tracking-[0.12em] text-rose-300/75 transition hover:border-rose-700 hover:text-rose-200 disabled:opacity-40"
                                                                                        >
                                                                                            Finalizar aventura
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Level Confirmation Banner */}
                                                                        {isUnlocked && isConfirming && (
                                                                            <div className="mt-2 border-l-2 border-[#c8aa6e] bg-[#090f1c] p-2.5" data-level-confirmation={profileKey}>
                                                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                                                    <div className="min-w-0 flex-1">
                                                                                        <p className="font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.1em] text-[#e2d5b5]">
                                                                                            {pendingLevelChange.direction > 0 ? 'Subir de nivel' : 'Bajar de nivel'} · {pendingLevelChange.currentLevel} → {pendingLevelChange.nextLevel}
                                                                                        </p>
                                                                                        <p className="mt-0.5 text-[10px] text-slate-400">{pendingLevelChange.changedLevelTitle}</p>
                                                                                        {pendingLevelChange.effectDescriptions.length > 0 && (
                                                                                            <ul className="mt-1 space-y-0.5 text-[10px] text-[#c8aa6e]/85 font-mono">
                                                                                                {pendingLevelChange.effectDescriptions.map((description) => (
                                                                                                    <li key={description}>{pendingLevelChange.direction > 0 ? '+' : '−'} {description}</li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex shrink-0 gap-1.5">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setPendingLevelChange(null)}
                                                                                            disabled={isSaving}
                                                                                            className="h-8 border border-slate-700 px-2.5 font-['Cinzel'] text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 transition hover:text-slate-200 disabled:opacity-40"
                                                                                        >
                                                                                            Cancelar
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={confirmProfileLevelChange}
                                                                                            disabled={isSaving}
                                                                                            className="h-8 border border-[#c8aa6e]/60 bg-[#c8aa6e]/15 px-2.5 font-['Cinzel'] text-[9px] font-bold uppercase tracking-[0.1em] text-[#f0e6d2] transition hover:bg-[#c8aa6e]/30 disabled:opacity-40"
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
                                    </div>
                                </motion.div>
                            );
                        })}
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
                        <label className="block text-xs font-['Cinzel'] font-bold uppercase tracking-wider text-slate-400 mb-1">Nombre del Personaje</label>
                        <input
                            type="text"
                            className="w-full bg-[#070c16] border border-slate-700 p-2.5 text-xs text-slate-200 focus:border-[#c8aa6e] focus:outline-none"
                            placeholder="Ej. Arthas"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-['Cinzel'] font-bold uppercase tracking-wider text-slate-400 mb-1">Contraseña de Acceso</label>
                        <input
                            type="text"
                            className="w-full bg-[#070c16] border border-slate-700 p-2.5 text-xs text-slate-200 focus:border-[#c8aa6e] focus:outline-none"
                            placeholder="Contraseña"
                            value={formData.passcode}
                            onChange={e => setFormData({ ...formData, passcode: e.target.value })}
                        />
                        <p className="text-[11px] text-slate-500 mt-1">Esta será la contraseña que usará el jugador para entrar.</p>
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
                                type="button"
                                onClick={() => {
                                    handleDeleteUser(editingPasswordFor.id);
                                    setEditingPasswordFor(null);
                                }}
                                className="px-3 py-2 bg-rose-950/40 text-rose-400 text-xs font-['Cinzel'] uppercase font-bold hover:bg-rose-900/50 flex items-center gap-1.5 border border-rose-800/60"
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
                        <label className="block text-xs font-['Cinzel'] font-bold uppercase tracking-wider text-slate-400 mb-1">Nueva Contraseña</label>
                        <input
                            type="text"
                            className="w-full bg-[#070c16] border border-slate-700 p-2.5 text-xs text-slate-200 focus:border-[#c8aa6e] focus:outline-none"
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
