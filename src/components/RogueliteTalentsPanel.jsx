import React, { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import Cropper from 'react-easy-crop';
import {
  FiCheck,
  FiEdit2,
  FiImage,
  FiPlus,
  FiShield,
  FiStar,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import HexIcon from './HexIcon';
import { uploadDataUrl } from '../utils/storage';
import {
  ROGUELITE_TALENT_SLOT_COUNT,
  createEmptyRogueliteTalent,
} from '../features/roguelite/talents';

const RARITIES = [
  {
    id: 'comun',
    label: 'Común',
    classes: 'border-slate-500 bg-slate-700 text-slate-200',
  },
  {
    id: 'poco-comun',
    label: 'Poco común',
    classes: 'border-emerald-500 bg-emerald-900 text-emerald-200',
  },
  {
    id: 'rara',
    label: 'Rara',
    classes: 'border-blue-500 bg-blue-900 text-blue-200',
  },
  {
    id: 'epica',
    label: 'Épica',
    classes: 'border-violet-500 bg-violet-950 text-violet-200',
  },
  {
    id: 'legendaria',
    label: 'Legendaria',
    classes: 'border-amber-500 bg-amber-950 text-amber-200',
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
  rarity,
  onResourceChange,
  onCatalogChange,
  onEquippedTalentIdsChange,
  onRarityChange,
}) => {
  const isMaster = role === 'master';
  const fileInputRef = useRef(null);
  const [imageTarget, setImageTarget] = useState(null);
  const [cropState, setCropState] = useState(null);
  const [selectedTalentId, setSelectedTalentId] = useState(null);
  const [activeSlot, setActiveSlot] = useState(null);
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

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFile}
        className="hidden"
        aria-label="Subir imagen de talento"
      />

      <div className="relative flex w-full flex-col items-center">
        <button
          type="button"
          onClick={() => requestImage({ type: 'resource' })}
          disabled={!isMaster}
          className={`group relative ${isMaster ? 'cursor-pointer' : 'cursor-default'}`}
          aria-label={
            isMaster ? 'Editar imagen del recurso de clase' : undefined
          }
        >
          <TalentImage
            image={resource.image}
            name={resource.name || 'Recurso de clase'}
            size="lg"
          />
          {isMaster && (
            <span className="absolute inset-0 flex items-center justify-center bg-[#05080f]/75 text-[9px] font-bold uppercase tracking-[0.16em] text-[#f0e6d2] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <FiImage className="mr-1.5 h-3.5 w-3.5" /> Imagen
            </span>
          )}
        </button>

        <div className="relative -mt-2">
          <button
            type="button"
            disabled={!isMaster}
            onClick={() => setShowRarityMenu((value) => !value)}
            className={`border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${selectedRarity.classes} ${isMaster ? 'hover:brightness-125' : 'cursor-default'}`}
          >
            {selectedRarity.label}
          </button>
          {isMaster && showRarityMenu && (
            <div className="absolute left-1/2 top-full z-30 mt-1 w-36 -translate-x-1/2 border border-[#c8aa6e]/25 bg-[#080c17] py-1 shadow-xl">
              {RARITIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onRarityChange(item.id);
                    setShowRarityMenu(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-[10px] uppercase tracking-wider text-slate-300 hover:bg-[#c8aa6e]/10 hover:text-[#f0e6d2]"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 w-full text-center">
          {isMaster ? (
            <>
              <input
                value={resource.name || ''}
                onChange={(event) =>
                  onResourceChange('name', event.target.value)
                }
                className="w-full border-0 border-b border-transparent bg-transparent px-2 py-1 text-center font-['Cinzel'] text-sm font-bold uppercase tracking-[0.12em] text-[#c8aa6e] outline-none transition focus:border-[#c8aa6e]/45"
                aria-label="Nombre del recurso de clase"
                placeholder="Recurso de clase"
              />
              <textarea
                value={resource.description || ''}
                onChange={(event) =>
                  onResourceChange('description', event.target.value)
                }
                rows={3}
                className="mt-1 w-full resize-none border border-transparent bg-transparent px-2 py-1 text-center text-xs leading-relaxed text-slate-400 outline-none transition focus:border-slate-700 focus:bg-[#05080f]/50"
                aria-label="Descripción del recurso de clase"
                placeholder="Describe cómo funciona el recurso de esta clase."
              />
            </>
          ) : (
            <>
              <h4 className="font-['Cinzel'] text-sm font-bold uppercase tracking-[0.12em] text-[#c8aa6e]">
                {resource.name || 'Recurso de clase'}
              </h4>
              <p className="mx-auto mt-2 max-w-[230px] text-xs leading-relaxed text-slate-400">
                {resource.description ||
                  'El máster todavía no ha definido la descripción de este recurso.'}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="my-6 h-px w-full bg-slate-800" />

      {isMaster ? (
        <div className="w-full">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-['Cinzel'] text-[11px] font-bold uppercase tracking-[0.14em] text-[#f0e6d2]">
                Catálogo de talentos
              </h4>
              <span className="text-[9px] uppercase tracking-[0.16em] text-slate-600">
                {talentCatalog.length} definidos
              </span>
            </div>
            <button
              type="button"
              onClick={addTalent}
              className="flex h-9 w-9 items-center justify-center border border-[#c8aa6e]/35 text-[#c8aa6e] transition hover:border-[#c8aa6e] hover:text-[#f0e6d2]"
              aria-label="Añadir talento a la clase"
            >
              <FiPlus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            {talentCatalog.map((talent) => (
              <button
                key={talent.id}
                type="button"
                onClick={() => setSelectedTalentId(talent.id)}
                className="group flex w-full items-center gap-3 border-l-2 border-slate-700 bg-[#111827]/45 px-2 py-2 text-left transition hover:border-[#c8aa6e] hover:bg-[#111827]"
              >
                <TalentImage image={talent.image} name={talent.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold uppercase tracking-wider text-[#f0e6d2]">
                    {talent.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                    {talent.description || 'Sin descripción'}
                  </span>
                </span>
                <span
                  className={`h-2 w-2 shrink-0 ${talent.available !== false ? 'bg-emerald-400' : 'bg-slate-700'}`}
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
        </div>
      ) : (
        <div className="w-full space-y-1">
          {Array.from({ length: ROGUELITE_TALENT_SLOT_COUNT }, (_, index) => {
            const catalogTalent = catalogById.get(equippedTalentIds[index]);
            const equippedTalent =
              catalogTalent?.available !== false ? catalogTalent : null;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setActiveSlot(index)}
                className="group flex min-h-14 w-full items-center gap-4 border border-transparent px-2 py-2 text-left transition hover:border-slate-800/70 hover:bg-slate-800/30 focus-visible:border-[#c8aa6e]/60 focus-visible:outline-none"
                aria-label={`Seleccionar talento para ranura ${index + 1}`}
              >
                <TalentImage
                  image={equippedTalent?.image}
                  name={equippedTalent?.name || `Ranura ${index + 1}`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-xs font-bold uppercase tracking-wider ${equippedTalent ? 'text-[#c8aa6e]' : 'text-slate-600'}`}
                  >
                    {equippedTalent?.name || 'Ranura vacía'}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                    {equippedTalent?.description ||
                      'Pulsa para elegir un talento'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="my-6 h-px w-full bg-slate-800" />

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
  rarity: PropTypes.string,
  onResourceChange: PropTypes.func,
  onCatalogChange: PropTypes.func,
  onEquippedTalentIdsChange: PropTypes.func,
  onRarityChange: PropTypes.func,
};

RogueliteTalentsPanel.defaultProps = {
  resource: {},
  talentCatalog: [],
  equippedTalentIds: [],
  rarity: 'rara',
  onResourceChange: () => {},
  onCatalogChange: () => {},
  onEquippedTalentIdsChange: () => {},
  onRarityChange: () => {},
};

export default RogueliteTalentsPanel;
