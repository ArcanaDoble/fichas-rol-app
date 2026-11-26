import React from 'react';
import { CALTROPS_HAZARD_ART } from '../../geometry';

const hazardAppearances = [
    { id: null, label: 'Rayado' },
    { ...CALTROPS_HAZARD_ART, label: 'Abrojos' },
];

export const HazardAppearanceControl = ({ showCaltrops, onChange }) => (
    <div className="bg-[#0b1120] p-3 rounded border border-slate-800 space-y-3" role="group" aria-label="Aspecto del peligro">
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Aspecto del peligro</div>
        <div className="grid grid-cols-2 gap-2">
            {hazardAppearances.map(({ id, label, image }) => {
                const active = showCaltrops === Boolean(id);
                return (
                    <button
                        key={label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => !active && onChange(id)}
                        className={`flex flex-col items-center justify-center gap-2 px-2 py-2 rounded border text-[10px] font-bold uppercase tracking-wider transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8aa6e] ${active ? 'border-[#c8aa6e] text-[#f8e7b9] bg-[#c8aa6e]/15' : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}
                    >
                        {image ? <img src={image} alt="" className="h-12 w-12 object-contain" /> : (
                            <span aria-hidden="true" className="h-12 w-12 rounded-sm border border-red-400/60"
                                style={{ backgroundImage: 'repeating-linear-gradient(135deg, #ef44444d 0 6px, #ef444421 6px 12px)' }} />
                        )}
                        {label}
                    </button>
                );
            })}
        </div>
    </div>
);
