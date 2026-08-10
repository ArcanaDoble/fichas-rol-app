import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FiCheck, FiX } from 'react-icons/fi';
import { normalizeTagColor } from '../utils/tags';

const TAG_COLOR_PRESETS = Object.freeze([
  { color: '#ef4444', label: 'Carmesí' },
  { color: '#f59e0b', label: 'Ámbar' },
  { color: '#10b981', label: 'Esmeralda' },
  { color: '#3b82f6', label: 'Zafiro' },
  { color: '#a78bfa', label: 'Violeta' },
  { color: '#38bdf8', label: 'Cian' },
]);

const tagStyle = (color) => ({
  color,
  borderColor: `${color}80`,
  backgroundColor: `${color}1a`,
});

const EditableTag = ({
  name,
  color,
  onNameChange,
  onColorChange,
  onCommit,
  readOnly = false,
  placeholder = 'ETIQUETA',
}) => {
  const safeColor = normalizeTagColor(color);
  const [isEditing, setIsEditing] = useState(false);
  const [hexDraft, setHexDraft] = useState(safeColor);
  const containerRef = useRef(null);
  const nameInputRef = useRef(null);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    setHexDraft(safeColor);
  }, [safeColor]);

  useEffect(() => {
    if (!isEditing) return undefined;

    nameInputRef.current?.focus();
    nameInputRef.current?.select();

    const closeFromOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsEditing(false);
        onCommitRef.current();
      }
    };

    document.addEventListener('mousedown', closeFromOutside);
    return () => document.removeEventListener('mousedown', closeFromOutside);
  }, [isEditing]);

  if (readOnly) {
    return (
      <span
        className="block min-w-[60px] border px-3 py-1 text-center font-sans text-[10px] font-bold uppercase tracking-[0.2em]"
        style={tagStyle(safeColor)}
      >
        {name || placeholder}
      </span>
    );
  }

  const commitAndClose = () => {
    setIsEditing(false);
    onCommit();
  };

  const handleHexChange = (value) => {
    setHexDraft(value);
    if (/^#[0-9a-f]{6}$/i.test(value)) onColorChange(value.toLowerCase());
  };

  return (
    <div ref={containerRef} className="relative" data-testid="editable-tag">
      {isEditing ? (
        <input
          ref={nameInputRef}
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitAndClose();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              commitAndClose();
            }
          }}
          className="min-w-[92px] max-w-[190px] border bg-[#05080f] px-2.5 py-1 text-center font-sans text-[10px] font-bold uppercase tracking-[0.16em] outline-none"
          style={tagStyle(safeColor)}
          placeholder={placeholder}
          aria-label={`Nombre de etiqueta ${name || placeholder}`}
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="block min-w-[60px] border px-3 py-1 text-center font-sans text-[10px] font-bold uppercase tracking-[0.2em] transition hover:brightness-125"
          style={tagStyle(safeColor)}
          aria-label={`Editar etiqueta ${name || placeholder}`}
        >
          {name || placeholder}
        </button>
      )}

      {isEditing && (
        <div className="absolute left-0 top-full z-[80] mt-2 w-[min(292px,calc(100vw-32px))] border border-[#c8aa6e]/25 bg-[#080c17] p-2 shadow-[0_10px_24px_rgba(0,0,0,0.65)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
            <span className="font-['Cinzel'] text-[9px] font-bold uppercase tracking-[0.18em] text-[#c8aa6e]/80">
              Color de etiqueta
            </span>
            <button
              type="button"
              onClick={commitAndClose}
              className="flex h-7 w-7 touch-manipulation items-center justify-center text-slate-500 transition hover:text-[#c8aa6e]"
              aria-label="Cerrar editor de etiqueta"
            >
              <FiX className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            {TAG_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.color}
                type="button"
                onClick={() => onColorChange(preset.color)}
                className={`h-6 w-6 shrink-0 touch-manipulation rounded-full border transition hover:scale-110 ${safeColor === preset.color
                  ? 'border-[#f0e6d2] ring-1 ring-[#c8aa6e] ring-offset-2 ring-offset-[#080c17]'
                  : 'border-white/20'
                  }`}
                style={{ backgroundColor: preset.color }}
                title={preset.label}
                aria-label={`Color ${preset.label}`}
              />
            ))}
          </div>

          <div className="mt-3 grid grid-cols-[36px_minmax(0,1fr)_32px] items-center gap-2">
            <label
              className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/25 shadow-[inset_0_0_0_3px_#080c17]"
              style={{ background: 'conic-gradient(#ef4444, #f59e0b, #10b981, #38bdf8, #3b82f6, #a78bfa, #ef4444)' }}
              title="Abrir selector de color personalizado"
            >
              <input
                type="color"
                value={safeColor}
                onChange={(event) => onColorChange(event.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Selector de color personalizado"
              />
            </label>
            <input
              type="text"
              value={hexDraft}
              onChange={(event) => handleHexChange(event.target.value)}
              onBlur={() => setHexDraft(safeColor)}
              maxLength={7}
              className="h-9 min-w-0 border border-slate-700 bg-[#05080f] px-2 font-mono text-xs uppercase text-slate-200 outline-none focus:border-[#c8aa6e]/70"
              aria-label="Color HEX de la etiqueta"
              placeholder="#EF4444"
            />
            <button
              type="button"
              onClick={commitAndClose}
              className="flex h-8 w-8 touch-manipulation items-center justify-center border border-[#c8aa6e]/25 text-[#c8aa6e]/80 transition hover:border-[#c8aa6e]/60 hover:text-[#f0e6d2]"
              aria-label="Aplicar color de etiqueta"
            >
              <FiCheck className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

EditableTag.propTypes = {
  name: PropTypes.string,
  color: PropTypes.string,
  onNameChange: PropTypes.func,
  onColorChange: PropTypes.func,
  onCommit: PropTypes.func,
  readOnly: PropTypes.bool,
  placeholder: PropTypes.string,
};

EditableTag.defaultProps = {
  name: '',
  color: '#ef4444',
  onNameChange: () => {},
  onColorChange: () => {},
  onCommit: () => {},
};

export default EditableTag;
