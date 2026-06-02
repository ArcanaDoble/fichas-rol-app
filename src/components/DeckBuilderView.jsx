import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc 
} from 'firebase/firestore';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
    FiFolder, 
    FiPlus, 
    FiTrash2, 
    FiEdit2, 
    FiArrowLeft, 
    FiX, 
    FiSearch, 
    FiCheck, 
    FiLayers,
    FiMenu
} from 'react-icons/fi';
import { 
    Sword, 
    Shield, 
    Sparkles, 
    Skull, 
    Heart, 
    Flame 
} from 'lucide-react';
import { db } from '../firebase';
import FoilCard from './FoilCard';
import Boton from './Boton';

// Card categories mapping
const CARD_TYPES = [
    { id: 'action', label: 'Acción', color: 'text-red-400 bg-red-950/40 border-red-800/40', icon: Sword },
    { id: 'attribute', label: 'Atributo', color: 'text-amber-400 bg-amber-950/40 border-amber-800/40', icon: Heart },
    { id: 'trap', label: 'Trampa', color: 'text-purple-400 bg-purple-950/40 border-purple-800/40', icon: Skull },
    { id: 'weapon', label: 'Arma', color: 'text-blue-400 bg-blue-950/40 border-blue-800/40', icon: Sword },
    { id: 'armor', label: 'Armadura', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40', icon: Shield },
    { id: 'minion', label: 'Minion/Skill', color: 'text-violet-400 bg-violet-950/40 border-violet-800/40', icon: Sparkles }
];

// 3D Tilt Card Wrapper Component
const TiltCard = ({ children, frontUrl, name, active = true }) => {
    const containerRef = useRef(null);
    const [style, setStyle] = useState({});
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e) => {
        if (!active || !containerRef.current) return;
        if (!isHovered) setIsHovered(true);

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const rotateX = (y - 50) / 4; 
        const rotateY = (x - 50) / -4; 

        setStyle({
            '--mouse-x': `${x}%`,
            '--mouse-y': `${y}%`,
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`,
            boxShadow: `0 20px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(200, 170, 110, ${Math.max(0.1, (50 - Math.abs(x - 50)) / 100)})`
        });
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setStyle({
            transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
            transition: 'transform 0.5s ease-out, box-shadow 0.5s ease-out'
        });
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-[3/4.2] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-100 ease-out select-none border border-slate-800/50"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={style}
        >
            <div className="absolute inset-0 z-0">
                {frontUrl ? (
                    <img 
                        src={frontUrl} 
                        alt={name} 
                        className="w-full h-full object-cover pointer-events-none select-none"
                        draggable={false}
                    />
                ) : (
                    <div className="w-full h-full bg-[#161a23] flex flex-col items-center justify-center p-4 border border-dashed border-[#c8aa6e]/30">
                        <FiLayers className="w-12 h-12 text-[#c8aa6e]/40 mb-2" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-center">{name}</span>
                    </div>
                )}
            </div>

            {/* Custom Interactive Glossy Glare */}
            {isHovered && (
                <div 
                    className="absolute inset-0 pointer-events-none z-10 opacity-30 mix-blend-color-dodge transition-opacity duration-300"
                    style={{
                        background: `radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 80%)`
                    }}
                />
            )}
            
            {/* Inner Border highlight */}
            <div className="absolute inset-0 border border-white/5 pointer-events-none rounded-lg z-20" />
            {children}
        </div>
    );
};

TiltCard.propTypes = {
    children: PropTypes.node,
    frontUrl: PropTypes.string,
    name: PropTypes.string,
    active: PropTypes.bool
};

export const DeckBuilderView = ({ ownerId, ownerName, isPlayer = true, onBack }) => {
    const [decks, setDecks] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [activeDeck, setActiveDeck] = useState(null);
    const [searchTemplate, setSearchTemplate] = useState('');
    const [newDeckModal, setNewDeckModal] = useState(false);
    const [newDeckName, setNewDeckName] = useState('');
    const [editingDeckName, setEditingDeckName] = useState(null);
    const [editDeckNameText, setEditDeckNameText] = useState('');

    // Real-time listener for decks
    useEffect(() => {
        const qDecks = query(collection(db, 'card_decks'), where('ownerId', '==', ownerId));
        const unsubDecks = onSnapshot(qDecks, (snap) => {
            const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDecks(loaded.sort((a, b) => b.createdAt - a.createdAt));

            // Sync active deck if it was updated
            if (activeDeck) {
                const updatedActive = loaded.find(d => d.id === activeDeck.id);
                if (updatedActive) {
                    setActiveDeck(updatedActive);
                } else {
                    setActiveDeck(null);
                }
            }
        });

        // Real-time listener for templates (canvas_cards)
        const unsubTemplates = onSnapshot(collection(db, 'canvas_cards'), (snap) => {
            const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTemplates(loaded.sort((a, b) => b.createdAt - a.createdAt));
        });

        return () => {
            unsubDecks();
            unsubTemplates();
        };
    }, [ownerId, activeDeck?.id]);

    // Handle Create Deck
    const handleCreateDeck = async () => {
        if (!newDeckName.trim()) return;
        try {
            await addDoc(collection(db, 'card_decks'), {
                name: newDeckName.trim(),
                ownerId,
                createdAt: Date.now(),
                cards: []
            });
            setNewDeckName('');
            setNewDeckModal(false);
        } catch (err) {
            console.error("Error creating deck:", err);
        }
    };

    // Handle Delete Deck
    const handleDeleteDeck = async (deckId, e) => {
        e.stopPropagation();
        if (!window.confirm("¿Seguro que deseas eliminar esta baraja permanentemente?")) return;
        try {
            await deleteDoc(doc(db, 'card_decks', deckId));
            if (activeDeck?.id === deckId) setActiveDeck(null);
        } catch (err) {
            console.error("Error deleting deck:", err);
        }
    };

    // Handle Rename Deck
    const handleRenameDeck = async (deckId, e) => {
        e.stopPropagation();
        if (!editDeckNameText.trim()) return;
        try {
            await updateDoc(doc(db, 'card_decks', deckId), {
                name: editDeckNameText.trim()
            });
            setEditingDeckName(null);
        } catch (err) {
            console.error("Error renaming deck:", err);
        }
    };

    // Add Card from templates to current deck
    const handleAddCardToDeck = async (template) => {
        if (!activeDeck) return;
        const newCard = {
            id: Math.random().toString(36).substr(2, 9),
            templateId: template.id,
            name: template.name || 'Carta sin nombre',
            frontUrl: template.frontUrl || '',
            type: 'action' // default category
        };

        const updatedCards = [...(activeDeck.cards || []), newCard];
        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: updatedCards
            });
        } catch (err) {
            console.error("Error adding card:", err);
        }
    };

    // Remove card from current deck
    const handleRemoveCardFromDeck = async (cardId) => {
        if (!activeDeck) return;
        const updatedCards = (activeDeck.cards || []).filter(c => c.id !== cardId);
        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: updatedCards
            });
        } catch (err) {
            console.error("Error removing card:", err);
        }
    };

    // Cycle card type category
    const handleCycleCardType = async (cardId) => {
        if (!activeDeck) return;
        const updatedCards = (activeDeck.cards || []).map(card => {
            if (card.id === cardId) {
                const currentIndex = CARD_TYPES.findIndex(t => t.id === card.type);
                const nextIndex = (currentIndex + 1) % CARD_TYPES.length;
                return { ...card, type: CARD_TYPES[nextIndex].id };
            }
            return card;
        });

        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: updatedCards
            });
        } catch (err) {
            console.error("Error updating card type:", err);
        }
    };

    // Handle Framer Motion Drag/Drop sorting
    const handleReorder = async (reorderedCards) => {
        if (!activeDeck) return;
        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: reorderedCards
            });
        } catch (err) {
            console.error("Error reordering cards:", err);
        }
    };

    // Stats counter helper
    const getCardCounts = (deck) => {
        const counts = { action: 0, attribute: 0, trap: 0, weapon: 0, armor: 0, minion: 0 };
        (deck.cards || []).forEach(c => {
            if (counts[c.type] !== undefined) {
                counts[c.type]++;
            } else {
                counts.action++; // Fallback
            }
        });
        return counts;
    };

    const filteredTemplates = templates.filter(t => 
        (t.name || '').toLowerCase().includes(searchTemplate.toLowerCase())
    );

    return (
        <div className="w-full h-full overflow-hidden bg-[#09090b] flex flex-col font-['Lato'] text-[#e2e8f0]">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Lato:wght@300;400;700&display=swap');
                
                .font-cinzel {
                    font-family: 'Cinzel', serif;
                }
                
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.3);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(200, 170, 110, 0.2);
                    border-radius: 9999px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(200, 170, 110, 0.4);
                }
                `}
            </style>

            <AnimatePresence>
                {/* 1. VIEW MODE: CATALOG OF FOLDERS / DECKS */}
                {!activeDeck && (
                    <motion.div 
                        key="catalog"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto custom-scrollbar"
                    >
                        {/* Header Panel */}
                        <div className="flex items-center justify-between border-b border-[#c8aa6e]/20 pb-4 mb-8">
                            <div>
                                <h3 className="text-2xl font-cinzel text-[#f0e6d2] uppercase tracking-wider flex items-center gap-2">
                                    <FiLayers className="text-[#c8aa6e] w-6 h-6" /> Barajas de Cartas
                                </h3>
                                <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
                                    Gestionar barajas del personaje: <span className="text-[#c8aa6e] font-bold">{ownerName}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {onBack && (
                                    <Boton color="gray" onClick={onBack} className="mr-2">
                                        Volver
                                    </Boton>
                                )}
                                <button
                                    onClick={() => setNewDeckModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#785a28] to-[#c8aa6e] text-[#09090b] font-bold text-xs uppercase tracking-widest rounded transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(200,170,110,0.3)]"
                                >
                                    <FiPlus className="stroke-[3]" /> Crear Baraja
                                </button>
                            </div>
                        </div>

                        {/* Decks Grid */}
                        {decks.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-12 bg-slate-950/20">
                                <FiFolder className="w-16 h-16 text-[#c8aa6e]/30 mb-4 stroke-[1]" />
                                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Sin barajas disponibles</h4>
                                <p className="text-xs text-slate-500 mt-2 text-center max-w-sm">
                                    Haz clic en el botón superior para crear tu primer mazo y empezar a coleccionar tus cartas tácticas.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                                {decks.map((deck) => {
                                    const counts = getCardCounts(deck);
                                    const totalCards = (deck.cards || []).length;
                                    const isEditingName = editingDeckName === deck.id;

                                    return (
                                        <motion.div
                                            key={deck.id}
                                            onClick={() => !isEditingName && setActiveDeck(deck)}
                                            className="group relative cursor-pointer aspect-[3/4.2] rounded bg-[#131722]/60 border border-slate-800 hover:border-[#c8aa6e]/60 transition-all duration-300 overflow-hidden flex flex-col justify-between p-5 hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.5)] shadow-md"
                                        >
                                            {/* Folder Bisel/Backing */}
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#c8aa6e]/5 to-transparent pointer-events-none" />

                                            {/* Deck Header */}
                                            <div>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        {isEditingName ? (
                                                            <div className="flex items-center gap-1 onClick-stopPropagation" onClick={e => e.stopPropagation()}>
                                                                <input
                                                                    type="text"
                                                                    value={editDeckNameText}
                                                                    onChange={(e) => setEditDeckNameText(e.target.value)}
                                                                    className="w-full bg-[#1b2130] border border-[#c8aa6e] text-sm text-[#f0e6d2] font-bold p-1 px-2 rounded outline-none"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleRenameDeck(deck.id, e);
                                                                        if (e.key === 'Escape') setEditingDeckName(null);
                                                                    }}
                                                                />
                                                                <button 
                                                                    onClick={(e) => handleRenameDeck(deck.id, e)}
                                                                    className="p-1.5 bg-[#c8aa6e] text-slate-950 rounded hover:bg-white"
                                                                >
                                                                    <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <h4 className="font-cinzel text-lg font-bold text-[#f0e6d2] uppercase tracking-wide group-hover:text-[#c8aa6e] transition-colors leading-tight">
                                                                {deck.name}
                                                            </h4>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                        <button 
                                                            onClick={(e) => {
                                                                setEditingDeckName(deck.id);
                                                                setEditDeckNameText(deck.name);
                                                            }}
                                                            className="p-1 hover:text-[#c8aa6e] rounded hover:bg-slate-800/50"
                                                        >
                                                            <FiEdit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleDeleteDeck(deck.id, e)}
                                                            className="p-1 hover:text-red-500 rounded hover:bg-slate-800/50"
                                                        >
                                                            <FiTrash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1 inline-block">
                                                    {totalCards} {totalCards === 1 ? 'Carta' : 'Cartas'}
                                                </span>
                                            </div>

                                            {/* Folder Deck Mini Previews */}
                                            <div className="h-[40%] flex items-center justify-center relative my-4">
                                                {deck.cards && deck.cards.length > 0 ? (
                                                    deck.cards.slice(0, 3).map((card, idx) => (
                                                        <div
                                                            key={card.id}
                                                            className="absolute aspect-[3/4.2] h-full rounded border border-slate-700/50 shadow-md overflow-hidden bg-[#161a23]"
                                                            style={{
                                                                left: `calc(50% - 25px + ${idx * 15}px)`,
                                                                transform: `rotate(${(idx - 1) * 8}deg) translateZ(0)`,
                                                                zIndex: idx,
                                                                opacity: 1 - (2 - idx) * 0.15
                                                            }}
                                                        >
                                                            {card.frontUrl && (
                                                                <img 
                                                                    src={card.frontUrl} 
                                                                    alt="" 
                                                                    className="w-full h-full object-cover select-none pointer-events-none"
                                                                />
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <FiFolder className="w-16 h-16 text-slate-800 stroke-[1] group-hover:scale-110 transition-transform duration-300" />
                                                )}
                                            </div>

                                            {/* Deck Category Count Badges */}
                                            <div className="border-t border-slate-800 pt-3 flex flex-wrap gap-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                                {CARD_TYPES.map(type => {
                                                    const count = counts[type.id] || 0;
                                                    if (count === 0) return null;
                                                    const Icon = type.icon;
                                                    return (
                                                        <div 
                                                            key={type.id} 
                                                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
                                                        >
                                                            <Icon className="w-2.5 h-2.5 text-[#c8aa6e]" />
                                                            <span>{count}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* 2. VIEW MODE: DETAILED DECK INTERIOR */}
                {activeDeck && (
                    <motion.div 
                        key="deck-detail"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="flex-1 flex flex-col overflow-hidden"
                    >
                        {/* Top Bar Navigation */}
                        <div className="flex-none p-4 bg-[#0d1017] border-b border-slate-800/80 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setActiveDeck(null)}
                                    className="p-2 bg-slate-800 hover:bg-[#c8aa6e] hover:text-slate-950 text-slate-400 rounded transition-all flex items-center justify-center"
                                    title="Volver a barajas"
                                >
                                    <FiArrowLeft className="w-5 h-5 stroke-[2.5]" />
                                </button>
                                <div>
                                    <h3 className="font-cinzel text-xl font-bold uppercase tracking-wider text-[#f0e6d2]">
                                        {activeDeck.name}
                                    </h3>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                                        Propietario: <span className="text-[#c8aa6e]">{ownerName}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Live Category Counts */}
                            <div className="flex flex-wrap items-center gap-2.5">
                                {CARD_TYPES.map(type => {
                                    const counts = getCardCounts(activeDeck);
                                    const count = counts[type.id] || 0;
                                    const Icon = type.icon;
                                    return (
                                        <div 
                                            key={type.id} 
                                            className={`flex items-center gap-1.5 px-3 py-1 border rounded text-xs font-bold transition-all ${count > 0 ? type.color : 'text-slate-600 bg-transparent border-slate-800/50'}`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            <span className="uppercase text-[9px] tracking-wider">{type.label}</span>
                                            <span className="ml-1 bg-black/40 px-1.5 py-0.2 rounded text-[10px] text-[#f0e6d2]">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Main Work Area */}
                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            
                            {/* Grid of Cards in Active Deck (LEFT SECTION) */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#09090b]">
                                <div className="max-w-6xl mx-auto flex flex-col h-full">
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#c8aa6e]">
                                            Mi Baraja ({ (activeDeck.cards || []).length } cartas)
                                        </span>
                                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                                            💡 Arrastra las cartas para reordenar a tu gusto
                                        </span>
                                    </div>

                                    {(!activeDeck.cards || activeDeck.cards.length === 0) ? (
                                        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-12 bg-slate-950/10">
                                            <FiLayers className="w-12 h-12 text-[#c8aa6e]/20 mb-3" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Mazo vacío</h4>
                                            <p className="text-[10px] text-slate-600 mt-1 max-w-xs text-center">
                                                Usa el buscador de biblioteca a la derecha y haz clic en las cartas para agregarlas a esta baraja.
                                            </p>
                                        </div>
                                    ) : (
                                        <Reorder.Group 
                                            axis="y" 
                                            values={activeDeck.cards || []} 
                                            onReorder={handleReorder}
                                            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 pb-12"
                                        >
                                            {activeDeck.cards.map((card) => {
                                                const category = CARD_TYPES.find(t => t.id === card.type) || CARD_TYPES[0];
                                                const CategoryIcon = category.icon;

                                                return (
                                                    <Reorder.Item 
                                                        key={card.id} 
                                                        value={card}
                                                        className="flex flex-col gap-2.5 z-10"
                                                    >
                                                        {/* Interactive card with 3D tilt */}
                                                        <TiltCard frontUrl={card.frontUrl} name={card.name}>
                                                            <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-0.5 bg-slate-950/80 border border-[#c8aa6e]/30 rounded text-[9px] text-[#f0e6d2] font-bold uppercase tracking-widest backdrop-blur-sm shadow">
                                                                <FiMenu className="w-3 h-3 text-[#c8aa6e]" />
                                                                <span className="line-clamp-1">{card.name}</span>
                                                            </div>
                                                        </TiltCard>

                                                        {/* Interactive badges for categories and removal */}
                                                        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                                                            <button
                                                                onClick={() => handleCycleCardType(card.id)}
                                                                className={`flex-1 flex items-center justify-center gap-1 py-1 border rounded text-[9px] font-bold uppercase tracking-wider transition-all hover:brightness-125 ${category.color}`}
                                                                title="Hacer clic para cambiar de tipo"
                                                            >
                                                                <CategoryIcon className="w-3 h-3" />
                                                                <span>{category.label}</span>
                                                            </button>

                                                            <button
                                                                onClick={() => handleRemoveCardFromDeck(card.id)}
                                                                className="p-1 px-2 text-red-500 hover:text-red-400 border border-slate-800 hover:border-red-900/40 hover:bg-red-950/20 rounded transition-all flex items-center justify-center"
                                                                title="Quitar de la baraja"
                                                            >
                                                                <FiTrash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </Reorder.Item>
                                                );
                                            })}
                                        </Reorder.Group>
                                    )}
                                </div>
                            </div>

                            {/* Card Pool Template Library Drawer (RIGHT SECTION) */}
                            <div className="w-full lg:w-80 flex-none bg-[#0d1017] border-t lg:border-t-0 lg:border-l border-slate-800/80 flex flex-col overflow-hidden">
                                
                                {/* Search Panel */}
                                <div className="flex-none p-4 border-b border-slate-800/80">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#c8aa6e] block mb-3">
                                        Biblioteca de Plantillas
                                    </span>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchTemplate}
                                            onChange={(e) => setSearchTemplate(e.target.value)}
                                            placeholder="Buscar carta..."
                                            className="w-full bg-[#131722] border border-slate-800 text-xs text-[#e2e8f0] p-2 pl-8 rounded outline-none focus:border-[#c8aa6e] transition-colors"
                                        />
                                        <FiSearch className="absolute left-2.5 top-2.5 text-slate-500 w-4 h-4" />
                                        {searchTemplate && (
                                            <button 
                                                onClick={() => setSearchTemplate('')}
                                                className="absolute right-2 top-2 p-0.5 text-slate-500 hover:text-white"
                                            >
                                                <FiX className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Templates Scrollable List */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3.5 bg-[#0b0e14]">
                                    {filteredTemplates.length === 0 ? (
                                        <div className="p-8 text-center text-slate-600 text-xs italic">
                                            No se encontraron plantillas.
                                        </div>
                                    ) : (
                                        filteredTemplates.map((template) => (
                                            <div 
                                                key={template.id}
                                                onClick={() => handleAddCardToDeck(template)}
                                                className="group flex gap-3 p-2 bg-[#131722]/50 border border-slate-800 rounded hover:border-[#c8aa6e]/50 hover:bg-[#131722] cursor-pointer transition-all duration-200"
                                            >
                                                {/* Mini Thumbnail */}
                                                <div className="w-11 aspect-[3/4.2] rounded overflow-hidden bg-slate-900 border border-slate-800 flex-none relative">
                                                    {template.frontUrl && (
                                                        <img 
                                                            src={template.frontUrl} 
                                                            alt="" 
                                                            className="w-full h-full object-cover select-none pointer-events-none"
                                                        />
                                                    )}
                                                </div>

                                                {/* Text detail */}
                                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                                    <span className="text-xs font-bold text-slate-200 uppercase group-hover:text-[#c8aa6e] transition-colors truncate">
                                                        {template.name || 'Carta sin nombre'}
                                                    </span>
                                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">
                                                        + Añadir al Mazo
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL: CREATE DECK */}
            <AnimatePresence>
                {newDeckModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#0f1219] border border-[#c8aa6e]/30 p-6 rounded-lg w-full max-w-md shadow-2xl relative"
                        >
                            <button
                                onClick={() => setNewDeckModal(false)}
                                className="absolute top-4 right-4 text-slate-500 hover:text-white rounded"
                            >
                                <FiX className="w-5 h-5" />
                            </button>

                            <h3 className="font-cinzel text-lg font-bold text-[#f0e6d2] uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-[#c8aa6e]/10 pb-2">
                                <FiPlus className="text-[#c8aa6e] stroke-[2.5]" /> Crear Nueva Baraja
                            </h3>

                            <div className="space-y-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Nombre de la Baraja</label>
                                    <input
                                        type="text"
                                        value={newDeckName}
                                        onChange={(e) => setNewDeckName(e.target.value)}
                                        placeholder="Ej: Mazo de Combate Aéreo"
                                        className="w-full bg-[#161a23] border border-slate-800 text-xs text-[#e2e8f0] p-3 rounded outline-none focus:border-[#c8aa6e] transition-colors"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCreateDeck();
                                        }}
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Boton color="gray" onClick={() => setNewDeckModal(false)}>
                                        Cancelar
                                    </Boton>
                                    <button
                                        onClick={handleCreateDeck}
                                        className="px-4 py-2 bg-[#c8aa6e] text-slate-950 font-bold text-xs uppercase tracking-widest rounded hover:bg-white active:scale-95 transition-all shadow"
                                    >
                                        Crear Baraja
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

DeckBuilderView.propTypes = {
    ownerId: PropTypes.string.isRequired,
    ownerName: PropTypes.string.isRequired,
    isPlayer: PropTypes.bool,
    onBack: PropTypes.func
};

export default DeckBuilderView;
