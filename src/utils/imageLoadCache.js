const getLoadedImageUrlCache = () => {
    if (!globalThis.__fichasRolLoadedImageUrls) {
        globalThis.__fichasRolLoadedImageUrls = new globalThis.Set();
    }
    return globalThis.__fichasRolLoadedImageUrls;
};

export const isImageUrlLoaded = (src) => Boolean(src && getLoadedImageUrlCache().has(src));

export const markImageUrlLoaded = (src) => {
    if (src) getLoadedImageUrlCache().add(src);
};
