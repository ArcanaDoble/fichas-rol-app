import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiChevronLeft } from 'react-icons/fi';
import { Skull, Plus } from 'lucide-react';
import { EnemyCreatorView } from './EnemyCreatorView';
import { EnemyDetailView } from './EnemyDetailView';

const INITIAL_ENEMIES = [
    {
        id: 'goblin',
        name: 'Goblin',
        type: 'Humanoide (Goblinoide)',
        cr: '1/4',
        hp: 7,
        ac: 15,
        image: 'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
    }
];

const EnemyCard = ({ enemy, onClick }) => {
    return (
        <div
            onClick={() => onClick && onClick(enemy)}
            className={`
            group relative aspect-[3/4.5] rounded-sm cursor-pointer transition-all duration-500 ease-out
            hover:-translate-y-2 hover:shadow-[0_15px_40px_-10px_rgba(220,38,38,0.2)]
          `}
        >
            {/* Main Frame Content */}
            <div className="absolute inset-0 overflow-hidden bg-[#1a0505] border-[1px] border-red-900/30">

                {/* Background Image with Zoom effect */}
                <div className="absolute inset-0 overflow-hidden">
                    {enemy.image ? (
                        <img
                            src={enemy.image}
                            alt={enemy.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-b from-red-950/20 to-black/80"></div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10" />
                </div>

                {/* Card Content */}
                <div className="absolute bottom-0 left-0 right-0 p-5 z-20 flex flex-col items-center text-center">
                    <h3 className="text-xl font-['Cinzel'] font-bold uppercase tracking-wider mb-1 text-red-100 group-hover:text-red-500 transition-colors drop-shadow-md leading-tight">
                        {enemy.name}
                    </h3>

                    <p className="text-[10px] text-red-300 uppercase tracking-widest font-bold opacity-80 mb-3">
                        {enemy.type}
                    </p>

                    {/* Stats Row */}
                    {/* Stats Row */}
                    <div className="flex items-center justify-between w-full px-2 mt-2 gap-1 text-[9px] text-slate-400">
                        {/* PT - Postura */}
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-200 text-xs">{enemy.stats?.postura?.max || 0}</span>
                            <span className="text-[7px] uppercase tracking-wider text-red-500/70">PT</span>
                        </div>
                        <div className="w-[1px] h-4 bg-gradient-to-b from-transparent via-red-900/60 to-transparent"></div>

                        {/* VI - Vida */}
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-200 text-xs">{enemy.stats?.vida?.max || enemy.hp || 0}</span>
                            <span className="text-[7px] uppercase tracking-wider text-red-500/70">VI</span>
                        </div>
                        <div className="w-[1px] h-4 bg-gradient-to-b from-transparent via-red-900/60 to-transparent"></div>

                        {/* IG - Ingenio */}
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-200 text-xs">{enemy.stats?.ingenio?.max || 0}</span>
                            <span className="text-[7px] uppercase tracking-wider text-red-500/70">IG</span>
                        </div>
                        <div className="w-[1px] h-4 bg-gradient-to-b from-transparent via-red-900/60 to-transparent"></div>

                        {/* CD - Cordura */}
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-200 text-xs">{enemy.stats?.cordura?.max || 0}</span>
                            <span className="text-[7px] uppercase tracking-wider text-red-500/70">CD</span>
                        </div>
                        <div className="w-[1px] h-4 bg-gradient-to-b from-transparent via-red-900/60 to-transparent"></div>

                        {/* AR - Armadura */}
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-200 text-xs">{enemy.stats?.armadura?.max || 0}</span>
                            <span className="text-[7px] uppercase tracking-wider text-red-500/70">AR</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fancy Border Frame (Over everything) - RED THEMED */}
            <div className="pointer-events-none absolute inset-0 border-2 border-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 shadow-[inset_0_0_20px_rgba(220,38,38,0.2)]">
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white"></div>
            </div>

            {/* Static Border for non-hover */}
            <div className="pointer-events-none absolute inset-0 border border-red-900/50 z-20 opacity-100 group-hover:opacity-0 transition-opacity"></div>
        </div>
    );
};

const BestiaryView = ({ onBack }) => {
    const [enemies, setEnemies] = useState(INITIAL_ENEMIES);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [selectedEnemy, setSelectedEnemy] = useState(null);

    // Fetch enemies from Firestore
    useEffect(() => {
        const fetchEnemies = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'enemies'));
                const loadedEnemies = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    loadedEnemies.push({
                        id: doc.id,
                        ...data,
                        // Ensure image is available, fallback to portrait if existing
                        image: data.image || data.portrait || null,
                        // Ensure CR/Type
                        cr: data.cr || '0',
                        type: data.type || 'Desconocido',
                        hp: data.hp || (data.stats && data.stats.vida ? data.stats.vida.max : 0),
                        ac: data.ac || (data.stats && data.stats.armadura ? 10 + data.stats.armadura.max : 10)
                    });
                });
                if (loadedEnemies.length > 0) {
                    setEnemies(loadedEnemies);
                }
            } catch (error) {
                console.error("Error fetching enemies: ", error);
            }
        };
        fetchEnemies();
    }, []);

    const filteredEnemies = useMemo(() => {
        return enemies.filter(enemy =>
            enemy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            enemy.type.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [enemies, searchTerm]);

    const handleCreateNew = () => {
        setIsCreating(true);
    };

    const handleSaveNewEnemy = async (newEnemy) => {
        try {
            await setDoc(doc(db, 'enemies', newEnemy.id), newEnemy);
            setEnemies(prev => [...prev, newEnemy]);
            setSelectedEnemy(newEnemy); // Select the new enemy to show its details
            setIsCreating(false); // Close creator, triggering transition to Detail View
        } catch (error) {
            console.error("Error saving enemy:", error);
            alert("Error al guardar el enemigo. Inténtalo de nuevo.");
        }
    };

    const handleSelectEnemy = (enemy) => {
        setSelectedEnemy(enemy);
    };

    const handleUpdateEnemy = async (updatedEnemy) => {
        try {
            await setDoc(doc(db, 'enemies', updatedEnemy.id), updatedEnemy, { merge: true });
            setEnemies(prev => prev.map(e => e.id === updatedEnemy.id ? updatedEnemy : e));
            setSelectedEnemy(updatedEnemy);
        } catch (error) {
            console.error("Error updating enemy:", error);
        }
    };

    const handleDeleteEnemy = async (enemyId) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar este enemigo de forma permanente?")) return;

        // Optimistic update: Remove from UI immediately
        const previousEnemies = [...enemies];
        setEnemies(prev => prev.filter(e => e.id !== enemyId));
        setSelectedEnemy(null);

        try {
            await deleteDoc(doc(db, 'enemies', enemyId));
        } catch (error) {
            console.error("Error deleting enemy:", error);
            alert("Error al eliminar el enemigo.");
            // Revert on failure
            setEnemies(previousEnemies);
        }
    };

    if (isCreating) {
        return (
            <EnemyCreatorView
                onBack={() => setIsCreating(false)}
                onSave={handleSaveNewEnemy}
            />
        );
    }

    return (
        <div className="min-h-screen bg-[#050b14] text-slate-200 font-sans selection:bg-red-500/30">
            <AnimatePresence mode="wait">
                {!selectedEnemy ? (
                    <motion.div
                        key="list-view"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* HEADER */}
                        <div className="sticky top-0 z-30 bg-[#050b14]/95 backdrop-blur-md border-b border-red-900/30 shadow-2xl">
                            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <button
                                        onClick={onBack}
                                        className="w-10 h-10 rounded-full border border-red-900/50 flex items-center justify-center text-red-500 hover:bg-red-900/20 hover:border-red-500 hover:scale-105 transition-all group"
                                    >
                                        <FiChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                                    </button>

                                    <div>
                                        <h1 className="text-2xl font-['Cinzel'] font-bold text-red-50 tracking-[0.15em]">
                                            BESTIARIO
                                        </h1>
                                        <div className="text-[10px] text-red-400/60 font-bold tracking-[0.3em] uppercase">
                                            Registro de Enemigos
                                        </div>
                                    </div>
                                </div>

                                {/* SEARCH BAR */}
                                <div className="relative group w-96">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <FiSearch className="h-4 w-4 text-red-700 group-focus-within:text-red-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="BUSCAR ENEMIGO..."
                                        className="block w-full rounded-none border-b border-red-900/30 bg-transparent py-2.5 pl-10 pr-4 text-xs font-bold text-red-100 placeholder-red-900/50 focus:border-red-500 focus:outline-none focus:ring-0 transition-all uppercase tracking-wider"
                                    />
                                    <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-red-500 group-focus-within:w-full transition-all duration-500"></div>
                                </div>
                            </div>
                        </div>

                        {/* CONTENT (Matches EnemyListView) */}
                        <div className="w-full h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
                            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-10">

                                {/* Section Divider / Header */}
                                <div className="flex items-center gap-4">
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-red-900/50 to-transparent"></div>
                                    <span className="font-['Cinzel'] text-red-500 tracking-widest text-lg">BESTIARIO DE CAMPAÑA</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-red-900/50 to-transparent"></div>
                                </div>

                                {/* Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-12">

                                    {/* Create New Enemy Card */}
                                    <div
                                        onClick={handleCreateNew}
                                        className="group relative aspect-[3/4.5] rounded-sm cursor-pointer transition-all duration-300 border-2 border-dashed border-red-900/30 hover:border-red-500 hover:bg-red-900/10 flex flex-col items-center justify-center gap-4"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-[#1a0505] border border-red-900/50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                                            <Plus className="w-8 h-8 text-red-500" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="font-['Cinzel'] font-bold text-red-500 uppercase tracking-wider text-lg">Crear Nuevo</h3>
                                            <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">Enemigo</p>
                                        </div>
                                    </div>

                                    {/* Existing Enemies */}
                                    <AnimatePresence>
                                        {filteredEnemies.map((enemy) => (
                                            <motion.div
                                                key={enemy.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <EnemyCard
                                                    enemy={enemy}
                                                    onClick={handleSelectEnemy}
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>

                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <EnemyDetailView
                        key={selectedEnemy.id}
                        enemy={selectedEnemy}
                        onClose={() => setSelectedEnemy(null)}
                        onUpdate={handleUpdateEnemy}
                        onDelete={() => handleDeleteEnemy(selectedEnemy.id)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default BestiaryView;
