export const ENEMY_HEADER_ASPECT = 2;
export const ENEMY_HEADER_FOCUS = { x: 0.68, y: 0.38 };

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const normalizeAxis = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return clamp(numeric > 1 ? numeric / 100 : numeric, 0, 1);
};

export const normalizeImageFocus = (value, fallback = ENEMY_HEADER_FOCUS) => ({
  x: normalizeAxis(value?.x, fallback.x),
  y: normalizeAxis(value?.y, fallback.y),
});

export const normalizeCropPercentages = (value) => {
  const x = Number(value?.x);
  const y = Number(value?.y);
  const width = Number(value?.width);
  const height = Number(value?.height);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
    width: clamp(width, 0.01, 100),
    height: clamp(height, 0.01, 100),
  };
};

export const focusFromSuggestedCrop = (crop, imageWidth, imageHeight) => normalizeImageFocus({
  x: (Number(crop?.x || 0) + Number(crop?.width || imageWidth) / 2) / imageWidth,
  y: (Number(crop?.y || 0) + Number(crop?.height || imageHeight) / 2) / imageHeight,
});

export const getLayoutAwareCrop = ({
  imageWidth,
  imageHeight,
  focus,
  suggestedCrop,
  aspect = ENEMY_HEADER_ASPECT,
  target = ENEMY_HEADER_FOCUS,
}) => {
  const width = Math.max(1, Number(imageWidth) || 1);
  const height = Math.max(1, Number(imageHeight) || 1);
  const normalizedFocus = normalizeImageFocus(focus);
  const normalizedTarget = normalizeImageFocus(target);
  const focusX = normalizedFocus.x * width;
  const focusY = normalizedFocus.y * height;
  const maximumWidth = Math.min(width, height * aspect);
  const minimumWidth = maximumWidth * 0.56;
  let cropWidth = clamp(Number(suggestedCrop?.width) || maximumWidth, minimumWidth, maximumWidth);

  const desiredLeft = focusX - normalizedTarget.x * cropWidth;
  const achievedX = (focusX - clamp(desiredLeft, 0, width - cropWidth)) / cropWidth;
  if (Math.abs(achievedX - normalizedTarget.x) > 0.12) {
    const edgeLimitedWidth = achievedX < normalizedTarget.x
      ? focusX / Math.max(0.01, normalizedTarget.x - 0.04)
      : (width - focusX) / Math.max(0.01, 1 - normalizedTarget.x - 0.04);
    cropWidth = clamp(edgeLimitedWidth, minimumWidth, cropWidth);
  }

  let cropHeight = cropWidth / aspect;
  if (cropHeight > height) {
    cropHeight = height;
    cropWidth = cropHeight * aspect;
  }

  return {
    x: Math.round(clamp(focusX - normalizedTarget.x * cropWidth, 0, width - cropWidth)),
    y: Math.round(clamp(focusY - normalizedTarget.y * cropHeight, 0, height - cropHeight)),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
};

export const getPortraitCrop = ({ imageWidth, imageHeight, focus, headerCrop }) => {
  const width = Math.max(1, Number(imageWidth) || 1);
  const height = Math.max(1, Number(imageHeight) || 1);
  const normalizedFocus = normalizeImageFocus(focus, { x: 0.5, y: 0.42 });
  const focusX = normalizedFocus.x * width;
  const focusY = normalizedFocus.y * height;
  const preferredSize = Number(headerCrop?.height) > 0
    ? Number(headerCrop.height) * 1.34
    : Math.min(width, height) * 0.7;
  const size = Math.round(clamp(preferredSize, Math.min(width, height) * 0.48, Math.min(width, height)));
  return {
    x: Math.round(clamp(focusX - size / 2, 0, width - size)),
    y: Math.round(clamp(focusY - size * 0.42, 0, height - size)),
    width: size,
    height: size,
  };
};

export const focusFromHeaderCrop = ({ crop, imageWidth, imageHeight, target = ENEMY_HEADER_FOCUS }) => {
  const normalizedTarget = normalizeImageFocus(target);
  return normalizeImageFocus({
    x: (crop.x + crop.width * normalizedTarget.x) / imageWidth,
    y: (crop.y + crop.height * normalizedTarget.y) / imageHeight,
  });
};

export const focusWithinCrop = ({ focus, crop, imageWidth, imageHeight }) => {
  const normalizedFocus = normalizeImageFocus(focus);
  const focusX = normalizedFocus.x * imageWidth;
  const focusY = normalizedFocus.y * imageHeight;
  return normalizeImageFocus({
    x: (focusX - crop.x) / crop.width,
    y: (focusY - crop.y) / crop.height,
  });
};

export const pointFromContainedImage = ({
  pointX,
  pointY,
  containerWidth,
  containerHeight,
  imageWidth,
  imageHeight,
}) => {
  const containerAspect = containerWidth / containerHeight;
  const imageAspect = imageWidth / imageHeight;
  const renderedWidth = imageAspect > containerAspect ? containerWidth : containerHeight * imageAspect;
  const renderedHeight = imageAspect > containerAspect ? containerWidth / imageAspect : containerHeight;
  const offsetX = (containerWidth - renderedWidth) / 2;
  const offsetY = (containerHeight - renderedHeight) / 2;
  return normalizeImageFocus({
    x: (pointX - offsetX) / renderedWidth,
    y: (pointY - offsetY) / renderedHeight,
  });
};
