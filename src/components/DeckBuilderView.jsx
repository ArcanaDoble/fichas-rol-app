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
    Heart 
} from 'lucide-react';
import { db } from '../firebase';
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
        <div className="w-full h-full overflow-y-auto custom-scrollbar bg-[#09090b] pb-20 md:pb-0">
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

            <div className="max-w-7xl mx-auto p-4 pt-12 md:p-8 lg:p-12">
                <AnimatePresence mode="wait">
                    {/* 1. VIEW MODE: CATALOG OF FOLDERS / DECKS */}
                    {!activeDeck ? (
                        <motion.div 
                            key="catalog"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full flex flex-col"
                        >
                            {/* Header Panel matching ProgressionView */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-12 border-b border-[#c8aa6e]/20 pb-4 md:pb-6 gap-4">
                                <div>
                                    <h2 className="text-3xl font-fantasy text-[#f0e6d2] mb-2">COLECCIÓN</h2>
                                    <p className="text-slate-400 text-xs uppercase tracking-widest">gestión de mazos y cartas de rol</p>
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
                                <div className="w-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-12 bg-slate-950/20">
                                    <FiLayers className="w-16 h-16 text-[#c8aa6e]/30 mb-4 stroke-[1]" />
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
                                                className="group relative cursor-pointer flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
                                            >
                                                {/* Visual Folder Container */}
                                                <div className="w-full relative aspect-[4/3] flex flex-col items-center justify-end group/folder mb-3 overflow-visible">
                                                    {/* Folder Back */}
                                                    <div className="absolute inset-0 bg-[#121620]/30 border border-slate-800/60 rounded-lg group-hover/folder:border-[#c8aa6e]/30 group-hover/folder:bg-[#121620]/50 transition-colors duration-300">
                                                        {/* Folder Tab */}
                                                        <div className="absolute -top-3 left-3 w-20 h-3 bg-[#121620]/30 border-t border-x border-slate-800/60 rounded-t-md group-hover/folder:border-[#c8aa6e]/30 group-hover/folder:bg-[#121620]/50 transition-colors duration-300"></div>
                                                    </div>

                                                    {/* 3 stacked cards peeking out of folder */}
                                                    <div className="absolute inset-x-0 bottom-2 top-2 flex items-center justify-center overflow-visible">
                                                        {deck.cards && deck.cards.length > 0 ? (
                                                            deck.cards.slice(0, 3).map((card, idx) => {
                                                                const rot = (idx - 1) * 8; // -8, 0, 8
                                                                const shiftX = (idx - 1) * 16; // -16px, 0, 16px
                                                                const shiftY = idx === 1 ? -6 : 0;
                                                                return (
                                                                    <div
                                                                        key={card.id}
                                                                        className="absolute aspect-[3/4.2] h-[85%] rounded border border-slate-700/50 shadow-lg overflow-hidden bg-[#161a23] transition-transform duration-300 group-hover/folder:scale-105"
                                                                        style={{
                                                                            transform: `translate(${shiftX}px, ${shiftY}px) rotate(${rot}deg)`,
                                                                            zIndex: idx + 2,
                                                                            opacity: 1 - (2 - idx) * 0.15
                                                                        }}
                                                                    >
                                                                        {card.frontUrl ? (
                                                                            <img 
                                                                                src={card.frontUrl} 
                                                                                alt="" 
                                                                                className="w-full h-full object-cover select-none pointer-events-none"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-full h-full bg-[#161a23] flex items-center justify-center p-1 border border-dashed border-[#c8aa6e]/20">
                                                                                <span className="text-[6px] text-slate-500 uppercase tracking-widest text-center truncate">{card.name}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="opacity-15 group-hover/folder:opacity-30 transition-opacity flex items-center justify-center h-full z-10">
                                                                <FiLayers className="w-8 h-8 text-[#c8aa6e] stroke-[1.5]" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Folder Front Cover/Flap */}
                                                    <div className="absolute bottom-0 inset-x-0 h-[48%] bg-[#1b2130]/90 border-t border-slate-800/80 rounded-b-lg shadow-[0_-5px_15px_rgba(0,0,0,0.5)] group-hover/folder:border-t-[#c8aa6e]/40 transition-colors duration-300 flex items-center justify-center z-10">
                                                        <span className="text-[9px] text-[#c8aa6e]/85 font-bold uppercase tracking-wider bg-black/45 px-2 py-0.5 rounded border border-[#c8aa6e]/20">
                                                            {totalCards} {totalCards === 1 ? 'Carta' : 'Cartas'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Text and stats below the folder */}
                                                <div className="px-1 flex flex-col gap-1.5">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            {isEditingName ? (
                                                                <div className="flex items-center gap-1 onClick-stopPropagation" onClick={e => e.stopPropagation()}>
                                                                    <input
                                                                        type="text"
                                                                        value={editDeckNameText}
                                                                        onChange={(e) => setEditDeckNameText(e.target.value)}
                                                                        className="w-full bg-[#1b2130] border border-[#c8aa6e] text-xs text-[#f0e6d2] font-bold p-1 px-2 rounded outline-none"
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
                                                                <>
                                                                    <h4 className="font-cinzel text-base font-bold text-[#f0e6d2] uppercase tracking-wide group-hover:text-[#c8aa6e] transition-colors leading-tight truncate">
                                                                        {deck.name}
                                                                    </h4>
                                                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1 inline-block">
                                                                        cartas: {totalCards}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                            <button 
                                                                onClick={(e) => {
                                                                    setEditingDeckName(deck.id);
                                                                    setEditDeckNameText(deck.name);
                                                                }}
                                                                className="p-1 text-slate-500 hover:text-[#c8aa6e] rounded hover:bg-slate-800/50"
                                                            >
                                                                <FiEdit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => handleDeleteDeck(deck.id, e)}
                                                                className="p-1 text-slate-500 hover:text-red-500 rounded hover:bg-slate-800/50"
                                                            >
                                                                <FiTrash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        /* 2. VIEW MODE: DETAILED DECK INTERIOR */
                        <motion.div 
                            key="deck-detail"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="w-full flex flex-col"
                        >
                            {/* Header Panel matching ProgressionView */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-12 border-b border-[#c8aa6e]/20 pb-4 md:pb-6 gap-4">
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setActiveDeck(null)}
                                        className="p-2 bg-slate-800 hover:bg-[#c8aa6e] hover:text-slate-950 text-slate-400 rounded transition-all flex items-center justify-center"
                                        title="Volver a barajas"
                                    >
                                        <FiArrowLeft className="w-5 h-5 stroke-[2.5]" />
                                    </button>
                                    <div>
                                        <h2 className="text-3xl font-fantasy text-[#f0e6d2] mb-2 uppercase">{activeDeck.name}</h2>
                                        <p className="text-slate-400 text-xs uppercase tracking-widest">
                                            Propietario: <span className="text-[#c8aa6e] font-bold">{ownerName}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Live Category Counts */}
                                <div className="flex flex-wrap items-center gap-2">
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

                            {/* Main Grid + Sidebar templates within max-w-5xl layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-12">
                                
                                {/* Left Section: Grid of Cards in Active Deck */}
                                <div className="lg:col-span-3 flex flex-col gap-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#c8aa6e]">
                                            Mi Baraja ({ (activeDeck.cards || []).length } cartas)
                                        </span>
                                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                                            💡 Arrastra las cartas verticalmente para ordenar
                                        </span>
                                    </div>

                                    {(!activeDeck.cards || activeDeck.cards.length === 0) ? (
                                        <div className="w-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-12 bg-slate-950/10">
                                            <FiLayers className="w-12 h-12 text-[#c8aa6e]/20 mb-3" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Mazo vacío</h4>
                                            <p className="text-[10px] text-slate-600 mt-1 max-w-xs text-center">
                                                Usa el buscador de plantillas a la derecha y haz clic para agregarlas a esta baraja.
                                            </p>
                                        </div>
                                    ) : (
                                        <Reorder.Group 
                                            axis="y" 
                                            values={activeDeck.cards || []} 
                                            onReorder={handleReorder}
                                            className="flex flex-col gap-8 w-full select-none items-center"
                                        >
                                            {activeDeck.cards.map((card) => {
                                                const category = CARD_TYPES.find(t => t.id === card.type) || CARD_TYPES[0];
                                                const CategoryIcon = category.icon;

                                                return (
                                                    <Reorder.Item 
                                                        key={card.id} 
                                                        value={card}
                                                        className="flex flex-col gap-2.5 z-10 w-44 md:w-52 shrink-0 relative"
                                                    >
                                                        {/* Interactive card with 3D tilt wrapper */}
                                                        <TiltCard frontUrl={card.frontUrl} name={card.name}>
                                                            {/* Floating cycle category pill */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCycleCardType(card.id);
                                                                }}
                                                                className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-4 py-1.5 border rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-lg transition-all hover:scale-105 active:scale-95 ${category.color} bg-black/60 hover:brightness-125`}
                                                                title="Cambiar tipo de carta"
                                                            >
                                                                <CategoryIcon className="w-3.5 h-3.5" />
                                                                <span>{category.label}</span>
                                                            </button>

                                                            {/* Floating Delete Button */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveCardFromDeck(card.id);
                                                                }}
                                                                className="absolute top-2.5 right-2.5 z-30 p-2 bg-black/60 hover:bg-red-600/90 text-slate-300 hover:text-white rounded-full transition-all border border-white/10 hover:border-red-500/40 shadow backdrop-blur-sm"
                                                                title="Quitar de la baraja"
                                                            >
                                                                <FiTrash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </TiltCard>
                                                    </Reorder.Item>
                                                );
                                            })}
                                        </Reorder.Group>
                                    )}
                                </div>

                                {/* Right Section: Templates Library (Sticky narrow box sidebar) */}
                                <div className="lg:col-span-1 lg:sticky lg:top-4 h-fit bg-[#0d1017] border border-slate-800/80 rounded flex flex-col overflow-hidden max-h-[75vh] shadow-xl">
                                    <div className="flex-none p-4 border-b border-slate-800/80 bg-slate-950/25">
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#c8aa6e] block mb-2.5">
                                            Plantillas
                                        </span>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={searchTemplate}
                                                onChange={(e) => setSearchTemplate(e.target.value)}
                                                placeholder="Buscar..."
                                                className="w-full bg-[#131722] border border-slate-800 text-[11px] text-[#e2e8f0] p-1.5 pl-7 rounded outline-none focus:border-[#c8aa6e] transition-colors"
                                            />
                                            <FiSearch className="absolute left-2.5 top-2.5 text-slate-500 w-3.5 h-3.5" />
                                            {searchTemplate && (
                                                <button 
                                                    onClick={() => setSearchTemplate('')}
                                                    className="absolute right-2 top-2 p-0.5 text-slate-500 hover:text-white"
                                                >
                                                    <FiX className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Templates list scroll area */}
                                    <div className="overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2.5 bg-[#0b0e14]/40 max-h-[55vh]">
                                        {filteredTemplates.length === 0 ? (
                                            <div className="p-4 text-center text-slate-600 text-[11px] italic">
                                                Sin plantillas.
                                            </div>
                                        ) : (
                                            filteredTemplates.map((template) => (
                                                <div 
                                                    key={template.id}
                                                    onClick={() => handleAddCardToDeck(template)}
                                                    className="group flex gap-2.5 p-2 bg-[#131722]/40 border border-slate-800 rounded hover:border-[#c8aa6e]/50 hover:bg-[#131722] cursor-pointer transition-all duration-200"
                                                >
                                                    <div className="w-9 aspect-[3/4.2] rounded overflow-hidden bg-slate-900 border border-slate-800 flex-none relative">
                                                        {template.frontUrl && (
                                                            <img 
                                                                src={template.frontUrl} 
                                                                alt="" 
                                                                className="w-full h-full object-cover select-none pointer-events-none"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 flex flex-col justify-center min-w-0">
                                                        <span className="text-[11px] font-bold text-slate-200 uppercase group-hover:text-[#c8aa6e] transition-colors truncate">
                                                            {template.name || 'Carta'}
                                                        </span>
                                                        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">
                                                            + Añadir
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
            </div>

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
