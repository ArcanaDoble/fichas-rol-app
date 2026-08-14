import {
  focusFromHeaderCrop,
  getLayoutAwareCrop,
  getPortraitCrop,
  normalizeCropPercentages,
  normalizeImageFocus,
  pointFromContainedImage,
} from '../imageFraming';

describe('encuadre asistido del bestiario Roguelite', () => {
  test('desplaza hacia la zona visible un sujeto situado cerca del borde izquierdo', () => {
    const crop = getLayoutAwareCrop({
      imageWidth: 1200,
      imageHeight: 1200,
      focus: { x: 0.32, y: 0.34 },
      suggestedCrop: { x: 0, y: 0, width: 1200, height: 600 },
    });
    const subjectPosition = (1200 * 0.32 - crop.x) / crop.width;

    expect(crop.width).toBeLessThan(1200);
    expect(crop.width / crop.height).toBeCloseTo(2, 1);
    expect(subjectPosition).toBeGreaterThan(0.5);
  });

  test('conserva un encuadre amplio cuando el sujeto ya ocupa la zona derecha correcta', () => {
    const crop = getLayoutAwareCrop({
      imageWidth: 1200,
      imageHeight: 1200,
      focus: { x: 0.69, y: 0.3 },
      suggestedCrop: { x: 0, y: 200, width: 1200, height: 600 },
    });

    expect(crop.width).toBe(1200);
    expect(crop.x).toBe(0);
  });

  test('deriva un retrato cuadrado centrado en el foco sin salirse de la imagen', () => {
    const portrait = getPortraitCrop({
      imageWidth: 1000,
      imageHeight: 1000,
      focus: { x: 0.08, y: 0.2 },
      headerCrop: { x: 0, y: 0, width: 600, height: 300 },
    });

    expect(portrait.width).toBe(portrait.height);
    expect(portrait.x).toBe(0);
    expect(portrait.y).toBeGreaterThanOrEqual(0);
  });

  test('traduce correctamente un toque sobre una imagen contenida con márgenes laterales', () => {
    expect(pointFromContainedImage({
      pointX: 300,
      pointY: 200,
      containerWidth: 600,
      containerHeight: 400,
      imageWidth: 400,
      imageHeight: 400,
    })).toEqual({ x: 0.5, y: 0.5 });
  });

  test('normaliza datos persistidos y recupera el foco efectivo del recorte', () => {
    expect(normalizeImageFocus({ x: 68, y: 38 })).toEqual({ x: 0.68, y: 0.38 });
    expect(normalizeCropPercentages({ x: 10, y: 20, width: 70, height: 35 }))
      .toEqual({ x: 10, y: 20, width: 70, height: 35 });
    expect(focusFromHeaderCrop({
      crop: { x: 100, y: 200, width: 600, height: 300 },
      imageWidth: 1000,
      imageHeight: 1000,
    })).toEqual({ x: 0.508, y: 0.314 });
  });

});
