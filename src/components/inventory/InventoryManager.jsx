import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Inventory from './Inventory';
import Input from '../Input';
import Boton from '../Boton';

const buildPlayerList = (players = [], manual = []) => {
  const map = new Map();
  [...players, ...manual]
    .filter((name) => typeof name === 'string' && name.trim().length > 0)
    .forEach((raw) => {
      const trimmed = raw.trim();
      const key = trimmed.toLowerCase();
      if (!map.has(key)) {
        map.set(key, trimmed);
      }
    });
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
};

const InventoryManager = ({ players = [] }) => {
  const [manualPlayers, setManualPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [newPlayer, setNewPlayer] = useState('');

  const availablePlayers = useMemo(
    () => buildPlayerList(players, manualPlayers),
    [players, manualPlayers]
  );

  useEffect(() => {
    if (availablePlayers.length === 0) {
      setSelectedPlayer('');
      return;
    }
    if (!selectedPlayer) {
      setSelectedPlayer(availablePlayers[0]);
      return;
    }
    const match = availablePlayers.find(
      (name) => name.toLowerCase() === selectedPlayer.toLowerCase()
    );
    if (!match) {
      setSelectedPlayer(availablePlayers[0]);
    } else if (match !== selectedPlayer) {
      setSelectedPlayer(match);
    }
  }, [availablePlayers, selectedPlayer]);

  const handleCreatePlayer = () => {
    const trimmed = newPlayer.trim();
    if (!trimmed) return;
    setManualPlayers((prev) => {
      if (prev.some((name) => name.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      return [...prev, trimmed];
    });
    setSelectedPlayer(trimmed);
    setNewPlayer('');
  };

  return (
    <div className="bg-slate-900/95 text-white p-4 sm:p-6 rounded-2xl shadow-2xl w-[20rem] sm:w-[26rem] max-h-[90vh] overflow-y-auto space-y-5 border border-slate-700/60">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-wide">Inventarios de jugadores</h2>
        <p className="text-sm text-slate-300">
          Consulta y modifica los objetos asignados a cada jugador desde un solo panel.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-slate-400">
            Seleccionar jugador
          </label>
          <select
            className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
          >
            {availablePlayers.length === 0 && <option value="">Sin jugadores registrados</option>}
            {availablePlayers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-3">
          <p className="text-xs text-slate-300 uppercase tracking-widest">Crear nuevo inventario</p>
          <Input
            size="sm"
            placeholder="Nombre del jugador"
            value={newPlayer}
            onChange={(e) => setNewPlayer(e.target.value)}
          />
          <Boton
            color="green"
            size="sm"
            className="w-full"
            onClick={handleCreatePlayer}
            disabled={!newPlayer.trim()}
          >
            Abrir inventario vacío
          </Boton>
        </div>
      </div>

      {selectedPlayer ? (
        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-3">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">
              Inventario de {selectedPlayer}
            </h3>
            <p className="text-xs text-slate-400">
              Agrega, elimina o reordena objetos arrastrándolos entre ranuras.
            </p>
          </div>
          <Inventory key={selectedPlayer} playerName={selectedPlayer} isMaster />
        </div>
      ) : (
        <p className="text-sm text-slate-300">
          Crea o selecciona un jugador para comenzar a gestionar su inventario.
        </p>
      )}
    </div>
  );
};

InventoryManager.propTypes = {
  players: PropTypes.arrayOf(PropTypes.string),
};

export default InventoryManager;
