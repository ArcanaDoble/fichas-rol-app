import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { FiSearch, FiUser, FiCalendar, FiActivity, FiPlus, FiKey, FiLock, FiTrash2 } from 'react-icons/fi';
import Boton from './Boton';
import Modal from './Modal';
import { deleteDoc } from 'firebase/firestore';

const UsersView = ({ onBack }) => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
            } catch (error) {
                console.error("Error fetching players:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlayers();
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

    const PLAYER_PERMISSIONS = [
        { key: 'canViewInitiative', label: 'Iniciativa', icon: '⚡' },
        { key: 'canViewReflexesGame', label: 'Minijuego Reflejos', icon: '🔒' },
        { key: 'canViewDiceCalculator', label: 'Calculadora Dados', icon: '🎲' },
        { key: 'canViewMinimap', label: 'Minimapa', icon: '⌚️' },
    ];

    const MASTER_PERMISSIONS = [
        { key: 'canViewBattleMap', label: 'Mapa de Batalla', icon: '🗺️', default: false },
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
