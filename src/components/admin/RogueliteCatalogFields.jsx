import React, { useState } from 'react';
import PropTypes from 'prop-types';
import TraitsInput from '../TraitsInput';
import { getWeaponForms, updateWeaponForm } from '../../features/roguelite/weaponForms';
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

const DescriptionFields = ({ value, setValue }) => (
  <fieldset className="grid min-w-0 gap-3 border-t border-[#c8aa6e]/15 pt-4 sm:col-span-2 sm:grid-cols-2">
    <legend className="mb-1 pr-3 font-['Cinzel'] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c8aa6e]">
      Texto de la tarjeta
    </legend>
    <Field label="Reglas y efecto">
      <textarea
        className={`${controlClass} min-h-[112px] resize-y font-['Alegreya'] text-[15px] font-medium leading-[1.5]`}
        value={value.descripcion || ''}
        placeholder="Qué hace, qué cuesta y cómo se resuelve"
        onChange={(event) => setValue((current) => ({ ...current, descripcion: event.target.value }))}
      />
    </Field>
    <Field label="Lore">
      <textarea
        className={`${controlClass} min-h-[112px] resize-y font-['Alegreya'] text-[15px] italic leading-[1.5]`}
        value={value.lore || ''}
        placeholder="Origen, aspecto o historia del objeto"
        onChange={(event) => setValue((current) => ({ ...current, lore: event.target.value }))}
      />
    </Field>
  </fieldset>
);

DescriptionFields.propTypes = {
  value: PropTypes.object.isRequired,
  setValue: PropTypes.func.isRequired,
};

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
    <DescriptionFields value={value} setValue={setValue} />
  </div>
);

export const TrickWeaponCatalogFields = ({ value, setValue, rarities, glossary, formIndex, onFormChange, baseImage }) => {
  const forms = getWeaponForms(value, baseImage);
  const form = forms[formIndex];
  const [traitInputs, setTraitInputs] = useState({});
  const change = key => next => setValue(current => updateWeaponForm(current, formIndex, { [key]: next }, baseImage));
  // The live profile uses parsed traits; the input must retain unfinished separators and spaces.
  const traitText = traitInputs[form.id] ?? form.rasgos.join(', ');
  const changeTraits = next => {
    setTraitInputs(current => ({ ...current, [form.id]: next }));
    change('rasgos')(next);
  };
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <TextField label="Nombre" value={value.nombre} onChange={update(setValue, 'nombre')} />
    <RarityField value={value.rareza} onChange={update(setValue, 'rareza')} rarities={rarities} />
    <div className="sm:col-span-2 flex min-h-[44px] flex-wrap items-center justify-between gap-2 border border-[#c8aa6e]/25 bg-black/20 px-3 py-2">
      <span className="font-['Cinzel'] text-xs text-[#c8aa6e]">◆ Truco · Dos formas</span>
      <button type="button" className="min-h-[32px] text-xs text-slate-500 hover:text-slate-300" onClick={() => setValue(current => ({
        ...current, rasgos: getWeaponForms(current, baseImage)[0].rasgos.join(', '),
      }))}>Quitar Truco</button>
    </div>
    <div className="sm:col-span-2 grid grid-cols-2 border-y border-[#c8aa6e]/20" role="group" aria-label="Forma que estás editando">
      {forms.map((entry, index) => <button type="button" key={entry.id} aria-pressed={index === formIndex}
        onClick={() => onFormChange(index)} className={`min-h-[48px] border-b-2 px-2 font-['Cinzel'] text-xs ${index === formIndex ? 'border-[#c8aa6e] text-[#e5d2a4]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
        {entry.label} · Forma {index + 1}
      </button>)}
    </div>
    <TextField label="Nombre de esta forma" value={form.label} onChange={change('label')} />
    <TextField label="Perfil de daño" value={form.dano} onChange={change('dano')} placeholder="2d8" />
    <SelectField label="Alcance" value={form.alcance} onChange={change('alcance')} options={EQUIPMENT_RANGES} />
    <SelectField label="Competencia" value={form.competence} onChange={change('competence')} options={WEAPON_COMPETENCES} />
    <SegmentedField label="Dados de acción" value={form.actionCost} onChange={change('actionCost')} options={ACTION_DICE_COSTS.slice(1)} formatLabel={cost => `${cost} dado${cost === 1 ? '' : 's'}`} />
    <SegmentedField label="Empuñadura" value={form.handsRequired} onChange={change('handsRequired')} options={[1, 2]} formatLabel={hands => `${hands} mano${hands === 1 ? '' : 's'}`} />
    <Field label="Rasgos de esta forma" className="sm:col-span-2">
      <TraitsInput value={traitText} onChange={changeTraits} glossary={glossary}
        className="!min-h-[42px] !rounded-none !border-[#34405a] !bg-[#080d19] !px-3 !py-2 !text-sm !text-[#e8dfcf]" />
    </Field>
    <TextField label="Precio / valor" value={value.valor} onChange={update(setValue, 'valor')} type="number" min={0} />
    <div className="flex flex-col justify-center text-xs text-[#bca77a]"><span className="font-['Cinzel']">Transformación · 1 DA</span><span className="mt-1 text-slate-500">Eliges el dado y se ignora su valor.</span></div>
    <Field label="Reglas y efecto de esta forma"><textarea className={`${controlClass} min-h-[112px] font-['Alegreya']`} value={form.descripcion} onChange={event => change('descripcion')(event.target.value)} /></Field>
    <Field label="Lore"><textarea className={`${controlClass} min-h-[112px] font-['Alegreya'] italic`} value={value.lore || ''} onChange={event => update(setValue, 'lore')(event.target.value)} /></Field>
  </div>;
};

export const ArmorCatalogFields = ({ value, setValue, rarities, glossary }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <TextField label="Nombre" value={value.nombre} onChange={update(setValue, 'nombre')} placeholder="Cota de malla" />
    <TextField label="CD" value={value.defenseClass} onChange={update(setValue, 'defenseClass')} placeholder="7" type="number" min={0} step={1} />
    <SelectField label="Competencia" value={value.competence} onChange={update(setValue, 'competence')} options={ARMOR_COMPETENCES} />
    <TextField label="Precio / valor" value={value.valor} onChange={update(setValue, 'valor')} placeholder="Pendiente de balance" type="number" min={0} step={1} />
    <TraitsField value={value.rasgos} onChange={update(setValue, 'rasgos')} glossary={glossary} />
    <RarityField value={value.rareza} onChange={update(setValue, 'rareza')} rarities={rarities} />
    <DescriptionFields value={value} setValue={setValue} />
  </div>
);

export const AccessoryCatalogFields = ({ value, setValue, rarities, glossary }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <TextField label="Nombre" value={value.nombre} onChange={update(setValue, 'nombre')} placeholder="Anillo, botas, objeto especial…" />
    <TextField label="Precio / valor" value={value.valor} onChange={update(setValue, 'valor')} placeholder="Pendiente de balance" type="number" min={0} step={1} />
    <TraitsField value={value.rasgos} onChange={update(setValue, 'rasgos')} glossary={glossary} />
    <RarityField value={value.rareza} onChange={update(setValue, 'rareza')} rarities={rarities} />
    <DescriptionFields value={value} setValue={setValue} />
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
    <DescriptionFields value={value} setValue={setValue} />
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
