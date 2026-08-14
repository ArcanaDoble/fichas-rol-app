import React, { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import Cropper from 'react-easy-crop';
import {
  FiCheck,
  FiEdit2,
  FiImage,
  FiPlus,
  FiStar,
  FiTrash2,
  FiX,
  FiZap,
} from 'react-icons/fi';
import HexIcon from './HexIcon';
import { uploadDataUrl } from '../utils/storage';
import {
  ROGUELITE_SKILL_SLOT_COUNT,
  ROGUELITE_TALENT_SLOT_COUNT,
  createEmptyRogueliteTalent,
} from '../features/roguelite/talents';

const RARITIES = [
  {
    id: 'comun',
    label: 'Común',
    accent: '#8d9aab',
    soft: 'rgba(141, 154, 171, 0.32)',
    faint: 'rgba(141, 154, 171, 0.1)',
  },
  {
    id: 'poco-comun',
    label: 'Poco común',
    accent: '#55b978',
    soft: 'rgba(85, 185, 120, 0.32)',
    faint: 'rgba(85, 185, 120, 0.1)',
  },
  {
    id: 'rara',
    label: 'Rara',
    accent: '#54a8dc',
    soft: 'rgba(84, 168, 220, 0.32)',
    faint: 'rgba(84, 168, 220, 0.1)',
  },
  {
    id: 'epica',
    label: 'Épica',
    accent: '#b96bd6',
    soft: 'rgba(185, 107, 214, 0.32)',
    faint: 'rgba(185, 107, 214, 0.1)',
  },
  {
    id: 'legendaria',
    label: 'Legendaria',
    accent: '#e0a45b',
    soft: 'rgba(224, 164, 91, 0.32)',
    faint: 'rgba(224, 164, 91, 0.1)',
  },
];

const createImage = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', reject);
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = source;
  });

const cropImageToDataUrl = async (source, area) => {
  const image = await createImage(source);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const size = 640;
  canvas.width = size;
  canvas.height = size;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    size,
    size
  );
  return canvas.toDataURL('image/webp', 0.88);
};

const renderInDocumentBody = (content) =>
  typeof document === 'undefined'
    ? content
    : createPortal(content, document.body);

const TalentImage = ({ image, name, size = 'sm' }) => (
  <HexIcon size={size} active={Boolean(image)}>
    {image ? (
      <img src={image} alt="" className="h-full w-full object-cover" />
    ) : (
      <FiStar
        className={
          size === 'lg' ? 'h-10 w-10 text-[#c8aa6e]' : 'h-4 w-4 text-slate-600'
        }
      />
    )}
    <span className="sr-only">{name}</span>
  </HexIcon>
);

const RogueliteTalentsPanel = ({
  role,
  classId,
  resource,
  talentCatalog,
  equippedTalentIds,
  equippedSkillIds = [],
  abilityCatalog = [],
  rarity,
  onResourceChange,
  onCatalogChange,
  onEquippedTalentIdsChange,
  onEquippedSkillIdsChange,
  onRarityChange,
}) => {
  const isMaster = role === 'master';
  const fileInputRef = useRef(null);
  const [imageTarget, setImageTarget] = useState(null);
  const [cropState, setCropState] = useState(null);
  const [selectedTalentId, setSelectedTalentId] = useState(null);
  const [activeSlot, setActiveSlot] = useState(null);
  const [activeSkillSlot, setActiveSkillSlot] = useState(null);
  const [showRarityMenu, setShowRarityMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const availableTalents = useMemo(
    () => talentCatalog.filter((talent) => talent.available !== false),
    [talentCatalog]
  );
  const catalogById = useMemo(
    () => new Map(talentCatalog.map((talent) => [talent.id, talent])),
    [talentCatalog]
  );
  const selectedTalent =
    talentCatalog.find((talent) => talent.id === selectedTalentId) || null;
  const selectedRarity =
    RARITIES.find((item) => item.id === rarity) || RARITIES[2];
  const equippedTalentCount = equippedTalentIds.filter((talentId) => {
    const talent = catalogById.get(talentId);
    return talent && talent.available !== false;
  }).length;

  const updateTalent = useCallback(
    (talentId, patch) => {
      onCatalogChange(
        talentCatalog.map((talent) =>
          talent.id === talentId ? { ...talent, ...patch } : talent
        )
      );
    },
    [onCatalogChange, talentCatalog]
  );

  const requestImage = (target) => {
    if (!isMaster) return;
    setImageTarget(target);
    const currentImage =
      target.type === 'resource'
        ? resource.imageSource || resource.image
        : (() => {
            const talent = talentCatalog.find(
              (item) => item.id === target.talentId
            );
            return talent?.imageSource || talent?.image;
          })();
    if (currentImage) {
      setCropState({
        source: currentImage,
        crop: { x: 0, y: 0 },
        zoom: 1,
        area: null,
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleImageFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !imageTarget) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Selecciona un archivo de imagen válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () =>
      setCropState({
        source: reader.result,
        crop: { x: 0, y: 0 },
        zoom: 1,
        area: null,
      });
    reader.readAsDataURL(file);
  };

  const saveCroppedImage = async () => {
    if (!cropState?.source || !cropState.area || !imageTarget) return;
    try {
      setIsUploading(true);
      const targetId =
        imageTarget.type === 'resource' ? 'resource' : imageTarget.talentId;
      const basePath = `roguelite-class-assets/${classId}/${targetId}`;
      const [imageSource, image] = await Promise.all([
        cropState.source.startsWith('data:')
          ? uploadDataUrl(cropState.source, `${basePath}-source`)
          : Promise.resolve(cropState.source),
        cropImageToDataUrl(cropState.source, cropState.area).then((dataUrl) =>
          uploadDataUrl(dataUrl, `${basePath}-image`)
        ),
      ]);

      if (imageTarget.type === 'resource') {
        onResourceChange('imageSource', imageSource);
        onResourceChange('image', image);
      } else {
        updateTalent(imageTarget.talentId, { imageSource, image });
      }
      setCropState(null);
      setImageTarget(null);
    } catch (error) {
      console.error('No se pudo guardar la imagen del talento', error);
      window.alert('No se pudo guardar la imagen. Inténtalo de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const addTalent = () => {
    const talent = createEmptyRogueliteTalent(talentCatalog);
    onCatalogChange([...talentCatalog, talent]);
    setSelectedTalentId(talent.id);
  };

  const removeTalent = (talentId) => {
    onCatalogChange(talentCatalog.filter((talent) => talent.id !== talentId));
    setSelectedTalentId(null);
  };

  const equipTalent = (slotIndex, talentId) => {
    const nextSlots = Array.from(
      { length: ROGUELITE_TALENT_SLOT_COUNT },
      (_, index) => equippedTalentIds[index] || null
    );
    nextSlots[slotIndex] = talentId;
    onEquippedTalentIdsChange(nextSlots);
    setActiveSlot(null);
  };

  const equippedSkillCount = equippedSkillIds.filter(Boolean).length;

  const equipSkill = (slotIndex, skillId) => {
    const nextSlots = Array.from(
      { length: ROGUELITE_SKILL_SLOT_COUNT },
      (_, index) => equippedSkillIds[index] || null
    );
    nextSlots[slotIndex] = skillId;
    if (onEquippedSkillIdsChange) {
      onEquippedSkillIdsChange(nextSlots);
    }
    setActiveSkillSlot(null);
  };

  return (
    <>
      <div className={`noma-talents-body ${isMaster ? 'is-master' : 'is-player'}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFile}
          className="hidden"
          aria-label="Subir imagen de talento"
        />

      <section
        className="noma-talent-stage"
        style={{
          '--noma-talent-accent': selectedRarity.accent,
          '--noma-talent-accent-soft': selectedRarity.soft,
          '--noma-talent-accent-faint': selectedRarity.faint,
        }}
      >
        <div className="noma-talent-stage__art" aria-hidden="true">
          {resource.image ? (
            <img src={resource.image} alt="" />
          ) : (
            <FiStar />
          )}
        </div>
        <div className="noma-talent-stage__veil" aria-hidden="true" />

        <div className="noma-talent-stage__heading">
          <FiStar aria-hidden="true" />
          <span>Talentos</span>
        </div>

        <div className="noma-talent-stage__content">
          <span className="noma-talent-stage__eyebrow">Recurso de clase</span>

          <div className="noma-talent-stage__rarity-wrap">
            <button
              type="button"
              disabled={!isMaster}
              onClick={() => setShowRarityMenu((value) => !value)}
              className="noma-talent-stage__rarity"
            >
              <span aria-hidden="true" />
              {selectedRarity.label}
            </button>
            {isMaster && showRarityMenu && (
              <div className="noma-talent-stage__rarity-menu">
                {RARITIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onRarityChange(item.id);
                      setShowRarityMenu(false);
                    }}
                  >
                    <span style={{ backgroundColor: item.accent }} aria-hidden="true" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isMaster ? (
            <input
              value={resource.name || ''}
              onChange={(event) => onResourceChange('name', event.target.value)}
              className="noma-talent-stage__title-input"
              aria-label="Nombre del recurso de clase"
              placeholder="Recurso de clase"
            />
          ) : (
            <h4 className="noma-talent-stage__title">
              {resource.name || 'Recurso de clase'}
            </h4>
          )}

          {isMaster ? (
            <textarea
              value={resource.description || ''}
              onChange={(event) => onResourceChange('description', event.target.value)}
              rows={4}
              className="noma-talent-stage__description-input"
              aria-label="Descripción del recurso de clase"
              placeholder="Describe cómo funciona el recurso de esta clase."
            />
          ) : (
            <p className="noma-talent-stage__description">
              {resource.description ||
                'El máster todavía no ha definido la descripción de este recurso.'}
            </p>
          )}
        </div>

        {isMaster && (
          <button
            type="button"
            onClick={() => requestImage({ type: 'resource' })}
            className="noma-talent-stage__edit-art"
            aria-label="Editar imagen del recurso de clase"
          >
            <FiImage aria-hidden="true" />
            <span>Cambiar arte</span>
          </button>
        )}

        <div className="noma-talent-stage__edge" aria-hidden="true" />
      </section>

      {isMaster ? (
        <section className="noma-talent-ledger noma-talent-catalog w-full">
          <div className="noma-talent-catalog__header">
            <div>
              <span className="noma-talent-catalog__eyebrow">Archivo de clase</span>
              <h4>
                Catálogo de talentos
              </h4>
              <span className="noma-talent-catalog__meta">
                {talentCatalog.length} definidos
              </span>
            </div>
            <button
              type="button"
              onClick={addTalent}
              className="noma-talent-catalog__add"
              aria-label="Añadir talento a la clase"
            >
              <FiPlus className="h-4 w-4" />
            </button>
          </div>

          <div className="noma-talent-ledger__list">
            {talentCatalog.map((talent, index) => (
              <button
                key={talent.id}
                type="button"
                onClick={() => setSelectedTalentId(talent.id)}
                className="noma-talent-entry group"
              >
                <span className="noma-talent-entry__index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <TalentImage image={talent.image} name={talent.name} />
                <span className="min-w-0 flex-1">
                  <span className="noma-talent-entry__title block truncate">
                    {talent.name}
                  </span>
                  <span className="noma-talent-entry__description block truncate">
                    {talent.description || 'Sin descripción'}
                  </span>
                </span>
                <span
                  className={`noma-talent-entry__status ${talent.available !== false ? 'is-active' : ''}`}
                />
                <FiEdit2 className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-[#c8aa6e]" />
              </button>
            ))}
            {talentCatalog.length === 0 && (
              <div className="border-y border-slate-800 py-5 text-center text-[10px] uppercase tracking-[0.12em] text-slate-600">
                No hay talentos definidos
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="noma-talent-ledger noma-talent-slots w-full">
          <div className="noma-talent-catalog__header">
            <div>
              <span className="noma-talent-catalog__eyebrow">Preparación</span>
              <h4>Talentos equipados</h4>
            </div>
            <span className="noma-talent-ledger__counter" aria-label={`${equippedTalentCount} talentos equipados`}>
              {equippedTalentCount}<small>/{ROGUELITE_TALENT_SLOT_COUNT}</small>
            </span>
          </div>

          <div className="noma-talent-ledger__list">
            {Array.from({ length: ROGUELITE_TALENT_SLOT_COUNT }, (_, index) => {
              const catalogTalent = catalogById.get(equippedTalentIds[index]);
              const equippedTalent =
                catalogTalent?.available !== false ? catalogTalent : null;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveSlot(index)}
                  className={`noma-talent-entry group ${equippedTalent ? 'is-equipped' : 'is-empty'}`}
                  aria-label={`Seleccionar talento para ranura ${index + 1}`}
                >
                  <span className="noma-talent-entry__index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <TalentImage
                    image={equippedTalent?.image}
                    name={equippedTalent?.name || `Ranura ${index + 1}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className="noma-talent-entry__title block truncate"
                    >
                      {equippedTalent?.name || 'Ranura vacía'}
                    </span>
                    <span className="noma-talent-entry__description block truncate">
                      {equippedTalent?.description ||
                        'Pulsa para elegir un talento'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

        <section className="noma-talent-ledger noma-talent-slots w-full mt-6" data-testid="equipped-skills-section">
          <div className="noma-talent-catalog__header">
            <div>
              <span className="noma-talent-catalog__eyebrow">Conjuros & Magia</span>
              <h4>Habilidades equipadas</h4>
            </div>
            <span className="noma-talent-ledger__counter" aria-label={`${equippedSkillCount} habilidades equipadas`}>
              {equippedSkillCount}<small>/{ROGUELITE_SKILL_SLOT_COUNT}</small>
            </span>
          </div>

          <div className="noma-talent-ledger__list">
            {Array.from({ length: ROGUELITE_SKILL_SLOT_COUNT }, (_, index) => {
              const skillId = equippedSkillIds[index];
              const equippedSkill = skillId
                ? abilityCatalog.find(
                    (item) => {
                      const normalizedSkillId = String(skillId).trim().toLowerCase();
                      return [
                        item.templateId, item.catalogId, item.id, item.runItemId, item.name, item.nombre,
                        item.payload?.templateId, item.payload?.catalogId, item.payload?.id,
                      ]
                        .some((value) => String(value || '').trim().toLowerCase() === normalizedSkillId);
                    }
                  ) || { name: skillId, description: 'Habilidad seleccionada' }
                : null;
              const image = equippedSkill?.image || equippedSkill?.imagen || equippedSkill?.imageUrl || equippedSkill?.icon || equippedSkill?.avatar;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveSkillSlot(index)}
                  className={`noma-talent-entry group ${equippedSkill ? 'is-equipped' : 'is-empty'}`}
                  aria-label={`Seleccionar habilidad para ranura ${index + 1}`}
                >
                  <span className="noma-talent-entry__index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <HexIcon size="sm" active={Boolean(image)}>
                    {image ? (
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <FiZap className="h-4 w-4 text-amber-400" />
                    )}
                    <span className="sr-only">{equippedSkill?.name || `Ranura ${index + 1}`}</span>
                  </HexIcon>
                  <span className="min-w-0 flex-1">
                    <span className="noma-talent-entry__title block truncate">
                      {equippedSkill?.name || equippedSkill?.nombre || 'Ranura vacía'}
                    </span>
                    <span className="noma-talent-entry__description block truncate">
                      {equippedSkill?.description || equippedSkill?.descripcion || 'Pulsa para elegir una habilidad'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

      <div className="noma-talent-divider" />
      </div>

      {selectedTalent &&
        isMaster &&
        renderInDocumentBody(
          <div
            className="fixed inset-0 isolate flex items-end justify-center bg-black/85 p-0 sm:items-center sm:p-6"
            style={{ zIndex: 2147483600 }}
            role="dialog"
            aria-modal="true"
            aria-label="Editar talento"
          >
            <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto border border-[#c8aa6e]/35 bg-[#080c17] p-5 shadow-2xl sm:p-6">
              <div className="mb-5 flex items-center justify-between border-b border-[#c8aa6e]/20 pb-3">
                <div>
                  <h4 className="font-['Cinzel'] text-sm font-bold uppercase tracking-[0.16em] text-[#f0e6d2]">
                    Editar talento
                  </h4>
                  <span className="text-[9px] uppercase tracking-[0.14em] text-slate-600">
                    Definición global de clase
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTalentId(null)}
                  className="h-10 w-10 text-slate-500 hover:text-[#f0e6d2]"
                  aria-label="Cerrar editor de talento"
                >
                  <FiX className="mx-auto h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-5 sm:grid-cols-[112px_minmax(0,1fr)]">
                <button
                  type="button"
                  onClick={() =>
                    requestImage({
                      type: 'talent',
                      talentId: selectedTalent.id,
                    })
                  }
                  className="group relative mx-auto h-28 w-28 border border-slate-700 bg-[#111827] sm:mx-0"
                  aria-label={`Editar imagen de ${selectedTalent.name}`}
                >
                  {selectedTalent.image ? (
                    <img
                      src={selectedTalent.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FiImage className="mx-auto h-full w-8 text-slate-700" />
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-black/75 py-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    Cambiar imagen
                  </span>
                </button>

                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.14em] text-[#c8aa6e]">
                      Nombre
                    </span>
                    <input
                      value={selectedTalent.name}
                      onChange={(event) =>
                        updateTalent(selectedTalent.id, {
                          name: event.target.value,
                        })
                      }
                      className="h-11 w-full border border-slate-700 bg-[#05080f] px-3 text-sm text-[#f0e6d2] outline-none focus:border-[#c8aa6e]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.14em] text-[#c8aa6e]">
                      Descripción
                    </span>
                    <textarea
                      value={selectedTalent.description}
                      onChange={(event) =>
                        updateTalent(selectedTalent.id, {
                          description: event.target.value,
                        })
                      }
                      rows={5}
                      className="w-full resize-y border border-slate-700 bg-[#05080f] px-3 py-2 text-sm leading-relaxed text-slate-300 outline-none focus:border-[#c8aa6e]"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={selectedTalent.available !== false}
                    onChange={(event) =>
                      updateTalent(selectedTalent.id, {
                        available: event.target.checked,
                      })
                    }
                    className="h-5 w-5 accent-[#c8aa6e]"
                  />
                  Disponible para los jugadores
                </label>
                <button
                  type="button"
                  onClick={() => removeTalent(selectedTalent.id)}
                  className="flex min-h-11 items-center justify-center gap-2 border border-red-900/60 px-4 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:border-red-600 hover:text-red-300"
                >
                  <FiTrash2 className="h-3.5 w-3.5" /> Eliminar talento
                </button>
              </div>
            </div>
          </div>
        )}

      {activeSlot !== null &&
        !isMaster &&
        renderInDocumentBody(
          <div
            className="fixed inset-0 isolate flex items-end justify-center bg-black/85 sm:items-center sm:p-6"
            style={{ zIndex: 2147483600 }}
            role="dialog"
            aria-modal="true"
            aria-label={`Elegir talento para la ranura ${activeSlot + 1}`}
          >
            <div className="flex max-h-[78dvh] w-full max-w-md flex-col border border-[#c8aa6e]/35 bg-[#080c17] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#c8aa6e]/20 px-4 py-3">
                <div>
                  <h4 className="font-['Cinzel'] text-xs font-bold uppercase tracking-[0.16em] text-[#f0e6d2]">
                    Talentos disponibles
                  </h4>
                  <span className="text-[9px] uppercase tracking-[0.12em] text-slate-600">
                    Ranura {activeSlot + 1} de {ROGUELITE_TALENT_SLOT_COUNT}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSlot(null)}
                  className="h-10 w-10 text-slate-500 hover:text-[#f0e6d2]"
                  aria-label="Cerrar selector de talentos"
                >
                  <FiX className="mx-auto h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-2">
                {availableTalents.map((talent) => {
                  const selected = equippedTalentIds[activeSlot] === talent.id;
                  return (
                    <button
                      key={talent.id}
                      type="button"
                      onClick={() => equipTalent(activeSlot, talent.id)}
                      className={`flex min-h-16 w-full items-center gap-3 border-b border-slate-800 px-2 py-2 text-left transition ${selected ? 'bg-[#c8aa6e]/10' : 'hover:bg-[#111827]'}`}
                    >
                      <TalentImage image={talent.image} name={talent.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold uppercase tracking-wider text-[#f0e6d2]">
                          {talent.name}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[10px] leading-relaxed text-slate-500">
                          {talent.description || 'Sin descripción'}
                        </span>
                      </span>
                      {selected && (
                        <FiCheck className="h-4 w-4 shrink-0 text-[#c8aa6e]" />
                      )}
                    </button>
                  );
                })}
                {availableTalents.length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-slate-600">
                    El máster todavía no ha publicado talentos para esta clase.
                  </div>
                )}
              </div>

              {equippedTalentIds[activeSlot] && (
                <button
                  type="button"
                  onClick={() => equipTalent(activeSlot, null)}
                  className="min-h-12 border-t border-red-900/40 text-[10px] font-bold uppercase tracking-[0.14em] text-red-400 hover:bg-red-950/25"
                >
                  Vaciar ranura
                </button>
              )}
            </div>
          </div>
        )}

      {cropState &&
        isMaster &&
        renderInDocumentBody(
          <div
          className="noma-image-editor-backdrop fixed inset-0 isolate flex items-center justify-center overflow-y-auto bg-[#02040a]/65 p-3 backdrop-blur-[2px] sm:p-6"
            style={{ zIndex: 2147483647 }}
            role="dialog"
            aria-modal="true"
            aria-label="Ajustar imagen"
          >
          <div className="noma-image-editor-panel my-auto w-full max-w-md border border-[#c8aa6e]/35 bg-[#080c17] p-4 shadow-2xl sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-['Cinzel'] text-xs font-bold uppercase tracking-[0.16em] text-[#f0e6d2]">
                    Ajustar imagen
                  </h4>
                  <span className="text-[9px] uppercase tracking-[0.12em] text-slate-600">
                    Arrastra y amplía el encuadre
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCropState(null)}
                  className="h-10 w-10 text-slate-500 hover:text-white"
                  aria-label="Cancelar ajuste de imagen"
                >
                  <FiX className="mx-auto h-5 w-5" />
                </button>
              </div>

              <div
                className="relative mx-auto aspect-square overflow-hidden border border-slate-700 bg-[#05080f]"
                style={{ width: 'min(100%, 62dvh)' }}
              >
                <Cropper
                  image={cropState.source}
                  crop={cropState.crop}
                  zoom={cropState.zoom}
                  aspect={1}
                  showGrid
                  onCropChange={(crop) =>
                    setCropState((state) => ({ ...state, crop }))
                  }
                  onZoomChange={(zoom) =>
                    setCropState((state) => ({ ...state, zoom }))
                  }
                  onCropComplete={(_, area) =>
                    setCropState((state) => ({ ...state, area }))
                  }
                />
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={cropState.zoom}
                onChange={(event) =>
                  setCropState((state) => ({
                    ...state,
                    zoom: Number(event.target.value),
                  }))
                }
                className="mt-4 w-full accent-[#c8aa6e]"
                aria-label="Ampliación de imagen"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 min-h-10 w-full border border-slate-700 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 transition hover:border-[#c8aa6e]/60 hover:text-[#f0e6d2]"
              >
                Seleccionar otro archivo
              </button>
              <button
                type="button"
                onClick={saveCroppedImage}
                disabled={isUploading || !cropState.area}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 border border-[#c8aa6e] bg-[#c8aa6e] px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[#080c17] disabled:cursor-wait disabled:opacity-50"
              >
                <FiCheck className="h-4 w-4" />{' '}
                {isUploading ? 'Guardando…' : 'Aplicar encuadre'}
              </button>
            </div>
          </div>
        )}

      {activeSkillSlot !== null &&
        renderInDocumentBody(
          <div
            className="fixed inset-0 isolate flex items-end justify-center bg-black/85 sm:items-center sm:p-6"
            style={{ zIndex: 2147483600 }}
            role="dialog"
            aria-modal="true"
            aria-label={`Elegir habilidad para la ranura ${activeSkillSlot + 1}`}
          >
            <div className="flex max-h-[78dvh] w-full max-w-md flex-col border border-[#c8aa6e]/35 bg-[#080c17] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#c8aa6e]/20 px-4 py-3">
                <div>
                  <h4 className="font-['Cinzel'] text-xs font-bold uppercase tracking-[0.16em] text-[#f0e6d2]">
                    Habilidades disponibles
                  </h4>
                  <span className="text-[9px] uppercase tracking-[0.12em] text-slate-600">
                    Ranura {activeSkillSlot + 1} de {ROGUELITE_SKILL_SLOT_COUNT}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSkillSlot(null)}
                  className="h-10 w-10 text-slate-500 hover:text-[#f0e6d2]"
                  aria-label="Cerrar selector de habilidades"
                >
                  <FiX className="mx-auto h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-2">
                {abilityCatalog.map((skill, sIdx) => {
                  const skillKey = String(skill.templateId || skill.id || skill.runItemId || skill.name || skill.nombre || '').trim();
                  const selected = equippedSkillIds[activeSkillSlot] === skillKey;
                  const image = skill.image || skill.imagen || skill.imageUrl || skill.icon || skill.avatar;
                  return (
                    <button
                      key={`${skillKey}-${sIdx}`}
                      type="button"
                      onClick={() => equipSkill(activeSkillSlot, skillKey)}
                      className={`flex min-h-16 w-full items-center gap-3 border-b border-slate-800 px-2 py-2 text-left transition ${selected ? 'bg-[#c8aa6e]/10' : 'hover:bg-[#111827]'}`}
                    >
                      <HexIcon size="sm" active={Boolean(image)}>
                        {image ? (
                          <img src={image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <FiZap className="h-4 w-4 text-amber-400" />
                        )}
                      </HexIcon>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold uppercase tracking-wider text-[#f0e6d2]">
                          {skill.name || skill.nombre}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[10px] leading-relaxed text-slate-500">
                          {skill.description || skill.descripcion || 'Sin descripción'}
                        </span>
                      </span>
                      {selected && (
                        <FiCheck className="h-4 w-4 shrink-0 text-[#c8aa6e]" />
                      )}
                    </button>
                  );
                })}
                {abilityCatalog.length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-slate-600">
                    No hay habilidades o conjuros disponibles en la pool de la clase.
                  </div>
                )}
              </div>

              {equippedSkillIds[activeSkillSlot] && (
                <button
                  type="button"
                  onClick={() => equipSkill(activeSkillSlot, null)}
                  className="min-h-12 border-t border-red-900/40 text-[10px] font-bold uppercase tracking-[0.14em] text-red-400 hover:bg-red-950/25"
                >
                  Vaciar ranura
                </button>
              )}
            </div>
          </div>
        )}
    </>
  );
};

TalentImage.propTypes = {
  image: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

RogueliteTalentsPanel.propTypes = {
  role: PropTypes.oneOf(['master', 'player']).isRequired,
  classId: PropTypes.string.isRequired,
  resource: PropTypes.object,
  talentCatalog: PropTypes.arrayOf(PropTypes.object),
  equippedTalentIds: PropTypes.arrayOf(PropTypes.string),
  equippedSkillIds: PropTypes.arrayOf(PropTypes.string),
  abilityCatalog: PropTypes.arrayOf(PropTypes.object),
  rarity: PropTypes.string,
  onResourceChange: PropTypes.func,
  onCatalogChange: PropTypes.func,
  onEquippedTalentIdsChange: PropTypes.func,
  onEquippedSkillIdsChange: PropTypes.func,
  onRarityChange: PropTypes.func,
};

RogueliteTalentsPanel.defaultProps = {
  resource: {},
  talentCatalog: [],
  equippedTalentIds: [],
  equippedSkillIds: [],
  abilityCatalog: [],
  rarity: 'rara',
  onResourceChange: () => {},
  onCatalogChange: () => {},
  onEquippedTalentIdsChange: () => {},
  onEquippedSkillIdsChange: () => {},
  onRarityChange: () => {},
};

export default RogueliteTalentsPanel;
