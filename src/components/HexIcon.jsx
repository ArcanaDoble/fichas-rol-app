import React from 'react';
import PropTypes from 'prop-types';

const HexIcon = ({ children, className, size = 'md', active = false, locked = false, onClick }) => {
    const sizeClasses = {
        sm: 'w-12 h-12',
        md: 'w-16 h-16',
        lg: 'w-24 h-24'
    };

    // Hexagon styling logic
    const baseClasses = "relative flex items-center justify-center hex-mask transition-all duration-300 cursor-pointer hover:scale-105";

    const activeStyle = active
        ? 'bg-gradient-to-br from-[#c8aa6e] to-[#785a28] shadow-[0_0_15px_rgba(200,170,110,0.5)]'
        : 'bg-[#1e293b]';

    const innerBg = active
        ? 'bg-[#161f32]' // Inner dark background
        : 'bg-[#0f172a]';

    return (
        <div
            onClick={onClick}
            className={`${baseClasses} ${sizeClasses[size]} ${activeStyle} ${locked ? 'opacity-50 grayscale' : ''} ${className}`}
        >
            {/* Inner Hexagon (Content Container) */}
            <div className={`w-full h-full hex-mask ${innerBg} flex items-center justify-center p-[2px]`}>
                <div className="w-full h-full hex-mask flex items-center justify-center overflow-hidden relative">
                    {/* Inner Shadow for depth */}
                    <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] pointer-events-none z-10"></div>

                    <div className="z-0 text-slate-200 flex flex-col items-center justify-center text-center w-full h-full">
                        {locked ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        ) : children}
                    </div>
                </div>
            </div>
        </div>
    );
};

HexIcon.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    active: PropTypes.bool,
    locked: PropTypes.bool,
    onClick: PropTypes.func
};

export default HexIcon;
