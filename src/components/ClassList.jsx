import React, { useMemo, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FiChevronDown, FiImage, FiLock, FiSearch, FiStar, FiX } from 'react-icons/fi';
import Cropper from 'react-easy-crop';
import Boton from './Boton';
import Modal from './Modal';

const difficultyOrder = {
  Baja: 0,
  Media: 1,
  Alta: 2,
  Legendaria: 3,
};

const statusConfig = {
  available: {
    label: 'Disponible',
    badgeClass:
      'bg-emerald-500/15 text-emerald-200 border border-emerald-400/40',
  },
  'in-progress': {
    label: 'En progreso',
    badgeClass: 'bg-sky-500/15 text-sky-200 border border-sky-400/40',
  },
  locked: {
    label: 'Bloqueada',
    badgeClass: 'bg-slate-700/70 text-slate-200 border border-slate-500/40',
  },
};

const sortOptions = [
  { value: 'alphaAsc', label: 'Orden alfabético (asc.)' },
  { value: 'alphaDesc', label: 'Orden alfabético (desc.)' },
  { value: 'difficulty', label: 'Dificultad' },
  { value: 'rarity', label: 'Valoración' },
  { value: 'status', label: 'Estado' },
];

const initialClasses = [
  {
    id: 'berserker',
    name: 'Berserker de Guerra',
    subtitle: 'Especialista en Daño',
    description:
      'Un guerrero impulsado por la ira ancestral, capaz de convertir cada herida en fuerza descomunal.',
    tags: ['Armas Pesadas', 'Furia', 'Frente'],
    difficulty: 'Media',
    rating: 4,
    status: 'available',
    mastery: '3 / 10',
    focus: 'Fuerza / Voluntad',
    shards: 320,
    xp: 120,
    image: null,
  },
  {
    id: 'arcanista',
    name: 'Arcanista Umbral',
    subtitle: 'Control y Apoyo',
    description:
      'Domina los pliegues de la realidad para alterar el campo de batalla con hechizos gravitacionales.',
    tags: ['Magia', 'Control', 'Distancia'],
    difficulty: 'Alta',
    rating: 5,
    status: 'in-progress',
    mastery: '6 / 10',
    focus: 'Intelecto / Voluntad',
    shards: 540,
    xp: 180,
    image: null,
  },
  {
    id: 'guardiana',
    name: 'Guardiana Solar',
    subtitle: 'Defensa y Curación',
    description:
      'Canaliza la luz radiante para proteger a sus aliados y desatar estallidos purificadores.',
    tags: ['Soporte', 'Protección', 'Sagrado'],
    difficulty: 'Media',
    rating: 4,
    status: 'locked',
    mastery: '0 / 10',
    focus: 'Voluntad / Intelecto',
    shards: 410,
    xp: 140,
    image: null,
  },
  {
    id: 'tactico',
    name: 'Táctico Sombrío',
    subtitle: 'Especialista en Sigilo',
    description:
      'Comandante silencioso que orquesta emboscadas precisas desde la penumbra.',
    tags: ['Sigilo', 'Estrategia', 'Emboscada'],
    difficulty: 'Alta',
    rating: 3,
    status: 'available',
    mastery: '8 / 10',
    focus: 'Destreza / Intelecto',
    shards: 270,
    xp: 110,
    image: null,
  },
  {
    id: 'druida',
    name: 'Druida Umbrátil',
    subtitle: 'Invocadora Primal',
    description:
      'Invoca espíritus antiguos y molda la flora del entorno para controlar la batalla.',
    tags: ['Naturaleza', 'Invocador', 'Apoyo'],
    difficulty: 'Media',
    rating: 5,
    status: 'available',
    mastery: '5 / 10',
    focus: 'Voluntad / Destreza',
    shards: 360,
    xp: 150,
    image: null,
  },
  {
    id: 'artificiero',
    name: 'Artificiero Rúnico',
    subtitle: 'Ofensiva Versátil',
    description:
      'Ingeniero arcano que despliega artefactos explosivos y defensas automáticas.',
    tags: ['Tecnología', 'Control de Zona', 'Ofensiva'],
    difficulty: 'Baja',
    rating: 3,
    status: 'locked',
    mastery: '0 / 10',
    focus: 'Intelecto / Destreza',
    shards: 250,
    xp: 90,
    image: null,
  },
];

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImage = async (imageSrc, crop) => {
  if (!imageSrc || !crop) return null;
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return canvas.toDataURL('image/png');
};

const renderStars = (rating) => {
  return Array.from({ length: 5 }).map((_, index) => (
    <FiStar
      key={index}
      className={`h-4 w-4 transition-colors ${
        index < rating ? 'text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]' : 'text-slate-600'
      }`}
    />
  ));
};

const ClassList = ({ onBack }) => {
  const [classes, setClasses] = useState(initialClasses);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('alphaAsc');
  const [cropperState, setCropperState] = useState({
    classId: null,
    imageSrc: '',
    crop: { x: 0, y: 0 },
    zoom: 1.1,
    croppedAreaPixels: null,
  });
  const [isCropping, setIsCropping] = useState(false);

  const fileInputRef = useRef(null);

  const handleSearchChange = (event) => setSearchTerm(event.target.value);

  const handleSortChange = (event) => setSortBy(event.target.value);

  const filteredClasses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const filtered = classes.filter((classItem) => {
      if (!query) return true;
      const haystack = [
        classItem.name,
        classItem.subtitle,
        classItem.description,
        classItem.tags.join(' '),
        classItem.focus,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case 'alphaDesc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'difficulty':
        sorted.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
        break;
      case 'rarity':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'status':
        sorted.sort((a, b) => {
          const statusA = statusConfig[a.status] ? statusConfig[a.status].label : a.status;
          const statusB = statusConfig[b.status] ? statusConfig[b.status].label : b.status;
          return statusA.localeCompare(statusB);
        });
        break;
      case 'alphaAsc':
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return sorted;
  }, [classes, searchTerm, sortBy]);

  const openFileDialogForClass = (classId) => {
    setCropperState({ classId, imageSrc: '', crop: { x: 0, y: 0 }, zoom: 1.2, croppedAreaPixels: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropperState((prev) => ({ ...prev, imageSrc: reader.result }));
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = useCallback((_, croppedAreaPixels) => {
    setCropperState((prev) => ({ ...prev, croppedAreaPixels }));
  }, []);

  const handleCropCancel = () => {
    setIsCropping(false);
    setCropperState({ classId: null, imageSrc: '', crop: { x: 0, y: 0 }, zoom: 1.1, croppedAreaPixels: null });
  };

  const handleCropSave = async () => {
    if (!cropperState.classId) return;
    const croppedImage = await getCroppedImage(cropperState.imageSrc, cropperState.croppedAreaPixels);
    if (!croppedImage) return;

    setClasses((prevClasses) =>
      prevClasses.map((classItem) =>
        classItem.id === cropperState.classId ? { ...classItem, image: croppedImage } : classItem
      )
    );
    handleCropCancel();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-4 md:p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-700/60 bg-slate-900/60 px-4 py-1 text-xs uppercase tracking-[0.2em] text-slate-300/80">
              <span className="text-amber-300">Modo Máster</span>
              <span className="text-slate-600">/</span>
              <span>Clases</span>
            </div>
            <h1 className="text-3xl font-bold uppercase tracking-wide text-white drop-shadow-[0_0_20px_rgba(96,165,250,0.35)]">
              Lista de Clases
            </h1>
            <p className="max-w-xl text-sm text-slate-400">
              Gestiona la biblioteca de clases disponibles para tus jugadores. Puedes personalizar el retrato de cada carta y prepararla antes de la sesión.
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-400">
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1">
                67 / 79 clases activas
              </span>
              <span className="rounded-full border border-indigo-400/40 bg-indigo-400/10 px-3 py-1">
                200 / 415 esencias
              </span>
              <span className="rounded-full border border-purple-400/40 bg-purple-400/10 px-3 py-1">
                1169 / 3950 reliquias
              </span>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1">
                265 / 500 dominio
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <Boton color="gray" onClick={onBack} className="w-full md:w-auto">
              ← Volver al menú
            </Boton>
            <div className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-4 shadow-[0_18px_40px_-18px_rgba(14,165,233,0.45)]">
              <div className="text-xs uppercase tracking-widest text-slate-500">Resumen rápido</div>
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                <div>
                  <div className="text-emerald-300/90 text-lg font-bold">12</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Disponibles</div>
                </div>
                <div>
                  <div className="text-sky-300/90 text-lg font-bold">4</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">En progreso</div>
                </div>
                <div>
                  <div className="text-amber-300/90 text-lg font-bold">2</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Legendarias</div>
                </div>
                <div>
                  <div className="text-rose-300/90 text-lg font-bold">6</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Bloqueadas</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-slate-800/60 bg-slate-900/80 p-4 shadow-[0_10px_30px_rgba(8,7,21,0.55)] md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Buscar clase, rol o palabras clave"
              className="w-full rounded-2xl border border-slate-700/70 bg-slate-950/80 py-3 pl-12 pr-4 text-sm text-slate-100 placeholder-slate-500 shadow-inner shadow-black/40 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
                aria-label="Limpiar búsqueda"
              >
                <FiX className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Orden</span>
              <div className="relative">
                <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="appearance-none rounded-2xl border border-slate-700/60 bg-slate-950/80 py-3 pl-4 pr-10 text-sm font-semibold text-slate-100 shadow-inner shadow-black/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredClasses.map((classItem) => {
            const status = statusConfig[classItem.status];
            return (
              <div
                key={classItem.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/70 shadow-[0_18px_40px_-18px_rgba(56,189,248,0.45)] transition hover:border-sky-500/40 hover:shadow-[0_25px_50px_-20px_rgba(56,189,248,0.55)]"
              >
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    {classItem.image ? (
                      <img
                        src={classItem.image}
                        alt={`Retrato de ${classItem.name}`}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-900/80">
                        <FiImage className="h-12 w-12 text-slate-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/10 to-transparent" />
                    {status && (
                      <div
                        className={`absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] backdrop-blur-sm transition group-hover:translate-y-[-2px] group-hover:shadow-[0_0_15px_rgba(56,189,248,0.4)] ${status.badgeClass}`}
                      >
                        {classItem.status === 'locked' && <FiLock className="h-3.5 w-3.5" />}
                        <span>{status.label}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => openFileDialogForClass(classItem.id)}
                      className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-slate-500/60 bg-slate-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 backdrop-blur transition hover:border-sky-400 hover:text-sky-200"
                    >
                      <FiImage className="h-4 w-4" />
                      <span>Editar retrato</span>
                    </button>
                    {classItem.status === 'locked' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
                        <div className="flex items-center gap-2 rounded-full border border-slate-600/60 bg-slate-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-slate-300">
                          <FiLock className="h-4 w-4" />
                          <span>Contenido bloqueado</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4 p-6">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-white drop-shadow-[0_0_16px_rgba(96,165,250,0.35)]">
                          {classItem.name}
                        </h2>
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                          {classItem.subtitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">{renderStars(classItem.rating)}</div>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300">
                      {classItem.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {classItem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4 text-xs text-slate-400">
                    <div className="space-y-1">
                      <div className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Dificultad</div>
                      <div className="text-sm font-semibold text-slate-100">{classItem.difficulty}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Dominio</div>
                      <div className="text-sm font-semibold text-slate-100">{classItem.mastery}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Enfoque</div>
                      <div className="text-sm font-semibold text-slate-100">{classItem.focus}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">C. de desbloqueo</div>
                      <div className="text-sm font-semibold text-amber-200">
                        {classItem.xp} XP • {classItem.shards} fragmentos
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={isCropping}
        onClose={handleCropCancel}
        title="Ajustar retrato"
        size="xl"
        footer={
          <>
            <Boton color="gray" onClick={handleCropCancel}>
              Cancelar
            </Boton>
            <Boton color="blue" onClick={handleCropSave}>
              Guardar recorte
            </Boton>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="relative h-[360px] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900">
            {cropperState.imageSrc ? (
              <Cropper
                image={cropperState.imageSrc}
                crop={cropperState.crop}
                zoom={cropperState.zoom}
                aspect={4 / 5}
                onCropChange={(crop) => setCropperState((prev) => ({ ...prev, crop }))}
                onZoomChange={(zoom) => setCropperState((prev) => ({ ...prev, zoom }))}
                onCropComplete={handleCropComplete}
                restrictPosition
                objectFit="cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Selecciona una imagen para comenzar.
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="zoom" className="text-xs uppercase tracking-[0.4em] text-slate-500">
              Zoom
            </label>
            <input
              id="zoom"
              type="range"
              min={1}
              max={3.5}
              step={0.05}
              value={cropperState.zoom}
              onChange={(event) =>
                setCropperState((prev) => ({ ...prev, zoom: Number(event.target.value) }))
              }
              className="accent-sky-400"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

ClassList.propTypes = {
  onBack: PropTypes.func.isRequired,
};

export default ClassList;
