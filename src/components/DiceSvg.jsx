import React from 'react';

const DiceSvg = ({ faces, value, className = "", style = {}, title }) => {
    let paths = null;
    let textY = "55"; // middle

    // Normalize faces to number; default to 20 if undefined
    const f = Number(faces) || 20;

    // Extraemos properties visuales clave para inyectarlas estructuralmente
    const { backgroundColor, borderColor, color, boxShadow, ...restStyle } = style || {};

    const fillProperty = backgroundColor || "transparent";

    switch (f) {
        case 4:
            // Tetrahedron (triangle pointing up)
            paths = (
                <>
                    <polygon points="50,10 90,85 10,85" fill={fillProperty} stroke="currentColor" strokeWidth="4" />
                    <polyline points="50,10 50,85" stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
                </>
            );
            textY = "65"; // shift text down a bit because of triangle
            break;
        case 6:
            // Cube (Square)
            paths = (
                <rect x="15" y="15" width="70" height="70" rx="10" fill={fillProperty} stroke="currentColor" strokeWidth="4" />
            );
            textY = "55";
            break;
        case 8:
            // Octahedron (Diamond)
            paths = (
                <>
                    <polygon points="50,5 95,50 50,95 5,50" fill={fillProperty} stroke="currentColor" strokeWidth="4" />
                    <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.4" />
                    <polyline points="50,5 50,95" stroke="currentColor" strokeWidth="2" opacity="0.4" />
                </>
            );
            textY = "57";
            break;
        case 10:
        case 100:
            // Pentagonal Trapezohedron (Kite)
            paths = (
                <>
                    <polygon points="50,5 90,40 50,95 10,40" fill={fillProperty} stroke="currentColor" strokeWidth="4" />
                    <polyline points="10,40 90,40" stroke="currentColor" strokeWidth="2" opacity="0.4" />
                    <polyline points="50,5 50,95" stroke="currentColor" strokeWidth="2" opacity="0.4" />
                </>
            );
            textY = "57";
            break;
        case 12:
            // Dodecahedron (Pentagon)
            paths = (
                <>
                    <polygon points="50,5 95,35 75,90 25,90 5,35" fill={fillProperty} stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
                    <polygon points="50,25 75,45 65,75 35,75 25,45" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeLinejoin="round" />
                    <polyline points="50,5 50,25" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                    <polyline points="95,35 75,45" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                    <polyline points="75,90 65,75" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                    <polyline points="25,90 35,75" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                    <polyline points="5,35 25,45" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                </>
            );
            textY = "57";
            break;
        case 20:
        default:
            // Icosahedron (Hexagon with internal triangles)
            paths = (
                <>
                    <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill={fillProperty} stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
                    <polygon points="50,20 80,75 20,75" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeLinejoin="round" />
                    <polyline points="50,5 50,20" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                    <polyline points="10,25 50,20" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                    <polyline points="90,25 50,20" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                    <polyline points="10,75 20,75" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                    <polyline points="90,75 80,75" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                    <polyline points="50,95 80,75" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                    <polyline points="50,95 20,75" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                </>
            );
            textY = "55";
            break;
    }

    return (
        <div
            className={`relative flex items-center justify-center transition-all ${className}`}
            style={{ color: borderColor || color, filter: boxShadow && boxShadow !== 'none' ? `drop-shadow(0 0 4px ${borderColor || color})` : 'none', ...restStyle }}
            title={title}
        >
            <svg viewBox="0 0 100 100" className="w-full h-full relative z-10" overflow="visible">
                {paths}
                <text
                    x="50"
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="currentColor"
                    fontSize={f === 4 ? "36" : "42"}
                    fontWeight="bold"
                    fontFamily="sans-serif"
                >
                    {value}
                </text>
            </svg>
        </div>
    );
};

export default DiceSvg;
