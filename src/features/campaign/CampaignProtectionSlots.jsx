import React, { useEffect } from 'react';
import { Shield, X } from 'lucide-react';
import LoadingImage from '../../components/LoadingImage';
import { equipmentItemsShareInstance, resolveEquipmentInstanceId } from '../roguelite/equipmentPool';
import {
  isCampaignArmorReinforcement,
  resolveCampaignArmorRd,
  resolveCampaignProtection,
} from './campaignEquipment';
import './CampaignProtectionSlots.css';

export default function CampaignProtectionSlots({
  equippedItems, inventoryItems, activeSlot, onToggleSlot, onEquip, onUnequip,
  getImage, getRarityColors, renderTrait,
}) {
  const protection = resolveCampaignProtection(equippedItems);
  useEffect(() => {
    if (!['body', 'reinforcement'].includes(activeSlot)) return undefined;
    const close = (event) => {
      if (event.key === 'Escape') onToggleSlot(activeSlot);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [activeSlot, onToggleSlot]);

  return (
    <section className={`noma-campaign-protection ${['body', 'reinforcement'].includes(activeSlot) ? 'is-selecting' : ''}`} aria-label="Protección equipada">
      <div className="noma-campaign-protection__heading">
        <h3><Shield aria-hidden="true" /> Cuerpo</h3>
        <output className="noma-campaign-protection__total" aria-label="Reducción de daño total del equipo">
          <span>RD total</span><strong>{protection.total ?? '—'}</strong>
        </output>
      </div>
      <div className="noma-campaign-protection__slots">
        {['body', 'reinforcement'].map((slot) => {
          const reinforcement = slot === 'reinforcement';
          const item = equippedItems[slot];
          const image = item ? getImage(item) : null;
          const colors = item ? getRarityColors(item) : {};
          const selected = activeSlot === slot;
          const rd = protection[slot === 'body' ? 'body' : 'reinforcement'];
          const name = item?.name || item?.nombre;
          const choices = inventoryItems.filter((candidate) => reinforcement
            ? isCampaignArmorReinforcement(candidate)
            : candidate._category === 'armor' && !isCampaignArmorReinforcement(candidate));
          const traits = String(item?.traits || item?.rasgos || item?.trait || '').split(',').map((trait) => trait.trim()).filter(Boolean);

          return (
            <div key={slot} className={`noma-campaign-protection__slot ${reinforcement ? 'is-reinforcement' : 'is-body'} ${selected ? 'is-selected' : ''}`}>
              <button
                type="button"
                className={`noma-campaign-protection__card ${item ? colors.border || '' : 'is-empty'}`}
                style={item ? colors.borderStyle : undefined}
                onClick={(event) => { event.stopPropagation(); onToggleSlot(slot); }}
                aria-label={item ? `Cambiar ${reinforcement ? 'refuerzo' : 'armadura'}: ${name}` : `Equipar ${reinforcement ? 'refuerzo' : 'armadura'}`}
                aria-expanded={selected}
                aria-haspopup="dialog"
              >
                {image && <LoadingImage src={image} alt="" imageClassName="noma-campaign-protection__art" skeletonClassName="noma-campaign-protection__art" showFailureFallback={false} />}
                <span className="noma-campaign-protection__fade" aria-hidden="true" />
                <span className="noma-campaign-protection__content">
                  {reinforcement && item && <span className="noma-campaign-protection__category">Refuerzo</span>}
                  {!item && !reinforcement && <Shield className="noma-campaign-protection__empty-icon" aria-hidden="true" />}
                  <span className="noma-campaign-protection__name">{name || (reinforcement ? 'Sin refuerzo' : 'Armadura')}</span>
                  {item ? (
                    <span className={`noma-campaign-protection__readout ${reinforcement ? '' : 'noma-armor-defense-readout'}`} role="img" aria-label={`${reinforcement ? 'Refuerzo' : 'Reducción de daño'}: ${rd ?? '—'}`}>
                      {reinforcement ? <strong>+{rd ?? '—'} RD</strong> : (
                        <>
                          <span className="noma-armor-defense-emblem" aria-hidden="true"><Shield /><span className="noma-armor-defense-emblem__value"><small>RD</small><strong>{rd ?? '—'}</strong></span></span>
                          <span className="noma-armor-defense-rule" aria-hidden="true"><span>Reducción de daño</span></span>
                        </>
                      )}
                    </span>
                  ) : <span className="noma-campaign-protection__empty-label">Equipar</span>}
                  {!reinforcement && traits.length > 0 && <span className="noma-loadout-traits noma-armor-protections">{traits.slice(0, 3).map(renderTrait)}</span>}
                </span>
              </button>
              {item && <button type="button" className="noma-loadout-slot-remove" aria-label={`Desequipar ${name}`} title={`Desequipar ${name}`} onClick={(event) => { event.stopPropagation(); onUnequip(slot); }}><X aria-hidden="true" /></button>}
              {selected && (
                <div className="noma-campaign-protection__picker" role="dialog" aria-label={`Seleccionar ${reinforcement ? 'refuerzo' : 'armadura'} del inventario`} onClick={(event) => event.stopPropagation()}>
                  <div className="noma-campaign-protection__picker-heading">Seleccionar {reinforcement ? 'refuerzo' : 'armadura'} del inventario</div>
                  {choices.map((candidate) => {
                    const equipped = equipmentItemsShareInstance(item, candidate);
                    const candidateImage = getImage(candidate);
                    const candidateRd = resolveCampaignArmorRd(candidate);
                    return (
                      <button type="button" key={resolveEquipmentInstanceId(candidate) || candidate._inventorySourceKey} className="noma-campaign-protection__option" disabled={equipped} onClick={() => onEquip(slot, candidate)}>
                        <span className="noma-campaign-protection__option-art">{candidateImage ? <LoadingImage src={candidateImage} alt="" imageClassName="h-full w-full object-cover" showFailureFallback={false} /> : <Shield aria-hidden="true" />}</span>
                        <span className="noma-campaign-protection__option-copy"><strong>{candidate.name || candidate.nombre}</strong><span>{reinforcement ? '+' : ''}{candidateRd == null ? 'RD sin definir' : `${reinforcement ? Math.min(1, candidateRd) : candidateRd} RD`}</span></span>
                        {equipped && <span className="noma-campaign-protection__equipped">Equipado</span>}
                      </button>
                    );
                  })}
                  {!choices.length && <p className="noma-campaign-protection__empty-picker">{reinforcement ? 'No hay refuerzos en tu inventario.' : 'No hay armaduras en tu inventario.'}<span>{reinforcement ? 'Las armaduras con el rasgo Refuerzo aparecen aquí.' : 'Añade armaduras desde la pestaña Inventario.'}</span></p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
