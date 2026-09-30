/** Match non-circular TokenImageWithLoader's object-contain, using its cached alpha. */
export const getTokenSilhouetteStyle = (source, isCircular = true) => {
    if (isCircular || !source) return {};
    const mask = `url(${JSON.stringify(source)})`;
    return {
        maskImage: mask, WebkitMaskImage: mask,
        maskSize: 'contain', WebkitMaskSize: 'contain',
        maskPosition: 'center', WebkitMaskPosition: 'center',
        maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
        maskMode: 'alpha',
    };
};
