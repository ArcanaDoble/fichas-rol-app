import React from 'react';
import PropTypes from 'prop-types';
import TraitsInput from '../TraitsInput';
import {
  ACTION_DICE_COSTS,
  ARMOR_COMPETENCES,
  ABILITY_RANGES,
  EQUIPMENT_RANGES,
  WEAPON_COMPETENCES,
} from '../../features/roguelite/catalogItem';

const controlClass = 'w-full min-h-[42px] appearance-none border border-[#34405a] bg-[#080d19] px-3 py-2 text-sm text-[#e8dfcf] outline-none transition-colors placeholder:text-[#657089] focus:border-[#c8aa6e] focus:ring-1 focus:ring-[#c8aa6e]/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

const Field = ({ label, children, className = '' }) => (
  <label className={`block min-w-0 ${className}`}>
    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8ea0bd]">
      {label}
    </span>
    {children}
  </label>
);

Field.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

const TextField = ({ label, value, onChange, placeholder = '', type = 'text', min, step }) => (
  <Field label={label}>
    <input
      className={controlClass}
      type={type}
      inputMode={type === 'number' ? 'numeric' : undefined}
      min={min}
      step={step}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  </Field>
);

TextField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  type: PropTypes.string,
  min: PropTypes.number,
  step: PropTypes.number,
};

const SelectField = ({ label, value, onChange, options }) => (
  <Field label={label}>
    <select
      className={controlClass}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value ?? option} value={option.value ?? option}>
          {option.label ?? option}
        </option>
      ))}
    </select>
  </Field>
);

SelectField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
};

const SegmentedField = ({ label, value, onChange, options, formatLabel }) => (
  <Field label={label}>
    <div className="grid min-h-[42px] grid-flow-col border border-[#34405a] bg-[#080d19]" role="group" aria-label={label}>
      {options.map((option) => {
        const selected = Number(value) === Number(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option)}
            className={`min-w-0 border-r border-[#34405a] px-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors last:border-r-0 ${selected
              ? 'bg-[#c8aa6e] text-[#080d19]'
              : 'text-[#9eabc0] hover:bg-[#151d2d] hover:text-[#ead8ac]'
            }`}
          >
            {formatLabel(option)}
          </button>
        );
      })}
    </div>
  </Field>
);

SegmentedField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  formatLabel: PropTypes.func.isRequired,
};

const RarityField = ({ value, onChange, rarities }) => (
  <SelectField
    label="Rareza"
    value={value}
    onChange={onChange}
    options={[
      { value: '', label: 'Sin rareza' },
      ...rarities.map((rarity) => ({ value: rarity.nombre, label: rarity.nombre })),
    ]}
  />
);

const DescriptionField = ({ value, onChange }) => (
  <Field label="Descripción" className="sm:col-span-2">
    <textarea
      className={`${controlClass} min-h-[88px] resize-y`}
      value={value || ''}
      placeholder="Regla, efecto o contexto del objeto"
      onChange={(event) => onChange(event.target.value)}
    />
  </Field>
);

const TraitsField = ({ value, onChange, glossary }) => (
  <Field label="Rasgos" className="sm:col-span-2">
    <TraitsInput
      value={value || ''}
      onChange={onChange}
      glossary={glossary}
      placeholder="Pesada, Barrido, Sangrado…"
      className="!min-h-[42px] !rounded-none !border-[#34405a] !bg-[#080d19] !px-3 !py-2 !text-sm !text-[#e8dfcf] focus:!border-[#c8aa6e] focus:!ring-[#c8aa6e]/30"
    />
  </Field>
);

const update = (setValue, key) => (value) => setValue((current) => ({ ...current, [key]: value }));

export const WeaponCatalogFields = ({ value, setValue, rarities, glossary }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <TextField label="Nombre" value={value.nombre} onChange={update(setValue, 'nombre')} placeholder="Mandoble" />
    <TextField label="Perfil de daño" value={value.dano} onChange={update(setValue, 'dano')} placeholder="2d8" />
    <SelectField label="Alcance" value={value.alcance} onChange={update(setValue, 'alcance')} options={EQUIPMENT_RANGES} />
    <SelectField label="Competencia" value={value.competence} onChange={update(setValue, 'competence')} options={WEAPON_COMPETENCES} />
    <SegmentedField label="Dados de acción" value={value.actionCost} onChange={update(setValue, 'actionCost')} options={ACTION_DICE_COSTS.slice(1)} formatLabel={(cost) => `${cost} dado${cost === 1 ? '' : 's'}`} />
    <SegmentedField label="Empuñadura" value={value.handsRequired} onChange={update(setValue, 'handsRequired')} options={[1, 2]} formatLabel={(hands) => `${hands} mano${hands === 1 ? '' : 's'}`} />
    <TraitsField value={value.rasgos} onChange={update(setValue, 'rasgos')} glossary={glossary} />
    <TextField label="Precio / valor" value={value.valor} onChange={update(setValue, 'valor')} placeholder="Pendiente de balance" type="number" min={0} step={1} />
    <RarityField value={value.rareza} onChange={update(setValue, 'rareza')} rarities={rarities} />
    <DescriptionField value={value.descripcion} onChange={update(setValue, 'descripcion')} />
  </div>
);

export const ArmorCatalogFields = ({ value, setValue, rarities, glossary }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <TextField label="Nombre" value={value.nombre} onChange={update(setValue, 'nombre')} placeholder="Cota de malla" />
    <TextField label="CD" value={value.defenseClass} onChange={update(setValue, 'defenseClass')} placeholder="7" type="number" min={0} step={1} />
    <SelectField label="Competencia" value={value.competence} onChange={update(setValue, 'competence')} options={ARMOR_COMPETENCES} />
    <TextField label="Precio / valor" value={value.valor} onChange={update(setValue, 'valor')} placeholder="Pendiente de balance" type="number" min={0} step={1} />
    <TraitsField value={value.rasgos} onChange={update(setValue, 'rasgos')} glossary={glossary} />
    <RarityField value={value.rareza} onChange={update(setValue, 'rareza')} rarities={rarities} />
    <DescriptionField value={value.descripcion} onChange={update(setValue, 'descripcion')} />
  </div>
);

export const AccessoryCatalogFields = ({ value, setValue, rarities, glossary }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <TextField label="Nombre" value={value.nombre} onChange={update(setValue, 'nombre')} placeholder="Anillo, botas, objeto especial…" />
    <TextField label="Precio / valor" value={value.valor} onChange={update(setValue, 'valor')} placeholder="Pendiente de balance" type="number" min={0} step={1} />
    <TraitsField value={value.rasgos} onChange={update(setValue, 'rasgos')} glossary={glossary} />
    <RarityField value={value.rareza} onChange={update(setValue, 'rareza')} rarities={rarities} />
    <DescriptionField value={value.descripcion} onChange={update(setValue, 'descripcion')} />
  </div>
);

export const AbilityCatalogFields = ({ value, setValue, rarities, glossary }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <TextField label="Nombre" value={value.nombre} onChange={update(setValue, 'nombre')} placeholder="Nombre de la habilidad" />
    <TextField label="Perfil de daño / efecto" value={value.poder} onChange={update(setValue, 'poder')} placeholder="d6 o descripción breve" />
    <SelectField label="Alcance" value={value.alcance} onChange={update(setValue, 'alcance')} options={ABILITY_RANGES} />
    <SegmentedField label="Dados de acción" value={value.actionCost} onChange={update(setValue, 'actionCost')} options={ACTION_DICE_COSTS} formatLabel={(cost) => (cost === 0 ? 'Sin coste' : `${cost}`)} />
    <TraitsField value={value.rasgos} onChange={update(setValue, 'rasgos')} glossary={glossary} />
    <RarityField value={value.rareza} onChange={update(setValue, 'rareza')} rarities={rarities} />
    <DescriptionField value={value.descripcion} onChange={update(setValue, 'descripcion')} />
  </div>
);

const catalogFieldsPropTypes = {
  value: PropTypes.object.isRequired,
  setValue: PropTypes.func.isRequired,
  rarities: PropTypes.array.isRequired,
  glossary: PropTypes.array.isRequired,
};

WeaponCatalogFields.propTypes = catalogFieldsPropTypes;
ArmorCatalogFields.propTypes = catalogFieldsPropTypes;
AccessoryCatalogFields.propTypes = catalogFieldsPropTypes;
AbilityCatalogFields.propTypes = catalogFieldsPropTypes;
