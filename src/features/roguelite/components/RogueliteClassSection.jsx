import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { ShieldQuestion } from 'lucide-react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { LibraryCharacterCard } from '../../../components/LibraryCharacterCard';
import { normalizeRogueliteAccess } from '../access';
import { mergeRogueliteClassCatalogs } from '../classDefinition';
import { createRogueliteProfileClass } from '../profileClass';

const RogueliteClassSection = ({ playerName, onOpenClass }) => {
  const [access, setAccess] = useState(null);
  const [classDefinitions, setClassDefinitions] = useState([]);
  const [profileConfigurations, setProfileConfigurations] = useState({});
  const [accessError, setAccessError] = useState('');
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    if (!playerName) {
      setAccess(normalizeRogueliteAccess());
      return undefined;
    }

    return onSnapshot(
      doc(db, 'players', playerName),
      (snapshot) => {
        setAccess(normalizeRogueliteAccess(snapshot.exists() ? snapshot.data() : {}));
        setAccessError('');
      },
      (snapshotError) => {
        console.error('Error loading roguelite player access:', snapshotError);
        setAccess(normalizeRogueliteAccess());
        setAccessError('No se pudo comprobar el acceso al modo roguelite.');
      },
    );
  }, [playerName]);

  useEffect(() => {
    if (!access?.enabled) {
      setClassDefinitions([]);
      return undefined;
    }

    const catalogs = {
      legacy: [],
      roguelite: [],
    };
    const failedCatalogs = new Set();
    const updateDefinitions = () => {
      setClassDefinitions(mergeRogueliteClassCatalogs(
        catalogs.legacy,
        catalogs.roguelite,
      ));
    };
    const handleCatalogError = (catalogName, snapshotError) => {
      console.error(`Error loading ${catalogName} classes:`, snapshotError);
      failedCatalogs.add(catalogName);
      if (failedCatalogs.size === 2) {
        setCatalogError('No se pudieron cargar las clases de aventura.');
      }
    };
    const subscribeToCatalog = (collectionName, catalogName) => onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        catalogs[catalogName] = snapshot.docs.map((classDoc) => ({
          ...classDoc.data(),
          id: classDoc.id,
        }));
        failedCatalogs.delete(catalogName);
        setCatalogError('');
        updateDefinitions();
      },
      (snapshotError) => handleCatalogError(catalogName, snapshotError),
    );

    const unsubscribeLegacyClasses = subscribeToCatalog('classes', 'legacy');
    const unsubscribeRogueliteClasses = subscribeToCatalog('rogueliteClasses', 'roguelite');

    return () => {
      unsubscribeLegacyClasses();
      unsubscribeRogueliteClasses();
    };
  }, [access?.enabled]);

  useEffect(() => {
    if (!access?.enabled || !playerName) {
      setProfileConfigurations({});
      return undefined;
    }

    return onSnapshot(
      collection(db, 'players', playerName, 'rogueliteClasses'),
      (snapshot) => {
        setProfileConfigurations(Object.fromEntries(
          snapshot.docs.map((configurationDoc) => [
            configurationDoc.id,
            { ...configurationDoc.data(), id: configurationDoc.id },
          ]),
        ));
      },
      (snapshotError) => {
        console.error('Error loading personal roguelite class configurations:', snapshotError);
        setProfileConfigurations({});
      },
    );
  }, [access?.enabled, playerName]);

  const unlockedClasses = useMemo(() => {
    if (!access?.enabled) return [];
    const classById = new Map(classDefinitions.map((classItem) => [classItem.id, classItem]));
    return access.unlockedClassIds
      .map((classId) => classById.get(classId))
      .filter(Boolean)
      .map((classDefinition) => createRogueliteProfileClass(
        classDefinition,
        profileConfigurations[classDefinition.id],
        playerName,
      ));
  }, [access, classDefinitions, playerName, profileConfigurations]);

  const missingClassCount = access?.enabled
    ? Math.max(0, access.unlockedClassIds.length - unlockedClasses.length)
    : 0;
  const error = accessError || catalogError;

  if (!access?.enabled) return null;

  return (
    <section className="space-y-6" data-testid="roguelite-class-section">
      <div className="flex items-center gap-4">
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#c8aa6e]/30 to-transparent" />
        <div className="text-center">
          <span className="font-['Cinzel'] text-lg tracking-widest text-[#c8aa6e]">CLASES DE AVENTURA</span>
          <p className="mt-1 font-['Cinzel'] text-[10px] uppercase tracking-widest text-slate-500">MODO ROGUELITE</p>
        </div>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#c8aa6e]/30 to-transparent" />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/25 bg-red-500/5 px-5 py-6 text-center text-sm text-red-300">
          {error}
        </div>
      ) : unlockedClasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#c8aa6e]/25 bg-[#0b1120]/45 px-6 py-12 text-center">
          <ShieldQuestion className="mb-4 h-10 w-10 text-[#c8aa6e]/45" />
          <h3 className="font-['Cinzel'] text-lg uppercase tracking-widest text-[#f0e6d2]">Sin clases desbloqueadas</h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
            Tienes acceso al modo Roguelite, pero el máster todavía no ha desbloqueado ninguna clase para este perfil.
          </p>
          {missingClassCount > 0 && (
            <p className="mt-3 text-xs text-amber-400/70">
              {missingClassCount} {missingClassCount === 1 ? 'clase asignada está pendiente' : 'clases asignadas están pendientes'} de publicación.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {unlockedClasses.map((classItem) => (
            <LibraryCharacterCard
              key={classItem.id}
              item={classItem}
              onOpen={() => onOpenClass(classItem, {
                mode: 'roguelite',
                collectionPathSegments: ['players', playerName, 'rogueliteClasses'],
                collectionLabel: `players/${playerName}/rogueliteClasses`,
                storagePrefix: `roguelite-profiles/${playerName}`,
                updateMainLibrary: false,
              })}
              starCount={10}
              starValue={classItem.level}
              levelPrefix="Nivel"
              ariaLabel={`Abrir clase ${classItem.name}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

RogueliteClassSection.propTypes = {
  playerName: PropTypes.string.isRequired,
  onOpenClass: PropTypes.func.isRequired,
};

export default RogueliteClassSection;
