import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper, {
  getInitialCropFromCroppedAreaPixels,
  getInitialCropFromCroppedAreaPercentages,
} from 'react-easy-crop';
import { FiCheck, FiCrosshair, FiImage, FiX } from 'react-icons/fi';
import PropTypes from 'prop-types';
import {
  ENEMY_HEADER_ASPECT,
  focusFromHeaderCrop,
  focusFromSuggestedCrop,
  focusWithinCrop,
  getLayoutAwareCrop,
  getPortraitCrop,
  normalizeCropPercentages,
  pointFromContainedImage,
} from './imageFraming';

const createImage = (source) => new Promise((resolve, reject) => {
  const image = new Image();
  image.addEventListener('load', () => resolve(image));
  image.addEventListener('error', reject);
  image.setAttribute('crossOrigin', 'anonymous');
  image.src = source;
});

const cropToWebp = async (source, area, outputWidth = 768, outputHeight = 768) => {
  const image = await createImage(source);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, outputWidth, outputHeight);
  return canvas.toDataURL('image/webp', 0.88);
};

const RogueliteAssetCropDialog = ({
  initialSource,
  initialCrop,
  title,
  variant,
  onCancel,
  onConfirm,
}) => {
  const inputRef = useRef(null);
  const focusViewportRef = useRef(null);
  const analysisRequestRef = useRef(0);
  const isEnemyHeader = variant === 'enemyHeader';
  const [source, setSource] = useState(initialSource || '');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState(null);
  const [areaPercentages, setAreaPercentages] = useState(null);
  const [mediaSize, setMediaSize] = useState(null);
  const [cropSize, setCropSize] = useState(null);
  const [naturalSize, setNaturalSize] = useState(null);
  const [pendingCrop, setPendingCrop] = useState(() => {
    const normalized = normalizeCropPercentages(initialCrop);
    return normalized ? { type: 'percentages', area: normalized } : null;
  });
  const [focusMode, setFocusMode] = useState(false);
  const [autoState, setAutoState] = useState('idle');
  const [busy, setBusy] = useState(false);
  const shouldAutoFrameRef = useRef(isEnemyHeader && !normalizeCropPercentages(initialCrop));

  const applyAutomaticFrame = useCallback(async (nextSource = source) => {
    if (!nextSource || !isEnemyHeader) return;
    const requestId = analysisRequestRef.current + 1;
    analysisRequestRef.current = requestId;
    setAutoState('working');
    try {
      const [image, smartcropModule] = await Promise.all([
        createImage(nextSource),
        import('smartcrop'),
      ]);
      const smartcrop = smartcropModule.default || smartcropModule;
      const result = await smartcrop.crop(image, {
        width: 1200,
        height: 600,
        minScale: 0.56,
        ruleOfThirds: true,
      });
      if (analysisRequestRef.current !== requestId) return;
      const size = { width: image.naturalWidth, height: image.naturalHeight };
      const suggestedFocus = focusFromSuggestedCrop(result.topCrop, size.width, size.height);
      const framedCrop = getLayoutAwareCrop({
        imageWidth: size.width,
        imageHeight: size.height,
        focus: suggestedFocus,
        suggestedCrop: result.topCrop,
      });
      setNaturalSize(size);
      setPendingCrop({ type: 'pixels', area: framedCrop });
      setFocusMode(false);
      setAutoState('ready');
    } catch (error) {
      if (analysisRequestRef.current !== requestId) return;
      console.warn('No se pudo aplicar el encuadre automático.', error);
      setAutoState('error');
    }
  }, [isEnemyHeader, source]);

  useEffect(() => {
    if (!source || !shouldAutoFrameRef.current) return;
    shouldAutoFrameRef.current = false;
    applyAutomaticFrame(source);
  }, [applyAutomaticFrame, source]);

  useEffect(() => {
    if (!pendingCrop || !mediaSize || !cropSize) return;
    const next = pendingCrop.type === 'percentages'
      ? getInitialCropFromCroppedAreaPercentages(pendingCrop.area, mediaSize, 0, cropSize, 1, 3)
      : getInitialCropFromCroppedAreaPixels(pendingCrop.area, mediaSize, 0, cropSize, 1, 3);
    setCrop(next.crop);
    setZoom(next.zoom);
    setPendingCrop(null);
  }, [cropSize, mediaSize, pendingCrop]);

  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Selecciona un archivo de imagen válido.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      analysisRequestRef.current += 1;
      setSource(reader.result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setArea(null);
      setAreaPercentages(null);
      setMediaSize(null);
      setCropSize(null);
      setNaturalSize(null);
      setPendingCrop(null);
      setFocusMode(false);
      setAutoState('idle');
      shouldAutoFrameRef.current = isEnemyHeader;
    };
    reader.readAsDataURL(file);
  };

  const chooseFocus = async (event) => {
    if (!focusViewportRef.current || !source) return;
    const image = naturalSize ? null : await createImage(source);
    const size = naturalSize || { width: image.naturalWidth, height: image.naturalHeight };
    const rect = focusViewportRef.current.getBoundingClientRect();
    const selectedFocus = pointFromContainedImage({
      pointX: event.clientX - rect.left,
      pointY: event.clientY - rect.top,
      containerWidth: rect.width,
      containerHeight: rect.height,
      imageWidth: size.width,
      imageHeight: size.height,
    });
    const framedCrop = getLayoutAwareCrop({
      imageWidth: size.width,
      imageHeight: size.height,
      focus: selectedFocus,
    });
    setNaturalSize(size);
    setPendingCrop({ type: 'pixels', area: framedCrop });
    setFocusMode(false);
    setAutoState('manual');
  };

  const confirm = async () => {
    if (!source || !area) return;
    try {
      setBusy(true);
      if (!isEnemyHeader) {
        const cropped = await cropToWebp(source, area);
        await onConfirm({ source, cropped });
        return;
      }
      const image = naturalSize ? null : await createImage(source);
      const size = naturalSize || { width: image.naturalWidth, height: image.naturalHeight };
      const effectiveFocus = focusFromHeaderCrop({
        crop: area,
        imageWidth: size.width,
        imageHeight: size.height,
      });
      const portraitCrop = getPortraitCrop({
        imageWidth: size.width,
        imageHeight: size.height,
        focus: effectiveFocus,
        headerCrop: area,
      });
      const [cropped, headerCropped] = await Promise.all([
        cropToWebp(source, portraitCrop, 768, 768),
        cropToWebp(source, area, 1536, 768),
      ]);
      await onConfirm({
        source,
        cropped,
        headerCropped,
        crop: areaPercentages,
        focus: effectiveFocus,
        headerFocus: focusWithinCrop({
          focus: effectiveFocus,
          crop: area,
          imageWidth: size.width,
          imageHeight: size.height,
        }),
      });
    } finally {
      setBusy(false);
    }
  };

  const dialog = (
    <div className="noma-rogue-dialog-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="noma-rogue-crop-dialog">
        <header>
          <div>
            <span>Archivo visual</span>
            <h3>{title}</h3>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cerrar editor de imagen"><FiX /></button>
        </header>

        <input ref={inputRef} type="file" accept="image/*" onChange={chooseFile} hidden />

        {source && isEnemyHeader && (
          <div className="noma-rogue-crop-dialog__assist">
            <div>
              <span>Composición asistida</span>
              <small>{autoState === 'working' ? 'Analizando imagen…' : autoState === 'error' ? 'Usa el foco manual' : 'El arte se adapta a la zona visible de la tarjeta'}</small>
            </div>
            <button type="button" disabled={autoState === 'working'} onClick={() => applyAutomaticFrame()}><FiCrosshair /> Encuadre automático</button>
            <button type="button" className={focusMode ? 'is-active' : ''} onClick={() => setFocusMode((current) => !current)}><FiCrosshair /> Marcar foco</button>
          </div>
        )}

        {source ? (
          focusMode ? (
            <button
              type="button"
              ref={focusViewportRef}
              className="noma-rogue-crop-dialog__focus-viewport"
              onClick={chooseFocus}
              aria-label="Marca el rostro o punto principal de la criatura"
            >
              <img src={source} alt="Imagen completa para elegir el punto de interés" />
              <span>Pulsa sobre el rostro o la silueta principal</span>
            </button>
          ) : (
            <div className={`noma-rogue-crop-dialog__viewport ${isEnemyHeader ? 'is-enemy-header' : ''}`}>
              <Cropper
                image={source}
                crop={crop}
                zoom={zoom}
                aspect={isEnemyHeader ? ENEMY_HEADER_ASPECT : 1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(percentages, pixels) => {
                  setArea(pixels);
                  setAreaPercentages(percentages);
                }}
                setMediaSize={(size) => {
                  setMediaSize(size);
                  setNaturalSize({ width: size.naturalWidth, height: size.naturalHeight });
                }}
                setCropSize={setCropSize}
                showGrid={!isEnemyHeader}
              />
              {isEnemyHeader && (
                <div className="noma-rogue-crop-dialog__card-preview" aria-hidden="true">
                  <div><FiCrosshair /><span>Enemigo</span></div>
                  <small>Zona reservada a información</small>
                  <i />
                </div>
              )}
            </div>
          )
        ) : (
          <button type="button" className="noma-rogue-crop-dialog__empty" onClick={() => inputRef.current?.click()}>
            <FiImage />
            <span>Seleccionar imagen</span>
          </button>
        )}

        {source && !focusMode && (
          <label className="noma-rogue-crop-dialog__zoom">
            <span>Encuadre</span>
            <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          </label>
        )}

        <footer>
          <button type="button" onClick={() => inputRef.current?.click()}><FiImage /> Cambiar archivo</button>
          <button type="button" disabled={!source || !area || busy || focusMode} onClick={confirm}><FiCheck /> {busy ? 'Guardando…' : 'Aplicar encuadre'}</button>
        </footer>
      </div>
    </div>
  );

  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
};

RogueliteAssetCropDialog.propTypes = {
  initialSource: PropTypes.string,
  initialCrop: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number, width: PropTypes.number, height: PropTypes.number }),
  title: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['square', 'enemyHeader']),
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

RogueliteAssetCropDialog.defaultProps = {
  initialSource: '',
  initialCrop: null,
  variant: 'square',
};

export default RogueliteAssetCropDialog;
