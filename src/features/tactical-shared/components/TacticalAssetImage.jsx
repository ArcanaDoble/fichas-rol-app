import React, { useEffect, useRef, useState } from 'react';
import { RotateCw, Sparkles } from 'lucide-react';
import { getCustomImage } from '../../../hooks/useCustomEquipmentImages';
import { isImageUrlLoaded, markImageUrlLoaded } from '../../../utils/imageLoadCache';

export const getObjectImage = (item, customImages) => {
    if (!item) return null;
    if (item.icon && (item.icon.startsWith('data:') || item.icon.startsWith('http'))) return item.icon;

    // Check custom uploaded images from Gestor de Equipamiento first
    if (customImages && typeof getCustomImage === 'function') {
        const custom = getCustomImage(item, customImages);
        if (custom) return custom;
    }

    const name = (item.name || item.nombre || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const category = (item.category || '').toLowerCase();
    const target = `${name} ${type} ${category}`;

    // Weapons
    if (name.includes('llave inglesa')) return '/armas/llave_inglesa.webp';
    if (name.includes('gancho de alcantarilla')) return '/armas/gancho_de_alcantarilla.webp';
    if (target.includes('antorcha')) return '/armas/antorcha.webp';
    if (name.includes('porra de jade')) return '/armas/Porra de jade.webp';
    if (name.includes('mazo glacial')) return '/armas/mazo_glacial.webp';
    if (name.includes('cuchillo')) return '/armas/cuchillo.webp';
    if (name.includes('tuberia') || name.includes('tubería')) return '/armas/tuberia.webp';
    if (name.includes('revolver') || name.includes('revólver')) return '/armas/revolver.webp';
    if (name.includes('pistola')) return '/armas/pistola.webp';
    if (name.includes('rifle')) return '/armas/rifle.webp';
    if (name.includes('escopeta')) return '/armas/escopeta.webp';
    if (name.includes('granarco')) return '/armas/arco_largo.webp';
    if (name.includes('arco')) return '/armas/arco_corto.webp';
    if (name.includes('gran clava') || name.includes('granclava')) return '/armas/gran_clava.webp';
    if (name.includes('clava')) return '/armas/clava.webp';
    if (name.includes('jabalina')) return '/armas/jabalina.webp';
    if (name.includes('lanza')) return '/armas/lanza.webp';
    if (name.includes('daga')) return '/armas/daga.webp';
    if (name.includes('hacha de mano')) return '/armas/hacha_de_mano.webp';
    if (name.includes('honda')) return '/armas/honda.webp';
    if (name.includes('tirachinas')) return '/armas/tirachinas.webp';
    if (name.includes('estoque')) return '/armas/estoque.webp';
    if (name.includes('ballesta pesada') || name.includes('granballesta')) return '/armas/ballesta_pesada.webp';
    if (name.includes('ultraballesta')) return '/armas/ultraballesta.webp';
    if (name.includes('ballesta de mano')) return '/armas/ballesta_de_mano.webp';
    if (name.includes('ballesta')) return '/armas/ballesta_ligera.webp';
    if (name.includes('martillo de mano')) return '/armas/martillo_de_mano.webp';
    if (name.includes('martillo de guerra')) return '/armas/martillo_de_guerra.webp';
    if (name.includes('gran martillo')) return '/armas/gran_martillo.webp';
    if (name.includes('ultramartillo')) return '/armas/ultramartillo.webp';
    if (name.includes('espada bastarda')) return '/armas/espada_bastarda.webp';
    if (name.includes('espada larga')) return '/armas/espada_larga.webp';
    if (name.includes('espada corta')) return '/armas/espada_corta.webp';
    if (name.includes('mandoble')) return '/armas/mandoble.webp';
    if (name.includes('cimitarra')) return '/armas/cimitarra.webp';
    if (name.includes('espada')) return '/armas/espada_de_acero.webp';
    if (name.includes('fauces')) return '/armas/fauces.webp';
    if (name.includes('garras')) return '/armas/garras.webp';
    // Objects
    if (target.includes('chatarra')) return '/objetos/chatarra.webp';
    if (target.includes('comida')) return '/objetos/comida.webp';
    if (target.includes('remedio') || target.includes('vendaje')) return '/objetos/vendaje.webp';
    if (target.includes('dinero') || target.includes('moneda')) return '/objetos/dinero.webp';
    if (target.includes('elixir') || target.includes('poción') || target.includes('pocion')) return '/objetos/elixir.webp';
    if (target.includes('libro')) return '/objetos/libro.webp';
    if (target.includes('llave')) return '/objetos/llave.webp';
    if (target.includes('municion') || target.includes('munición')) return '/objetos/municion.webp';
    if (target.includes('pergamino')) return '/objetos/pergamino.webp';
    if (target.includes('polvora') || target.includes('pólvora')) return '/objetos/polvora.webp';
    if (target.includes('coctel molotov') || target.includes('cóctel molotov')) return '/objetos/coctel_molotov.webp';
    if (target.includes('herramientas') || target.includes('herramienta')) return '/objetos/herramientas.webp';
    if (target.includes('recurso')) return '/objetos/recurso.webp';
    if (target.includes('accesorio')) return '/objetos/accesorio.webp';
    if (target.includes('arma') && !target.includes('armadura')) return '/objetos/arma.webp';
    // Armor
    if (target.includes('ultraarmadura de hierro')) return '/armaduras/armadura_de_coloso.webp';
    if (target.includes('armadura de placas')) return '/armaduras/armadura_de_placas.webp';
    if (target.includes('armadura de hierro')) return '/armaduras/armadura_de_hierro.webp';
    if (target.includes('armadura de acero reforzado')) return '/armaduras/armadura_de_acero_reforzado.webp';
    if (target.includes('armadura de acero')) return '/armaduras/armadura_de_acero.webp';
    if (target.includes('armadura de coloso')) return '/armaduras/armadura_de_coloso.webp';
    if (target.includes('armadura de escamas')) return '/armaduras/armadura_de_escamas.webp';
    if (target.includes('armadura bandeada')) return '/armaduras/armadura bandeada.webp';
    if (target.includes('armadura acolchada')) return '/armaduras/armadura_acolchada.webp';
    if (target.includes('armadura de piel') || target.includes('armadura de pieles')) return '/armaduras/armadura_de_piel.webp';
    if (target.includes('armadura de cuero tachonado')) return '/armaduras/armadura_de_cuero_tachonado.webp';
    if (target.includes('armadura de cuero')) return '/armaduras/armadura_de_cuero.webp';
    if (target.includes('camisote de mallas')) return '/armaduras/cota_de_malla.webp';
    if (target.includes('armadura')) return '/objetos/armadura.webp';
    // Accessories
    if (name.includes('casco de minero')) return '/accesorios/casco_de_minero.webp';
    if (name.includes('guante blanco')) return '/accesorios/guante_blanco.webp';
    return null;
};

// Legacy tactical image primitives. Mode-specific presentation should wrap these.
export const CanvasAssetImage = ({
    src,
    label = '',
    imageClassName = '',
    imageStyle = undefined,
    overlayClassName = '',
    loadingClassName = 'absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0b1120]/95 via-black/70 to-[#161f32]/90',
    loadingRingClassName = 'absolute inset-[-7px] rounded-full border border-[#c8aa6e]/15 animate-pulse',
    loadingIconClassName = 'w-4 h-4 text-[#c8aa6e]/80 animate-spin drop-shadow-[0_0_8px_rgba(200,170,110,0.35)]',
    loadingTimeoutMs = 15000,
    fallback = null,
    suppressNativeCallout = false,
}) => {
    const [status, setStatus] = useState(src ? (isImageUrlLoaded(src) ? 'loaded' : 'loading') : 'idle');
    const imgRef = useRef(null);

    useEffect(() => {
        if (!src) {
            setStatus('idle');
            return undefined;
        }

        let isCurrent = true;
        if (isImageUrlLoaded(src)) {
            setStatus('loaded');
            return () => {
                isCurrent = false;
            };
        }

        setStatus('loading');

        const syncSettledImage = () => {
            const image = imgRef.current;
            if (!isCurrent || !image || !image.complete) return false;

            const nextStatus = image.naturalWidth > 0 ? 'loaded' : 'error';
            if (nextStatus === 'loaded') markImageUrlLoaded(src);
            setStatus(nextStatus);
            return true;
        };

        const settleTimer = window.setTimeout(syncSettledImage, 0);
        const timeoutTimer = window.setTimeout(() => {
            if (syncSettledImage()) return;
            if (isCurrent) setStatus('error');
        }, Math.max(1000, Number(loadingTimeoutMs) || 15000));

        return () => {
            isCurrent = false;
            window.clearTimeout(settleTimer);
            window.clearTimeout(timeoutTimer);
        };
    }, [loadingTimeoutMs, src]);

    if (!src) return fallback;

    const showFallback = status === 'error' && fallback;

    return (
        <>
            <img
                ref={imgRef}
                src={src}
                alt=""
                aria-label={label || undefined}
                draggable={false}
                onContextMenu={suppressNativeCallout ? (event) => event.preventDefault() : undefined}
                onLoad={(event) => {
                    const nextStatus = event.currentTarget.naturalWidth > 0 ? 'loaded' : 'error';
                    if (nextStatus === 'loaded') markImageUrlLoaded(src);
                    setStatus(nextStatus);
                }}
                onError={() => setStatus('error')}
                className={`${imageClassName} transition-opacity duration-500 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
                style={{
                    ...imageStyle,
                    ...(suppressNativeCallout ? {
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                    } : {})
                }}
            />
            {overlayClassName && !showFallback && (
                <div className={`${overlayClassName} transition-opacity duration-500 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`} />
            )}
            {status === 'loading' && (
                <div className={loadingClassName}>
                    <div className="relative flex items-center justify-center">
                        {loadingRingClassName && <div className={loadingRingClassName} />}
                        <RotateCw className={loadingIconClassName} />
                    </div>
                </div>
            )}
            {showFallback && (
                <div className="absolute inset-0">
                    {fallback}
                </div>
            )}
        </>
    );
};

export const TokenImageWithLoader = ({
    src,
    label = '',
    className = '',
    imageClassName = 'w-full h-full object-contain',
    imageStyle = undefined,
    fallbackIcon: FallbackIcon = Sparkles,
}) => (
    <div className={`relative overflow-hidden ${className}`}>
        <CanvasAssetImage
            src={src}
            label={label}
            imageClassName={imageClassName}
            imageStyle={imageStyle}
            loadingClassName="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none"
            loadingRingClassName=""
            loadingIconClassName="w-3.5 h-3.5 text-[#c8aa6e]/70 animate-spin drop-shadow-[0_0_6px_rgba(200,170,110,0.28)]"
            fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                    <FallbackIcon className="w-1/2 h-1/2 max-w-10 max-h-10 text-[#c8aa6e]/70 drop-shadow-[0_0_12px_rgba(200,170,110,0.3)]" />
                </div>
            }
        />
    </div>
);

export const CardImageWithLoader = ({
    src,
    label = 'Carta',
    className = 'absolute inset-0 w-full h-full',
    imageClassName = 'w-full h-full object-cover',
}) => (
    <div
        className={`relative overflow-hidden bg-[#111827] ${className}`}
        onContextMenu={(event) => event.preventDefault()}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
        <CanvasAssetImage
            src={src}
            label={label}
            imageClassName={imageClassName}
            suppressNativeCallout
            loadingClassName="absolute inset-0 flex items-center justify-center bg-[#0b1120]/90 backdrop-blur-sm pointer-events-none"
            loadingRingClassName="hidden"
            loadingIconClassName="w-5 h-5 text-[#c8aa6e]/60 animate-spin drop-shadow-md"
            fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-[#0b1120]/90 backdrop-blur-sm">
                    <div className="h-2/3 w-2/3 rounded border border-[#c8aa6e]/10 bg-black/40 shadow-inner" />
                </div>
            }
        />
    </div>
);
