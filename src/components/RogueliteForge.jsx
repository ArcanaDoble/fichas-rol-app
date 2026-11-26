import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { nanoid } from 'nanoid';
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  ArrowLeft,
  MoreHorizontal,
  Dices,
  ChevronDown,
  Copy,
  Gem,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Search,
  Shield,
  Sword,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { db, storage } from '../firebase';
import { isValidHexColor, normalizeHexColor } from '../utils/color';
import { optimizeImageFile } from '../utils/storage';
import {
  AbilityCatalogFields,
  AccessoryCatalogFields,
  ArmorCatalogFields,
  WeaponCatalogFields,
  TrickWeaponCatalogFields,
} from './admin/RogueliteCatalogFields';
import { getWeaponForms, hasWeaponTrick, resolveWeaponForm } from '../features/roguelite/weaponForms';
import RogueliteInventoryCard from './RogueliteInventoryCard';
import TraitsInput from './TraitsInput';
import {
  abilityCatalogItemToForm,
  abilityCatalogItemToStorage,
  accessoryCatalogItemToForm,
  accessoryCatalogItemToStorage,
  armorCatalogItemToForm,
  armorCatalogItemToStorage,
  createEmptyAbilityCatalogItem,
  createEmptyAccessoryCatalogItem,
  createEmptyArmorCatalogItem,
  createEmptyWeaponCatalogItem,
  weaponCatalogItemToForm,
  weaponCatalogItemToStorage,
} from '../features/roguelite/catalogItem';

const normalizeKey = (name) => String(name || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, '_')
  .replace(/[^a-z0-9_]/g, '');

const splitTraits = (value) => (Array.isArray(value) ? value : String(value || '').split(','))
  .map((trait) => String(trait || '').trim())
  .filter(Boolean);

const objectToForm = (item = {}) => ({
  ...item,
  id: item.id || '',
  nombre: item.nombre || item.name || '',
  rareza: item.rareza || item.rarity || '',
  rasgos: splitTraits(item.rasgos || item.traits).join(', '),
  descripcion: item.descripcion || item.description || '',
  lore: item.lore || item.descripcionLore || item.flavorText || item.flavourText || '',
  valor: item.valor ?? '',
  color: item.color || '#c8aa6e',
});

const createEmptyObject = () => objectToForm({});

const objectToStorage = (item = {}) => ({
  ...item,
  id: item.id,
  name: String(item.nombre || '').trim(),
  nombre: String(item.nombre || '').trim(),
  type: 'Objeto',
  itemType: 'object',
  category: 'objects',
  description: String(item.descripcion || '').trim(),
  descripcion: String(item.descripcion || '').trim(),
  lore: String(item.lore || '').trim(),
  descripcionLore: String(item.lore || '').trim(),
  rareza: String(item.rareza || '').trim(),
  rasgos: splitTraits(item.rasgos),
  valor: item.valor ?? '',
  color: item.color || '#c8aa6e',
});

const CATEGORY_CONFIG = [
  { id: 'weapons', label: 'Armas', singular: 'Arma', icon: Sword, collection: 'weapons', empty: createEmptyWeaponCatalogItem, toForm: weaponCatalogItemToForm, toStorage: weaponCatalogItemToStorage, source: 'armas' },
  { id: 'armor', label: 'Armaduras', singular: 'Armadura', icon: Shield, collection: 'armors', empty: createEmptyArmorCatalogItem, toForm: armorCatalogItemToForm, toStorage: armorCatalogItemToStorage, source: 'armaduras' },
  { id: 'abilities', label: 'Habilidades', singular: 'Habilidad', icon: Zap, collection: 'abilities', empty: createEmptyAbilityCatalogItem, toForm: abilityCatalogItemToForm, toStorage: abilityCatalogItemToStorage, source: 'habilidades' },
  { id: 'objects', label: 'Objetos', singular: 'Objeto', icon: Package, collection: 'customItems', empty: createEmptyObject, toForm: objectToForm, toStorage: objectToStorage, source: 'objects' },
  { id: 'accessories', label: 'Accesorios', singular: 'Accesorio', icon: Gem, collection: 'accessories', empty: createEmptyAccessoryCatalogItem, toForm: accessoryCatalogItemToForm, toStorage: accessoryCatalogItemToStorage, source: 'accesorios' },
];

const FALLBACK_RARITY_COLORS = {
  legendaria: '#f97316',
  epica: '#a855f7',
  rara: '#3b82f6',
  'poco comun': '#22c55e',
  comun: '#94a3b8',
};

const DEFAULT_RARITIES = [
  { nombre: 'Común', color: '#94a3b8' },
  { nombre: 'Poco común', color: '#22c55e' },
  { nombre: 'Rara', color: '#3b82f6' },
  { nombre: 'Épica', color: '#a855f7' },
  { nombre: 'Legendaria', color: '#f97316' },
  { nombre: 'Mítica', color: '#ef4444' },
];

const noopAsync = async () => {};

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const colorWithAlpha = (hex, alpha) => {
  const clean = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return `rgba(200, 170, 110, ${alpha})`;
  const number = Number.parseInt(clean, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
};

const getItemName = (item) => item?.nombre || item?.name || 'Objeto sin nombre';
const getItemDescription = (item) => item?.descripcion || item?.description || '';
const getItemLore = (item) => item?.lore || item?.descripcionLore || item?.flavorText || item?.flavourText || '';
const asImageSource = (value) => /^(https?:|data:image|blob:|\/)/i.test(String(value || '').trim())
  ? String(value).trim()
  : '';

const Section = ({ title, hint, children, defaultOpen = false }) => (
  <details className="noma-forge-section group overflow-hidden rounded-xl border border-[#c8aa6e]/20 bg-[#161f32]/70 shadow-[0_14px_35px_-24px_rgba(0,0,0,0.9)]" open={defaultOpen}>
    <summary className="flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
      <span>
        <strong className="block font-['Cinzel'] text-sm uppercase tracking-[0.13em] text-[#f0e6d2]">{title}</strong>
        {hint && <small className="mt-0.5 block font-['Lato'] text-[11px] text-slate-500">{hint}</small>}
      </span>
      <ChevronDown className="text-[#c8aa6e]/70 transition-transform group-open:rotate-180" size={18} />
    </summary>
    <div className="border-t border-[#c8aa6e]/15 p-4">{children}</div>
  </details>
);

Section.propTypes = {
  title: PropTypes.string.isRequired,
  hint: PropTypes.string,
  children: PropTypes.node.isRequired,
  defaultOpen: PropTypes.bool,
};

const ObjectFields = ({ value, setValue, rarities, glossary }) => {
  const update = (key) => (eventOrValue) => {
    const nextValue = eventOrValue?.target ? eventOrValue.target.value : eventOrValue;
    setValue((current) => ({ ...current, [key]: nextValue }));
  };
  const control = 'min-h-[44px] w-full rounded border border-[#c8aa6e]/25 bg-black/40 px-3 py-2 text-sm text-[#e8dfcf] outline-none transition-colors focus:border-[#c8aa6e]/80';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea0bd]">Nombre</span>
        <input className={control} value={value.nombre || ''} onChange={update('nombre')} placeholder="Objeto nuevo" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea0bd]">Rareza</span>
        <select className={control} value={value.rareza || ''} onChange={update('rareza')}>
          <option value="">Sin rareza</option>
          {rarities.map((rarity) => <option key={rarity.nombre} value={rarity.nombre}>{rarity.nombre}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea0bd]">Precio / valor</span>
        <input className={control} type="number" min="0" inputMode="numeric" value={value.valor ?? ''} onChange={update('valor')} placeholder="0" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea0bd]">Color de icono</span>
        <span className="flex overflow-hidden rounded border border-[#c8aa6e]/25 bg-black/40">
          <input className="h-[42px] w-14 cursor-pointer bg-transparent p-1" type="color" value={value.color || '#c8aa6e'} onChange={update('color')} />
          <input className="min-w-0 flex-1 bg-transparent px-2 text-sm text-[#e8dfcf] outline-none" value={value.color || ''} onChange={update('color')} />
        </span>
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea0bd]">Rasgos</span>
        <TraitsInput value={value.rasgos || ''} onChange={update('rasgos')} glossary={glossary} placeholder="Consumible, Curación, Único…" className="!min-h-[44px] !rounded !border-[#c8aa6e]/25 !bg-black/40 !text-[#e8dfcf]" />
      </label>
      <fieldset className="grid min-w-0 gap-3 border-t border-[#c8aa6e]/15 pt-4 sm:col-span-2 sm:grid-cols-2">
        <legend className="mb-1 pr-3 font-['Cinzel'] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c8aa6e]">Texto de la tarjeta</legend>
        <label className="block min-w-0">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea0bd]">Reglas y efecto</span>
          <textarea className={`${control} min-h-[120px] resize-y font-['Alegreya'] text-[15px] font-medium leading-[1.5]`} value={value.descripcion || ''} onChange={update('descripcion')} placeholder="Qué hace, qué cuesta y cómo se resuelve" />
        </label>
        <label className="block min-w-0">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea0bd]">Lore</span>
          <textarea className={`${control} min-h-[120px] resize-y font-['Alegreya'] text-[15px] italic leading-[1.5]`} value={value.lore || ''} onChange={update('lore')} placeholder="Origen, aspecto o historia del objeto" />
        </label>
      </fieldset>
    </div>
  );
};

ObjectFields.propTypes = {
  value: PropTypes.object.isRequired,
  setValue: PropTypes.func.isRequired,
  rarities: PropTypes.array.isRequired,
  glossary: PropTypes.array.isRequired,
};

const RarityManager = ({ rarities, onChanged, onClose }) => {
  const [draft, setDraft] = useState({ nombre: '', color: '#64748b' });
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setDraft({ nombre: '', color: '#64748b' });
    setEditingName('');
    setError('');
  };

  const editRarity = (rarity) => {
    setDraft({ nombre: rarity.nombre || '', color: rarity.color || '#64748b' });
    setEditingName(rarity.nombre || '');
    setError('');
  };

  const saveRarity = async () => {
    const nombre = String(draft.nombre || '').trim();
    if (!nombre) {
      setError('Escribe un nombre para la rareza.');
      return;
    }
    if (!/^#[0-9a-f]{6}$/i.test(draft.color || '')) {
      setError('El color debe tener el formato #RRGGBB.');
      return;
    }
    const duplicate = rarities.some((rarity) => normalizeText(rarity.nombre) === normalizeText(nombre)
      && normalizeText(rarity.nombre) !== normalizeText(editingName));
    if (duplicate) {
      setError('Ya existe una rareza con ese nombre.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await setDoc(doc(db, 'rarities', nombre), { nombre, color: draft.color });
      if (editingName && editingName !== nombre) await deleteDoc(doc(db, 'rarities', editingName));
      await onChanged();
      resetForm();
    } catch (saveError) {
      console.error(saveError);
      setError('No se pudo guardar la rareza.');
    } finally {
      setSaving(false);
    }
  };

  const removeRarity = async (rarity) => {
    if (!window.confirm(`¿Eliminar la rareza “${rarity.nombre}”? Los objetos conservarán su texto, pero perderán este color.`)) return;
    try {
      await deleteDoc(doc(db, 'rarities', rarity.nombre));
      if (editingName === rarity.nombre) resetForm();
      await onChanged();
    } catch (deleteError) {
      console.error(deleteError);
      setError('No se pudo eliminar la rareza.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 md:flex md:justify-end" role="dialog" aria-modal="true" aria-labelledby="forge-rarity-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col border-t border-[#785a28]/55 bg-[#0b1120] shadow-2xl md:relative md:inset-auto md:h-full md:max-h-none md:w-[430px] md:border-l md:border-t-0">
        <header className="flex items-center justify-between border-b border-[#785a28]/35 px-4 py-4 sm:px-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a99365]">Catálogo visual</p>
            <h2 id="forge-rarity-title" className="font-['Cinzel'] text-lg font-semibold uppercase tracking-[0.08em] text-[#f0e6d2]">Rarezas</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center border border-[#785a28]/60 text-[#c8aa6e] transition-colors hover:border-[#c8aa6e] hover:bg-[#785a28]/15 hover:text-[#f0e6d2]" aria-label="Cerrar gestor de rarezas"><X size={19} /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-2 sm:px-5">
          {rarities.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Todavía no hay rarezas.</p>
          ) : (
            <ul className="divide-y divide-[#785a28]/20">
              {rarities.map((rarity) => (
                <li key={rarity.nombre} className="flex min-h-[58px] items-center gap-3 py-2">
                  <span className="h-7 w-2 shrink-0" style={{ backgroundColor: rarity.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate font-['Cinzel'] text-sm font-semibold text-slate-200">{rarity.nombre}</span>
                  <button type="button" onClick={() => editRarity(rarity)} className="flex h-10 w-10 items-center justify-center text-slate-500 transition-colors hover:bg-[#785a28]/15 hover:text-[#c8aa6e]" aria-label={`Editar ${rarity.nombre}`}><Pencil size={16} /></button>
                  <button type="button" onClick={() => removeRarity(rarity)} className="flex h-10 w-10 items-center justify-center text-slate-600 transition-colors hover:bg-rose-950/50 hover:text-rose-300" aria-label={`Eliminar ${rarity.nombre}`}><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[#785a28]/35 bg-[#090e19] p-4 sm:p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a99365]">{editingName ? 'Modificar rareza' : 'Nueva rareza'}</p>
          <div className="grid grid-cols-[1fr_52px] gap-2">
            <input className="min-h-[46px] min-w-0 border border-[#785a28]/55 bg-black/30 px-3 text-sm text-slate-100 outline-none transition-colors focus:border-[#c8aa6e]/80" value={draft.nombre} onChange={(event) => setDraft((current) => ({ ...current, nombre: event.target.value }))} placeholder="Nombre" />
            <input className="h-[46px] w-[52px] cursor-pointer border border-[#785a28]/55 bg-black/30 p-1" type="color" value={draft.color} onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))} aria-label="Color de la rareza" />
          </div>
          <input className="mt-2 min-h-[42px] w-full border border-[#785a28]/35 bg-black/20 px-3 font-mono text-xs uppercase text-slate-400 outline-none focus:border-[#c8aa6e]/70" value={draft.color} onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))} aria-label="Código hexadecimal" />
          {error && <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={editingName ? resetForm : onClose} className="min-h-[46px] border border-slate-700 bg-transparent px-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100">{editingName ? 'Cancelar edición' : 'Cerrar'}</button>
            <button type="button" onClick={saveRarity} disabled={saving} className="min-h-[46px] border border-[#c8aa6e]/55 bg-[#785a28]/75 px-3 text-xs font-bold uppercase tracking-[0.1em] text-[#f0e6d2] transition-colors hover:bg-[#8b6a32] disabled:opacity-50">{saving ? 'Guardando…' : editingName ? 'Actualizar' : 'Agregar'}</button>
          </div>
        </div>
      </section>
    </div>
  );
};

RarityManager.propTypes = {
  rarities: PropTypes.array.isRequired,
  onChanged: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

const EMPTY_GLOSSARY_TERM = { word: '', color: '#c8aa6e', colorInput: '#c8aa6e', info: '' };

const GlossaryManager = ({ glossary, onChanged, onClose }) => {
  const [draft, setDraft] = useState(EMPTY_GLOSSARY_TERM);
  const [editingWord, setEditingWord] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const visibleTerms = useMemo(() => {
    const needle = normalizeText(search);
    return [...glossary]
      .sort((left, right) => (left.word || '').localeCompare(right.word || '', 'es'))
      .filter((term) => !needle || normalizeText(`${term.word} ${term.info}`).includes(needle));
  }, [glossary, search]);

  const resetForm = () => {
    setDraft(EMPTY_GLOSSARY_TERM);
    setEditingWord('');
    setError('');
  };

  const editTerm = (term) => {
    const color = normalizeHexColor(term.color || '#c8aa6e');
    setDraft({ word: term.word || '', info: term.info || '', color, colorInput: color });
    setEditingWord(term.word || '');
    setError('');
  };

  const saveTerm = async () => {
    const word = draft.word.trim();
    const color = normalizeHexColor(draft.colorInput || draft.color);
    if (!word) return setError('Escribe el término que quieres destacar.');
    if (!isValidHexColor(color)) return setError('Usa un color hexadecimal válido.');
    setSaving(true);
    setError('');
    try {
      if (editingWord && editingWord !== word) await deleteDoc(doc(db, 'glossary', editingWord));
      await setDoc(doc(db, 'glossary', word), { word, color, info: draft.info.trim() });
      await onChanged();
      resetForm();
    } catch (saveError) {
      setError('No se pudo guardar el término.');
    } finally {
      setSaving(false);
    }
  };

  const removeTerm = async (term) => {
    if (!window.confirm(`¿Eliminar “${term.word}” del glosario?`)) return;
    await deleteDoc(doc(db, 'glossary', term.word));
    await onChanged();
    if (editingWord === term.word) resetForm();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 md:flex md:justify-end" role="dialog" aria-modal="true" aria-labelledby="forge-glossary-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col border-t border-[#785a28]/55 bg-[#0b1120] shadow-2xl md:relative md:inset-auto md:h-full md:max-h-none md:w-[480px] md:border-l md:border-t-0">
        <header className="border-b border-[#785a28]/35 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a99365]">Lenguaje del sistema</p>
              <h2 id="forge-glossary-title" className="font-['Cinzel'] text-lg font-semibold uppercase tracking-[0.08em] text-[#f0e6d2]">Glosario</h2>
            </div>
            <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#785a28]/60 text-[#c8aa6e] transition-colors hover:border-[#c8aa6e] hover:bg-[#785a28]/15 hover:text-[#f0e6d2]" aria-label="Cerrar gestor del glosario"><X size={19} /></button>
          </div>
          <label className="mt-4 flex min-h-[44px] items-center gap-2 border border-[#785a28]/35 bg-black/25 px-3 focus-within:border-[#c8aa6e]/70">
            <Search size={16} className="text-[#8f805f]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600" placeholder="Buscar término o descripción…" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Borrar búsqueda del glosario"><X size={15} /></button>}
          </label>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-2 sm:px-5">
          {visibleTerms.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">{search ? 'No hay coincidencias.' : 'Todavía no hay términos.'}</p>
          ) : (
            <ul className="divide-y divide-[#785a28]/20">
              {visibleTerms.map((term) => (
                <li key={term.word} className="flex min-h-[68px] items-center gap-3 py-2">
                  <span className="h-8 w-2 shrink-0" style={{ backgroundColor: term.color }} aria-hidden="true" />
                  <button type="button" onClick={() => editTerm(term)} className="min-w-0 flex-1 py-1 text-left">
                    <span className="block truncate font-['Cinzel'] text-sm font-semibold" style={{ color: term.color }}>{term.word}</span>
                    <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-400">{term.info || 'Sin descripción.'}</span>
                  </button>
                  <button type="button" onClick={() => editTerm(term)} className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-500 transition-colors hover:bg-[#785a28]/15 hover:text-[#c8aa6e]" aria-label={`Editar ${term.word}`}><Pencil size={16} /></button>
                  <button type="button" onClick={() => removeTerm(term)} className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-600 transition-colors hover:bg-rose-950/50 hover:text-rose-300" aria-label={`Eliminar ${term.word}`}><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[#785a28]/35 bg-[#090e19] p-4 sm:p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a99365]">{editingWord ? 'Modificar término' : 'Nuevo término'}</p>
          <div className="grid grid-cols-[1fr_52px] gap-2">
            <input value={draft.word} onChange={(event) => { setError(''); setDraft((current) => ({ ...current, word: event.target.value })); }} className="min-h-[46px] min-w-0 border border-[#785a28]/55 bg-black/30 px-3 text-sm text-slate-100 outline-none focus:border-[#c8aa6e]/80" placeholder="Nombre del término" />
            <input type="color" value={draft.color} onChange={(event) => { setError(''); setDraft((current) => ({ ...current, color: event.target.value, colorInput: event.target.value })); }} className="h-[46px] w-[52px] cursor-pointer border border-[#785a28]/55 bg-black/30 p-1" aria-label="Color del término" />
          </div>
          <input value={draft.colorInput} onChange={(event) => { const value = event.target.value; setError(''); setDraft((current) => ({ ...current, colorInput: value, ...(isValidHexColor(normalizeHexColor(value)) ? { color: normalizeHexColor(value) } : {}) })); }} className="mt-2 min-h-[42px] w-full border border-[#785a28]/35 bg-black/20 px-3 font-mono text-xs uppercase text-slate-400 outline-none focus:border-[#c8aa6e]/70" aria-label="Código hexadecimal del término" />
          <textarea value={draft.info} onChange={(event) => { setError(''); setDraft((current) => ({ ...current, info: event.target.value })); }} rows={3} className="mt-2 w-full resize-none border border-[#785a28]/35 bg-black/25 px-3 py-2.5 text-sm leading-5 text-slate-200 outline-none placeholder:text-slate-600 focus:border-[#c8aa6e]/70" placeholder="Explicación que verá el jugador…" />
          {error && <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={editingWord ? resetForm : onClose} className="min-h-[46px] border border-slate-700 bg-transparent px-3 text-xs font-bold uppercase tracking-[0.1em] text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100">{editingWord ? 'Cancelar edición' : 'Cerrar'}</button>
            <button type="button" onClick={saveTerm} disabled={saving} className="min-h-[46px] border border-[#c8aa6e]/55 bg-[#785a28]/75 px-3 text-xs font-bold uppercase tracking-[0.1em] text-[#f0e6d2] transition-colors hover:bg-[#8b6a32] disabled:opacity-50">{saving ? 'Guardando…' : editingWord ? 'Actualizar' : 'Agregar'}</button>
          </div>
        </div>
      </section>
    </div>
  );
};

GlossaryManager.propTypes = {
  glossary: PropTypes.array.isRequired,
  onChanged: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

const RogueliteForge = ({
  armas = [],
  armaduras = [],
  habilidades = [],
  accesorios = [],
  rarities = [],
  glossary = [],
  rarityColorMap = {},
  onCatalogChanged = noopAsync,
  onRaritiesChanged = noopAsync,
  onGlossaryChanged = noopAsync,
  onBack,
}) => {
  const [category, setCategory] = useState('weapons');
  const [objects, setObjects] = useState([]);
  const [customImages, setCustomImages] = useState({});
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [draft, setDraft] = useState(createEmptyWeaponCatalogItem());
  const [selectedFile, setSelectedFile] = useState(null);
  const [localPreview, setLocalPreview] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [editingFormIndex, setEditingFormIndex] = useState(0);
  const [formImageEdits, setFormImageEdits] = useState({});
  const formPreviewUrls = useRef(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rarityManagerOpen, setRarityManagerOpen] = useState(false);
  const [glossaryManagerOpen, setGlossaryManagerOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    const seedDefaultRarities = async () => {
      try {
        const markerRef = doc(db, 'rogueliteForgeSettings', 'rarities');
        const marker = await getDoc(markerRef);
        if (marker.exists() && marker.data()?.defaultsSeeded) return;
        const snapshot = await getDocs(collection(db, 'rarities'));
        const existing = new Set(snapshot.docs.map((entry) => normalizeText(entry.data()?.nombre || entry.id)));
        await Promise.all(DEFAULT_RARITIES
          .filter((rarity) => !existing.has(normalizeText(rarity.nombre)))
          .map((rarity) => setDoc(doc(db, 'rarities', rarity.nombre), rarity)));
        await setDoc(markerRef, { defaultsSeeded: true, updatedAt: Date.now() }, { merge: true });
        if (active) await onRaritiesChanged();
      } catch (seedError) {
        console.error('No se pudieron preparar las rarezas iniciales de la Forja.', seedError);
      }
    };
    seedDefaultRarities();
    return () => { active = false; };
  }, [onRaritiesChanged]);

  useEffect(() => onSnapshot(collection(db, 'customItems'), (snapshot) => {
    setObjects(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
  }), []);

  useEffect(() => onSnapshot(collection(db, 'equipment_images'), (snapshot) => {
    setCustomImages(Object.fromEntries(snapshot.docs.map((entry) => [entry.id, { id: entry.id, ...entry.data() }])));
  }), []);

  useEffect(() => () => {
    if (localPreview?.startsWith('blob:')) URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const activeConfig = CATEGORY_CONFIG.find((entry) => entry.id === category) || CATEGORY_CONFIG[0];
  const sources = { armas, armaduras, habilidades, accesorios, objects };
  const currentItems = sources[activeConfig.source] || [];
  const filteredItems = useMemo(() => {
    const needle = normalizeText(search.trim());
    return [...currentItems]
      .filter((item) => !item.deleted)
      .filter((item) => !needle || normalizeText([
        getItemName(item),
        getItemDescription(item),
        getItemLore(item),
        item.rareza,
        ...(Array.isArray(item.rasgos) ? item.rasgos : [item.rasgos]),
      ].join(' ')).includes(needle))
      .sort((left, right) => getItemName(left).localeCompare(getItemName(right), 'es'));
  }, [currentItems, search]);

  const imageRecord = customImages[normalizeKey(draft.nombre)] || null;
  const inheritedImage = asImageSource(editor?.sourceImage || imageRecord?.imageUrl || editor?.item?.image || editor?.item?.icon);
  const isTrick = category === 'weapons' && hasWeaponTrick(draft);
  const forms = isTrick ? getWeaponForms(draft, removeImage ? '' : localPreview || inheritedImage) : [];
  const formImage = index => {
    const edit = formImageEdits[forms[index]?.id];
    if (edit?.remove) return '';
    return edit?.preview || forms[index]?.image || '';
  };
  const previewImage = isTrick ? formImage(editingFormIndex) : removeImage ? '' : (localPreview || inheritedImage);
  const resetFormEditing = () => {
    formPreviewUrls.current.forEach(url => URL.revokeObjectURL(url));
    formPreviewUrls.current.clear();
    setFormImageEdits({}); setEditingFormIndex(0);
  };
  useEffect(() => () => formPreviewUrls.current.forEach(url => URL.revokeObjectURL(url)), []);

  const rarityAccent = useMemo(() => {
    const rarityName = draft.rareza || '';
    const configured = rarityColorMap[rarityName] || rarities.find((entry) => entry.nombre === rarityName)?.color;
    return configured || FALLBACK_RARITY_COLORS[normalizeText(rarityName)] || '#c8aa6e';
  }, [draft.rareza, rarities, rarityColorMap]);

  const previewItem = useMemo(() => ({
    ...draft,
    name: draft.nombre || `Nueva ${activeConfig.singular.toLowerCase()}`,
    damage: category === 'abilities' ? draft.poder : draft.dano,
    defense: draft.defenseClass || draft.defensa,
    range: draft.alcance,
    description: draft.descripcion,
    lore: draft.lore,
  }), [activeConfig.singular, category, draft]);

  const openNew = () => {
    resetFormEditing();
    setDraft(activeConfig.empty());
    setEditor({ mode: 'new', item: null, originalName: '' });
    setSelectedFile(null);
    setLocalPreview('');
    setRemoveImage(false);
    setError('');
  };

  const openEdit = (item) => {
    resetFormEditing();
    const originalName = getItemName(item);
    const record = customImages[normalizeKey(originalName)];
    setDraft(activeConfig.toForm(item));
    setEditor({ mode: 'edit', item, originalName, sourceImage: asImageSource(record?.imageUrl || item.image || item.icon) });
    setSelectedFile(null);
    setLocalPreview('');
    setRemoveImage(false);
    setError('');
  };

  const openDuplicate = (item) => {
    resetFormEditing();
    const originalName = getItemName(item);
    const sourceImage = asImageSource(customImages[normalizeKey(originalName)]?.imageUrl || item.image || item.icon);
    setDraft({ ...activeConfig.toForm(item), id: '', nombre: `${originalName} (copia)`, fuente: 'custom' });
    setEditor({ mode: 'duplicate', item: null, originalName: '', sourceImage });
    setSelectedFile(null);
    setLocalPreview('');
    setRemoveImage(false);
    setError('');
  };

  const closeEditor = () => {
    resetFormEditing();
    setMobilePreview(false);
    setEditor(null);
    setSelectedFile(null);
    setLocalPreview('');
    setRemoveImage(false);
    setError('');
  };

  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (isTrick) {
      const preview = URL.createObjectURL(file);
      formPreviewUrls.current.add(preview);
      const id = forms[editingFormIndex].id;
      setFormImageEdits(current => ({ ...current, [id]: { file, preview, remove: false } }));
      event.target.value = '';
      return;
    }
    setSelectedFile(file);
    setLocalPreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const uploadImage = async (file, name, register = true) => {
    const optimized = await optimizeImageFile(file, { maxWidth: 768, maxHeight: 768, quality: 0.86 });
    const uploadFile = optimized.file;
    const key = normalizeKey(name);
    const extension = uploadFile.type === 'image/webp' ? 'webp' : (uploadFile.name?.split('.').pop() || 'webp');
    const storageRef = ref(storage, `equipment_images/${category}/${key}.${extension}`);
    await uploadBytes(storageRef, uploadFile);
    const imageUrl = await getDownloadURL(storageRef);
    if (register) await setDoc(doc(db, 'equipment_images', key), {
      imageUrl,
      itemName: name,
      category,
      storagePath: storageRef.fullPath,
      updatedAt: Date.now(),
    });
    return imageUrl;
  };

  const saveItem = async () => {
    const name = String(draft.nombre || '').trim();
    if (!name) {
      setError('El objeto necesita un nombre.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const id = editor?.mode === 'edit' && draft.id ? draft.id : nanoid();
      let payload = activeConfig.toStorage({ ...draft, id, nombre: name, fuente: 'custom' });
      let finalImage = '';

      if (isTrick) {
        const savedForms = [];
        for (const [index, form] of forms.entries()) {
          const edit = formImageEdits[form.id];
          const file = edit?.file || (index === 0 && !edit?.remove ? selectedFile : null);
          const image = file ? await uploadImage(file, `${name}-${id}-${form.id}`, false)
            : edit?.remove ? '' : formImage(index);
          savedForms.push({ ...form, image });
        }
        payload = activeConfig.toStorage({ ...draft, id, nombre: name, fuente: 'custom', trickForms: savedForms });
      } else if (selectedFile) {
        finalImage = await uploadImage(selectedFile, name);
      } else if (!removeImage && inheritedImage) {
        finalImage = inheritedImage;
        const key = normalizeKey(name);
        const existingRecord = customImages[normalizeKey(editor?.originalName || name)] || {};
        await setDoc(doc(db, 'equipment_images', key), {
          ...existingRecord,
          imageUrl: inheritedImage,
          itemName: name,
          category,
          updatedAt: Date.now(),
        });
      }

      if (category === 'objects' && finalImage) payload = { ...payload, icon: finalImage, image: finalImage };
      if (category === 'objects' && removeImage) payload = { ...payload, icon: '', image: '' };
      await setDoc(doc(db, activeConfig.collection, id), payload);

      const originalKey = normalizeKey(editor?.originalName);
      const newKey = normalizeKey(name);
      if (editor?.mode === 'edit' && originalKey && originalKey !== newKey) {
        await deleteDoc(doc(db, 'equipment_images', originalKey));
      }
      if (removeImage) await deleteDoc(doc(db, 'equipment_images', newKey));

      await onCatalogChanged(category);
      closeEditor();
    } catch (saveError) {
      console.error(saveError);
      setError('No se pudo guardar. Revisa la conexión e inténtalo otra vez.');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item) => {
    const name = getItemName(item);
    if (!window.confirm(`¿Eliminar “${name}” del catálogo?`)) return;
    try {
      if ((category === 'weapons' || category === 'armor') && item.fuente === 'sheet') {
        await setDoc(doc(db, activeConfig.collection, item.id), { ...item, deleted: true, fuente: 'custom' });
      } else {
        await deleteDoc(doc(db, activeConfig.collection, item.id));
      }
      await deleteDoc(doc(db, 'equipment_images', normalizeKey(name)));
      await onCatalogChanged(category);
    } catch (deleteError) {
      console.error(deleteError);
      setError('No se pudo eliminar el objeto.');
    }
  };

  const FieldComponent = {
    weapons: WeaponCatalogFields,
    armor: ArmorCatalogFields,
    abilities: AbilityCatalogFields,
    accessories: AccessoryCatalogFields,
    objects: ObjectFields,
  }[category];

  if (editor) {
    return (
      <div className="noma-forge noma-forge-editor min-h-[100dvh] bg-[#09090b] pb-24 font-['Lato'] text-[#e2e8f0] selection:bg-[#c8aa6e]/30 selection:text-[#f0e6d2]">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a1b26] via-[#09090b] to-[#09090b] opacity-80" />
        <header className="sticky top-0 z-40 border-b border-[#c8aa6e]/20 bg-[#09090b]/95 px-3 py-2.5 backdrop-blur md:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <button type="button" onClick={closeEditor} className="flex min-h-[42px] items-center gap-2 px-2 font-['Cinzel'] text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:bg-[#c8aa6e]/[0.06] hover:text-[#c8aa6e]">
              <X size={20} /> <span className="hidden sm:inline">Cerrar</span>
            </button>
            <div className="min-w-0 text-center">
              <p className="truncate font-['Cinzel'] text-sm font-bold uppercase tracking-[0.12em] text-[#f0e6d2]">
                {editor.mode === 'edit' ? 'Editar' : editor.mode === 'duplicate' ? 'Duplicar' : 'Crear'} {activeConfig.singular.toLowerCase()}
              </p>
              <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#c8aa6e]/70">Forja Roguelite</span>
            </div>
            <span className="w-[52px] text-right text-[9px] font-bold uppercase tracking-wider text-slate-600">{activeConfig.label}</span>
          </div>
        </header>

        <main className="relative mx-auto grid max-w-6xl gap-5 px-3 py-4 md:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.22fr)] md:px-6 md:py-7">
          <aside className={`${mobilePreview ? 'block' : 'hidden'} min-w-0 md:block md:sticky md:top-[82px] md:self-start`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#9ca8bb]">Vista en inventario</span>
              <span className="text-[10px] text-[#647188]">En tiempo real</span>
            </div>
            {(isTrick ? forms : [null]).map((form, index) => {
              const profile = form ? resolveWeaponForm({ ...draft, trickForms: forms, activeFormId: form.id }) : draft;
              const item = form ? { ...previewItem, ...profile, name: draft.nombre || 'Nueva arma', damage: profile.dano, description: profile.descripcion } : previewItem;
              return <div key={form?.id || 'single'} className="mb-5">
              {form && <button type="button" onClick={() => setEditingFormIndex(index)} className={`mb-2 min-h-[36px] w-full border-b pb-2 text-left font-['Cinzel'] text-xs ${editingFormIndex === index ? 'border-[#c8aa6e]/60 text-[#e5d2a4]' : 'border-slate-700 text-slate-500'}`}>{form.label} · Forma {index + 1}</button>}
            <div className="noma-class-inventory-grid noma-forge-inventory-preview grid">
              <div className="noma-class-inventory-entry min-w-0">
              <RogueliteInventoryCard
                item={item}
                image={(form ? formImage(index) : previewImage) || null}
                fallbackIcon={<activeConfig.icon size={54} />}
                categoryLabel={activeConfig.singular}
                rarityAccent={rarityAccent}
                raritySoft={colorWithAlpha(rarityAccent, 0.22)}
                rarityFaint={colorWithAlpha(rarityAccent, 0.08)}
                actionCost={(category === 'weapons' || category === 'abilities') ? Number(profile.actionCost || 0) : null}
                handsRequired={category === 'weapons' ? Number(profile.handsRequired || 1) : null}
                visibleTraits={splitTraits(profile.rasgos)}
                glossary={glossary}
              />
              </div>
            </div>
            </div>;
            })}
          </aside>

          <section className={`noma-forge-fields ${mobilePreview ? 'hidden md:block' : ''} min-w-0 space-y-3`}>
            <Section title="Datos y reglas" hint="Los campos cambian según el tipo de objeto" defaultOpen>
              {isTrick ? <TrickWeaponCatalogFields value={draft} setValue={setDraft} rarities={rarities} glossary={glossary}
                formIndex={editingFormIndex} onFormChange={setEditingFormIndex} baseImage={removeImage ? '' : localPreview || inheritedImage} />
                : <FieldComponent value={draft} setValue={setDraft} rarities={rarities} glossary={glossary} />}
            </Section>
            <Section key={isTrick ? forms[editingFormIndex]?.id : 'art'} title={isTrick ? `Arte · ${forms[editingFormIndex]?.label}` : 'Arte del objeto'} hint="Sube una imagen o conserva la actual" defaultOpen={!previewImage}>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={chooseFile} />
              <div className="grid gap-3 sm:grid-cols-[120px_1fr] sm:items-center">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#c8aa6e]/30 bg-black/30">
                  {previewImage ? <img src={previewImage} alt="Previsualización" className="h-full w-full object-cover" /> : <ImagePlus size={34} className="text-[#657189]" />}
                </div>
                <div className="space-y-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-[44px] w-full items-center justify-center gap-2 border border-[#785a28]/80 bg-[#0b1120] px-4 text-xs font-bold uppercase tracking-[0.12em] text-[#c8aa6e] transition-colors hover:border-[#c8aa6e]/70 hover:bg-[#c8aa6e]/[0.07] hover:text-[#ead8ac]">
                    <Upload size={17} /> {previewImage ? 'Cambiar imagen' : 'Subir imagen'}
                  </button>
                  {previewImage && <button type="button" onClick={() => {
                    if (isTrick) setFormImageEdits(current => ({ ...current, [forms[editingFormIndex].id]: { remove: true } }));
                    else { setSelectedFile(null); setLocalPreview(''); setRemoveImage(true); }
                  }} className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded border border-rose-900/40 px-4 text-xs font-semibold text-rose-300/70 transition-colors hover:bg-rose-950/30 hover:text-rose-300"><Trash2 size={15} /> Quitar imagen</button>}
                  <p className="text-[11px] leading-relaxed text-[#707d92]">Se optimizará automáticamente para que editar desde el móvil sea rápido.</p>
                </div>
              </div>
            </Section>
            {error && <p role="alert" className="rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</p>}
          </section>
        </main>

        <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-[#c8aa6e]/20 bg-[#09090b]/96 p-3 backdrop-blur">
          <div className="mx-auto grid max-w-xl grid-cols-[auto_1fr_1.3fr] gap-2 md:grid-cols-[0.7fr_1.3fr]">
            <button type="button" onClick={() => setMobilePreview((visible) => !visible)} className="min-h-[48px] border border-[#785a28]/60 px-3 text-xs text-[#c8aa6e] md:hidden">{mobilePreview ? 'Editar' : isTrick ? 'Ver formas' : 'Ver carta'}</button>
            <button type="button" onClick={closeEditor} disabled={saving} className="min-h-[48px] border border-slate-700 font-['Cinzel'] text-xs font-bold uppercase tracking-wider text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={saveItem} disabled={saving} className="min-h-[48px] border border-[#c8aa6e]/55 bg-[#785a28]/75 px-4 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.1em] text-[#f0e6d2] transition-colors hover:border-[#d6bd83] hover:bg-[#8b6a32] disabled:opacity-60">
              {saving ? 'Guardando…' : 'Guardar en catálogo'}
            </button>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="noma-forge min-h-[100dvh] bg-[#09090b] font-['Lato'] text-[#e2e8f0] selection:bg-[#c8aa6e]/30 selection:text-[#f0e6d2]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a1b26] via-[#09090b] to-[#09090b] opacity-80" />
      <header className="sticky top-0 z-30 border-b border-[#c8aa6e]/20 bg-[#09090b]/95 backdrop-blur md:relative md:bg-transparent md:backdrop-blur-none">
        <div className="mx-auto max-w-[1600px] px-3 pb-3 pt-2.5 md:px-8 md:pb-6 md:pt-8">
          <div className="mb-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="forge-header-action forge-header-action--back md:order-2"
              aria-label="Menú Máster"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Menú Máster</span>
            </button>
            <div className="min-w-0 flex-1 md:order-1">
              <h1 className="font-['Cinzel'] text-xl font-bold uppercase tracking-[0.08em] text-[#f0e6d2] md:text-4xl">Forja Roguelite</h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 md:mt-1 md:text-xs">Crear, ajustar y probar objetos</p>
            </div>
            <button
              type="button"
              onClick={openNew}
              className="forge-header-action forge-header-action--create md:order-3"
              aria-label={`Crear nueva ${activeConfig.singular.toLowerCase()}`}
              title={`Crear nueva ${activeConfig.singular.toLowerCase()}`}
            >
              <Plus size={16} strokeWidth={1.75} /> <span className="hidden sm:inline">Nueva {activeConfig.singular.toLowerCase()}</span>
            </button>
          </div>

          <nav className="-mx-3 flex overflow-x-auto border-b border-slate-800 px-3 [scrollbar-width:none] md:mx-0 md:px-0" aria-label="Categorías">
            {CATEGORY_CONFIG.map((entry) => {
              const selected = entry.id === category;
              return <button key={entry.id} type="button" onClick={() => { setCategory(entry.id); setSearch(''); }} className={`relative min-h-[46px] shrink-0 px-4 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-px after:transition-colors ${selected ? 'text-[#d6bd83] after:bg-[#c8aa6e]' : 'text-slate-500 after:bg-transparent hover:text-slate-300'}`}>{entry.label}</button>;
            })}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1600px] px-3 py-4 md:px-8 md:py-6">
        <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
          <label className="col-span-2 flex min-h-[46px] min-w-0 flex-1 items-center gap-2 border border-slate-800 bg-[#111827]/70 px-3 transition-colors focus-within:border-slate-600 sm:col-span-1">
            <Search size={18} className="shrink-0 text-[#748096]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-[#e8dfcf] outline-none placeholder:text-[#667287]" placeholder={`Buscar en ${activeConfig.label.toLowerCase()}…`} />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Borrar búsqueda"><X size={16} /></button>}
          </label>
          <button type="button" onClick={() => setRarityManagerOpen(true)} className="min-h-[46px] border border-[#785a28]/75 bg-[#0b1120]/80 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a99365] transition-colors hover:border-[#c8aa6e]/70 hover:bg-[#c8aa6e]/[0.06] hover:text-[#d6bd83] sm:px-4">Gestionar rarezas</button>
          <button type="button" onClick={() => setGlossaryManagerOpen(true)} className="min-h-[46px] border border-[#785a28]/75 bg-[#0b1120]/80 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a99365] transition-colors hover:border-[#c8aa6e]/70 hover:bg-[#c8aa6e]/[0.06] hover:text-[#d6bd83] sm:px-4">Gestionar glosario</button>
          <span className="hidden text-xs uppercase tracking-[0.16em] text-[#6e7b91] sm:block">{filteredItems.length} resultados</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center border border-dashed border-slate-800 bg-[#111827]/45 p-7 text-center">
            <h2 className="font-['Cinzel'] text-lg text-[#dac99f]">{search ? 'No hay coincidencias' : `Todavía no hay ${activeConfig.label.toLowerCase()}`}</h2>
            <p className="mt-2 max-w-sm text-sm text-[#77849a]">{search ? 'Prueba con otro nombre, rareza o rasgo.' : 'Crea el primero directamente desde el móvil.'}</p>
            {!search && <button type="button" onClick={openNew} className="mt-5 flex min-h-[44px] items-center gap-2 border border-[#785a28] bg-[#0b1120] px-5 text-xs font-bold uppercase tracking-wider text-[#c8aa6e] transition-colors hover:border-[#c8aa6e]/80 hover:bg-[#c8aa6e]/[0.07]"><Plus size={17} /> Crear {activeConfig.singular.toLowerCase()}</button>}
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const name = getItemName(item);
              const itemImage = asImageSource(hasWeaponTrick(item) ? resolveWeaponForm(item).image : customImages[normalizeKey(name)]?.imageUrl || item.image || item.icon);
              const form = activeConfig.toForm(item);
              const rarity = form.rareza || 'Sin rareza';
              const accent = rarityColorMap[rarity] || rarities.find((entry) => entry.nombre === rarity)?.color || FALLBACK_RARITY_COLORS[normalizeText(rarity)] || '#c8aa6e';
              const damage = category === 'abilities' ? form.poder : form.dano;
              const defense = form.defenseClass || form.defensa;
              return (
                <article key={item.id || name} className="forge-entry" style={{ '--forge-accent': accent }}>
                  <button type="button" onClick={() => openEdit(item)} className="forge-entry__content" aria-label={`Editar ${name}`}>
                    <div className={`forge-entry__hero${itemImage ? '' : ' forge-entry__hero--unillustrated'}`}>
                      {itemImage && <img src={itemImage} alt="" className="forge-entry__art" loading="lazy" />}
                      <div className="forge-entry__wash" />
                      <div className="forge-entry__identity">
                        <span className="forge-entry__rarity">{rarity}</span>
                        <h2>{name}</h2>
                      </div>
                    </div>
                    <div className="forge-entry__rules">
                      {damage && <span><small>Daño</small> {damage}</span>}
                      {defense && <span><small>CD</small> {defense}</span>}
                      {form.alcance && <span><small>Alc.</small> {form.alcance}</span>}
                      {(category === 'weapons' || category === 'abilities') && <span aria-label={`Coste: ${form.actionCost || 1} dados de acción`}><Dices size={15} /> {form.actionCost || 1}</span>}
                    </div>
                    <div className="forge-entry__traits">
                      {splitTraits(form.rasgos).map((trait) => {
                        const term = glossary.find((entry) => normalizeText(entry.word) === normalizeText(trait));
                        return <span key={trait} style={{ color: term?.color }}>◆ {trait}</span>;
                      })}
                    </div>
                    {getItemDescription(item) && <p className="forge-entry__description">{getItemDescription(item)}</p>}
                  </button>
                  <details className="forge-entry__options">
                    <summary aria-label={`Opciones de ${name}`}><MoreHorizontal size={20} /></summary>
                    <div>
                      <button type="button" onClick={() => openDuplicate(item)}><Copy size={16} /> Duplicar</button>
                      <button type="button" onClick={() => deleteItem(item)} className="forge-entry__delete"><Trash2 size={16} /> Eliminar</button>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </main>
      {rarityManagerOpen && <RarityManager rarities={rarities} onChanged={onRaritiesChanged} onClose={() => setRarityManagerOpen(false)} />}
      {glossaryManagerOpen && <GlossaryManager glossary={glossary} onChanged={onGlossaryChanged} onClose={() => setGlossaryManagerOpen(false)} />}
    </div>
  );
};

RogueliteForge.propTypes = {
  armas: PropTypes.array,
  armaduras: PropTypes.array,
  habilidades: PropTypes.array,
  accesorios: PropTypes.array,
  rarities: PropTypes.array,
  glossary: PropTypes.array,
  rarityColorMap: PropTypes.object,
  onCatalogChanged: PropTypes.func,
  onRaritiesChanged: PropTypes.func,
  onGlossaryChanged: PropTypes.func,
  onBack: PropTypes.func.isRequired,
};

export default RogueliteForge;
