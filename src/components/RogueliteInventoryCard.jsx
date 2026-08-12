import React from 'react';
import PropTypes from 'prop-types';
import { Dices } from 'lucide-react';
import { FiX } from 'react-icons/fi';
import { normalizeGlossaryWord } from '../utils/glossary';

const RogueliteInventoryCard = ({
    item,
    image,
    fallbackIcon,
    categoryLabel,
    rarityAccent,
    raritySoft,
    rarityFaint,
    actionCost,
    handsRequired,
    visibleTraits,
    glossary,
    proficiencyWarning,
    canRemove,
    onRemove,
    variant,
}) => {
    const damage = item.damage || item.dano;
    const defense = item.defense || item.defensa;
    const range = item.range || item.alcance;
    const description = item.detail || item.description || 'Sin descripción.';
    const rarity = item.rareza || item.rarity || 'Sin rareza';

    const renderTrait = (trait, index) => {
        const glossaryEntry = (glossary || []).find(
            (entry) => normalizeGlossaryWord(entry.word) === normalizeGlossaryWord(trait),
        );

        return (
            <span
                key={`${trait}-${index}`}
                className="noma-inventory-card__trait"
                data-tooltip-id={glossaryEntry ? 'trait-tooltip' : undefined}
                data-tooltip-content={glossaryEntry?.info}
                style={glossaryEntry?.color ? { color: glossaryEntry.color } : undefined}
            >
                <span aria-hidden="true">◆</span>
                {trait}
            </span>
        );
    };

    return (
        <article
            data-testid="inventory-item-card"
            className={`noma-inventory-card ${variant === 'inspector' ? 'noma-inventory-card--inspector' : ''}`}
            style={{
                '--noma-item-accent': rarityAccent,
                '--noma-item-accent-soft': raritySoft,
                '--noma-item-accent-faint': rarityFaint,
            }}
        >
            <header className="noma-inventory-card__hero">
                {image ? (
                    <img
                        src={image}
                        alt=""
                        className="noma-inventory-card__art"
                        aria-hidden="true"
                    />
                ) : (
                    <div className="noma-inventory-card__fallback" aria-hidden="true">
                        {fallbackIcon}
                    </div>
                )}
                <div className="noma-inventory-card__art-wash" aria-hidden="true" />

                <div className="noma-inventory-card__identity">
                    <span className="noma-inventory-card__category">{categoryLabel}</span>
                    <h4>{item.name || 'Objeto sin nombre'}</h4>
                    <span className="noma-inventory-card__rarity">{rarity}</span>
                </div>

                {canRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="noma-inventory-card__remove"
                        title="Eliminar"
                        aria-label={`Eliminar ${item.name || 'objeto'}`}
                    >
                        <FiX aria-hidden="true" />
                    </button>
                )}
            </header>

            <div className="noma-inventory-card__body">
                {(damage || defense) && (
                    <div className="noma-inventory-card__primary-stat">
                        {damage && (
                            <div>
                                <span>Daño</span>
                                <strong>{damage}</strong>
                            </div>
                        )}
                        {defense && (
                            <div>
                                <span>CD</span>
                                <strong>{defense}</strong>
                            </div>
                        )}
                    </div>
                )}

                {(range || actionCost !== null || handsRequired) && (
                    <dl className="noma-inventory-card__rules">
                        {range && (
                            <div>
                                <dt>Alcance</dt>
                                <dd>{range}</dd>
                            </div>
                        )}
                        {actionCost !== null && (
                            <div aria-label={`Coste: ${actionCost} dados de acción`}>
                                <dt>Coste</dt>
                                <dd>
                                    <Dices aria-hidden="true" />
                                    {actionCost}
                                </dd>
                            </div>
                        )}
                        {handsRequired && (
                            <div>
                                <dt>Empuñadura</dt>
                                <dd>{handsRequired === 2 ? 'Dos manos' : 'Una mano'}</dd>
                            </div>
                        )}
                    </dl>
                )}

                {proficiencyWarning && (
                    <p className="noma-inventory-card__warning">{proficiencyWarning}</p>
                )}

                {visibleTraits.length > 0 && (
                    <div className="noma-inventory-card__traits">
                        {visibleTraits.map(renderTrait)}
                    </div>
                )}

                <div className="noma-inventory-card__description">
                    <span aria-hidden="true">◆</span>
                    <p>{description}</p>
                </div>
            </div>

            <div className="noma-inventory-card__rarity-line" aria-hidden="true" />
        </article>
    );
};

RogueliteInventoryCard.propTypes = {
    item: PropTypes.object.isRequired,
    image: PropTypes.string,
    fallbackIcon: PropTypes.node,
    categoryLabel: PropTypes.string,
    rarityAccent: PropTypes.string.isRequired,
    raritySoft: PropTypes.string.isRequired,
    rarityFaint: PropTypes.string.isRequired,
    actionCost: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    handsRequired: PropTypes.number,
    visibleTraits: PropTypes.arrayOf(PropTypes.string),
    glossary: PropTypes.arrayOf(PropTypes.object),
    proficiencyWarning: PropTypes.string,
    canRemove: PropTypes.bool,
    onRemove: PropTypes.func,
    variant: PropTypes.oneOf(['default', 'inspector']),
};

RogueliteInventoryCard.defaultProps = {
    image: null,
    fallbackIcon: null,
    categoryLabel: 'Objeto',
    actionCost: null,
    handsRequired: null,
    visibleTraits: [],
    glossary: [],
    proficiencyWarning: null,
    canRemove: false,
    onRemove: undefined,
    variant: 'default',
};

export default RogueliteInventoryCard;
