import { useEffect, useState } from 'react';
import { getWeaponForms, resolveWeaponForm } from './weaponForms';

export const useSheetWeaponTrick = ({ sheet, enabled, onPrepare }) => {
  const [error, setError] = useState('');

  useEffect(() => { setError(''); }, [sheet?.id]);

  const begin = weapon => {
    if (!enabled) return;
    setError('');
    try {
      const current = resolveWeaponForm(weapon), destination = getWeaponForms(weapon).find(form => form.id !== current.activeFormId);
      if (!destination) throw new Error('Esta forma ya no está disponible.');
      onPrepare(weapon, destination.id);
    } catch (cause) { setError(cause.message || 'No se pudo preparar la forma del arma.'); }
  };

  return { begin, error };
};
