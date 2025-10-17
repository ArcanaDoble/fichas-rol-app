import React from 'react';
import PropTypes from 'prop-types';
import { FaCoins } from 'react-icons/fa';
import { FiSearch, FiChevronRight } from 'react-icons/fi';

const navigationTabs = [
  { id: 'recommended', label: 'Recomendados', active: true },
  { id: 'all', label: 'Todos los objetos' },
  { id: 'sets', label: 'Sets de objetos' },
];

const suggestedItems = [
  {
    id: 'hextech-protobelt',
    name: 'Hextech Protobelt-01',
    role: 'Movilidad',
    cost: 2500,
    tags: ['Movilidad', 'Impulso'],
    highlight: 'Buena contra: Tanques',
    palette: 'from-sky-500/30 via-slate-900 to-slate-950',
  },
  {
    id: 'morellonomicon',
    name: 'Morellonomicon',
    role: 'Anti-curación',
    cost: 3000,
    tags: ['Poder de habilidad', 'Heridas graves'],
    highlight: 'Buena contra: Sanadores',
    palette: 'from-emerald-400/30 via-slate-900 to-slate-950',
  },
  {
    id: 'rabadons-deathcap',
    name: "Rabadon's Deathcap",
    role: 'Potenciador AP',
    cost: 3100,
    tags: ['+40% AP', '+120 AP'],
    highlight: 'Buena contra: Resistencias bajas',
    palette: 'from-fuchsia-500/30 via-slate-900 to-slate-950',
  },
  {
    id: 'void-staff',
    name: 'Void Staff',
    role: 'Penetración mágica',
    cost: 2800,
    tags: ['+65 AP', '40% Penetración'],
    highlight: 'Buena contra: Brujos',
    palette: 'from-purple-500/30 via-slate-900 to-slate-950',
  },
];

const featuredItem = {
  id: 'featured-rabadon',
  name: "Rabadon's Deathcap",
  cost: 3100,
  summary: '+25 Poder de habilidad\n+40% Poder de habilidad',
  description:
    'Sombrero legendario que amplifica el daño mágico de manera devastadora. Perfecto para lanzar hechizos demoledores.',
  buildPath: [
    { id: 'blasting-wand', cost: 1250, label: 'Blasting Wand' },
    { id: 'needlessly-large-rod', cost: 1250, label: 'Needlessly Large Rod' },
    { id: 'amplifying-tome', cost: 600, label: 'Amplifying Tome' },
  ],
};

const ShopMenu = ({ gold, onGoldChange, readOnly = false }) => {
  const handleGoldChange = (event) => {
    if (!onGoldChange) return;
    const value = Number(event.target.value);
    if (Number.isNaN(value)) {
      onGoldChange(0);
      return;
    }
    const clamped = Math.max(0, Math.min(9999, value));
    onGoldChange(clamped);
  };

  return (
    <div className="w-[480px] text-white z-40">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-slate-950/80">
          <div className="flex items-center space-x-3 text-xs uppercase tracking-[0.25em] text-slate-300">
            {navigationTabs.map((tab) => (
              <span
                key={tab.id}
                className={`pb-1 transition-colors ${
                  tab.active
                    ? 'text-amber-300 border-b-2 border-amber-400'
                    : 'text-slate-500 border-b-2 border-transparent hover:text-slate-200'
                }`}
              >
                {tab.label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-amber-500/40 shadow-inner">
            <FaCoins className="text-amber-300" />
            <input
              type="number"
              min={0}
              max={9999}
              value={gold}
              readOnly={readOnly}
              onChange={handleGoldChange}
              className={`bg-transparent w-16 text-right text-sm font-semibold focus:outline-none ${
                readOnly ? 'text-slate-300 cursor-default' : 'text-amber-200'
              }`}
            />
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">
          <div className="flex items-center gap-3 bg-slate-900/70 border border-slate-800/80 rounded-lg px-3 py-2 text-slate-300">
            <FiSearch className="text-slate-500" />
            <input
              type="text"
              placeholder="Buscar objetos o palabras clave"
              className="bg-transparent flex-1 text-sm placeholder:text-slate-500 focus:outline-none"
              readOnly
            />
          </div>

          <div className="grid grid-cols-[2fr,1fr] gap-4">
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Sugeridos
              </div>
              <div className="grid grid-cols-2 gap-3">
                {suggestedItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border border-slate-800/70 bg-gradient-to-br ${item.palette} p-3 shadow-lg hover:shadow-amber-500/30 transition-shadow duration-200`}
                  >
                    <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.35em] text-slate-300">
                      <span>{item.role}</span>
                      <span className="text-amber-300">{item.cost}</span>
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-100 leading-tight">
                      {item.name}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.25em] text-slate-300">
                      {item.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 rounded-full bg-slate-900/70 border border-slate-700/70">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[0.65rem] uppercase tracking-[0.25em] text-slate-400">
                      <span>{item.highlight}</span>
                      <FiChevronRight className="text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 shadow-inner">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Vista previa
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-100 leading-tight">
                {featuredItem.name}
              </div>
              <div className="mt-2 text-xs text-slate-400 whitespace-pre-line leading-relaxed">
                {featuredItem.summary}
              </div>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                {featuredItem.description}
              </p>

              <div className="mt-4">
                <div className="text-xs uppercase tracking-[0.35em] text-slate-400 mb-2">
                  Construcción
                </div>
                <div className="flex flex-col gap-2">
                  {featuredItem.buildPath.map((part) => (
                    <div
                      key={part.id}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
                    >
                      <span>{part.label}</span>
                      <span className="text-amber-300 font-semibold">{part.cost}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="mt-5 w-full bg-amber-500/80 hover:bg-amber-400 text-slate-900 font-semibold py-2 rounded-lg transition-colors"
              >
                Comprar por {featuredItem.cost}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ShopMenu.propTypes = {
  gold: PropTypes.number.isRequired,
  onGoldChange: PropTypes.func,
  readOnly: PropTypes.bool,
};

export default ShopMenu;
