import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * FoilCard Component
 * Implements interactive MTG-style foil effects.
 * @param {string} foilType - traditional, etched, textured, gilded, oilslick, galaxy, surge, neon, phoenix
 * @param {boolean} active - whether the foil effect is enabled
 */
const FoilCard = ({ children, foilType, active = true, className = "", ...props }) => {
    const containerRef = useRef(null);
    const [style, setStyle] = useState({});
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e) => {
        if (!active || !containerRef.current || !foilType || foilType === 'none') return;
        if (!isHovered) setIsHovered(true);

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Perspective calculation (subtle tilt)
        const rotateX = (y - 50) / 10;
        const rotateY = (x - 50) / -10;

        setStyle({
            '--mouse-x': `${x}%`,
            '--mouse-y': `${y}%`,
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        });
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setStyle((prev) => ({
            ...prev,
            transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
        }));
    };

    const isFoil = active && foilType && foilType !== 'none';

    // Foil types that already have their own light/shine effect built into the CSS
    // and don't need the additional glint overlay
    const foilsWithBuiltInShine = ['traditional', 'mithril', 'textured', 'phoenix', 'oil', 'surge', 'golden', 'flux'];
    const showGlint = isFoil && !foilsWithBuiltInShine.includes(foilType);

    return (
        <div
            ref={containerRef}
            className={`${isFoil ? 'foil-container' : ''} ${className} ${isHovered ? 'is-hovered' : ''}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ ...props.style, ...style }}
            {...props}
        >
            {isFoil && <div className={`foil-layer foil-${foilType}`} />}
            {isFoil && foilType === 'oil' && <div className="foil-oil-glare" />}
            {isFoil && foilType === 'flux' && <div className="foil-flux-glare" />}
            {showGlint && <div className="foil-glint" />}
            <div className="relative z-10 h-full w-full">
                {children}
            </div>
        </div>
    );
};

FoilCard.propTypes = {
    children: PropTypes.node,
    foilType: PropTypes.string,
    active: PropTypes.bool,
    className: PropTypes.string,
};

export default FoilCard;


