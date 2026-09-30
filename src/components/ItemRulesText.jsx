import React, { useId, useState } from 'react';
import './ItemRulesText.css';

const ItemRulesText = ({ text, name = 'objeto', previewLength = 180 }) => {
    const id = useId();
    const [expandedText, setExpandedText] = useState(null);
    if (!text) return null;
    const expanded = expandedText === text;
    const long = text.length > previewLength;
    const completeSentences = text.slice(0, previewLength).match(/^[\s\S]*[.!?](?=\s|$)/)?.[0]?.trim();
    const preview = completeSentences && completeSentences.length >= 60
        ? completeSentences
        : `${text.slice(0, previewLength).replace(/\s+\S*$/, '').trim()}…`;
    return (
        <div className="noma-item-rules">
            <p id={id}>{long && !expanded ? preview : text}</p>
            {long && <button type="button" className="noma-item-rules__toggle"
                aria-expanded={expanded} aria-controls={id}
                aria-label={`${expanded ? 'Resumir reglas' : 'Ver reglas completas'} de ${name}`}
                onClick={() => setExpandedText(expanded ? null : text)}>
                {expanded ? 'Ver menos' : 'Ver reglas completas'}
            </button>}
        </div>
    );
};

export default ItemRulesText;
