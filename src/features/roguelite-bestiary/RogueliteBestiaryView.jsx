import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { FiArrowLeft, FiPlus, FiSearch, FiX } from 'react-icons/fi';
import { Skull } from 'lucide-react';
import { db } from '../../firebase';
import { addCampaignNpcToActiveCanvas, addRogueliteEnemyToActiveCanvas } from './canvasSpawn';
import { createEmptyRogueliteEnemy, mergeRogueliteEnemySnapshot, normalizeRogueliteEnemy, normalizeRogueliteEnemyAbility, prepareRogueliteEnemyForFirestore, reorderRogueliteEnemies, sortRogueliteEnemies } from './enemyModel';
import { createEmptyCampaignNpc, normalizeCampaignNpc } from './campaignNpcModel';
import RogueliteEnemyCard from './RogueliteEnemyCard';

const normalizeCatalog = (items = [], type) => items
  .filter(Boolean)
  .map((item) => ({ ...item, type: item.type || type }));

const deduplicate = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item.templateId || item.catalogId || item.id || item.name || item.nombre || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const RogueliteBestiaryView = ({ onBack, armas, armaduras, habilidades, accesorios, variant = 'roguelite' }) => {
  const campaign = variant === 'campaignNpc';
  const collectionName = campaign ? 'campaignNpcs' : 'rogueliteEnemies';
  const abilityCollectionName = campaign ? 'campaignNpcAbilities' : 'rogueliteEnemyAbilities';
  const normalize = campaign ? normalizeCampaignNpc : normalizeRogueliteEnemy;
  const createEmpty = campaign ? createEmptyCampaignNpc : createEmptyRogueliteEnemy;
  const [enemies, setEnemies] = useState([]);
  const [abilityLibrary, setAbilityLibrary] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [launchingId, setLaunchingId] = useState(null);
  const [draggedEnemyId, setDraggedEnemyId] = useState(null);
  const [dragOverEnemyId, setDragOverEnemyId] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const unsubEnemies = onSnapshot(collection(db, collectionName), (snapshot) => {
      const loaded = snapshot.docs.map((entry) => normalize({ id: entry.id, ...entry.data() }));
      setEnemies((current) => sortRogueliteEnemies(mergeRogueliteEnemySnapshot(current, loaded)));
      setLoading(false);
    }, (error) => {
      console.error('No se pudo cargar el archivo de combate', error);
      setLoading(false);
      setNotice({ type: 'error', text: 'No se pudo cargar el archivo de enemigos.' });
    });
    const unsubAbilities = onSnapshot(collection(db, abilityCollectionName), (snapshot) => {
      setAbilityLibrary(snapshot.docs.map((entry) => normalizeRogueliteEnemyAbility({ id: entry.id, ...entry.data() })));
    });
    const unsubItems = onSnapshot(collection(db, 'customItems'), (snapshot) => {
      setCustomItems(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data(), type: entry.data().type || 'object' })));
    });
    return () => { unsubEnemies(); unsubAbilities(); unsubItems(); };
  }, [abilityCollectionName, collectionName, normalize]);

  const equipmentCatalog = useMemo(() => deduplicate([
    ...normalizeCatalog(armas, 'weapon'),
    ...normalizeCatalog(armaduras, 'armor'),
    ...normalizeCatalog(accesorios, 'access'),
    ...normalizeCatalog(habilidades, 'ability'),
    ...customItems,
  ]), [armas, armaduras, accesorios, habilidades, customItems]);

  const visibleEnemies = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return enemies;
    return enemies.filter((enemy) => `${enemy.name} ${enemy.description} ${enemy.rarity}`.toLowerCase().includes(needle));
  }, [enemies, search]);

  const changeEnemy = (nextEnemy) => {
    setEnemies((current) => current.map((enemy) => enemy.id === nextEnemy.id ? { ...nextEnemy, _dirty: true } : enemy));
  };

  const saveEnemy = async (candidate) => {
    const enemy = normalize(candidate);
    const { _dirty, _localOnly, ...payload } = enemy;
    try {
      setSavingId(enemy.id);
      await setDoc(doc(db, collectionName, enemy.id), prepareRogueliteEnemyForFirestore({ ...payload, updatedAt: Date.now() }));
      setEnemies((current) => current.map((item) => item.id === enemy.id ? payload : item));
      setNotice({ type: 'success', text: `${enemy.name} se ha guardado en ${campaign ? 'el archivo de Campaña' : 'el bestiario Roguelite'}.` });
      return true;
    } catch (error) {
      console.error('No se pudo guardar la ficha de combate', error);
      setNotice({ type: 'error', text: 'No se pudieron guardar los cambios del enemigo.' });
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const deleteEnemy = async (enemy) => {
    if (!window.confirm(`¿Eliminar la tarjeta de ${enemy.name}?`)) return;
    if (enemy._localOnly) {
      setEnemies((current) => current.filter((item) => item.id !== enemy.id));
      return;
    }
    await deleteDoc(doc(db, collectionName, enemy.id));
  };

  const duplicateEnemy = (enemy) => {
    const copy = createEmpty();
    setEnemies((current) => [{ ...normalize({ ...enemy, id: copy.id, name: `${enemy.name} · copia`, sortOrder: -1 }), _localOnly: true, _dirty: true }, ...current]);
  };

  const persistEnemyOrder = async (orderedEnemies) => {
    const savedEnemies = orderedEnemies.filter((enemy) => !enemy._localOnly);
    if (!savedEnemies.length) return;
    const batch = writeBatch(db);
    const updatedAt = Date.now();
    savedEnemies.forEach((enemy) => {
      batch.set(doc(db, collectionName, enemy.id), { sortOrder: enemy.sortOrder, updatedAt }, { merge: true });
    });
    try {
      await batch.commit();
    } catch (error) {
      console.error('No se pudo guardar el orden del bestiario Roguelite', error);
      setNotice({ type: 'error', text: 'La posición cambió en pantalla, pero no pudo guardarse.' });
    }
  };

  const moveEnemyTo = (sourceId, targetId) => {
    const ordered = reorderRogueliteEnemies(enemies, sourceId, targetId);
    if (ordered === enemies) return;
    setEnemies(ordered);
    persistEnemyOrder(ordered);
  };

  const moveEnemyBy = (enemyId, offset) => {
    const index = enemies.findIndex((enemy) => enemy.id === enemyId);
    const target = enemies[index + offset];
    if (index < 0 || !target) return;
    moveEnemyTo(enemyId, target.id);
  };

  const saveAbility = async (ability) => {
    const normalized = normalizeRogueliteEnemyAbility(ability);
    await setDoc(doc(db, abilityCollectionName, normalized.id), prepareRogueliteEnemyForFirestore({ ...normalized, updatedAt: Date.now() }), { merge: true });
  };

  const launchEnemy = async (enemy) => {
    try {
      setLaunchingId(enemy.id);
      if (campaign && (enemy._localOnly || enemy._dirty)) {
        const saved = await saveEnemy(enemy);
        if (!saved) return null;
      }
      const result = await (campaign ? addCampaignNpcToActiveCanvas(enemy) : addRogueliteEnemyToActiveCanvas(enemy));
      setNotice({ type: 'success', enemyId: enemy.id, text: `${result.token.name} se ha añadido a «${result.scenarioName}».` });
      return result;
    } catch (error) {
      console.error('No se pudo añadir el enemigo al Canvas', error);
      setNotice({ type: 'error', enemyId: enemy.id, text: error.message || 'No se pudo añadir el enemigo al Canvas.' });
      return null;
    } finally {
      setLaunchingId(null);
    }
  };

  const noticeContent = notice && <aside className={`noma-rogue-bestiary__notice is-${notice.type}`} role="status">
    <Skull />{notice.text}<button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso"><FiX /></button>
  </aside>;

  return (
    <main className="noma-rogue-bestiary">
      <header className="noma-rogue-bestiary__header">
        <div className="noma-rogue-bestiary__header-inner">
          <div className="noma-rogue-bestiary__identity">
            <button type="button" onClick={onBack} aria-label="Volver a la selección de bestiario"><FiArrowLeft /></button>
            <div><h1>{campaign ? 'PNJ y enemigos de Campaña' : 'Bestiario'}</h1><p>{campaign ? 'Aliados y enemigos · fichas reutilizables' : 'Registro de enemigos · Roguelite'}</p></div>
          </div>
          <div className="noma-rogue-bestiary__header-actions">
            <label><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={campaign ? 'Buscar ficha…' : 'Buscar enemigo…'} />{search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda"><FiX /></button>}</label>
            <button type="button" onClick={() => setEnemies((current) => [{ ...createEmpty(), sortOrder: -1, _localOnly: true, _dirty: true }, ...current])}><FiPlus /> {campaign ? 'Nueva ficha' : 'Nueva tarjeta'}</button>
          </div>
        </div>
      </header>

      <div className="noma-rogue-bestiary__toolbar">
        <span>{visibleEnemies.length} tarjeta{visibleEnemies.length === 1 ? '' : 's'} operativa{visibleEnemies.length === 1 ? '' : 's'}{!search.trim() && visibleEnemies.length > 1 ? ' · arrastra o usa las flechas para ordenar' : ''}</span>
      </div>

      {!notice?.enemyId && noticeContent}

      {loading ? (
        <div className="noma-rogue-bestiary__empty">Abriendo el archivo de {campaign ? 'Campaña' : 'enemigos'}…</div>
      ) : visibleEnemies.length === 0 ? (
        <div className="noma-rogue-bestiary__empty"><Skull /><h2>{search ? 'No hay coincidencias' : campaign ? 'Aún no hay fichas de Campaña' : 'El bestiario Roguelite está vacío'}</h2><p>{search ? 'Prueba otro nombre o limpia el filtro.' : campaign ? 'Crea una ficha, elige Aliado o Enemigo y añádela a un encuentro de Campaña.' : 'Crea la primera tarjeta; el bestiario tradicional seguirá intacto.'}</p></div>
      ) : (
        <section className="noma-rogue-bestiary__grid">
          {visibleEnemies.map((enemy) => {
            const enemyIndex = enemies.findIndex((item) => item.id === enemy.id);
            const canReorder = !search.trim() && enemies.length > 1;
            return (
            <RogueliteEnemyCard
              key={enemy.id}
              enemy={enemy}
              variant={variant}
              equipmentCatalog={equipmentCatalog}
              abilityLibrary={abilityLibrary}
              onChange={changeEnemy}
              onSave={saveEnemy}
              onDelete={deleteEnemy}
              onDuplicate={duplicateEnemy}
              onSaveAbility={saveAbility}
              onLaunch={launchEnemy}
              launchNotice={notice?.enemyId === enemy.id ? noticeContent : null}
              onMove={(offset) => moveEnemyBy(enemy.id, offset)}
              onDragStart={(event) => {
                if (!canReorder) return;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', enemy.id);
                setDraggedEnemyId(enemy.id);
              }}
              onDragEnd={() => { setDraggedEnemyId(null); setDragOverEnemyId(null); }}
              onDragOver={(event) => {
                if (!canReorder || !draggedEnemyId || draggedEnemyId === enemy.id) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDragOverEnemyId(enemy.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = draggedEnemyId || event.dataTransfer.getData('text/plain');
                if (canReorder && sourceId) moveEnemyTo(sourceId, enemy.id);
                setDraggedEnemyId(null);
                setDragOverEnemyId(null);
              }}
              canMovePrevious={canReorder && enemyIndex > 0}
              canMoveNext={canReorder && enemyIndex < enemies.length - 1}
              canReorder={canReorder}
              isDragging={draggedEnemyId === enemy.id}
              isDropTarget={dragOverEnemyId === enemy.id && draggedEnemyId !== enemy.id}
              saving={savingId === enemy.id}
              launching={launchingId === enemy.id}
            />
            );
          })}
        </section>
      )}
    </main>
  );
};

RogueliteBestiaryView.propTypes = {
  onBack: PropTypes.func.isRequired,
  armas: PropTypes.array,
  armaduras: PropTypes.array,
  habilidades: PropTypes.array,
  accesorios: PropTypes.array,
  variant: PropTypes.oneOf(['roguelite', 'campaignNpc']),
};

RogueliteBestiaryView.defaultProps = { armas: [], armaduras: [], habilidades: [], accesorios: [] };

export default RogueliteBestiaryView;
