import React, { useState, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { BsDice6 } from 'react-icons/bs';
import { GiFist } from 'react-icons/gi';
import { FaFire, FaBolt, FaSnowflake, FaRadiationAlt } from 'react-icons/fa';
import Tarjeta from './Tarjeta';
import Boton from './Boton';
import { FiSearch, FiMap, FiCopy, FiEdit2, FiX } from 'react-icons/fi';

const atributos = ['destreza', 'vigor', 'intelecto', 'voluntad'];
const defaultRecursos = ['postura', 'vida', 'ingenio', 'cordura', 'armadura'];
const recursoColor = {
  postura: '#34d399',
  vida: '#f87171',
  ingenio: '#60a5fa',
  cordura: '#a78bfa',
  armadura: '#9ca3af',
};
const atributoColor = {
  destreza: '#34d399',
  vigor: '#f87171',
  intelecto: '#60a5fa',
  voluntad: '#a78bfa',
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatSigned = (value) => (value > 0 ? `+${value}` : `${value}`);

const EnemyViewModal = ({ enemy, onClose, onEdit, onDuplicate, onSendToMap, highlightText = (t) => t, floating = false }) => {
  const modalRef = useRef(null);
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 300, y: window.innerHeight / 2 - 250 });
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      setPos({
        x: window.innerWidth / 2 - rect.width / 2,
        y: window.innerHeight / 2 - rect.height / 2,
      });
    }
  }, [enemy?.id]);

  const handleMouseDown = (e) => {
    e.stopPropagation();
    setDragging(true);
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
  };
  const handleMouseUp = () => setDragging(false);
  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);
  if (!enemy) return null;

  const dadoIcono = () => <BsDice6 className="inline" />;
  const iconoDano = (tipo) => {
    if (!tipo) return null;
    switch (tipo.toLowerCase()) {
      case 'físico': return <GiFist className="inline" />;
      case 'fuego': return <FaFire className="inline" />;
      case 'eléctrico': return <FaBolt className="inline" />;
      case 'hielo': return <FaSnowflake className="inline" />;
      case 'radiación': return <FaRadiationAlt className="inline" />;
      default: return null;
    }
  };

  // Buscar dentro de la ficha (equipo y poderes)
  const [query, setQuery] = useState('');
  const normalize = (t) => (t || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const tokens = useMemo(() => normalize(query).split(/\s+/).filter(Boolean), [query]);
  const matches = (text) => {
    if (tokens.length === 0) return true;
    const n = normalize(text);
    return tokens.every((tk) => n.includes(tk));
  };
  const filteredWeapons = useMemo(() => {
    const list = enemy.weapons || [];
    if (tokens.length === 0) return list;
    return list.filter((w) =>
      matches(`${w?.nombre || ''} ${w?.descripcion || ''} ${w?.rasgos?.join(', ') || ''} ${w?.dano || ''} ${w?.tipoDano || ''}`)
    );
  }, [enemy.weapons, tokens]);
  const filteredArmors = useMemo(() => {
    const list = enemy.armaduras || [];
    if (tokens.length === 0) return list;
    return list.filter((a) =>
      matches(`${a?.nombre || ''} ${a?.descripcion || ''} ${a?.rasgos?.join(', ') || ''} ${a?.defensa || ''}`)
    );
  }, [enemy.armaduras, tokens]);
  const filteredPowers = useMemo(() => {
    const list = enemy.poderes || [];
    if (tokens.length === 0) return list;
    return list.filter((p) =>
      matches(`${p?.nombre || ''} ${p?.descripcion || ''} ${p?.rasgos?.join(', ') || ''} ${p?.poder || ''} ${p?.alcance || ''}`)
    );
  }, [enemy.poderes, tokens]);

  const scrollTo = (id) => {
    if (!modalRef.current) return;
    const el = modalRef.current.querySelector(`#${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const orderedStats = useMemo(() => {
    const stats = enemy.stats || {};
    const entries = Object.entries(stats);
    const prioritized = [];
    defaultRecursos.forEach((key) => {
      if (stats[key]) {
        prioritized.push([key, stats[key]]);
      }
    });
    const seen = new Set(prioritized.map(([key]) => key));
    entries.forEach(([key, value]) => {
      if (!seen.has(key)) {
        prioritized.push([key, value]);
      }
    });
    return prioritized;
  }, [enemy.stats]);

  const windowBox = (
    <div
      ref={modalRef}
      className="fixed bg-gray-800 rounded-xl w-full max-h-screen sm:w-[min(90vw,1100px)] sm:max-h-[75vh] overflow-y-auto p-4 sm:p-6 select-none pointer-events-auto"
      style={{ top: pos.y, left: pos.x, zIndex: 1000 }}
      onClick={(e) => e.stopPropagation()}
      onPointerDownCapture={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4 cursor-move" onMouseDown={handleMouseDown}>
        <h2 className="text-xl font-bold">Ficha de {enemy.name}</h2>
        <div className="hidden md:flex gap-2">
          {onSendToMap && (
            <Boton color="indigo" onClick={() => onSendToMap(enemy)}>
              Enviar al mapa
            </Boton>
          )}
          {onDuplicate && (
            <Boton color="yellow" onClick={() => onDuplicate(enemy)}>
              Duplicar
            </Boton>
          )}
          {onEdit && (
            <Boton
              color="blue"
              size="sm"
              className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm"
              onClick={() => onEdit(enemy)}
            >
              Editar
            </Boton>
          )}
          <Boton
            color="gray"
            size="sm"
            className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm"
            onClick={onClose}
          >
            ✕
          </Boton>
        </div>
      </div>
      {/* Buscador dentro de la ficha */}
      <div className="mb-3 relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en equipo y poderes (nombre, rasgos, descripción...)"
          className="w-full pl-10 pr-3 py-2 rounded-md bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>
      {/* Tabs de navegación rápida */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm" onClick={() => scrollTo('info')}>Resumen</button>
        <button className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm" onClick={() => scrollTo('weapons')}>Armas</button>
        <button className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm" onClick={() => scrollTo('armors')}>Armaduras</button>
        <button className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm" onClick={() => scrollTo('powers')}>Poderes</button>
        <button className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm" onClick={() => scrollTo('notes')}>Notas</button>
      </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna 1 */}
          <div className="space-y-4">
            {enemy.portrait && (
              <div className="w-full aspect-square max-w-xs mx-auto rounded-lg overflow-hidden bg-gray-700 flex items-center justify-center">
                <img
                  src={enemy.portrait}
                  alt={enemy.name}
                  className="w-full h-full object-contain object-center rounded-lg shadow-md border border-gray-800"
                  style={{ background: '#222' }}
                />
              </div>
            )}
            <div id="info" className="bg-gray-700 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-lg">Información Básica</h3>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Nivel:</span> {enemy.nivel || 1}</p>
                <p><span className="font-medium">Experiencia:</span> {enemy.experiencia || 0}</p>
                <p><span className="font-medium">Dinero:</span> {enemy.dinero || 0}</p>
              </div>
            </div>
            {enemy.description && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Descripción</h3>
                <p className="text-gray-300 text-sm">{highlightText(enemy.description)}</p>
              </div>
            )}
            {enemy.notas && (
              <div id="notes" className="bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Notas</h3>
                <p className="text-gray-300 text-sm">{highlightText(enemy.notas)}</p>
              </div>
            )}
          </div>
          {/* Columna 2 */}
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Atributos</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {atributos.map((attr) => (
                  <div key={attr} className="flex justify-between">
                    <span
                      className="font-medium capitalize"
                      style={{ color: atributoColor[attr] }}
                    >
                      {attr}:
                    </span>
                    <span style={{ color: recursoColor.armadura }}>
                      {enemy.atributos?.[attr] || 'D4'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Estadísticas</h3>
              {orderedStats.length > 0 ? (
                <div className="space-y-3 text-sm">
                  {orderedStats.map(([key, rawStat]) => {
                    const stat =
                      rawStat && typeof rawStat === 'object'
                        ? rawStat
                        : { total: rawStat };
                    const label = stat.label || key;
                    const baseValue = toNumber(stat.base, toNumber(stat.total));
                    const buffValue = toNumber(stat.buff, 0);
                    const totalValue = toNumber(stat.total, baseValue + buffValue);
                    const actualValue = toNumber(stat.actual, totalValue);
                    const color = stat.color || recursoColor[key] || '#ffffff';

                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium capitalize" style={{ color }}>
                            {label}
                          </span>
                          <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                            <span className="text-gray-300">Base {baseValue}</span>
                            {buffValue !== 0 && (
                              <span className="text-amber-300 font-semibold">+ ({formatSigned(buffValue)})</span>
                            )}
                            <span className="text-blue-300 font-semibold">= {baseValue + buffValue}</span>
                            {totalValue !== baseValue + buffValue && (
                              <span className="text-indigo-300">({totalValue})</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Actual</span>
                          <span className="text-emerald-300 font-semibold">{actualValue}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Sin estadísticas registradas</p>
              )}
            </div>
          </div>
          {/* Columna 3 */}
          <div className="space-y-4">
            <div id="weapons" className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Armas Equipadas</h3>
              {filteredWeapons?.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredWeapons.map((weapon, index) => (
                    <Tarjeta key={index} variant="weapon" className="text-xs p-3" interactive={false}>
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src="/marcas/Espada.png"
                          alt="Icono de arma"
                          className="w-6 h-6 object-contain"
                          loading="lazy"
                        />
                        <p className="font-bold text-sm text-white">{weapon.nombre}</p>
                      </div>
                      <p className="mb-1">
                        <span className="font-medium">Daño:</span> {dadoIcono()} {weapon.dano} {iconoDano(weapon.tipoDano)}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Alcance:</span> {weapon.alcance}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Consumo:</span> {weapon.consumo}
                      </p>
                      {weapon.rasgos && weapon.rasgos.length > 0 && (
                        <p className="mb-1">
                          <span className="font-medium">Rasgos:</span> {highlightText(weapon.rasgos.join(', '))}
                        </p>
                      )}
                      {weapon.descripcion && (
                        <p className="text-gray-300 italic">
                          <span className="font-medium">Descripción:</span> {highlightText(weapon.descripcion)}
                        </p>
                      )}
                    </Tarjeta>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Sin armas equipadas</p>
              )}
            </div>
            <div id="armors" className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Armaduras Equipadas</h3>
              {filteredArmors?.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredArmors.map((armor, index) => (
                    <Tarjeta key={index} variant="armor" className="text-xs p-3" interactive={false}>
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src="/marcas/Armadura.png"
                          alt="Icono de armadura"
                          className="w-6 h-6 object-contain"
                          loading="lazy"
                        />
                        <p className="font-bold text-sm text-white">{armor.nombre}</p>
                      </div>
                      <p className="mb-1">
                        <span className="font-medium">Defensa:</span> {armor.defensa}
                      </p>
                      {armor.rasgos && armor.rasgos.length > 0 && (
                        <p className="mb-1">
                          <span className="font-medium">Rasgos:</span> {highlightText(armor.rasgos.join(', '))}
                        </p>
                      )}
                      {armor.descripcion && (
                        <p className="text-gray-300 italic">
                          <span className="font-medium">Descripción:</span> {highlightText(armor.descripcion)}
                        </p>
                      )}
                    </Tarjeta>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Sin armaduras equipadas</p>
              )}
            </div>
            <div id="powers" className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Poderes Equipados</h3>
              {filteredPowers?.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredPowers.map((power, index) => (
                    <Tarjeta key={index} variant="power" className="text-xs p-3" interactive={false}>
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src="/marcas/Músculo.png"
                          alt="Icono de poder"
                          className="w-6 h-6 object-contain"
                          loading="lazy"
                        />
                        <p className="font-bold text-sm text-white">{power.nombre}</p>
                      </div>
                      <p className="mb-1">
                        <span className="font-medium">Daño:</span> {power.poder}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Alcance:</span> {power.alcance}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Consumo:</span> {power.consumo}
                      </p>
                      {power.rasgos && power.rasgos.length > 0 && (
                        <p className="mb-1">
                          <span className="font-medium">Rasgos:</span> {highlightText(power.rasgos.join(', '))}
                        </p>
                      )}
                      {power.descripcion && (
                        <p className="text-gray-300 italic">
                          <span className="font-medium">Descripción:</span> {highlightText(power.descripcion)}
                        </p>
                      )}
                    </Tarjeta>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Sin poderes equipados</p>
              )}
            </div>
          </div>
        </div>
        {/* Barra de acciones sticky para móvil */}
        <div className="md:hidden sticky bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-700 mt-3 -mx-6 px-4 py-2">
          <div className="flex items-center justify-around gap-3">
            {onSendToMap && (
              <button
                type="button"
                title="Enviar al mapa"
                aria-label="Enviar al mapa"
                onClick={() => onSendToMap(enemy)}
                className="h-10 w-10 rounded-full bg-indigo-600 text-white shadow flex items-center justify-center active:scale-95"
              >
                <FiMap />
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                title="Duplicar"
                aria-label="Duplicar"
                onClick={() => onDuplicate(enemy)}
                className="h-10 w-10 rounded-full bg-yellow-500 text-gray-900 shadow flex items-center justify-center active:scale-95"
              >
                <FiCopy />
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                title="Editar"
                aria-label="Editar"
                onClick={() => onEdit(enemy)}
                className="h-10 w-10 rounded-full bg-blue-600 text-white shadow flex items-center justify-center active:scale-95"
              >
                <FiEdit2 />
              </button>
            )}
            <button
              type="button"
              title="Cerrar"
              aria-label="Cerrar"
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-gray-700 text-white shadow flex items-center justify-center active:scale-95"
            >
              <FiX />
            </button>
          </div>
        </div>
      </div>
  );

  const content = floating ? (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {windowBox}
    </div>
  ) : (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}>
      {windowBox}
    </div>
  );
  return createPortal(content, document.body);
};

EnemyViewModal.propTypes = {
  enemy: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
  onDuplicate: PropTypes.func,
  onSendToMap: PropTypes.func,
  highlightText: PropTypes.func,
  floating: PropTypes.bool,
};

export default EnemyViewModal;
