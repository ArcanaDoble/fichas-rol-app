import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FiMinus, FiPlus } from 'react-icons/fi';

const clamp = (value, minimum, maximum) => {
    const safeValue = Number.isFinite(value) ? value : minimum;
    return Math.min(maximum, Math.max(minimum, safeValue));
};

const NumberStepper = ({
    value,
    onChange,
    label,
    min = 0,
    max = 99,
    step = 1,
    className = '',
}) => {
    const normalizedValue = clamp(Number(value), min, max);
    const [draftValue, setDraftValue] = useState(String(normalizedValue));

    useEffect(() => {
        setDraftValue(String(normalizedValue));
    }, [normalizedValue]);

    const commit = (nextValue) => {
        const parsed = Number(nextValue);
        const resolved = clamp(parsed, min, max);
        setDraftValue(String(resolved));
        onChange(resolved);
    };

    return (
        <div className={`inline-flex h-10 shrink-0 items-stretch border border-[#c8aa6e]/25 bg-[#080c17] ${className}`}>
            <button
                type="button"
                onClick={() => commit(normalizedValue - step)}
                disabled={normalizedValue <= min}
                className="flex w-10 touch-manipulation items-center justify-center border-r border-[#c8aa6e]/15 text-[#9b8556] transition hover:bg-[#c8aa6e]/10 hover:text-[#e2d5b5] active:bg-[#c8aa6e]/20 disabled:cursor-not-allowed disabled:text-slate-800"
                aria-label={`Reducir ${label}`}
            >
                <FiMinus className="h-4 w-4" />
            </button>
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={draftValue}
                onChange={(event) => {
                    if (/^\d*$/.test(event.target.value)) setDraftValue(event.target.value);
                }}
                onBlur={() => commit(draftValue)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        commit(draftValue);
                        event.currentTarget.blur();
                    }
                    if (event.key === 'Escape') {
                        setDraftValue(String(normalizedValue));
                        event.currentTarget.blur();
                    }
                }}
                className="w-12 bg-transparent text-center font-mono text-sm font-bold text-[#f0e6d2] outline-none"
                aria-label={label}
            />
            <button
                type="button"
                onClick={() => commit(normalizedValue + step)}
                disabled={normalizedValue >= max}
                className="flex w-10 touch-manipulation items-center justify-center border-l border-[#c8aa6e]/15 text-[#9b8556] transition hover:bg-[#c8aa6e]/10 hover:text-[#e2d5b5] active:bg-[#c8aa6e]/20 disabled:cursor-not-allowed disabled:text-slate-800"
                aria-label={`Aumentar ${label}`}
            >
                <FiPlus className="h-4 w-4" />
            </button>
        </div>
    );
};

NumberStepper.propTypes = {
    value: PropTypes.number,
    onChange: PropTypes.func.isRequired,
    label: PropTypes.string.isRequired,
    min: PropTypes.number,
    max: PropTypes.number,
    step: PropTypes.number,
    className: PropTypes.string,
};

export default NumberStepper;

