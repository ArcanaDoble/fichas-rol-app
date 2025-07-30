import React, { useState, useEffect } from 'react';
import Boton from './Boton';
import Input from './Input';
import { rollExpression } from '../utils/dice';

const SPECIAL_TRAIT_COLOR = '#ef4444';

const DiceCalculator = ({ playerName, onBack }) => {

  const [selectedDice, setSelectedDice] = useState([]);
  const [formula, setFormula] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showResult, setShowResult] = useState(false);

  // Tipos de dados disponibles con imágenes
  const diceTypes = [
    { sides: 4, color: 'bg-red-500', image: '/dados/calculadora/calculadora-D4.png' },
    { sides: 6, color: 'bg-blue-500', image: '/dados/calculadora/calculadora-D6.png' },
    { sides: 8, color: 'bg-green-500', image: '/dados/calculadora/calculadora-D8.png' },
    { sides: 10, color: 'bg-yellow-500', image: '/dados/calculadora/calculadora-D10.png' },
    { sides: 12, color: 'bg-purple-500', image: '/dados/calculadora/calculadora-D12.png' },
    { sides: 20, color: 'bg-pink-500', image: '/dados/calculadora/calculadora-D20.png' },
    { sides: 100, color: 'bg-gray-500', image: '/dados/calculadora/calculadora-D100.png' }
  ];

  // Cargar historial del localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('diceHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Guardar historial en localStorage
  const saveHistory = (newEntry) => {
    const updatedHistory = [newEntry, ...history].slice(0, 50); // Máximo 50 entradas
    setHistory(updatedHistory);
    localStorage.setItem('diceHistory', JSON.stringify(updatedHistory));
  };

  // Agregar dado a la selección
  const addDice = (sides) => {
    setSelectedDice([...selectedDice, { sides, id: Date.now() + Math.random() }]);
  };

  // Remover dado de la selección
  const removeDice = (id) => {
    setSelectedDice(selectedDice.filter(dice => dice.id !== id));
  };

  // Limpiar selección
  const clearDice = () => {
    setSelectedDice([]);
    setResult(null);
    setShowResult(false);
  };

  // Tirar dados seleccionados
  const rollSelectedDice = () => {
    if (selectedDice.length === 0) return;

    const results = selectedDice.map(dice => {
      const roll = Math.floor(Math.random() * dice.sides) + 1;
      return { sides: dice.sides, roll };
    });

    const total = results.reduce((sum, result) => sum + result.roll, 0);
    const formulaText = selectedDice.map(dice => `1d${dice.sides}`).join(' + ');

    const resultData = {
      formula: formulaText,
      results,
      total,
      timestamp: new Date().toLocaleString(),
      player: playerName
    };

    setResult(resultData);
    setShowResult(true);
    saveHistory(resultData);
  };

  // Tirar fórmula o calcular operación matemática
  const rollFormula = () => {
    if (!formula.trim()) return;
    try {
      const parsed = rollExpression(formula);
      const resultData = {
        formula: parsed.formula,
        results: parsed.details,
        total: parsed.total,
        timestamp: new Date().toLocaleString(),
        player: playerName,
      };
      setResult(resultData);
      setShowResult(true);
      saveHistory(resultData);
    } catch (error) {
      alert('Fórmula inválida. Usa formato como: 2d6+1d8+3 o una operación matemática.');
    }
  };



  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 px-2 py-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Boton onClick={onBack} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg">
            ← Volver
          </Boton>
          <h1 className="text-xl font-bold text-white text-center flex-1">
            🎲 Calculadora de Dados
          </h1>
          <div className="w-16"></div> {/* Spacer para centrar el título */}
        </div>

        <div className="text-center mb-6">
          <p className="text-gray-300 text-sm">Jugador: {playerName}</p>
        </div>

        <div className="space-y-6">
          {/* Selector de dados */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3 text-center">Seleccionar Dados</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {diceTypes.map(dice => (
                <Boton
                  key={dice.sides}
                  onClick={() => addDice(dice.sides)}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold h-24 sm:h-20 flex flex-col items-center justify-center text-sm border-2 border-gray-600 hover:border-gray-500 transition-all duration-200 relative overflow-hidden rounded-lg"
                >
                  <div className="relative z-10 flex flex-col items-center justify-center h-full p-2">
                    <img
                      src={dice.image}
                      alt={`d${dice.sides}`}
                      className="w-12 h-12 sm:w-10 sm:h-10 object-contain mb-1 filter drop-shadow-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <span className="text-2xl hidden">🎲</span>
                    <span className="text-sm font-semibold">d{dice.sides}</span>
                  </div>
                  <div className={`absolute inset-0 ${dice.color} opacity-20`}></div>
                </Boton>
              ))}
            </div>
          </div>

          {/* Dados seleccionados */}
          {selectedDice.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-white text-center flex-1">Dados Seleccionados</h3>
                <Boton color="red" onClick={clearDice} size="sm">
                  Limpiar
                </Boton>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedDice.map(dice => (
                  <div
                    key={dice.id}
                    className="bg-gray-700 text-white px-3 py-2 rounded-lg flex items-center gap-2"
                  >
                    <span>d{dice.sides}</span>
                    <button
                      onClick={() => removeDice(dice.id)}
                      className="text-red-400 hover:text-red-300 text-lg"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <Boton color="green" onClick={rollSelectedDice} className="w-full py-3 text-lg">
                🎲 Tirar Dados Seleccionados
              </Boton>
            </div>
          )}

          {/* Fórmula manual */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3 text-center">Fórmula Manual</h3>
            <div className="space-y-3">
              <Input
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="Ej: 2d6+1d8+3"
                className="w-full text-center"
                onKeyDown={(e) => e.key === 'Enter' && rollFormula()}
              />
              <Boton color="blue" onClick={rollFormula} className="w-full py-3 text-lg">
                🎲 Tirar Fórmula
              </Boton>
              <p className="text-gray-400 text-sm text-center">
                Formato: XdY+Z (ej: 2d6+1d8+3, 1d20+5, 3d4-1)
              </p>
            </div>
          </div>

          {/* Resultado */}
          {showResult && result && (
            <div className="bg-green-900/20 border-green-500/50 rounded-lg p-4 border">
              <h3 className="text-lg font-semibold text-green-400 mb-3 text-center">🎯 Resultado</h3>
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-white text-sm mb-1">
                    <span className="font-medium">Fórmula:</span> {result.formula}
                  </p>
                </div>
                <div className="text-white">
                  <p className="font-medium text-center mb-2">Detalles:</p>
                  <div className="space-y-1">
                    {result.results.map((detail, index) => (
                      <div key={index} className="text-sm text-center bg-gray-800/50 rounded p-2">
                        {detail.type === 'dice' ? (
                          <span>
                            {detail.formula}: [
                            {detail.rolls.map((r, ri) => (
                              <span
                                key={ri}
                                style={r.critical ? { color: SPECIAL_TRAIT_COLOR } : {}}
                              >
                                {r.value}
                                {ri < detail.rolls.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                            ] = {detail.subtotal}
                          </span>
                        ) : detail.type === 'calc' ? (
                          <span>Resultado: {detail.value}</span>
                        ) : (
                          <span>Modificador: {detail.formula}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-center bg-green-800/30 rounded-lg p-4">
                  <p className="text-3xl font-bold text-green-400">
                    Total: {result.total}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Historial */}
          {history.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3 text-center">📜 Historial</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {history.slice(0, 10).map((entry, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-white font-medium">{entry.player}</p>
                        <p className="text-gray-300">{entry.formula}</p>
                        <p className="text-green-400 font-bold">Total: {entry.total}</p>
                      </div>
                      <p className="text-gray-500 text-xs">{entry.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiceCalculator;
