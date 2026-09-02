import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { nanoid } from 'nanoid';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Gem,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Search,
  Shield,
  Sparkles,
  Sword,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { db, storage } from '../firebase';
import { optimizeImageFile } from '../utils/storage';
import {
  AbilityCatalogFields,
  AccessoryCatalogFields,
  ArmorCatalogFields,
  WeaponCatalogFields,
} from './admin/RogueliteCatalogFields';
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
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea0bd]">Descripción</span>
        <textarea className={`${control} min-h-[110px] resize-y`} value={value.descripcion || ''} onChange={update('descripcion')} placeholder="Qué hace y cómo se utiliza" />
      </label>
    </div>
  );
};

ObjectFields.propTypes = {
  value: PropTypes.object.isRequired,
  setValue: PropTypes.func.isRequired,
  rarities: PropTypes.array.isRequired,
  glossary: PropTypes.array.isRequired,
};

const RogueliteForge = ({
  armas,
  armaduras,
  habilidades,
  accesorios,
  rarities,
  glossary,
  rarityColorMap,
  onCatalogChanged,
  onBack,
}) => {
  const [category, setCategory] = useState('weapons');
  const [objects, setObjects] = useState([]);
  const [customImages, setCustomImages] = useState({});
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);
  const [draft, setDraft] = useState(createEmptyWeaponCatalogItem());
  const [selectedFile, setSelectedFile] = useState(null);
  const [localPreview, setLocalPreview] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

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
        item.rareza,
        ...(Array.isArray(item.rasgos) ? item.rasgos : [item.rasgos]),
      ].join(' ')).includes(needle))
      .sort((left, right) => getItemName(left).localeCompare(getItemName(right), 'es'));
  }, [currentItems, search]);

  const imageRecord = customImages[normalizeKey(draft.nombre)] || null;
  const inheritedImage = asImageSource(editor?.sourceImage || imageRecord?.imageUrl || editor?.item?.image || editor?.item?.icon);
  const previewImage = removeImage ? '' : (localPreview || inheritedImage);

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
  }), [activeConfig.singular, category, draft]);

  const openNew = () => {
    setDraft(activeConfig.empty());
    setEditor({ mode: 'new', item: null, originalName: '' });
    setSelectedFile(null);
    setLocalPreview('');
    setRemoveImage(false);
    setError('');
  };

  const openEdit = (item) => {
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
    setEditor(null);
    setSelectedFile(null);
    setLocalPreview('');
    setRemoveImage(false);
    setError('');
  };

  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setLocalPreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const uploadImage = async (file, name) => {
    const optimized = await optimizeImageFile(file, { maxWidth: 768, maxHeight: 768, quality: 0.86 });
    const uploadFile = optimized.file;
    const key = normalizeKey(name);
    const extension = uploadFile.type === 'image/webp' ? 'webp' : (uploadFile.name?.split('.').pop() || 'webp');
    const storageRef = ref(storage, `equipment_images/${category}/${key}.${extension}`);
    await uploadBytes(storageRef, uploadFile);
    const imageUrl = await getDownloadURL(storageRef);
    await setDoc(doc(db, 'equipment_images', key), {
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

      if (selectedFile) {
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
            <button type="button" onClick={closeEditor} className="flex min-h-[42px] items-center gap-2 rounded px-2 font-['Cinzel'] text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 transition-colors hover:bg-[#c8aa6e]/10 hover:text-[#c8aa6e]">
              <X size={20} /> <span className="hidden sm:inline">Cerrar</span>
            </button>
            <div className="min-w-0 text-center">
              <p className="truncate font-['Cinzel'] text-sm font-bold uppercase tracking-[0.12em] text-[#f0e6d2]">
                {editor.mode === 'edit' ? 'Editar' : editor.mode === 'duplicate' ? 'Duplicar' : 'Crear'} {activeConfig.singular.toLowerCase()}
              </p>
              <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#c8aa6e]/70">Arcana Vault · Forja</span>
            </div>
            <span className="w-[52px] text-right text-[9px] font-bold uppercase tracking-wider text-slate-600">{category}</span>
          </div>
        </header>

        <main className="relative mx-auto grid max-w-6xl gap-5 px-3 py-4 md:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.22fr)] md:px-6 md:py-7">
          <aside className="min-w-0 md:sticky md:top-[82px] md:self-start">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.17em] text-[#9ca8bb]"><Sparkles size={14} className="text-[#c8aa6e]" /> Vista en inventario</span>
              <span className="text-[10px] text-[#647188]">En tiempo real</span>
            </div>
            <div className="mx-auto max-w-[430px]">
              <RogueliteInventoryCard
                item={previewItem}
                image={previewImage || null}
                fallbackIcon={<activeConfig.icon size={54} />}
                categoryLabel={activeConfig.singular}
                rarityAccent={rarityAccent}
                raritySoft={colorWithAlpha(rarityAccent, 0.22)}
                rarityFaint={colorWithAlpha(rarityAccent, 0.08)}
                actionCost={(category === 'weapons' || category === 'abilities') ? Number(draft.actionCost || 0) : null}
                handsRequired={category === 'weapons' ? Number(draft.handsRequired || 1) : null}
                visibleTraits={splitTraits(draft.rasgos)}
                glossary={glossary}
                variant="inspector"
              />
            </div>
          </aside>

          <section className="noma-forge-fields min-w-0 space-y-3">
            <Section title="Datos y reglas" hint="Los campos cambian según el tipo de objeto" defaultOpen>
              <FieldComponent value={draft} setValue={setDraft} rarities={rarities} glossary={glossary} />
            </Section>
            <Section title="Arte del objeto" hint="Sube una imagen o conserva la actual" defaultOpen={!previewImage}>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={chooseFile} />
              <div className="grid gap-3 sm:grid-cols-[120px_1fr] sm:items-center">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#c8aa6e]/30 bg-black/30">
                  {previewImage ? <img src={previewImage} alt="Previsualización" className="h-full w-full object-cover" /> : <ImagePlus size={34} className="text-[#657189]" />}
                </div>
                <div className="space-y-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded border border-[#c8aa6e]/35 bg-[#c8aa6e]/10 px-4 text-xs font-bold uppercase tracking-[0.12em] text-[#c8aa6e] transition-colors hover:border-[#c8aa6e]/70 hover:bg-[#c8aa6e]/20">
                    <Upload size={17} /> {previewImage ? 'Cambiar imagen' : 'Subir imagen'}
                  </button>
                  {previewImage && <button type="button" onClick={() => { setSelectedFile(null); setLocalPreview(''); setRemoveImage(true); }} className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded border border-rose-900/40 px-4 text-xs font-semibold text-rose-300/70 transition-colors hover:bg-rose-950/30 hover:text-rose-300"><Trash2 size={15} /> Quitar imagen</button>}
                  <p className="text-[11px] leading-relaxed text-[#707d92]">Se optimizará automáticamente para que editar desde el móvil sea rápido.</p>
                </div>
              </div>
            </Section>
            {error && <p role="alert" className="rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</p>}
          </section>
        </main>

        <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-[#c8aa6e]/20 bg-[#09090b]/96 p-3 backdrop-blur">
          <div className="mx-auto grid max-w-xl grid-cols-[0.7fr_1.3fr] gap-2">
            <button type="button" onClick={closeEditor} disabled={saving} className="min-h-[48px] rounded border border-[#c8aa6e]/25 font-['Cinzel'] text-xs font-bold uppercase tracking-wider text-slate-400 transition-colors hover:border-[#c8aa6e]/50 hover:text-[#c8aa6e] disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={saveItem} disabled={saving} className="min-h-[48px] rounded bg-gradient-to-b from-[#d6bd83] to-[#b8944f] px-4 font-['Cinzel'] text-xs font-bold uppercase tracking-[0.1em] text-[#09090b] shadow-[0_0_24px_rgba(200,170,110,0.18)] transition hover:brightness-110 disabled:opacity-60">
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
              className="group flex min-h-[42px] items-center gap-2 overflow-hidden rounded-sm border border-[#c8aa6e]/30 bg-[#c8aa6e]/5 px-3 font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.16em] text-[#c8aa6e] transition-all hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10 hover:shadow-[0_0_15px_rgba(200,170,110,0.2)] md:order-2 md:px-5 md:text-xs md:tracking-[0.2em]"
            >
              <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1" />
              <span className="hidden sm:inline">Menú Máster</span>
            </button>
            <div className="min-w-0 flex-1 md:order-1">
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.25em] text-[#c8aa6e] md:block">Arcana Vault · Master Tools</p>
              <h1 className="font-['Cinzel'] text-xl font-bold uppercase tracking-[0.08em] text-[#f0e6d2] md:text-4xl">Forja Roguelite</h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 md:mt-1 md:text-xs">Crear, ajustar y probar objetos</p>
            </div>
            <button
              type="button"
              onClick={openNew}
              className="group flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-[#c8aa6e]/50 bg-[#0b1120] text-[#c8aa6e] shadow-lg transition-all hover:scale-105 hover:border-[#c8aa6e] hover:bg-[#c8aa6e]/10 hover:shadow-[0_0_20px_rgba(200,170,110,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8aa6e] md:order-3"
              aria-label={`Crear nueva ${activeConfig.singular.toLowerCase()}`}
              title={`Crear nueva ${activeConfig.singular.toLowerCase()}`}
            >
              <Plus size={24} strokeWidth={1.75} className="transition-transform group-hover:rotate-90" />
            </button>
          </div>

          <nav className="-mx-3 flex gap-1 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-5 md:px-0" aria-label="Categorías">
            {CATEGORY_CONFIG.map((entry) => {
              const Icon = entry.icon;
              const selected = entry.id === category;
              return <button key={entry.id} type="button" onClick={() => { setCategory(entry.id); setSearch(''); }} className={`flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded border px-3 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${selected ? 'border-[#c8aa6e]/70 bg-[#c8aa6e]/15 text-[#f0e6d2] shadow-[inset_0_-2px_0_rgba(200,170,110,0.45)]' : 'border-[#c8aa6e]/15 bg-[#161f32]/45 text-slate-500 hover:border-[#c8aa6e]/35 hover:text-slate-200'}`}><Icon size={16} /> {entry.label}</button>;
            })}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1600px] px-3 py-4 md:px-8 md:py-6">
        <div className="mb-4 flex items-center gap-3">
          <label className="flex min-h-[46px] min-w-0 flex-1 items-center gap-2 rounded border border-[#c8aa6e]/20 bg-[#161f32]/65 px-3 transition-colors focus-within:border-[#c8aa6e]/60">
            <Search size={18} className="shrink-0 text-[#748096]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-[#e8dfcf] outline-none placeholder:text-[#667287]" placeholder={`Buscar en ${activeConfig.label.toLowerCase()}…`} />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Borrar búsqueda"><X size={16} /></button>}
          </label>
          <span className="hidden text-xs uppercase tracking-[0.16em] text-[#6e7b91] sm:block">{filteredItems.length} resultados</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-[#c8aa6e]/25 bg-[#161f32]/40 p-7 text-center">
            <activeConfig.icon size={42} className="mb-4 text-[#69768c]" />
            <h2 className="font-['Cinzel'] text-lg text-[#dac99f]">{search ? 'No hay coincidencias' : `Todavía no hay ${activeConfig.label.toLowerCase()}`}</h2>
            <p className="mt-2 max-w-sm text-sm text-[#77849a]">{search ? 'Prueba con otro nombre, rareza o rasgo.' : 'Crea el primero directamente desde el móvil.'}</p>
            {!search && <button type="button" onClick={openNew} className="mt-5 flex min-h-[44px] items-center gap-2 rounded border border-[#c8aa6e]/40 bg-[#c8aa6e]/10 px-5 text-xs font-bold uppercase tracking-wider text-[#c8aa6e]"><Plus size={17} /> Crear {activeConfig.singular.toLowerCase()}</button>}
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const name = getItemName(item);
              const itemImage = asImageSource(customImages[normalizeKey(name)]?.imageUrl || item.image || item.icon);
              const Icon = activeConfig.icon;
              return (
                <article key={item.id || name} className="group grid min-h-[96px] grid-cols-[76px_1fr_auto] overflow-hidden rounded-lg border border-[#c8aa6e]/15 bg-[#161f32]/65 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.9)] transition-all hover:-translate-y-0.5 hover:border-[#c8aa6e]/45 hover:bg-[#1a2235]/75">
                  <button type="button" onClick={() => openEdit(item)} className="relative flex items-center justify-center overflow-hidden bg-[#0b1120]" aria-label={`Editar ${name}`}>
                    {itemImage ? <img src={itemImage} alt="" className="h-full w-full object-cover opacity-90 transition-transform group-hover:scale-105" /> : <Icon size={28} className="text-[#566278]" />}
                    <span className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#785a28] to-transparent" />
                  </button>
                  <button type="button" onClick={() => openEdit(item)} className="min-w-0 px-3 py-3 text-left">
                    <span className="block truncate font-['Cinzel'] text-sm font-semibold text-[#e5d7b7]">{name}</span>
                    <span className="mt-1 block truncate text-[11px] uppercase tracking-[0.13em] text-[#748198]">{item.rareza || 'Sin rareza'} · {activeConfig.singular}</span>
                    {getItemDescription(item) && <span className="mt-1 block truncate text-xs text-[#7f8b9e]">{getItemDescription(item)}</span>}
                  </button>
                  <div className="flex flex-col border-l border-[#c8aa6e]/10">
                    <button type="button" onClick={() => openEdit(item)} className="flex flex-1 items-center justify-center px-3 text-[#8895a9] hover:bg-[#c8aa6e]/10 hover:text-[#ead8ac]" aria-label={`Editar ${name}`}><Pencil size={15} /></button>
                    <button type="button" onClick={() => openDuplicate(item)} className="flex flex-1 items-center justify-center border-t border-[#c8aa6e]/10 px-3 text-[#738096] hover:bg-[#c8aa6e]/10 hover:text-[#ead8ac]" aria-label={`Duplicar ${name}`}><Copy size={15} /></button>
                    <button type="button" onClick={() => deleteItem(item)} className="flex flex-1 items-center justify-center border-t border-[#c8aa6e]/10 px-3 text-[#76555d] hover:bg-red-950/40 hover:text-red-300" aria-label={`Eliminar ${name}`}><Trash2 size={15} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
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
  onBack: PropTypes.func.isRequired,
};

RogueliteForge.defaultProps = {
  armas: [],
  armaduras: [],
  habilidades: [],
  accesorios: [],
  rarities: [],
  glossary: [],
  rarityColorMap: {},
  onCatalogChanged: async () => {},
};

export default RogueliteForge;
