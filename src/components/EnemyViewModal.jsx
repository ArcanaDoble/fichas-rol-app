import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { BsDice6 } from 'react-icons/bs';
import { GiFist } from 'react-icons/gi';
import { FaFire, FaBolt, FaSnowflake, FaRadiationAlt } from 'react-icons/fa';
import Tarjeta from './Tarjeta';
import Boton from './Boton';

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

const EnemyViewModal = ({ enemy, onClose, onEdit, highlightText = (t) => t, floating = false }) => {
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

  const windowBox = (
    <div
      ref={modalRef}
      className="fixed bg-gray-800 rounded-xl w-full h-full sm:max-w-[80vw] sm:max-h-[70vh] overflow-y-auto p-2 sm:p-6 select-none pointer-events-auto"
      style={{ top: pos.y, left: pos.x, zIndex: 1000 }}
      onClick={(e) => e.stopPropagation()}
      onPointerDownCapture={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4 cursor-move" onMouseDown={handleMouseDown}>
        <h2 className="text-xl font-bold">Ficha de {enemy.name}</h2>
        <div className="flex gap-2">
          {onEdit && (
            <Boton color="blue" onClick={() => onEdit(enemy)}>
              Editar
            </Boton>
          )}
          <Boton color="gray" onClick={onClose}>✕</Boton>
        </div>
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
            <div className="bg-gray-700 rounded-lg p-4 space-y-2">
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
              <div className="bg-gray-700 rounded-lg p-4">
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
              <div className="space-y-3 text-sm">
                {defaultRecursos.map((recurso) => {
                  const stat = enemy.stats?.[recurso] || { base: 0, total: 0, actual: 0, buff: 0 };
                  const color = recursoColor[recurso] || '#ffffff';
                  return (
                    <div key={recurso} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize" style={{ color }}>{recurso}</span>
                        <div className="flex gap-2 text-xs">
                          <span className="text-gray-400">Base: {stat.base}</span>
                          <span className="text-green-400">+{stat.buff}</span>
                          <span className="text-blue-400">= {stat.total}</span>
                          <span className="text-yellow-400">({stat.actual})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Columna 3 */}
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Armas Equipadas</h3>
              {enemy.weapons?.length > 0 ? (
                <div className="space-y-2">
                  {enemy.weapons.map((weapon, index) => (
                    <Tarjeta key={index} variant="weapon" className="text-xs">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">⚔️</span>
                        <p className="font-bold text-sm">{weapon.nombre}</p>
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
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Armaduras Equipadas</h3>
              {enemy.armaduras?.length > 0 ? (
                <div className="space-y-2">
                  {enemy.armaduras.map((armor, index) => (
                    <Tarjeta key={index} variant="armor" className="text-xs">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🛡️</span>
                        <p className="font-bold text-sm">{armor.nombre}</p>
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
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Poderes Equipados</h3>
              {enemy.poderes?.length > 0 ? (
                <div className="space-y-2">
                  {enemy.poderes.map((power, index) => (
                    <Tarjeta key={index} variant="power" className="text-xs">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">💪</span>
                        <p className="font-bold text-sm">{power.nombre}</p>
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
  highlightText: PropTypes.func,
  floating: PropTypes.bool,
};

export default EnemyViewModal;
