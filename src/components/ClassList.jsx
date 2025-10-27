import React, { useMemo, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  FiChevronDown,
  FiImage,
  FiLock,
  FiSearch,
  FiStar,
  FiX,
  FiArrowRight,
  FiTarget,
} from 'react-icons/fi';
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

const detailTabs = [
  { id: 'overview', label: 'Resumen' },
  { id: 'inspiration', label: 'Inspiración (Hitos)' },
  { id: 'levels', label: 'Nivel de Campeón' },
  { id: 'rules', label: 'Reglas' },
  { id: 'equipment', label: 'Equipación' },
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
    summary: {
      battleRole: 'Ofensiva frontal',
      combo: 'Acumula rabia con golpes pesados y desátala para activar frenesíes devastadores.',
      difficultyNote:
        'Gestiona el daño recibido para potenciar tus ataques sin quedar expuesto cuando tu furia se agota.',
      highlights: [
        'Gran mitigación mientras esté en frenesí',
        'Puede limpiar hordas con barridos circulares',
        'Necesita apoyo para reposicionarse tras largas cargas',
      ],
    },
    inspiration: [
      {
        title: 'Juramento del Último Bastión',
        description:
          'Protege a un aliado herido mortalmente y vence al enemigo que lo amenazaba antes de finalizar el encuentro.',
      },
      {
        title: 'Rito de Cicatrices',
        description:
          'Recibe daño igual o superior a la mitad de tus puntos de vida máximos y continúa luchando hasta lograr la victoria.',
      },
    ],
    championLevels: [
      {
        title: 'Nivel 5 — Surcar la Sangre',
        description: 'Puedes volver a lanzar tu acción de ataque cuando eliminas a un enemigo durante el frenesí.',
      },
      {
        title: 'Nivel 9 — Rugido de Guerra',
        description:
          'Todos los aliados cercanos obtienen ventaja en sus siguientes tiradas de ataque tras verte entrar en frenesí.',
      },
    ],
    rules: [
      'Cuando entres en frenesí, aumenta tu defensa en +2 hasta el final de tu siguiente turno.',
      'Si terminas tu turno sin haber atacado, pierdes la mitad de la furia acumulada.',
    ],
    equipment: [
      {
        name: 'Hacha Ciclónica',
        type: 'Arma pesada',
        detail: '2H • Alcance corto • Añade +1 dado de daño durante el frenesí.',
      },
      {
        name: 'Talismán de Ira Ancestral',
        type: 'Accesorio',
        detail: 'Permite convertir 1 punto de daño recibido en furia adicional una vez por encuentro.',
      },
    ],
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
    summary: {
      battleRole: 'Control de zona',
      combo: 'Manipula la gravedad para ralentizar a los enemigos y canaliza ráfagas de energía oscura.',
      difficultyNote:
        'Requiere posicionamiento cuidadoso y coordinación para aprovechar al máximo sus campos gravitacionales.',
      highlights: [
        'Puede aislar objetivos prioritarios',
        'Herramientas de apoyo versátiles para el grupo',
        'Vulnerable cuando se queda sin esencia arcana',
      ],
    },
    inspiration: [
      {
        title: 'Horizonte de Eventos',
        description:
          'Mantén a tres enemigos atrapados simultáneamente en tus pozos gravitacionales durante dos rondas completas.',
      },
      {
        title: 'La Luz se Doble',
        description:
          'Protege a un aliado de daño letal desviando el ataque con un portal umbral en el momento preciso.',
      },
    ],
    championLevels: [
      {
        title: 'Nivel 7 — Estela Oscura',
        description: 'Tras lanzar una habilidad de control, obtienes automáticamente un escudo de energía escalonado.',
      },
      {
        title: 'Nivel 10 — Desgarro Cósmico',
        description:
          'Una vez por encuentro, abre una grieta que inflige daño masivo y recoloca a los enemigos atrapados.',
      },
    ],
    rules: [
      'Las áreas umbrales se consideran terreno difícil para enemigos pero no para aliados.',
      'Puedes redirigir un ataque dirigido a ti hacia una de tus zonas ancladas con una tirada de concentración exitosa.',
    ],
    equipment: [
      {
        name: 'Báculo de Singulares',
        type: 'Implemento arcano',
        detail: 'Permite almacenar un hechizo de control adicional listo para su liberación inmediata.',
      },
      {
        name: 'Orbe de Horizon',
        type: 'Foco',
        detail: 'Reduce en 1 la dificultad de los chequeos para mantener efectos canalizados.',
      },
    ],
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
    summary: {
      battleRole: 'Defensa y curación',
      combo: 'Alterna escudos radiantes y pulsos curativos para mantener al grupo siempre protegido.',
      difficultyNote:
        'Maximiza tu impacto sincronizando las curaciones con los estallidos de luz solar para castigar a los enemigos.',
      highlights: [
        'Curaciones constantes y preventivas',
        'Capacidad de purificar estados negativos',
        'Dependiente de posicionamiento para irradiar a todo el grupo',
      ],
    },
    inspiration: [
      {
        title: 'Aurora Custodia',
        description:
          'Salva a dos aliados diferentes de quedar incapacitados en el mismo encuentro con tus escudos radiantes.',
      },
      {
        title: 'Llama Purificadora',
        description: 'Disipa tres efectos de corrupción en una sola escena usando la luz solar concentrada.',
      },
    ],
    championLevels: [
      {
        title: 'Nivel 6 — Halo Inquebrantable',
        description: 'Tus escudos otorgan resistencia a daño radiante y entumecimiento a los agresores.',
      },
      {
        title: 'Nivel 10 — Sol Naciente',
        description:
          'Una vez por día, revive a todo el grupo con la mitad de sus puntos de vida tras caer en combate.',
      },
    ],
    rules: [
      'Tus curaciones restauran un punto de estado adicional a objetivos que no estén bajo efectos oscuros.',
      'Cada vez que bloqueas daño con un escudo solar, generas luz acumulada para potenciar tu siguiente estallido.',
    ],
    equipment: [
      {
        name: 'Maza de Horizonte',
        type: 'Arma ligera',
        detail: 'Inflige daño radiante adicional a criaturas de la sombra.',
      },
      {
        name: 'Égida Solar',
        type: 'Escudo pesado',
        detail: 'Permite redirigir un ataque recibido por un aliado cercano una vez por escena.',
      },
    ],
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
    summary: {
      battleRole: 'Estratega sigiloso',
      combo: 'Coordina emboscadas desde la sombra y utiliza trampas para dividir al enemigo.',
      difficultyNote:
        'Necesita preparación previa y aliados dispuestos a seguir los planes para brillar.',
      highlights: [
        'Control total de la información del campo',
        'Especialista en objetivos prioritarios',
        'Dependiente de recursos para desplegar trampas',
      ],
    },
    inspiration: [
      {
        title: 'Sombras Concertadas',
        description: 'Resuelve una emboscada en la que cada aliado ejecute tu plan sin fallar ninguna tirada clave.',
      },
      {
        title: 'Maestro del Tablero',
        description: 'Resuelve un encuentro completo sin recibir daño directo gracias a tu red de trampas.',
      },
    ],
    championLevels: [
      {
        title: 'Nivel 4 — Reconocimiento Total',
        description: 'Siempre actúas con ventaja en iniciativa si preparaste el terreno con antelación.',
      },
      {
        title: 'Nivel 8 — Emboscada Perfecta',
        description: 'Tras salir de sigilo, tus ataques críticos infligen daño adicional masivo.',
      },
    ],
    rules: [
      'Puedes colocar una trampa sin gastar acción si no te has movido durante el turno.',
      'Obtienes ventaja en tiradas de sigilo contra objetivos que sigan tus rutas preestablecidas.',
    ],
    equipment: [
      {
        name: 'Cuchillas Interferentes',
        type: 'Armas dobles',
        detail: 'Aplican sangrado leve y silencio breve cuando atacas desde sigilo.',
      },
      {
        name: 'Red Fantasma',
        type: 'Herramienta',
        detail: 'Permite inmovilizar a un enemigo en el inicio de la emboscada sin gasto adicional.',
      },
    ],
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
    summary: {
      battleRole: 'Invocadora primal',
      combo: 'Coordina espíritus y flora cambiante para sofocar a los enemigos mientras apoyas al grupo.',
      difficultyNote:
        'Exige administración constante de los vínculos con los espíritus para no perder control del campo.',
      highlights: [
        'Gran versatilidad a distancia',
        'Invocaciones resistentes y útiles',
        'Vulnerable cuando queda sin espíritus anclados',
      ],
    },
    inspiration: [
      {
        title: 'Círculo Eterno',
        description:
          'Mantén tres espíritus activos de tipos diferentes protegiendo a cada aliado durante un encuentro completo.',
      },
      {
        title: 'Raíz Primigenia',
        description: 'Neutraliza a un enemigo jefe inmovilizándolo con tus lianas durante al menos dos rondas seguidas.',
      },
    ],
    championLevels: [
      {
        title: 'Nivel 5 — Brote Resiliente',
        description: 'Tus invocaciones recuperan puntos de vida al inicio de cada turno mientras permanezcas concentrada.',
      },
      {
        title: 'Nivel 9 — Avatar del Bosque',
        description: 'Puedes fusionarte con tus aliados para otorgarles beneficios únicos según el espíritu activo.',
      },
    ],
    rules: [
      'Puedes sacrificar una invocación para disipar efectos elementales en un área pequeña.',
      'Recuperas un espíritu derrotado al final del encuentro si mantuviste el control sin fallos graves.',
    ],
    equipment: [
      {
        name: 'Báculo Semilla Umbral',
        type: 'Implemento',
        detail: 'Fortalece a las invocaciones recién creadas otorgándoles armadura temporal.',
      },
      {
        name: 'Capa de Hoja Viva',
        type: 'Armadura ligera',
        detail: 'Permite camuflarte en entornos naturales ganando ventaja en sigilo.',
      },
    ],
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
    summary: {
      battleRole: 'Ofensiva versátil',
      combo: 'Despliega torretas y runas explosivas mientras alterna entre apoyo y ofensiva.',
      difficultyNote:
        'Requiere planificación y recursos suficientes para mantener la presión tecnológica.',
      highlights: [
        'Gran capacidad de adaptación táctica',
        'Puede defender posiciones clave con facilidad',
        'Sus artefactos son vulnerables a la destrucción directa',
      ],
    },
    inspiration: [
      {
        title: 'Sincronía Perfecta',
        description: 'Mantén tres artefactos activos a la vez sin perder el control de ninguno durante dos rondas.',
      },
      {
        title: 'Maestro Runario',
        description: 'Neutraliza a un enemigo jefe utilizando exclusivamente inventos rúnicos en un encuentro.',
      },
    ],
    championLevels: [
      {
        title: 'Nivel 6 — Red de Torretas',
        description: 'Tus torretas comparten objetivos y ventajas cuando están dentro de tu red táctica.',
      },
      {
        title: 'Nivel 10 — Catalizador Supremo',
        description: 'Activa todos tus artefactos simultáneamente causando una reacción en cadena devastadora.',
      },
    ],
    rules: [
      'Tus torretas cuentan como aliados para efectos de cobertura y flanqueo.',
      'Puedes reconfigurar un artefacto destruido gastando una acción y recursos adecuados.',
    ],
    equipment: [
      {
        name: 'Guanteletes de Sintonía',
        type: 'Arma a distancia',
        detail: 'Permiten canalizar runas elementales y adaptarlas al tipo de objetivo.',
      },
      {
        name: 'Kit de Ensamblaje Rápido',
        type: 'Herramienta',
        detail: 'Reduce el tiempo de despliegue de artefactos a la mitad.',
      },
    ],
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
  const [selectedClass, setSelectedClass] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');
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

  const openClassDetails = (classItem) => {
    setSelectedClass(classItem);
    setActiveDetailTab('overview');
  };

  const closeClassDetails = () => {
    setSelectedClass(null);
    setActiveDetailTab('overview');
  };

  const renderDetailContent = () => {
    if (!selectedClass) return null;

    const {
      summary = {},
      inspiration = [],
      championLevels = [],
      rules = [],
      equipment = [],
    } = selectedClass;

    switch (activeDetailTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div>
              <div className="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">Rol en combate</div>
              <div className="text-lg font-semibold text-slate-100">
                {summary.battleRole || 'No definido'}
              </div>
            </div>
            {summary.combo && (
              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
                <div className="text-[0.65rem] uppercase tracking-[0.35em] text-sky-200/80">Combo recomendado</div>
                <p className="mt-2 text-sm leading-relaxed text-sky-50/90">{summary.combo}</p>
              </div>
            )}
            {summary.difficultyNote && (
              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
                <div className="text-[0.65rem] uppercase tracking-[0.35em] text-purple-200/80">Consejo de dificultad</div>
                <p className="mt-2 text-sm leading-relaxed text-purple-50/90">{summary.difficultyNote}</p>
              </div>
            )}
            {summary.highlights && summary.highlights.length > 0 && (
              <div>
                <div className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500">Puntos clave</div>
                <ul className="mt-3 space-y-3">
                  {summary.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                      <FiTarget className="mt-1 h-4 w-4 text-sky-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case 'inspiration':
        return (
          <div className="space-y-4">
            {inspiration.length > 0 ? (
              inspiration.map((entry) => (
                <div
                  key={entry.title}
                  className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 shadow-[0_10px_25px_-15px_rgba(251,191,36,0.6)]"
                >
                  <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-100">
                    {entry.title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-amber-50/90">{entry.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">
                Aún no hay hitos de inspiración registrados para esta clase.
              </p>
            )}
          </div>
        );
      case 'levels':
        return (
          <div className="space-y-4">
            {championLevels.length > 0 ? (
              championLevels.map((level) => (
                <div
                  key={level.title}
                  className="rounded-2xl border border-indigo-400/30 bg-indigo-400/10 p-4 shadow-[0_10px_25px_-15px_rgba(129,140,248,0.6)]"
                >
                  <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-100">
                    {level.title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-indigo-50/90">{level.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No se han definido niveles de campeón especiales.</p>
            )}
          </div>
        );
      case 'rules':
        return (
          <div className="space-y-3">
            {rules.length > 0 ? (
              rules.map((rule) => (
                <div
                  key={rule}
                  className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-50/90"
                >
                  {rule}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No hay reglas adicionales para esta clase.</p>
            )}
          </div>
        );
      case 'equipment':
        return (
          <div className="space-y-4">
            {equipment.length > 0 ? (
              equipment.map((item) => (
                <div
                  key={item.name}
                  className="rounded-2xl border border-sky-400/30 bg-sky-400/10 p-4 shadow-[0_10px_25px_-15px_rgba(56,189,248,0.6)]"
                >
                  <div className="text-xs uppercase tracking-[0.35em] text-sky-200/80">{item.type}</div>
                  <h4 className="mt-1 text-sm font-semibold uppercase tracking-[0.3em] text-sky-100">{item.name}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-sky-50/90">{item.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">Sin equipación inicial asignada.</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

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
                role="button"
                tabIndex={0}
                aria-label={`Abrir detalles de ${classItem.name}`}
                className="group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/70 shadow-[0_18px_40px_-18px_rgba(56,189,248,0.45)] transition hover:border-sky-500/40 hover:shadow-[0_25px_50px_-20px_rgba(56,189,248,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                onClick={() => openClassDetails(classItem)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openClassDetails(classItem);
                  }
                }}
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
                      onClick={(event) => {
                        event.stopPropagation();
                        openFileDialogForClass(classItem.id);
                      }}
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
        isOpen={Boolean(selectedClass)}
        onClose={closeClassDetails}
        size="full"
        overlayClassName="bg-slate-950/80 backdrop-blur-xl"
        className="max-h-[90vh] overflow-hidden border border-slate-800/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100"
      >
        {selectedClass && (
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] xl:grid-cols-[1.2fr_0.8fr]">
            <div className="flex flex-col gap-8">
              <div className="rounded-3xl border border-slate-800/60 bg-slate-950/60 p-8 shadow-[0_20px_45px_-30px_rgba(56,189,248,0.65)]">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-3 rounded-full border border-slate-700/60 bg-slate-900/70 px-4 py-1 text-[0.6rem] uppercase tracking-[0.4em] text-slate-300">
                        <span className="text-sky-300">Clase</span>
                        <span className="text-slate-600">/</span>
                        <span>Detalle</span>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold uppercase tracking-[0.2em] text-white drop-shadow-[0_0_25px_rgba(56,189,248,0.45)]">
                          {selectedClass.name}
                        </h2>
                        <p className="mt-1 text-xs uppercase tracking-[0.35em] text-slate-500">
                          {selectedClass.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 text-right">
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-4 py-1 text-xs uppercase tracking-[0.35em] text-slate-300">
                        <span>Valoración</span>
                        <span className="flex items-center gap-1">{renderStars(selectedClass.rating)}</span>
                      </div>
                      {statusConfig[selectedClass.status] && (
                        <div
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] ${statusConfig[selectedClass.status].badgeClass}`}
                        >
                          {selectedClass.status === 'locked' && <FiLock className="h-3.5 w-3.5" />}
                          <span>{statusConfig[selectedClass.status].label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300 lg:max-w-3xl">
                    {selectedClass.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedClass.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[0.38fr_1fr] xl:grid-cols-[0.32fr_1fr]">
                <div className="rounded-3xl border border-slate-800/60 bg-slate-950/60 p-6 shadow-inner shadow-slate-900/50">
                  <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Secciones</div>
                  <div className="mt-4 flex flex-col gap-3">
                    {detailTabs.map((tab) => {
                      const isActive = tab.id === activeDetailTab;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveDetailTab(tab.id)}
                          className={`group flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-[0.3em] transition ${
                            isActive
                              ? 'border-sky-400/60 bg-sky-500/10 text-sky-100 shadow-[0_0_25px_rgba(56,189,248,0.35)]'
                              : 'border-slate-700/60 bg-slate-900/60 text-slate-400 hover:border-slate-500/60 hover:text-slate-200'
                          }`}
                        >
                          <span className="flex-1">{tab.label}</span>
                          <FiArrowRight
                            className={`h-4 w-4 transition-transform ${
                              isActive ? 'translate-x-1 text-sky-200' : 'text-slate-500 group-hover:translate-x-1'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-800/60 bg-slate-950/60 p-6 shadow-inner shadow-slate-900/50">
                  {renderDetailContent()}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/60 shadow-[0_25px_55px_-25px_rgba(56,189,248,0.55)]">
                <div className="relative aspect-[4/5] overflow-hidden">
                  {selectedClass.image ? (
                    <img
                      src={selectedClass.image}
                      alt={`Retrato de ${selectedClass.name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-950/80">
                      <FiImage className="h-16 w-16 text-slate-700" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{selectedClass.name}</h3>
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                          {selectedClass.subtitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">{renderStars(selectedClass.rating)}</div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4 p-6">
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                    <div className="space-y-1">
                      <div className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-500">Dificultad</div>
                      <div className="text-sm font-semibold text-slate-100">{selectedClass.difficulty}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-500">Dominio</div>
                      <div className="text-sm font-semibold text-slate-100">{selectedClass.mastery}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-500">Enfoque</div>
                      <div className="text-sm font-semibold text-slate-100">{selectedClass.focus}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-500">Requisitos</div>
                      <div className="text-sm font-semibold text-amber-200">
                        {selectedClass.xp} XP • {selectedClass.shards} fragmentos
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-700/60 bg-slate-950/60 p-4 text-xs text-slate-400">
                    <div className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-500">Etiquetas</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedClass.tags.map((tag) => (
                        <span
                          key={`detail-${tag}`}
                          className="rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Boton color="blue" onClick={closeClassDetails} className="justify-center uppercase tracking-[0.3em]">
                    Cerrar panel
                  </Boton>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

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
