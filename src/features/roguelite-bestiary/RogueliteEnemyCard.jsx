import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  FiCheck,
  FiEdit2,
  FiImage,
  FiMinus,
  FiPlus,
  FiSave,
  FiSearch,
  FiStar,
  FiTrash2,
  FiX,
  FiZap,
} from 'react-icons/fi';
import { ChevronLeft, ChevronRight, Crosshair, Dices, Footprints, Gauge, GripVertical, Heart, Shield, Skull, Swords } from 'lucide-react';
import HexIcon from '../../components/HexIcon';
import { useCustomEquipmentImages } from '../../hooks/useCustomEquipmentImages';
import { getObjectImage } from '../tactical-shared/components/TacticalAssetImage';
import { uploadDataUrl } from '../../utils/storage';
import { ABILITY_RANGES } from '../roguelite/catalogItem';
import {
  ROGUELITE_ENEMY_RARITIES,
  ROGUELITE_ENEMY_SLOT_MAX,
  ROGUELITE_ENEMY_SLOT_MIN,
  ROGUELITE_ENEMY_STAT_MAX,
  ROGUELITE_THREAT_DICE,
  clampRogueliteEnemyStat,
  createEmptyRogueliteEnemyAbility,
  normalizeRogueliteEnemy,
  normalizeRogueliteEnemyAbility,
} from './enemyModel';
import RogueliteAssetCropDialog from './RogueliteAssetCropDialog';

const STAT_DEFINITIONS = [
  { id: 'vida', label: 'Vida', Icon: Heart, color: '#e7a0a8' },
  { id: 'cd', label: 'CD', Icon: Shield, color: '#c8c6be' },
  { id: 'movimiento', label: 'Movimiento', Icon: Footprints, color: '#86bfe2' },
  { id: 'iniciativa', label: 'Iniciativa', Icon: Gauge, color: '#d7b867' },
  { id: 'ofensiva', label: 'Base ofensiva', Icon: Crosshair, color: '#d68469' },
];

const identity = (item) => item?.templateId || item?.catalogId || item?.id || item?.name || item?.nombre || '';
const itemName = (item) => item?.name || item?.nombre || 'Elemento sin nombre';
const itemDescription = (item) => item?.description || item?.descripcion || item?.detail || 'Sin descripción';
const readTraits = (item) => (
  (Array.isArray(item?.traits ?? item?.rasgos)
    ? (item.traits ?? item.rasgos)
    : String(item?.traits ?? item?.rasgos ?? '').split(','))
    .map((trait) => String(trait || '').trim())
    .filter(Boolean)
);

const readActionCost = (item) => {
  const raw = item?.actionCost ?? item?.consumo ?? item?.consumption ?? item?.cost ?? item?.coste;
  if (typeof raw === 'number') return raw;
  const text = String(raw || '');
  const icons = text.match(/🟡/g);
  if (icons?.length) return icons.length;
  const numeric = Number.parseInt(text.match(/\d+/)?.[0], 10);
  return Number.isFinite(numeric) ? numeric : null;
};

const resolveType = (item) => {
  const raw = `${item?.type || ''} ${item?._category || ''} ${item?.category || ''}`.toLowerCase();
  if (raw.includes('armor') || raw.includes('armadura')) return 'Armadura';
  if (raw.includes('ability') || raw.includes('habil')) return 'Habilidad';
  if (raw.includes('access')) return 'Accesorio';
  if (raw.includes('object') || raw.includes('objeto')) return 'Objeto';
  return 'Arma';
};

export const formatEquipmentSummary = (item) => {
  if (!item) return '';
  const type = resolveType(item);
  const details = [];

  if (type === 'Arma') {
    const damage = item.dano ?? item.damage ?? item.damageProfile ?? item.poder;
    const range = item.alcance ?? item.range;
    const actionCost = readActionCost(item);
    if (damage) details.push(String(damage));
    if (range) details.push(String(range));
    if (actionCost !== null) details.push(`${actionCost} ${actionCost === 1 ? 'dado' : 'dados'}`);
  } else if (type === 'Armadura') {
    const defense = item.defenseClass ?? item.cd ?? item.defensa ?? item.defense ?? item.armorClass;
    if (defense !== undefined && defense !== '') details.push(`CD ${defense}`);
  } else if (type === 'Habilidad') {
    const damage = item.damage ?? item.dano;
    const range = item.alcance ?? item.range;
    const actionCost = readActionCost(item);
    if (damage) details.push(String(damage));
    if (range) details.push(String(range));
    if (actionCost !== null) details.push(`${actionCost} ${actionCost === 1 ? 'dado' : 'dados'}`);
  }

  if (details.length === 0 && itemDescription(item) !== 'Sin descripción') details.push(itemDescription(item));
  const traits = readTraits(item);
  if (traits.length) details.push(traits.join(', '));
  return [type, ...details].join(' · ');
};

const equipmentRuleData = (item) => {
  const type = resolveType(item);
  const details = [];
  if (type === 'Arma') {
    const damage = item.dano ?? item.damage ?? item.damageProfile ?? item.poder;
    const range = item.alcance ?? item.range;
    if (damage) details.push(String(damage));
    if (range) details.push(String(range));
  } else if (type === 'Armadura') {
    const defense = item.defenseClass ?? item.cd ?? item.defensa ?? item.defense ?? item.armorClass;
    if (defense !== undefined && defense !== '') details.push(`CD ${defense}`);
  } else if (type === 'Habilidad') {
    const damage = item.damage ?? item.dano;
    const range = item.range ?? item.alcance;
    if (damage) details.push(String(damage));
    if (range) details.push(String(range));
  }
  if (!details.length && itemDescription(item) !== 'Sin descripción') details.push(itemDescription(item));
  return { type, details, actionCost: type === 'Armadura' ? null : readActionCost(item), traits: readTraits(item) };
};

const formatAbilityRules = (ability) => {
  const rules = [];
  const damage = ability?.damage ?? ability?.dano;
  const range = ability?.range ?? ability?.alcance;
  if (damage) rules.push(`Daño ${damage}`);
  if (range) rules.push(`Alcance ${range}`);
  const traits = readTraits(ability);
  if (traits.length) rules.push(traits.join(', '));
  return rules.join(' · ');
};

const ActionCostIcons = ({ value }) => {
  const count = Math.max(0, Math.min(3, Number(value) || 0));
  if (!count) return null;
  return (
    <span className="noma-enemy-entry__dice" aria-label={`Coste: ${count} ${count === 1 ? 'dado de acción' : 'dados de acción'}`}>
      <Dices aria-hidden="true" />
      <span>{count}</span>
    </span>
  );
};

const EquipmentRuleSummary = ({ item }) => {
  const { type, details, actionCost, traits } = equipmentRuleData(item);
  return (
    <>
      <span className="noma-enemy-entry__rules" title={formatEquipmentSummary(item)}>
        <span>{[type, ...details].join(' · ')}</span>
        <ActionCostIcons value={actionCost} />
      </span>
      {traits.length > 0 && <span className="noma-enemy-entry__traits">{traits.join(' · ')}</span>}
    </>
  );
};

const EnemyStatInput = ({ value, label, onCommit }) => {
  const [draft, setDraft] = useState(String(value ?? 0));

  useEffect(() => setDraft(String(value ?? 0)), [value]);

  const commit = (nextValue = draft) => {
    const normalized = clampRogueliteEnemyStat(nextValue);
    setDraft(String(normalized));
    onCommit(normalized);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      title={`Valor máximo: ${ROGUELITE_ENEMY_STAT_MAX}`}
      value={draft}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => {
        const nextValue = event.target.value;
        if (nextValue === '') {
          setDraft('');
          return;
        }
        if (!/^\d+$/.test(nextValue)) return;
        const normalized = String(clampRogueliteEnemyStat(nextValue));
        setDraft(normalized);
        onCommit(Number(normalized));
      }}
      onBlur={() => commit()}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      aria-label={label}
    />
  );
};

const EnemyRowImage = ({ item, image, emptyIcon: EmptyIcon = FiStar }) => (
  <HexIcon size="sm" active={Boolean(image)}>
    {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <EmptyIcon className="h-4 w-4 text-slate-600" />}
    <span className="sr-only">{itemName(item)}</span>
  </HexIcon>
);

const Portal = ({ children }) => (
  typeof document === 'undefined' ? children : createPortal(children, document.body)
);

const CatalogDialog = ({ title, eyebrow, query, onQueryChange, items, imageFor, onChoose, onClear, onClose }) => (
  <Portal>
    <div className="noma-rogue-dialog-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="noma-rogue-picker">
        <header>
          <div><span>{eyebrow}</span><h3>{title}</h3></div>
          <button type="button" onClick={onClose} aria-label="Cerrar selector"><FiX /></button>
        </header>
        <label className="noma-rogue-picker__search">
          <FiSearch />
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar por nombre o tipo…" autoFocus />
        </label>
        <div className="noma-rogue-picker__list">
          {items.map((item, index) => (
            <button type="button" key={`${identity(item)}-${index}`} onClick={() => onChoose(item)}>
              <EnemyRowImage item={item} image={imageFor(item)} />
              <span><strong>{itemName(item)}</strong><small>{resolveType(item)} · {itemDescription(item)}</small></span>
              <FiCheck />
            </button>
          ))}
          {items.length === 0 && <p>No hay coincidencias en el catálogo.</p>}
        </div>
        <footer><button type="button" onClick={onClear}><FiTrash2 /> Vaciar ranura</button></footer>
      </div>
    </div>
  </Portal>
);

const AbilityDialog = ({ initialAbility, library, imageFor, onCancel, onSave, onChooseLibrary, onRequestImage, onClear }) => {
  const [draft, setDraft] = useState(() => ({ ...(initialAbility || createEmptyRogueliteEnemyAbility()) }));
  const [tab, setTab] = useState(initialAbility ? 'edit' : 'library');
  const [search, setSearch] = useState('');
  const visibleLibrary = library.filter((ability) => (
    `${itemName(ability)} ${itemDescription(ability)}`.toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <Portal>
      <div className="noma-rogue-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Editar habilidad del enemigo">
        <div className="noma-rogue-ability-dialog">
          <header>
            <div><span>Archivo de combate</span><h3>Habilidad del enemigo</h3></div>
            <button type="button" onClick={onCancel} aria-label="Cerrar editor"><FiX /></button>
          </header>
          <nav>
            <button type="button" className={tab === 'library' ? 'is-active' : ''} onClick={() => setTab('library')}>Biblioteca</button>
            <button type="button" className={tab === 'edit' ? 'is-active' : ''} onClick={() => setTab('edit')}>Crear / editar</button>
          </nav>
          {tab === 'library' ? (
            <>
              <label className="noma-rogue-picker__search"><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar habilidad reutilizable…" /></label>
              <div className="noma-rogue-picker__list">
                {visibleLibrary.map((ability) => (
                  <button type="button" key={ability.id} onClick={() => onChooseLibrary(ability)}>
                    <EnemyRowImage item={ability} image={imageFor(ability)} emptyIcon={FiZap} />
                    <span><strong>{itemName(ability)}</strong><small>{formatAbilityRules(ability) || itemDescription(ability)}</small></span>
                    <FiCheck />
                  </button>
                ))}
                {visibleLibrary.length === 0 && <p>No hay habilidades guardadas. Crea la primera desde la otra pestaña.</p>}
              </div>
            </>
          ) : (
            <div className="noma-rogue-ability-dialog__editor">
              <button type="button" className="noma-rogue-ability-dialog__art" onClick={() => onRequestImage(draft, setDraft)}>
                {imageFor(draft) ? <img src={imageFor(draft)} alt="" /> : <FiImage />}
                <span>Cambiar icono</span>
              </button>
              <div>
                <label><span>Nombre</span><input value={draft.name || ''} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
                <div className="noma-rogue-ability-dialog__rules">
                  <label><span>Daño</span><input value={draft.damage || ''} onChange={(event) => setDraft({ ...draft, damage: event.target.value })} placeholder="Ej. 1d6" /></label>
                  <label><span>Alcance</span><select value={draft.range || 'Arma'} onChange={(event) => setDraft({ ...draft, range: event.target.value })}>{ABILITY_RANGES.map((range) => <option value={range} key={range}>{range}</option>)}</select></label>
                  <label><span>Rasgos</span><input value={readTraits(draft).join(', ')} onChange={(event) => setDraft({ ...draft, traits: event.target.value })} placeholder="Derribo, Empuje…" /></label>
                </div>
                <label><span>Descripción</span><textarea rows={6} value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
                <label className="noma-rogue-ability-dialog__library-check"><input type="checkbox" checked={draft.saveToLibrary !== false} onChange={(event) => setDraft({ ...draft, saveToLibrary: event.target.checked })} /> Guardar también en la biblioteca reutilizable</label>
              </div>
            </div>
          )}
          <footer>
            <button type="button" onClick={onClear}><FiTrash2 /> Vaciar ranura</button>
            {tab === 'edit' && <button type="button" onClick={() => onSave(draft)}><FiSave /> Aplicar habilidad</button>}
          </footer>
        </div>
      </div>
    </Portal>
  );
};

const RogueliteEnemyCard = ({ enemy: rawEnemy, equipmentCatalog, abilityLibrary, onChange, onSave, onDelete, onDuplicate, onSaveAbility, onLaunch, onMove, onDragStart, onDragEnd, onDragOver, onDrop, canMovePrevious, canMoveNext, canReorder, isDragging, isDropTarget, saving, launching }) => {
  const enemy = normalizeRogueliteEnemy(rawEnemy);
  const customImages = useCustomEquipmentImages();
  const [showRarity, setShowRarity] = useState(false);
  const [equipmentSlot, setEquipmentSlot] = useState(null);
  const [abilitySlot, setAbilitySlot] = useState(null);
  const [query, setQuery] = useState('');
  const [cropTarget, setCropTarget] = useState(null);
  const [abilityImageBridge, setAbilityImageBridge] = useState(null);
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const identityEditorRef = useRef(null);
  const rarity = ROGUELITE_ENEMY_RARITIES.find((entry) => entry.id === enemy.rarity) || ROGUELITE_ENEMY_RARITIES[0];
  const equipmentCount = enemy.equipmentSlots.filter(Boolean).length;
  const abilityCount = enemy.abilitySlots.filter(Boolean).length;
  const imageFor = (item) => item?.image || item?.imagen || item?.imageUrl || item?.icon || getObjectImage(item || {}, customImages);
  const filteredEquipment = useMemo(() => equipmentCatalog.filter((item) => (
    `${itemName(item)} ${resolveType(item)} ${itemDescription(item)}`.toLowerCase().includes(query.toLowerCase())
  )).slice(0, 80), [equipmentCatalog, query]);

  const update = (patch) => onChange({ ...enemy, ...patch });
  const updateStat = (key, field, value) => {
    const stat = enemy.stats[key];
    const numeric = clampRogueliteEnemyStat(value);
    const next = { ...stat, [field]: numeric };
    if (field === 'max' && next.current > numeric) next.current = numeric;
    if (field === 'current' && numeric > next.max) next.max = numeric;
    update({ stats: { ...enemy.stats, [key]: next } });
  };
  const resizeSlots = (type, delta) => {
    const countKey = `${type}SlotCount`;
    const slotsKey = `${type}Slots`;
    const nextCount = Math.min(ROGUELITE_ENEMY_SLOT_MAX, Math.max(ROGUELITE_ENEMY_SLOT_MIN, enemy[countKey] + delta));
    update({ [countKey]: nextCount, [slotsKey]: Array.from({ length: nextCount }, (_, index) => enemy[slotsKey][index] || null) });
  };
  const setSlot = (type, index, item) => {
    const key = `${type}Slots`;
    const next = [...enemy[key]];
    next[index] = item ? { ...item } : null;
    update({ [key]: next });
  };

  useEffect(() => {
    if (!isEditingIdentity) return undefined;
    const closeOnOutsidePress = (event) => {
      if (!identityEditorRef.current?.contains(event.target)) setIsEditingIdentity(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [isEditingIdentity]);

  const saveEnemy = async () => {
    await onSave(enemy);
    setIsEditingIdentity(false);
  };

  const requestAbilityImage = (draft, setDraft) => {
    setAbilityImageBridge({ draft, setDraft });
    setCropTarget({ type: 'ability', source: draft.imageSource || draft.image || '' });
  };

  const commitCrop = async ({ source, cropped, headerCropped, crop: imageCrop, focus: imageFocus, headerFocus }) => {
    const targetId = cropTarget.type === 'enemy' ? 'portrait' : abilityImageBridge?.draft?.id || 'ability';
    const basePath = `roguelite-enemy-assets/${enemy.id}/${targetId}`;
    const [imageSource, image, headerImage] = await Promise.all([
      source.startsWith('data:') ? uploadDataUrl(source, `${basePath}-source`) : Promise.resolve(source),
      uploadDataUrl(cropped, `${basePath}-image`),
      headerCropped ? uploadDataUrl(headerCropped, `${basePath}-header`) : Promise.resolve(''),
    ]);
    if (cropTarget.type === 'enemy') {
      update({ imageSource, image, headerImage, imageCrop, imageFocus, headerFocus });
    } else if (abilityImageBridge) {
      abilityImageBridge.setDraft({ ...abilityImageBridge.draft, imageSource, image });
    }
    setCropTarget(null);
    setAbilityImageBridge(null);
  };

  return (
    <article
      className={`noma-talents-shell noma-enemy-card ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
      style={{ '--noma-talent-accent': rarity.accent, '--noma-talent-accent-soft': rarity.soft, '--noma-talent-accent-faint': rarity.faint }}
      data-testid="roguelite-enemy-card"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <section
        className="noma-talent-stage noma-enemy-card__stage"
        style={{ '--noma-talent-accent': rarity.accent, '--noma-talent-accent-soft': rarity.soft, '--noma-talent-accent-faint': rarity.faint }}
      >
        <div className="noma-talent-stage__art" aria-hidden="true">
          {enemy.headerImage || enemy.image
            ? <img src={enemy.headerImage || enemy.image} alt="" style={enemy.headerImage ? { objectPosition: `${enemy.headerFocus.x * 100}% ${enemy.headerFocus.y * 100}%` } : undefined} />
            : <Skull />}
        </div>
        <div className="noma-talent-stage__veil" aria-hidden="true" />
        <div className="noma-talent-stage__heading"><Skull aria-hidden="true" /><span>Enemigo</span></div>
        <div className="noma-talent-stage__content">
          <span className="noma-talent-stage__eyebrow">Tarjeta de encuentro</span>
          <div className="noma-talent-stage__rarity-wrap">
            <button type="button" className="noma-talent-stage__rarity" onClick={() => setShowRarity(!showRarity)}><span />{rarity.label}</button>
            {showRarity && <div className="noma-talent-stage__rarity-menu">{ROGUELITE_ENEMY_RARITIES.map((entry) => <button type="button" key={entry.id} onClick={() => { update({ rarity: entry.id }); setShowRarity(false); }}><span style={{ backgroundColor: entry.accent }} />{entry.label}</button>)}</div>}
          </div>
          {isEditingIdentity ? (
            <div className="noma-enemy-card__identity-editor" ref={identityEditorRef}>
              <input className="noma-talent-stage__title-input" value={enemy.name} onChange={(event) => update({ name: event.target.value })} aria-label="Nombre del enemigo" autoFocus />
              <textarea className="noma-talent-stage__description-input" rows={4} value={enemy.description} onChange={(event) => update({ description: event.target.value })} aria-label="Descripción del enemigo" />
              <span><FiCheck /> Pulsa fuera para terminar</span>
            </div>
          ) : (
            <button type="button" className="noma-enemy-card__identity-display" onClick={() => setIsEditingIdentity(true)} aria-label="Editar nombre y descripción del enemigo">
              <strong className="noma-talent-stage__title">{enemy.name || 'Enemigo sin nombre'}</strong>
              <span className="noma-talent-stage__description">{enemy.description || 'Añade una breve descripción de la criatura.'}</span>
              <FiEdit2 aria-hidden="true" />
            </button>
          )}
        </div>
        <button type="button" className="noma-talent-stage__edit-art" onClick={() => setCropTarget({ type: 'enemy', source: enemy.imageSource || enemy.headerImage || enemy.image || '' })}><FiImage /><span>Cambiar arte</span></button>
        <div className="noma-talent-stage__edge" aria-hidden="true" />
      </section>

      <section className="noma-enemy-stats">
        <header><div><span>Perfil de combate</span><h4>Estadísticas</h4></div><label><span>Amenaza</span><select value={enemy.threatDie} onChange={(event) => update({ threatDie: event.target.value })}>{ROGUELITE_THREAT_DICE.map((die) => <option value={die} key={die || 'none'}>{die ? die.toUpperCase() : 'Sin dado'}</option>)}</select></label></header>
        <div className="noma-enemy-stats__list">
          {STAT_DEFINITIONS.map(({ id, label, Icon, color }) => {
            const stat = enemy.stats[id];
            const maximum = Math.max(0, Math.round(stat.max));
            const current = Math.max(0, Math.min(maximum, Math.round(stat.current)));
            return <div className="noma-enemy-stat" key={id} style={{ '--enemy-stat-color': color }}><div className="noma-enemy-stat__identity"><Icon /><span>{label}</span></div><div className={`noma-enemy-stat__track ${maximum === 0 ? 'is-empty' : ''}`} aria-label={`${label}: ${current} de ${maximum} bloques`}>{maximum > 0 ? Array.from({ length: maximum }, (_, index) => <i className={index < current ? 'is-filled' : ''} key={index} />) : <span>Sin bloques</span>}</div><div className="noma-enemy-stat__values"><EnemyStatInput value={stat.current} onCommit={(value) => updateStat(id, 'current', value)} label={`${label} actual`} /><em>/</em><EnemyStatInput value={stat.max} onCommit={(value) => updateStat(id, 'max', value)} label={`${label} base`} /></div></div>;
          })}
        </div>
      </section>

      <section className="noma-talent-ledger noma-enemy-ledger">
        <div className="noma-talent-catalog__header">
          <div><span className="noma-talent-catalog__eyebrow">Preparación táctica</span><h4>Equipamiento</h4></div>
          <div className="noma-enemy-ledger__controls"><button type="button" disabled={enemy.equipmentSlotCount <= ROGUELITE_ENEMY_SLOT_MIN} onClick={() => resizeSlots('equipment', -1)} aria-label="Quitar ranura de equipo"><FiMinus /></button><span>{equipmentCount}<small>/{enemy.equipmentSlotCount}</small></span><button type="button" disabled={enemy.equipmentSlotCount >= ROGUELITE_ENEMY_SLOT_MAX} onClick={() => resizeSlots('equipment', 1)} aria-label="Añadir ranura de equipo"><FiPlus /></button></div>
        </div>
        <div className="noma-talent-ledger__list">
          {enemy.equipmentSlots.map((item, index) => <button type="button" key={index} className={`noma-talent-entry group ${item ? 'is-equipped' : 'is-empty'}`} onClick={() => { setQuery(''); setEquipmentSlot(index); }}><span className="noma-talent-entry__index">{String(index + 1).padStart(2, '0')}</span><EnemyRowImage item={item} image={imageFor(item)} emptyIcon={Swords} /><span className="min-w-0 flex-1"><span className="noma-talent-entry__title block truncate">{item ? itemName(item) : 'Ranura vacía'}</span>{item ? <EquipmentRuleSummary item={item} /> : <span className="noma-talent-entry__description block truncate">Pulsa para buscar en el catálogo</span>}</span><FiEdit2 /></button>)}
        </div>
      </section>

      <section className="noma-talent-ledger noma-enemy-ledger">
        <div className="noma-talent-catalog__header">
          <div><span className="noma-talent-catalog__eyebrow">Patrón de criatura</span><h4>Habilidades</h4></div>
          <div className="noma-enemy-ledger__controls"><button type="button" disabled={enemy.abilitySlotCount <= ROGUELITE_ENEMY_SLOT_MIN} onClick={() => resizeSlots('ability', -1)} aria-label="Quitar ranura de habilidad"><FiMinus /></button><span>{abilityCount}<small>/{enemy.abilitySlotCount}</small></span><button type="button" disabled={enemy.abilitySlotCount >= ROGUELITE_ENEMY_SLOT_MAX} onClick={() => resizeSlots('ability', 1)} aria-label="Añadir ranura de habilidad"><FiPlus /></button></div>
        </div>
        <div className="noma-talent-ledger__list">
          {enemy.abilitySlots.map((ability, index) => <button type="button" key={index} className={`noma-talent-entry group ${ability ? 'is-equipped' : 'is-empty'}`} onClick={() => setAbilitySlot(index)}><span className="noma-talent-entry__index">{String(index + 1).padStart(2, '0')}</span><EnemyRowImage item={ability} image={imageFor(ability)} emptyIcon={FiZap} /><span className="min-w-0 flex-1"><span className="noma-talent-entry__title block truncate">{ability ? itemName(ability) : 'Ranura vacía'}</span><span className="noma-talent-entry__description block truncate">{ability ? (formatAbilityRules(ability) || itemDescription(ability)) : 'Pulsa para crear o reutilizar una habilidad'}</span></span><FiEdit2 /></button>)}
        </div>
      </section>

      <footer className="noma-enemy-card__actions">
        <button type="button" onClick={() => onLaunch(enemy)} disabled={launching}><Swords />{launching ? 'Añadiendo…' : 'Añadir al encuentro'}</button>
        <div>
          <button type="button" onClick={saveEnemy} disabled={saving}><FiSave />{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          <span className="noma-enemy-card__order" role="group" aria-label="Orden de la tarjeta">
            <button type="button" className="noma-enemy-card__drag-handle" draggable={canReorder} disabled={!canReorder} onDragStart={onDragStart} onDragEnd={onDragEnd} aria-label="Arrastrar para reordenar" title={canReorder ? 'Arrastra para cambiar la posición' : 'Limpia la búsqueda para reordenar'}><GripVertical /></button>
            <button type="button" disabled={!canMovePrevious} onClick={() => onMove(-1)} aria-label="Mover tarjeta a la posición anterior"><ChevronLeft /></button>
            <button type="button" disabled={!canMoveNext} onClick={() => onMove(1)} aria-label="Mover tarjeta a la posición siguiente"><ChevronRight /></button>
          </span>
          <button type="button" onClick={() => onDuplicate(enemy)} aria-label="Duplicar enemigo"><FiPlus /></button>
          <button type="button" onClick={() => onDelete(enemy)} aria-label="Eliminar enemigo"><FiTrash2 /></button>
        </div>
      </footer>

      {equipmentSlot !== null && <CatalogDialog title={`Equipo · ranura ${equipmentSlot + 1}`} eyebrow="Catálogo general" query={query} onQueryChange={setQuery} items={filteredEquipment} imageFor={imageFor} onChoose={(item) => { setSlot('equipment', equipmentSlot, item); setEquipmentSlot(null); }} onClear={() => { setSlot('equipment', equipmentSlot, null); setEquipmentSlot(null); }} onClose={() => setEquipmentSlot(null)} />}
      {abilitySlot !== null && <AbilityDialog initialAbility={enemy.abilitySlots[abilitySlot]} library={abilityLibrary} imageFor={imageFor} onCancel={() => setAbilitySlot(null)} onClear={() => { setSlot('ability', abilitySlot, null); setAbilitySlot(null); }} onChooseLibrary={(ability) => { setSlot('ability', abilitySlot, normalizeRogueliteEnemyAbility(ability)); setAbilitySlot(null); }} onRequestImage={requestAbilityImage} onSave={async (ability) => { const { saveToLibrary, ...storedAbility } = normalizeRogueliteEnemyAbility(ability); setSlot('ability', abilitySlot, storedAbility); if (saveToLibrary !== false) await onSaveAbility(storedAbility); setAbilitySlot(null); }} />}
      {cropTarget && (
        <RogueliteAssetCropDialog
          initialSource={cropTarget.source}
          initialCrop={cropTarget.type === 'enemy' ? enemy.imageCrop : null}
          variant={cropTarget.type === 'enemy' ? 'enemyHeader' : 'square'}
          title={cropTarget.type === 'enemy' ? `Retrato · ${enemy.name}` : 'Icono de habilidad'}
          onCancel={() => { setCropTarget(null); setAbilityImageBridge(null); }}
          onConfirm={commitCrop}
        />
      )}
    </article>
  );
};

EnemyRowImage.propTypes = { item: PropTypes.object, image: PropTypes.string, emptyIcon: PropTypes.elementType };
ActionCostIcons.propTypes = { value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]) };
EquipmentRuleSummary.propTypes = { item: PropTypes.object.isRequired };
EnemyStatInput.propTypes = { value: PropTypes.number.isRequired, label: PropTypes.string.isRequired, onCommit: PropTypes.func.isRequired };
Portal.propTypes = { children: PropTypes.node.isRequired };
CatalogDialog.propTypes = { title: PropTypes.string.isRequired, eyebrow: PropTypes.string.isRequired, query: PropTypes.string.isRequired, onQueryChange: PropTypes.func.isRequired, items: PropTypes.array.isRequired, imageFor: PropTypes.func.isRequired, onChoose: PropTypes.func.isRequired, onClear: PropTypes.func.isRequired, onClose: PropTypes.func.isRequired };
AbilityDialog.propTypes = { initialAbility: PropTypes.object, library: PropTypes.array.isRequired, imageFor: PropTypes.func.isRequired, onCancel: PropTypes.func.isRequired, onSave: PropTypes.func.isRequired, onChooseLibrary: PropTypes.func.isRequired, onRequestImage: PropTypes.func.isRequired, onClear: PropTypes.func.isRequired };
RogueliteEnemyCard.propTypes = { enemy: PropTypes.object.isRequired, equipmentCatalog: PropTypes.array.isRequired, abilityLibrary: PropTypes.array.isRequired, onChange: PropTypes.func.isRequired, onSave: PropTypes.func.isRequired, onDelete: PropTypes.func.isRequired, onDuplicate: PropTypes.func.isRequired, onSaveAbility: PropTypes.func.isRequired, onLaunch: PropTypes.func.isRequired, onMove: PropTypes.func, onDragStart: PropTypes.func, onDragEnd: PropTypes.func, onDragOver: PropTypes.func, onDrop: PropTypes.func, canMovePrevious: PropTypes.bool, canMoveNext: PropTypes.bool, canReorder: PropTypes.bool, isDragging: PropTypes.bool, isDropTarget: PropTypes.bool, saving: PropTypes.bool, launching: PropTypes.bool };

RogueliteEnemyCard.defaultProps = { onMove: () => {}, onDragStart: () => {}, onDragEnd: () => {}, onDragOver: () => {}, onDrop: () => {}, canMovePrevious: false, canMoveNext: false, canReorder: false, isDragging: false, isDropTarget: false, saving: false, launching: false };

export default RogueliteEnemyCard;
