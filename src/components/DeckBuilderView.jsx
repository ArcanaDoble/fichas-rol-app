import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiPlus, 
    FiTrash2, 
    FiEdit2, 
    FiArrowLeft, 
    FiX, 
    FiSearch, 
    FiCheck, 
    FiLayers
} from 'react-icons/fi';
import { 
    Sword, 
    Shield, 
    Sparkles, 
    Skull, 
    Heart,
    Flame,
    RefreshCw,
    Trash2,
    Database,
    Eye,
    EyeOff,
    LockKeyhole,
    Users,
    Download
} from 'lucide-react';
import { db } from '../firebase';
import Boton from './Boton';
import { uploadFile } from '../utils/storage';

// Card categories mapping
const CARD_TYPES = [
    { id: 'action', label: 'Acción', color: 'text-red-400 bg-red-950/40 border-red-800/40', icon: Sword },
    { id: 'attribute', label: 'Atributo', color: 'text-amber-400 bg-amber-950/40 border-amber-800/40', icon: Heart },
    { id: 'trap', label: 'Trampa', color: 'text-purple-400 bg-purple-950/40 border-purple-800/40', icon: Skull },
    { id: 'weapon', label: 'Arma', color: 'text-blue-400 bg-blue-950/40 border-blue-800/40', icon: Sword },
    { id: 'armor', label: 'Armadura', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40', icon: Shield },
    { id: 'minion', label: 'Minion', color: 'text-violet-400 bg-violet-950/40 border-violet-800/40', icon: Users },
    { id: 'skill', label: 'Habilidad', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40', icon: Sparkles },
    { id: 'status', label: 'Estado', color: 'text-orange-400 bg-orange-950/40 border-orange-800/40', icon: Flame }
];

const DECK_COLOR_THEMES = [
    { id: 'gold', label: 'Dorado', color: '#c8aa6e', back: 'rgba(18, 22, 32, 0.55)', tab: 'rgba(28, 31, 41, 0.72)', front: 'rgba(30, 35, 48, 0.92)', border: 'rgba(200, 170, 110, 0.34)', glow: 'rgba(200, 170, 110, 0.2)' },
    { id: 'emerald', label: 'Esmeralda', color: '#34d399', back: 'rgba(6, 28, 22, 0.56)', tab: 'rgba(6, 45, 35, 0.7)', front: 'rgba(8, 42, 32, 0.9)', border: 'rgba(52, 211, 153, 0.34)', glow: 'rgba(52, 211, 153, 0.2)' },
    { id: 'ruby', label: 'Rubí', color: '#fb7185', back: 'rgba(40, 10, 16, 0.56)', tab: 'rgba(58, 13, 22, 0.72)', front: 'rgba(54, 14, 22, 0.9)', border: 'rgba(251, 113, 133, 0.35)', glow: 'rgba(251, 113, 133, 0.22)' },
    { id: 'azure', label: 'Zafiro', color: '#60a5fa', back: 'rgba(10, 22, 44, 0.56)', tab: 'rgba(12, 32, 62, 0.72)', front: 'rgba(15, 35, 60, 0.9)', border: 'rgba(96, 165, 250, 0.35)', glow: 'rgba(96, 165, 250, 0.22)' },
    { id: 'violet', label: 'Violeta', color: '#a78bfa', back: 'rgba(28, 18, 48, 0.56)', tab: 'rgba(40, 25, 68, 0.72)', front: 'rgba(38, 27, 62, 0.9)', border: 'rgba(167, 139, 250, 0.35)', glow: 'rgba(167, 139, 250, 0.2)' },
    { id: 'slate', label: 'Ceniza', color: '#cbd5e1', back: 'rgba(20, 24, 32, 0.58)', tab: 'rgba(31, 36, 46, 0.72)', front: 'rgba(35, 41, 52, 0.9)', border: 'rgba(203, 213, 225, 0.28)', glow: 'rgba(203, 213, 225, 0.14)' }
];

const getDeckColorTheme = (colorId, isLibrary = false) => (
    DECK_COLOR_THEMES.find(theme => theme.id === colorId)
    || DECK_COLOR_THEMES.find(theme => theme.id === (colorId === 'crimson' ? 'ruby' : colorId))
    || DECK_COLOR_THEMES.find(theme => theme.id === (isLibrary ? 'emerald' : 'gold'))
    || DECK_COLOR_THEMES[0]
);

const hexToRgba = (hex, alpha = 1) => {
    const normalized = hex.replace('#', '');
    const value = parseInt(normalized.length === 3
        ? normalized.split('').map(char => char + char).join('')
        : normalized, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const COLLECTION_ACCESS = {
    HIDDEN: 'hidden',
    READ: 'read',
    EDIT: 'edit'
};

const isMasterLibraryDeck = (deck) => deck?.isMasterLibrary === true;

const getDeckAccessForViewer = (deck, viewerId) => {
    if (!isMasterLibraryDeck(deck)) return COLLECTION_ACCESS.EDIT;
    return deck.permissions?.[viewerId] || COLLECTION_ACCESS.HIDDEN;
};

// 3D Tilt Card Wrapper Component
const TiltCard = ({ children, frontUrl, name, active = true }) => {
    const containerRef = useRef(null);
    const [style, setStyle] = useState({});
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (!active) {
            setIsHovered(false);
            setStyle({
                transform: 'none',
                transition: 'transform 0.5s ease-out, box-shadow 0.5s ease-out'
            });
        }
    }, [active]);

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
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.025)`,
            boxShadow: `0 18px 28px rgba(0, 0, 0, 0.62), 0 0 16px rgba(200, 170, 110, ${Math.max(0.06, (50 - Math.abs(x - 50)) / 260)})`
        });
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setStyle({
            transform: 'none',
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
                    className="absolute inset-0 pointer-events-none z-10 mix-blend-screen transition-opacity duration-500"
                    style={{
                        opacity: 0.44,
                        filter: 'blur(1.1px)',
                        backgroundImage: `
                            radial-gradient(circle at var(--mouse-x) var(--mouse-y),
                                rgba(255,255,255,0.46) 0%,
                                rgba(255,255,255,0.22) 14%,
                                rgba(255,255,255,0.10) 30%,
                                rgba(255,255,255,0.04) 48%,
                                rgba(255,255,255,0) 72%
                            ),
                            radial-gradient(circle at var(--mouse-x) var(--mouse-y),
                                rgba(240,230,210,0.18) 0%,
                                rgba(240,230,210,0.07) 22%,
                                rgba(240,230,210,0) 54%
                            )
                        `,
                        backgroundSize: '100% 100%, 100% 100%'
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

const DeckCardItem = ({
    card,
    draggedCardId,
    dropTargetCardId,
    canEdit = true,
    canManageVisibility = false,
    isMasterLibrary = false,
    handleCycleCardType,
    handleRemoveCardFromDeck,
    handleToggleCardVisibility,
    handleCardPointerDown
}) => {
    const category = CARD_TYPES.find(t => t.id === card.type) || CARD_TYPES[0];
    const CategoryIcon = category.icon;
    const isDragging = draggedCardId === card.id;
    const isDropTarget = dropTargetCardId === card.id;
    const isHiddenForPlayers = isMasterLibrary && card.visibleToPlayers === false;

    return (
        <motion.div 
            data-deck-card-id={card.id}
            onPointerDown={(event) => canEdit && handleCardPointerDown(event, card)}
            className={`flex touch-none flex-col gap-2.5 z-10 w-full max-w-[240px] mx-auto relative transition-all duration-200 ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${isDragging ? 'opacity-35 scale-[0.985]' : 'opacity-100'} ${isDropTarget ? 'scale-[1.02]' : ''} ${isHiddenForPlayers ? 'opacity-75' : ''}`}
        >
            <AnimatePresence>
                {isDropTarget && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="pointer-events-none absolute -inset-2 z-0 rounded-xl border border-[#c8aa6e]/70 bg-[#c8aa6e]/10 shadow-[0_0_28px_rgba(200,170,110,0.24),inset_0_0_22px_rgba(200,170,110,0.10)]"
                    />
                )}
            </AnimatePresence>
            <TiltCard frontUrl={card.frontUrl} name={card.name} active={!isDragging && !isDropTarget}>
                {isMasterLibrary && (
                    <div className={`absolute bottom-2.5 left-2.5 z-30 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-widest backdrop-blur-md ${isHiddenForPlayers ? 'border-slate-600/50 bg-slate-950/80 text-slate-400' : 'border-emerald-400/40 bg-emerald-950/60 text-emerald-200'}`}>
                        {isHiddenForPlayers ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {isHiddenForPlayers ? 'Oculta' : 'Publicada'}
                    </div>
                )}

                {/* Floating cycle category button (top-left) */}
                {canEdit && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCycleCardType(card.id);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`absolute top-2.5 left-2.5 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-[#c8aa6e]/25 bg-[#05070b]/80 shadow-[0_0_14px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition-all hover:scale-105 hover:border-[#c8aa6e]/70 hover:bg-[#111827]/90 active:scale-95 cursor-pointer ${category.color.split(' ')[0]}`}
                        title={`Tipo actual: ${category.label}. Clic para cambiar.`}
                    >
                        <CategoryIcon className="w-3.5 h-3.5" />
                        <RefreshCw className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#05070b] p-[1px] text-[#c8aa6e]" />
                    </button>
                )}

                {canManageVisibility && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCardVisibility(card.id);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`absolute top-2.5 left-1/2 z-30 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border bg-[#05070b]/80 shadow-[0_0_14px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer ${isHiddenForPlayers ? 'border-slate-600/45 text-slate-400 hover:border-emerald-400/60 hover:text-emerald-200' : 'border-emerald-400/40 text-emerald-200 hover:border-slate-400/60 hover:text-slate-200'}`}
                        title={isHiddenForPlayers ? 'Hacer visible para jugadores con lectura' : 'Ocultar para jugadores con lectura'}
                    >
                        {isHiddenForPlayers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                )}

                {/* Floating Delete Button (top-right) */}
                {canEdit && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCardFromDeck(card.id);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute top-2.5 right-2.5 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-slate-600/35 bg-[#05070b]/80 text-slate-400 shadow-[0_0_14px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition-all hover:scale-105 hover:border-rose-400/60 hover:bg-rose-950/80 hover:text-rose-200 active:scale-95 cursor-pointer"
                        title="Quitar de la baraja"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </TiltCard>
        </motion.div>
    );
};

DeckCardItem.propTypes = {
    card: PropTypes.object.isRequired,
    draggedCardId: PropTypes.string,
    dropTargetCardId: PropTypes.string,
    canEdit: PropTypes.bool,
    canManageVisibility: PropTypes.bool,
    isMasterLibrary: PropTypes.bool,
    handleCycleCardType: PropTypes.func.isRequired,
    handleRemoveCardFromDeck: PropTypes.func.isRequired,
    handleToggleCardVisibility: PropTypes.func.isRequired,
    handleCardPointerDown: PropTypes.func.isRequired
};

export const DeckBuilderView = ({ ownerId, ownerName, currentUserId, knownPlayers = [], isPlayer = true, onBack }) => {
    const [decks, setDecks] = useState([]);
    const [masterLibraryDecks, setMasterLibraryDecks] = useState([]);
    const [activeDeck, setActiveDeck] = useState(null);
    const [searchTemplate, setSearchTemplate] = useState('');
    const [newDeckModal, setNewDeckModal] = useState(false);
    const [newDeckName, setNewDeckName] = useState('');
    const [newDeckIsMasterLibrary, setNewDeckIsMasterLibrary] = useState(false);
    const [editingDeckName, setEditingDeckName] = useState(null);
    const [editDeckNameText, setEditDeckNameText] = useState('');
    const [draggedCardId, setDraggedCardId] = useState(null);
    const [dropTargetCardId, setDropTargetCardId] = useState(null);
    const [draggedNormalDeckId, setDraggedNormalDeckId] = useState(null);
    const [normalDeckDropTargetId, setNormalDeckDropTargetId] = useState(null);
    const [draggedLibraryDeckId, setDraggedLibraryDeckId] = useState(null);
    const [libraryDropTargetId, setLibraryDropTargetId] = useState(null);
    const [dragPreview, setDragPreview] = useState(null);
    const [isUploadingLibraryCard, setIsUploadingLibraryCard] = useState(false);
    const [libraryCardToDelete, setLibraryCardToDelete] = useState(null);
    const [deckToDelete, setDeckToDelete] = useState(null);
    const [localCards, setLocalCards] = useState([]);
    const [activeCardTypeFilter, setActiveCardTypeFilter] = useState(null);
    const dragStateRef = useRef(null);
    const normalDeckDragStateRef = useRef(null);
    const normalDeckDragClickBlockedRef = useRef(false);
    const libraryDragStateRef = useRef(null);
    const libraryDragClickBlockedRef = useRef(false);
    const libraryCardFileInputRef = useRef(null);
    const viewerId = currentUserId || ownerId;

    const visibleDecks = useMemo(() => {
        const merged = [...decks, ...masterLibraryDecks];
        return merged;
    }, [decks, masterLibraryDecks]);

    const sortNormalDecks = (items) => {
        const hasManualOrder = items.some(deck => typeof deck.sortOrder === 'number');
        if (!hasManualOrder) {
            return [...items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        return [...items].sort((a, b) => {
            const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
            const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
    };

    const sortLibraryDecks = (items) => {
        const hasManualOrder = items.some(deck => typeof deck.sortOrder === 'number');
        if (!hasManualOrder) {
            return [...items].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));
        }
        return [...items].sort((a, b) => {
            const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
            const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
        });
    };

    const normalDecks = useMemo(
        () => sortNormalDecks(visibleDecks.filter(deck => !isMasterLibraryDeck(deck))),
        [visibleDecks]
    );

    const libraryDecks = useMemo(
        () => sortLibraryDecks(visibleDecks.filter(deck => isMasterLibraryDeck(deck))),
        [visibleDecks]
    );

    const catalogDeckItems = useMemo(() => [
        ...normalDecks,
        ...(libraryDecks.length > 0 ? [{ id: '__library_separator__', isSeparator: true }] : []),
        ...libraryDecks
    ], [normalDecks, libraryDecks]);

    const canReorderNormalDecks = normalDecks.length > 1;
    const canReorderLibraryDecks = !isPlayer && libraryDecks.length > 1;

    const activeDeckAccess = activeDeck
        ? getDeckAccessForViewer(activeDeck, viewerId)
        : COLLECTION_ACCESS.HIDDEN;
    const activeDeckIsMasterLibrary = isMasterLibraryDeck(activeDeck);
    const activeDeckTheme = getDeckColorTheme(activeDeck?.color, activeDeckIsMasterLibrary);
    const canEditActiveDeck = !!activeDeck && (!isPlayer || activeDeck.ownerId === ownerId || activeDeckAccess === COLLECTION_ACCESS.EDIT);
    const canManageActiveLibraryPermissions = !!activeDeck && !isPlayer && activeDeckIsMasterLibrary;
    const canManageActiveCardVisibility = canManageActiveLibraryPermissions || (isPlayer && activeDeckAccess === COLLECTION_ACCESS.EDIT && activeDeckIsMasterLibrary);

    // Sync localCards with activeDeck when not dragging
    useEffect(() => {
        if (activeDeck) {
            if (draggedCardId === null) {
                setLocalCards(activeDeck.cards || []);
            }
        } else {
            setLocalCards([]);
            setActiveCardTypeFilter(null);
        }
    }, [activeDeck, draggedCardId]);

    useEffect(() => {
        if (!activeCardTypeFilter) return;
        const hasFilteredType = localCards.some(card => (card.type || 'action') === activeCardTypeFilter);
        if (!hasFilteredType) {
            setActiveCardTypeFilter(null);
        }
    }, [activeCardTypeFilter, localCards]);

    useEffect(() => () => {
        clearDragListeners();
        clearNormalDeckDragListeners();
        clearLibraryDragListeners();
    }, []);

    useEffect(() => {
        if (!activeDeck) return;
        const updatedActive = visibleDecks.find(d => d.id === activeDeck.id);
        if (updatedActive) {
            setActiveDeck(updatedActive);
        } else {
            setActiveDeck(null);
        }
    }, [visibleDecks, activeDeck?.id]);

    // Real-time listener for decks
    useEffect(() => {
        const qDecks = query(collection(db, 'card_decks'), where('ownerId', '==', ownerId));
        const unsubDecks = onSnapshot(qDecks, (snap) => {
            const loaded = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDecks(loaded);
        });

        let unsubMasterLibraries = null;
        if (isPlayer) {
            unsubMasterLibraries = onSnapshot(collection(db, 'card_decks'), (snap) => {
                const loaded = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(deck => (
                        deck.ownerId === 'master' &&
                        isMasterLibraryDeck(deck) &&
                        getDeckAccessForViewer(deck, viewerId) !== COLLECTION_ACCESS.HIDDEN
                    ));
                setMasterLibraryDecks(loaded);
            });
        } else {
            setMasterLibraryDecks([]);
        }

        return () => {
            unsubDecks();
            if (unsubMasterLibraries) unsubMasterLibraries();
        };
    }, [ownerId, isPlayer, viewerId]);

    // Handle Create Deck
    const handleCreateDeck = async () => {
        if (!newDeckName.trim()) return;
        try {
            const payload = {
                name: newDeckName.trim(),
                ownerId,
                createdAt: Date.now(),
                cards: [],
                isMasterLibrary: !isPlayer && newDeckIsMasterLibrary
            };
            if (payload.isMasterLibrary) {
                payload.permissions = {};
            }
            await addDoc(collection(db, 'card_decks'), payload);
            setNewDeckName('');
            setNewDeckIsMasterLibrary(false);
            setNewDeckModal(false);
        } catch (err) {
            console.error("Error creating deck:", err);
        }
    };

    // Handle Delete Deck
    const handleDeleteDeck = async (deckId, e) => {
        e.stopPropagation();
        const deck = visibleDecks.find(d => d.id === deckId);
        if (deck && isPlayer && (deck.ownerId !== ownerId || isMasterLibraryDeck(deck))) return;
        if (!deck) return;
        setDeckToDelete(deck);
    };

    const confirmDeleteDeck = async () => {
        if (!deckToDelete) return;
        try {
            await deleteDoc(doc(db, 'card_decks', deckToDelete.id));
            if (activeDeck?.id === deckToDelete.id) setActiveDeck(null);
            setDeckToDelete(null);
        } catch (err) {
            console.error("Error deleting deck:", err);
        }
    };

    // Handle Rename Deck
    const handleRenameDeck = async (deckId, e) => {
        e.stopPropagation();
        if (!editDeckNameText.trim()) return;
        const deck = visibleDecks.find(d => d.id === deckId);
        if (deck && isPlayer && (deck.ownerId !== ownerId || isMasterLibraryDeck(deck))) return;
        try {
            await updateDoc(doc(db, 'card_decks', deckId), {
                name: editDeckNameText.trim()
            });
            setEditingDeckName(null);
        } catch (err) {
            console.error("Error renaming deck:", err);
        }
    };

    const handleUpdateDeckColor = async (deckId, colorId, e) => {
        e.stopPropagation();
        const deck = visibleDecks.find(d => d.id === deckId);
        if (!deck) return;

        const isLibrary = isMasterLibraryDeck(deck);
        const access = getDeckAccessForViewer(deck, viewerId);
        const canChangeDeckColor = !isPlayer || (deck.ownerId === ownerId && !isLibrary) || (isLibrary && access === COLLECTION_ACCESS.EDIT);
        if (!canChangeDeckColor) return;

        try {
            await updateDoc(doc(db, 'card_decks', deckId), {
                color: colorId
            });
        } catch (err) {
            console.error("Error updating deck color:", err);
        }
    };

    // Add Card from templates to current deck
    const handleAddCardToDeck = async (template) => {
        if (!activeDeck || !canEditActiveDeck) return;
        const newCard = {
            id: Math.random().toString(36).substr(2, 9),
            templateId: template.id,
            name: template.name || 'Carta sin nombre',
            frontUrl: template.frontUrl || '',
            type: template.type || 'action',
            visibleToPlayers: activeDeckIsMasterLibrary ? true : undefined
        };
        if (!activeDeckIsMasterLibrary) {
            delete newCard.visibleToPlayers;
        }

        const updatedCards = [...localCards, newCard];
        setLocalCards(updatedCards);
        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: updatedCards
            });
        } catch (err) {
            console.error("Error adding card:", err);
        }
    };

    const removeCardFromActiveDeck = async (cardId) => {
        if (!activeDeck || !canEditActiveDeck) return;
        const updatedCards = localCards.filter(c => c.id !== cardId);
        setLocalCards(updatedCards);
        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: updatedCards
            });
        } catch (err) {
            console.error("Error removing card:", err);
        }
    };

    // Remove card from current deck
    const handleRemoveCardFromDeck = async (cardId) => {
        if (!activeDeck || !canEditActiveDeck) return;
        if (activeDeckIsMasterLibrary) {
            const card = localCards.find(c => c.id === cardId);
            if (card) {
                setLibraryCardToDelete(card);
            }
            return;
        }

        await removeCardFromActiveDeck(cardId);
    };

    const confirmRemoveLibraryCard = async () => {
        if (!libraryCardToDelete) return;
        await removeCardFromActiveDeck(libraryCardToDelete.id);
        setLibraryCardToDelete(null);
    };

    // Cycle card type category
    const handleCycleCardType = async (cardId) => {
        if (!activeDeck || !canEditActiveDeck) return;
        const updatedCards = localCards.map(card => {
            if (card.id === cardId) {
                const currentIndex = CARD_TYPES.findIndex(t => t.id === card.type);
                const nextIndex = (currentIndex + 1) % CARD_TYPES.length;
                return { ...card, type: CARD_TYPES[nextIndex].id };
            }
            return card;
        });

        setLocalCards(updatedCards);
        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: updatedCards
            });
        } catch (err) {
            console.error("Error updating card type:", err);
        }
    };

    const handleToggleCardVisibility = async (cardId) => {
        if (!activeDeck || !canManageActiveCardVisibility) return;
        const updatedCards = localCards.map(card => (
            card.id === cardId
                ? { ...card, visibleToPlayers: card.visibleToPlayers === false }
                : card
        ));

        setLocalCards(updatedCards);
        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: updatedCards
            });
        } catch (err) {
            console.error("Error updating card visibility:", err);
        }
    };

    const handleUpdateLibraryPermission = async (playerName, access) => {
        if (!activeDeck || !canManageActiveLibraryPermissions || !playerName) return;
        const permissions = { ...(activeDeck.permissions || {}) };
        if (access === COLLECTION_ACCESS.HIDDEN) {
            delete permissions[playerName];
        } else {
            permissions[playerName] = access;
        }

        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), { permissions });
        } catch (err) {
            console.error("Error updating library permissions:", err);
        }
    };

    const getCardNameFromFile = (fileName = '') => {
        const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
        return cleanName || 'Carta sin nombre';
    };

    const handleUploadLibraryCard = async (event) => {
        const file = event.target.files?.[0];
        if (event.target) {
            event.target.value = '';
        }
        if (!file || !activeDeck || !activeDeckIsMasterLibrary || !canEditActiveDeck) return;
        if (!file.type?.startsWith('image/')) {
            alert('Selecciona una imagen para subir la carta.');
            return;
        }

        setIsUploadingLibraryCard(true);
        try {
            const cardId = Math.random().toString(36).substr(2, 9);
            const extension = file.name.split('.').pop() || 'png';
            const frontUrl = await uploadFile(
                file,
                `deck-library-cards/${activeDeck.id}/${Date.now()}-${cardId}.${extension}`
            );
            const newCard = {
                id: cardId,
                templateId: cardId,
                name: getCardNameFromFile(file.name),
                frontUrl,
                type: 'action',
                visibleToPlayers: true
            };
            const updatedCards = [...localCards, newCard];
            setLocalCards(updatedCards);
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: updatedCards
            });
        } catch (err) {
            console.error("Error uploading library card:", err);
            alert('No se pudo subir la carta a la colección.');
        } finally {
            setIsUploadingLibraryCard(false);
        }
    };

    const handleDownloadTemplateCard = async (template, event) => {
        event.stopPropagation();
        if (!template?.frontUrl) return;
        const safeName = (template.name || 'carta')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || 'carta';

        try {
            const response = await fetch(template.frontUrl);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `${safeName}.png`;
            link.click();
            URL.revokeObjectURL(objectUrl);
        } catch (err) {
            console.error('Error downloading template card:', err);
            const link = document.createElement('a');
            link.href = template.frontUrl;
            link.download = `${safeName}.png`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.click();
        }
    };

    const getDropTargetCardId = (clientX, clientY, excludedCardId) => {
        if (typeof document === 'undefined') return null;
        const element = document.elementFromPoint(clientX, clientY);
        const cardElement = element?.closest?.('[data-deck-card-id]');
        const targetId = cardElement?.getAttribute('data-deck-card-id');
        return targetId && targetId !== excludedCardId ? targetId : null;
    };

    const swapCardsById = (cards, draggedId, targetId) => {
        const draggedIdx = cards.findIndex(card => card.id === draggedId);
        const targetIdx = cards.findIndex(card => card.id === targetId);
        if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return cards;

        const updatedCards = [...cards];
        [updatedCards[draggedIdx], updatedCards[targetIdx]] = [updatedCards[targetIdx], updatedCards[draggedIdx]];
        return updatedCards;
    };

    const getDropTargetLibraryDeckId = (clientX, clientY, excludedDeckId) => {
        if (typeof document === 'undefined') return null;
        const element = document.elementFromPoint(clientX, clientY);
        const deckElement = element?.closest?.('[data-library-deck-id]');
        const targetId = deckElement?.getAttribute('data-library-deck-id');
        return targetId && targetId !== excludedDeckId ? targetId : null;
    };

    const getDropTargetNormalDeckId = (clientX, clientY, excludedDeckId) => {
        if (typeof document === 'undefined') return null;
        const element = document.elementFromPoint(clientX, clientY);
        const deckElement = element?.closest?.('[data-normal-deck-id]');
        const targetId = deckElement?.getAttribute('data-normal-deck-id');
        return targetId && targetId !== excludedDeckId ? targetId : null;
    };

    const swapDecksById = (items, draggedId, targetId) => {
        const draggedIdx = items.findIndex(deck => deck.id === draggedId);
        const targetIdx = items.findIndex(deck => deck.id === targetId);
        if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return items;

        const updatedItems = [...items];
        [updatedItems[draggedIdx], updatedItems[targetIdx]] = [updatedItems[targetIdx], updatedItems[draggedIdx]];
        return updatedItems;
    };

    const clearDragListeners = () => {
        const state = dragStateRef.current;
        if (!state) return;
        window.removeEventListener('pointermove', state.handlePointerMove);
        window.removeEventListener('pointerup', state.handlePointerUp);
        window.removeEventListener('pointercancel', state.handlePointerUp);
    };

    const clearNormalDeckDragListeners = () => {
        const state = normalDeckDragStateRef.current;
        if (!state) return;
        window.removeEventListener('pointermove', state.handlePointerMove);
        window.removeEventListener('pointerup', state.handlePointerUp);
        window.removeEventListener('pointercancel', state.handlePointerUp);
    };

    const clearLibraryDragListeners = () => {
        const state = libraryDragStateRef.current;
        if (!state) return;
        window.removeEventListener('pointermove', state.handlePointerMove);
        window.removeEventListener('pointerup', state.handlePointerUp);
        window.removeEventListener('pointercancel', state.handlePointerUp);
    };

    const finishNormalDeckDrag = async (clientX, clientY) => {
        const state = normalDeckDragStateRef.current;
        if (!state) return;

        clearNormalDeckDragListeners();
        normalDeckDragStateRef.current = null;

        const targetId = getDropTargetNormalDeckId(clientX, clientY, state.deck.id);
        const updatedDecks = targetId ? swapDecksById(normalDecks, state.deck.id, targetId) : normalDecks;
        const hasSwapped = updatedDecks !== normalDecks;
        normalDeckDragClickBlockedRef.current = state.hasMoved || hasSwapped;

        setDraggedNormalDeckId(null);
        setNormalDeckDropTargetId(null);

        if (!hasSwapped) return;

        try {
            await Promise.all(updatedDecks.map((deck, index) => (
                updateDoc(doc(db, 'card_decks', deck.id), { sortOrder: index })
            )));
        } catch (err) {
            console.error("Error saving deck order:", err);
        }
    };

    const handleNormalDeckPointerDown = (event, deck) => {
        if (!canReorderNormalDecks) return;
        if (event.button !== undefined && event.button !== 0) return;

        event.preventDefault();

        const handlePointerMove = (moveEvent) => {
            if (normalDeckDragStateRef.current) {
                normalDeckDragStateRef.current.hasMoved = true;
            }
            const targetId = getDropTargetNormalDeckId(moveEvent.clientX, moveEvent.clientY, deck.id);
            setNormalDeckDropTargetId(targetId);
        };

        const handlePointerUp = (upEvent) => {
            finishNormalDeckDrag(upEvent.clientX, upEvent.clientY);
        };

        normalDeckDragStateRef.current = {
            deck,
            handlePointerMove,
            handlePointerUp,
            hasMoved: false
        };

        setDraggedNormalDeckId(deck.id);
        setNormalDeckDropTargetId(null);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    };

    const finishLibraryDeckDrag = async (clientX, clientY) => {
        const state = libraryDragStateRef.current;
        if (!state) return;

        clearLibraryDragListeners();
        libraryDragStateRef.current = null;

        const targetId = getDropTargetLibraryDeckId(clientX, clientY, state.deck.id);
        const updatedDecks = targetId ? swapDecksById(libraryDecks, state.deck.id, targetId) : libraryDecks;
        const hasSwapped = updatedDecks !== libraryDecks;
        libraryDragClickBlockedRef.current = state.hasMoved || hasSwapped;

        setDraggedLibraryDeckId(null);
        setLibraryDropTargetId(null);

        if (!hasSwapped) return;

        try {
            await Promise.all(updatedDecks.map((deck, index) => (
                updateDoc(doc(db, 'card_decks', deck.id), { sortOrder: index })
            )));
        } catch (err) {
            console.error("Error saving library deck order:", err);
        }
    };

    const handleLibraryDeckPointerDown = (event, deck) => {
        if (!canReorderLibraryDecks) return;
        if (event.button !== undefined && event.button !== 0) return;

        event.preventDefault();

        const handlePointerMove = (moveEvent) => {
            if (libraryDragStateRef.current) {
                libraryDragStateRef.current.hasMoved = true;
            }
            const targetId = getDropTargetLibraryDeckId(moveEvent.clientX, moveEvent.clientY, deck.id);
            setLibraryDropTargetId(targetId);
        };

        const handlePointerUp = (upEvent) => {
            finishLibraryDeckDrag(upEvent.clientX, upEvent.clientY);
        };

        libraryDragStateRef.current = {
            deck,
            handlePointerMove,
            handlePointerUp,
            hasMoved: false
        };

        setDraggedLibraryDeckId(deck.id);
        setLibraryDropTargetId(null);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    };

    const finishDrag = async (clientX, clientY) => {
        const state = dragStateRef.current;
        if (!state) return;

        clearDragListeners();
        dragStateRef.current = null;

        const targetId = getDropTargetCardId(clientX, clientY, state.card.id);
        const updatedCards = targetId ? swapCardsById(localCards, state.card.id, targetId) : localCards;
        const hasSwapped = updatedCards !== localCards;

        setDraggedCardId(null);
        setDropTargetCardId(null);
        setDragPreview(null);

        if (!activeDeck || !canEditActiveDeck || !hasSwapped) return;

        setLocalCards(updatedCards);

        try {
            await updateDoc(doc(db, 'card_decks', activeDeck.id), {
                cards: updatedCards
            });
        } catch (err) {
            console.error("Error saving card order:", err);
        }
    };

    const handleCardPointerDown = (event, card) => {
        if (event.button !== undefined && event.button !== 0) return;
        if (!activeDeck || !canEditActiveDeck) return;

        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const initialPreview = {
            card,
            width: rect.width,
            height: rect.height,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            x: event.clientX,
            y: event.clientY
        };

        const handlePointerMove = (moveEvent) => {
            const targetId = getDropTargetCardId(moveEvent.clientX, moveEvent.clientY, card.id);
            setDropTargetCardId(targetId);
            setDragPreview(prev => prev ? {
                ...prev,
                x: moveEvent.clientX,
                y: moveEvent.clientY
            } : prev);
        };

        const handlePointerUp = (upEvent) => {
            finishDrag(upEvent.clientX, upEvent.clientY);
        };

        dragStateRef.current = {
            card,
            handlePointerMove,
            handlePointerUp
        };

        setDraggedCardId(card.id);
        setDropTargetCardId(null);
        setDragPreview(initialPreview);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    };

    // Stats counter helper
    const getCardCounts = (deck) => {
        const counts = CARD_TYPES.reduce((acc, type) => {
            acc[type.id] = 0;
            return acc;
        }, {});
        (deck.cards || []).forEach(c => {
            if (counts[c.type] !== undefined) {
                counts[c.type]++;
            } else {
                counts.action++; // Fallback
            }
        });
        return counts;
    };

    const masterLibraryTemplates = visibleDecks
        .filter(deck => isMasterLibraryDeck(deck) && deck.id !== activeDeck?.id)
        .flatMap(deck => {
            const access = getDeckAccessForViewer(deck, viewerId);
            const canSeeHiddenCards = !isPlayer || access === COLLECTION_ACCESS.EDIT;
            return (deck.cards || [])
                .filter(card => canSeeHiddenCards || card.visibleToPlayers !== false)
                .map(card => ({
                    ...card,
                    id: `library:${deck.id}:${card.id}`,
                    templateId: card.templateId || card.id,
                    sourceDeckId: deck.id,
                    sourceDeckName: deck.name,
                    sourceType: 'master_library'
                }));
        });

    const filteredTemplates = masterLibraryTemplates.filter(t => 
        (t.name || '').toLowerCase().includes(searchTemplate.toLowerCase())
    );

    const visibleActiveCards = activeDeckIsMasterLibrary && isPlayer && activeDeckAccess === COLLECTION_ACCESS.READ
        ? localCards.filter(card => card.visibleToPlayers !== false)
        : localCards;
    const displayedCards = activeCardTypeFilter
        ? visibleActiveCards.filter(card => (card.type || 'action') === activeCardTypeFilter)
        : visibleActiveCards;
    const activeCardType = CARD_TYPES.find(type => type.id === activeCardTypeFilter);

    return (
        <div className="w-full h-screen max-h-screen overflow-y-auto custom-scrollbar bg-[#09090b] pb-20 md:pb-0">
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
                            {/* Header Panel matching CardBuilder */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-12 border-b border-[#c8aa6e]/20 pb-4 md:pb-6 gap-4">
                                <div>
                                    <h1 className="text-3xl font-fantasy text-[#f0e6d2] mb-2 uppercase tracking-wider drop-shadow-[0_2px_10px_rgba(200,170,110,0.2)] md:text-4xl">
                                        Colección de Barajas
                                    </h1>
                                    <p className="text-slate-400 text-xs uppercase tracking-widest">
                                        Gestor de baraja y cartas del sistema — {ownerName}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {onBack && (
                                        <button
                                            type="button"
                                            onClick={onBack}
                                            className="group inline-flex items-center justify-center gap-2 border border-[#c8aa6e]/30 bg-[#c8aa6e]/5 px-4 py-2.5 font-fantasy text-xs font-bold uppercase tracking-[0.2em] text-[#c8aa6e] transition-all hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10 mr-2 rounded"
                                        >
                                            <FiArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                                            Volver
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setNewDeckModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#785a28] to-[#c8aa6e] text-[#09090b] font-bold text-xs uppercase tracking-widest rounded transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(200,170,110,0.3)]"
                                    >
                                        <FiPlus className="stroke-[3]" /> {isPlayer ? 'Crear Baraja' : 'Crear Baraja / Colección'}
                                    </button>
                                </div>
                            </div>

                            {/* Decks Grid */}
                            {normalDecks.length === 0 && libraryDecks.length === 0 ? (
                                <div className="w-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-12 bg-slate-950/20">
                                    <FiLayers className="w-16 h-16 text-[#c8aa6e]/30 mb-4 stroke-[1]" />
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Sin barajas disponibles</h4>
                                    <p className="text-xs text-slate-500 mt-2 text-center max-w-sm">
                                        Haz clic en el botón superior para crear tu primer mazo y empezar a coleccionar tus cartas tácticas.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                                    {catalogDeckItems.map((deck) => {
                                        if (deck.isSeparator) {
                                            return (
                                                <div key={deck.id} className="col-span-full mt-4 flex items-center gap-4">
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                                                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-950/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                                                        <Database className="h-3.5 w-3.5" />
                                                        Colecciones base
                                                    </div>
                                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                                                </div>
                                            );
                                        }
                                        const counts = getCardCounts(deck);
                                        const totalCards = (deck.cards || []).length;
                                        const isEditingName = editingDeckName === deck.id;
                                        const isLibrary = isMasterLibraryDeck(deck);
                                        const deckAccess = getDeckAccessForViewer(deck, viewerId);
                                        const canEditDeckCards = !isPlayer || deck.ownerId === ownerId || deckAccess === COLLECTION_ACCESS.EDIT;
                                        const canManageDeckActions = !isPlayer || (deck.ownerId === ownerId && !isLibrary);
                                        const canChangeDeckColor = !isPlayer || (deck.ownerId === ownerId && !isLibrary) || (isLibrary && deckAccess === COLLECTION_ACCESS.EDIT);
                                        const deckTheme = getDeckColorTheme(deck.color, isLibrary);
                                        const isDraggingNormalDeck = draggedNormalDeckId === deck.id;
                                        const isNormalDropTarget = normalDeckDropTargetId === deck.id;
                                        const isDraggingLibraryDeck = draggedLibraryDeckId === deck.id;
                                        const isLibraryDropTarget = libraryDropTargetId === deck.id;
                                        const isDropTargetDeck = isLibraryDropTarget || isNormalDropTarget;

                                        return (
                                            <motion.div
                                                key={deck.id}
                                                data-normal-deck-id={!isLibrary ? deck.id : undefined}
                                                data-library-deck-id={isLibrary ? deck.id : undefined}
                                                onPointerDown={(event) => {
                                                    if (isLibrary) {
                                                        handleLibraryDeckPointerDown(event, deck);
                                                    } else {
                                                        handleNormalDeckPointerDown(event, deck);
                                                    }
                                                }}
                                                onClick={() => {
                                                    if (normalDeckDragClickBlockedRef.current) {
                                                        normalDeckDragClickBlockedRef.current = false;
                                                        return;
                                                    }
                                                    if (libraryDragClickBlockedRef.current) {
                                                        libraryDragClickBlockedRef.current = false;
                                                        return;
                                                    }
                                                    if (!isEditingName) setActiveDeck(deck);
                                                }}
                                                className={`group relative flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${(canReorderLibraryDecks && isLibrary) || (canReorderNormalDecks && !isLibrary) ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${isDraggingLibraryDeck || isDraggingNormalDeck ? 'opacity-45 scale-[0.985]' : ''} ${isDropTargetDeck ? 'scale-[1.02]' : ''}`}
                                            >
                                                <AnimatePresence>
                                                    {isDropTargetDeck && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.97 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.98 }}
                                                            className={`pointer-events-none absolute -inset-3 z-0 rounded-xl border shadow-[0_0_30px_rgba(16,185,129,0.20)] ${isLibrary ? 'border-emerald-300/55 bg-emerald-400/10' : 'border-[#c8aa6e]/60 bg-[#c8aa6e]/10'}`}
                                                        />
                                                    )}
                                                </AnimatePresence>
                                                {/* Visual Folder Container */}
                                                <div className="w-full relative aspect-[4/3] flex flex-col items-center justify-end group/folder mb-3 overflow-visible">
                                                    {/* Folder Back */}
                                                    <div
                                                        className="absolute inset-0 rounded-lg border transition-all duration-300 group-hover/folder:brightness-110"
                                                        style={{
                                                            backgroundColor: deckTheme.back,
                                                            borderColor: deckTheme.border,
                                                            boxShadow: `inset 0 1px 0 ${deckTheme.glow}`
                                                        }}
                                                    >
                                                        {/* Folder Tab */}
                                                        <div
                                                            className="absolute -top-3 left-3 h-3 w-20 rounded-t-md border-x border-t transition-all duration-300"
                                                            style={{
                                                                backgroundColor: deckTheme.tab,
                                                                borderColor: deckTheme.border
                                                            }}
                                                        ></div>
                                                    </div>

                                                    {isLibrary && (
                                                        <div className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-950/70 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.14)] backdrop-blur-md">
                                                            <Database className="h-3 w-3" />
                                                            Colección base
                                                        </div>
                                                    )}

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
                                                                <FiLayers className="w-8 h-8 stroke-[1.5]" style={{ color: deckTheme.color }} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Folder Front Cover/Flap */}
                                                    <div
                                                        className="absolute bottom-0 inset-x-0 h-[48%] rounded-b-lg border-t transition-all duration-300 flex items-center justify-center z-10"
                                                        style={{
                                                            backgroundColor: deckTheme.front,
                                                            borderColor: deckTheme.border,
                                                            boxShadow: `0 -5px 15px rgba(0,0,0,0.5), inset 0 1px 0 ${deckTheme.glow}`
                                                        }}
                                                    >
                                                        <span
                                                            className="text-[9px] font-bold uppercase tracking-wider bg-black/45 px-2 py-0.5 rounded border"
                                                            style={{
                                                                color: deckTheme.color,
                                                                borderColor: deckTheme.border
                                                            }}
                                                        >
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
                                                                        {isLibrary ? (canEditDeckCards ? 'base editable' : 'base lectura') : 'cartas'}: {totalCards}
                                                                    </span>
                                                                    {canChangeDeckColor && (
                                                                        <div
                                                                            className="mt-2 flex flex-wrap items-center gap-1.5"
                                                                            onClick={e => e.stopPropagation()}
                                                                            onPointerDown={e => e.stopPropagation()}
                                                                            aria-label="Color de baraja"
                                                                        >
                                                                            {DECK_COLOR_THEMES.map(theme => {
                                                                                const isSelectedColor = deckTheme.id === theme.id;
                                                                                return (
                                                                                    <button
                                                                                        key={theme.id}
                                                                                        type="button"
                                                                                        title={`Color ${theme.label}`}
                                                                                        aria-label={`Color ${theme.label}`}
                                                                                        aria-pressed={isSelectedColor}
                                                                                        onClick={(e) => handleUpdateDeckColor(deck.id, theme.id, e)}
                                                                                        className={`relative h-3.5 w-3.5 rounded-full border transition-all duration-150 hover:border-[#f0e6d2]/70 ${isSelectedColor ? 'border-[#f0e6d2]/85' : 'border-slate-600/70'}`}
                                                                                        style={{
                                                                                            backgroundColor: theme.color,
                                                                                            boxShadow: isSelectedColor ? `0 0 0 2px #080b10, 0 0 0 3px ${theme.border}` : 'none'
                                                                                        }}
                                                                                    >
                                                                                        {isSelectedColor && (
                                                                                            <span className="absolute inset-[3px] rounded-full bg-[#080b10]/75" />
                                                                                        )}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                        {canManageDeckActions && (
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
                                                        )}
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
                            <div
                                className="relative flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-12 border-b pb-4 md:pb-6 gap-4 overflow-hidden"
                                style={{ borderColor: activeDeckTheme.border }}
                            >
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setActiveDeck(null)}
                                        className="p-2 bg-slate-800 hover:bg-[#c8aa6e] hover:text-slate-950 text-slate-400 rounded transition-all flex items-center justify-center"
                                        title="Volver a barajas"
                                    >
                                        <FiArrowLeft className="w-5 h-5 stroke-[2.5]" />
                                    </button>
                                    <div className="relative z-10">
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <h2 className="text-3xl font-fantasy text-[#f0e6d2] uppercase">{activeDeck.name}</h2>
                                            {activeDeckIsMasterLibrary && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-950/50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-200">
                                                    <Database className="h-3 w-3" />
                                                    Colección base
                                                </span>
                                            )}
                                            {!canEditActiveDeck && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600/45 bg-slate-950/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                                    <LockKeyhole className="h-3 w-3" />
                                                    Solo lectura
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-400 text-xs uppercase tracking-widest">
                                            Propietario: <span className="font-bold" style={{ color: activeDeckTheme.color }}>{activeDeck.ownerId === 'master' ? 'Master' : ownerName}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Live Category Counts */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {CARD_TYPES.map(type => {
                                        const counts = getCardCounts(activeDeck);
                                        const count = counts[type.id] || 0;
                                        const Icon = type.icon;
                                        const isTypeFilterActive = activeCardTypeFilter === type.id;
                                        return (
                                            <button
                                                key={type.id} 
                                                type="button"
                                                onClick={() => setActiveCardTypeFilter(prev => prev === type.id ? null : type.id)}
                                                disabled={count === 0}
                                                aria-pressed={isTypeFilterActive}
                                                title={count > 0 ? `Filtrar por ${type.label}` : `Sin cartas de ${type.label}`}
                                                className={`flex items-center gap-1.5 px-3 py-1 border rounded text-xs font-bold transition-all disabled:cursor-default ${count > 0 ? `${type.color} hover:brightness-125` : 'text-slate-600 bg-transparent border-slate-800/50'} ${isTypeFilterActive ? 'ring-1 ring-[#f0e6d2]/60 ring-offset-1 ring-offset-[#05070b] brightness-125' : ''}`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                <span className="uppercase text-[9px] tracking-wider">{type.label}</span>
                                                <span className="ml-1 bg-black/40 px-1.5 py-0.2 rounded text-[10px] text-[#f0e6d2]">{count}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Main Grid + Sidebar templates within max-w-5xl layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-12">
                                
                                {/* Left Section: Grid of Cards in Active Deck */}
                                <div
                                    className="flex min-w-0 flex-col gap-4 lg:col-span-3"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[10px] uppercase font-bold tracking-widest text-[#c8aa6e]">
                                                {activeDeckIsMasterLibrary ? 'Colección Base' : 'Mi Baraja'} ({ displayedCards.length }{activeCardType ? `/${visibleActiveCards.length}` : ''} cartas)
                                            </span>
                                            {activeCardType && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveCardTypeFilter(null)}
                                                    className="inline-flex items-center gap-1 rounded border border-slate-700/70 bg-slate-950/45 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:border-[#c8aa6e]/50 hover:text-[#f0e6d2]"
                                                >
                                                    {activeCardType.label}
                                                    <FiX className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                        {canEditActiveDeck ? (
                                            <span className="hidden sm:inline-flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                                            <RefreshCw className="h-3 w-3 text-[#c8aa6e]/60" />
                                            Arrastra una carta sobre otra para intercambiarlas
                                            </span>
                                        ) : (
                                            <span className="hidden sm:inline-flex items-center gap-1.5 text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                                                <Eye className="h-3 w-3 text-slate-500" />
                                                Puedes importar estas cartas, pero no modificar la colección
                                            </span>
                                        )}
                                    </div>

                                    {displayedCards.length === 0 ? (
                                        <div className="w-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-12 bg-slate-950/10">
                                            <FiLayers className="w-12 h-12 text-[#c8aa6e]/20 mb-3" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Mazo vacío</h4>
                                            <p className="text-[10px] text-slate-600 mt-1 max-w-xs text-center">
                                                Usa las cartas disponibles a la derecha y haz clic para agregarlas a esta baraja.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid w-full min-w-0 select-none grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                                            {displayedCards.map((card) => {
                                                return (
                                                    <DeckCardItem 
                                                        key={card.id}
                                                        card={card}
                                                        draggedCardId={draggedCardId}
                                                        dropTargetCardId={dropTargetCardId}
                                                        canEdit={canEditActiveDeck}
                                                        canManageVisibility={canManageActiveCardVisibility}
                                                        isMasterLibrary={activeDeckIsMasterLibrary}
                                                        handleCycleCardType={handleCycleCardType}
                                                        handleRemoveCardFromDeck={handleRemoveCardFromDeck}
                                                        handleToggleCardVisibility={handleToggleCardVisibility}
                                                        handleCardPointerDown={handleCardPointerDown}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Right Section: Templates Library (Sticky narrow box sidebar) */}
                                <div className="lg:col-span-1 lg:sticky lg:top-4 h-fit bg-[#0d1017] border border-slate-800/80 rounded flex flex-col overflow-hidden max-h-[75vh] shadow-xl">
                                    {canManageActiveLibraryPermissions && (
                                        <div className="flex-none border-b border-emerald-500/20 bg-emerald-950/10 p-4">
                                            <span className="mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                                                <Users className="h-3.5 w-3.5" />
                                                Permisos
                                            </span>
                                            <div className="flex max-h-44 flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar">
                                                {knownPlayers.length === 0 ? (
                                                    <div className="text-[10px] italic text-slate-600">No hay jugadores registrados.</div>
                                                ) : (
                                                    knownPlayers.map(player => {
                                                        const access = activeDeck.permissions?.[player] || COLLECTION_ACCESS.HIDDEN;
                                                        return (
                                                            <div key={player} className="rounded border border-slate-800/80 bg-slate-950/35 p-2">
                                                                <div className="mb-2 truncate text-[11px] font-bold uppercase tracking-wider text-slate-200">{player}</div>
                                                                <div className="grid grid-cols-3 gap-1">
                                                                    {[
                                                                        { value: COLLECTION_ACCESS.HIDDEN, label: 'Oculto' },
                                                                        { value: COLLECTION_ACCESS.READ, label: 'Ver' },
                                                                        { value: COLLECTION_ACCESS.EDIT, label: 'Editar' }
                                                                    ].map(option => (
                                                                        <button
                                                                            key={option.value}
                                                                            type="button"
                                                                            onClick={() => handleUpdateLibraryPermission(player, option.value)}
                                                                            className={`rounded border px-1.5 py-1 text-[8px] font-bold uppercase tracking-wider transition-colors ${access === option.value ? 'border-[#c8aa6e]/70 bg-[#c8aa6e]/15 text-[#f0e6d2]' : 'border-slate-800 bg-slate-950/40 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
                                                                        >
                                                                            {option.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-none p-4 border-b border-slate-800/80 bg-slate-950/25">
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#c8aa6e] block mb-2.5">
                                            Cartas disponibles
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
                                        {activeDeckIsMasterLibrary && canEditActiveDeck && (
                                            <div className="mt-3">
                                                <input
                                                    ref={libraryCardFileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleUploadLibraryCard}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => libraryCardFileInputRef.current?.click()}
                                                    disabled={isUploadingLibraryCard}
                                                    className="flex w-full items-center justify-center gap-2 rounded border border-emerald-400/35 bg-emerald-950/30 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-200 transition-all hover:border-emerald-300/70 hover:bg-emerald-900/35 disabled:cursor-wait disabled:opacity-60"
                                                >
                                                    <FiPlus className="h-3.5 w-3.5 stroke-[3]" />
                                                    {isUploadingLibraryCard ? 'Subiendo...' : 'Subir carta'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Templates list scroll area */}
                                    <div className="overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2.5 bg-[#0b0e14]/40 max-h-[55vh]">
                                        {filteredTemplates.length === 0 ? (
                                            <div className="p-4 text-center text-slate-600 text-[11px] italic">
                                                Sin cartas disponibles.
                                            </div>
                                        ) : (
                                            filteredTemplates.map((template) => (
                                                <div 
                                                    key={template.id}
                                                    onClick={() => canEditActiveDeck && handleAddCardToDeck(template)}
                                                    className={`group flex items-center gap-2.5 p-2 bg-[#131722]/40 border border-slate-800 rounded transition-all duration-200 ${canEditActiveDeck ? 'hover:border-[#c8aa6e]/50 hover:bg-[#131722] cursor-pointer' : 'cursor-default opacity-75'}`}
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
                                                            {template.sourceDeckName || 'Colección base'}
                                                        </span>
                                                        <span className="text-[8px] text-slate-600 uppercase tracking-wider font-bold mt-0.5">
                                                            {canEditActiveDeck ? '+ Añadir' : 'Solo lectura'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(event) => handleDownloadTemplateCard(template, event)}
                                                        disabled={!template.frontUrl}
                                                        className="flex h-8 w-8 flex-none self-center items-center justify-center rounded border border-slate-800/80 bg-slate-950/45 text-slate-500 transition-colors hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e] disabled:cursor-not-allowed disabled:opacity-35"
                                                        title="Descargar PNG"
                                                        aria-label={`Descargar ${template.name || 'carta'} en PNG`}
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                    </button>
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
                                onClick={() => {
                                    setNewDeckIsMasterLibrary(false);
                                    setNewDeckModal(false);
                                }}
                                className="absolute top-4 right-4 text-slate-500 hover:text-white rounded"
                            >
                                <FiX className="w-5 h-5" />
                            </button>

                            <h3 className="font-cinzel text-lg font-bold text-[#f0e6d2] uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-[#c8aa6e]/10 pb-2">
                                <FiPlus className="text-[#c8aa6e] stroke-[2.5]" /> Crear Nueva {newDeckIsMasterLibrary ? 'Colección Base' : 'Baraja'}
                            </h3>

                            <div className="space-y-4">
                                {!isPlayer && (
                                    <button
                                        type="button"
                                        onClick={() => setNewDeckIsMasterLibrary(prev => !prev)}
                                        className={`flex w-full items-start gap-3 rounded border p-3 text-left transition-colors ${newDeckIsMasterLibrary ? 'border-emerald-400/45 bg-emerald-950/25' : 'border-slate-800 bg-[#161a23]/50 hover:border-[#c8aa6e]/35'}`}
                                    >
                                        <Database className={`mt-0.5 h-5 w-5 flex-none ${newDeckIsMasterLibrary ? 'text-emerald-300' : 'text-slate-500'}`} />
                                        <span className="flex flex-col gap-1">
                                            <span className="text-[11px] font-bold uppercase tracking-widest text-[#f0e6d2]">Colección base del Master</span>
                                            <span className="text-[10px] leading-relaxed text-slate-500">
                                                Actúa como base de datos de cartas universales. El Master decide qué jugadores pueden verla o editarla y qué cartas concretas quedan publicadas.
                                            </span>
                                        </span>
                                    </button>
                                )}

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                                        Nombre de la {newDeckIsMasterLibrary ? 'Colección' : 'Baraja'}
                                    </label>
                                    <input
                                        type="text"
                                        value={newDeckName}
                                        onChange={(e) => setNewDeckName(e.target.value)}
                                        placeholder={newDeckIsMasterLibrary ? 'Ej: Cartas Universales de Acción' : 'Ej: Mazo de Combate Aéreo'}
                                        className="w-full bg-[#161a23] border border-slate-800 text-xs text-[#e2e8f0] p-3 rounded outline-none focus:border-[#c8aa6e] transition-colors"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCreateDeck();
                                        }}
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Boton color="gray" onClick={() => {
                                        setNewDeckIsMasterLibrary(false);
                                        setNewDeckModal(false);
                                    }}>
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

            <AnimatePresence>
                {deckToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/82 p-3 backdrop-blur-sm sm:p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.94, y: 18 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 10 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                            className="relative grid w-full max-w-2xl grid-cols-1 gap-4 overflow-hidden rounded-xl border border-red-900/45 bg-[#0b1120] p-4 shadow-[0_0_50px_rgba(220,38,38,0.18)] sm:grid-cols-[120px_1fr] sm:p-6"
                        >
                            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-55" />
                            <div className="mx-auto flex w-24 items-center justify-center sm:mx-0 sm:w-full">
                                <div className="flex aspect-[3/4.2] w-full items-center justify-center rounded-lg border border-red-900/35 bg-[#05070b] shadow-[0_18px_30px_rgba(0,0,0,0.45)]">
                                    {isMasterLibraryDeck(deckToDelete) ? (
                                        <Database className="h-12 w-12 text-red-400/80" />
                                    ) : (
                                        <FiLayers className="h-12 w-12 text-red-400/80" />
                                    )}
                                </div>
                            </div>

                            <div className="flex min-w-0 flex-col justify-center">
                                <h3 className="mb-2 flex items-center gap-2 font-cinzel text-lg font-bold uppercase tracking-wide text-red-500 sm:text-xl">
                                    <Trash2 className="h-5 w-5 flex-none" />
                                    Eliminar {isMasterLibraryDeck(deckToDelete) ? 'colección base' : 'baraja'}
                                </h3>
                                <p className="text-sm leading-relaxed text-slate-400">
                                    ¿Estás seguro de que deseas eliminar <span className="font-bold text-[#f0e6d2]">"{deckToDelete.name || 'Baraja sin nombre'}"</span>?
                                </p>
                                <p className="mt-2 text-xs leading-relaxed text-red-400/75">
                                    Esta acción eliminará permanentemente la {isMasterLibraryDeck(deckToDelete) ? 'colección y sus cartas compartidas' : 'baraja y todas sus cartas'}. No afectará a otras colecciones.
                                </p>

                                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setDeckToDelete(null)}
                                        className="rounded px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-[#f0e6d2]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmDeleteDeck}
                                        className="rounded border border-red-900/55 bg-red-950/30 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-red-400 shadow-[0_0_20px_rgba(220,38,38,0.10)] transition-all hover:border-red-500/70 hover:bg-red-900/40 hover:text-red-200"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {libraryCardToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/82 p-3 backdrop-blur-sm sm:p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.94, y: 18 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 10 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                            className="relative grid w-full max-w-2xl grid-cols-1 gap-4 overflow-hidden rounded-xl border border-red-900/45 bg-[#0b1120] p-4 shadow-[0_0_50px_rgba(220,38,38,0.18)] sm:grid-cols-[120px_1fr] sm:p-6"
                        >
                            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-55" />
                            <div className="mx-auto w-24 sm:mx-0 sm:w-full">
                                <div className="aspect-[3/4.2] overflow-hidden rounded-lg border border-red-900/35 bg-[#05070b] shadow-[0_18px_30px_rgba(0,0,0,0.45)]">
                                    {libraryCardToDelete.frontUrl ? (
                                        <img
                                            src={libraryCardToDelete.frontUrl}
                                            alt={libraryCardToDelete.name || 'Carta'}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center p-3 text-center text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                            {libraryCardToDelete.name || 'Carta'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex min-w-0 flex-col justify-center">
                                <h3 className="mb-2 flex items-center gap-2 font-cinzel text-lg font-bold uppercase tracking-wide text-red-500 sm:text-xl">
                                    <Trash2 className="h-5 w-5 flex-none" />
                                    Eliminar carta base
                                </h3>
                                <p className="text-sm leading-relaxed text-slate-400">
                                    ¿Estás seguro de que deseas eliminar <span className="font-bold text-[#f0e6d2]">"{libraryCardToDelete.name || 'Carta sin nombre'}"</span> de la colección base?
                                </p>
                                <p className="mt-2 text-xs leading-relaxed text-red-400/75">
                                    Esta acción eliminará permanentemente esta carta de la base de datos compartida. Los jugadores con acceso dejarán de verla como plantilla.
                                </p>

                                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setLibraryCardToDelete(null)}
                                        className="rounded px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-[#f0e6d2]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmRemoveLibraryCard}
                                        className="rounded border border-red-900/55 bg-red-950/30 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-red-400 shadow-[0_0_20px_rgba(220,38,38,0.10)] transition-all hover:border-red-500/70 hover:bg-red-900/40 hover:text-red-200"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {dragPreview && (
                    <motion.div
                        key="deck-card-drag-preview"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1.04, rotate: -1.5 }}
                        exit={{ opacity: 0, scale: 0.98, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                        className="pointer-events-none fixed z-[9999]"
                        style={{
                            left: dragPreview.x - dragPreview.offsetX,
                            top: dragPreview.y - dragPreview.offsetY,
                            width: dragPreview.width,
                            height: dragPreview.height,
                            filter: 'drop-shadow(0 24px 28px rgba(0,0,0,0.72)) drop-shadow(0 0 22px rgba(200,170,110,0.28))'
                        }}
                    >
                        <TiltCard frontUrl={dragPreview.card.frontUrl} name={dragPreview.card.name} active={false} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

DeckBuilderView.propTypes = {
    ownerId: PropTypes.string.isRequired,
    ownerName: PropTypes.string.isRequired,
    currentUserId: PropTypes.string,
    knownPlayers: PropTypes.arrayOf(PropTypes.string),
    isPlayer: PropTypes.bool,
    onBack: PropTypes.func
};

export default DeckBuilderView;
