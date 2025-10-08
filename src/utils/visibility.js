/**
 * Utilidades para cálculo de visibilidad y iluminación
 * Implementa algoritmos de ray casting para determinar áreas visibles
 */

/**
 * Calcula la intersección entre un rayo y un segmento de línea
 * @param {Object} ray - Rayo con origen y dirección
 * @param {Object} segment - Segmento con puntos inicial y final
 * @returns {Object|null} Punto de intersección o null si no hay intersección
 */
function raySegmentIntersection(ray, segment) {
  const { origin, direction } = ray;
  const { start, end } = segment;
  
  const dx1 = direction.x;
  const dy1 = direction.y;
  const dx2 = end.x - start.x;
  const dy2 = end.y - start.y;
  const dx3 = origin.x - start.x;
  const dy3 = origin.y - start.y;
  
  const denominator = dx1 * dy2 - dy1 * dx2;
  
  // Usar epsilon más estricto para mejor precisión
  const EPSILON = 1e-12;
  
  // Líneas paralelas
  if (Math.abs(denominator) < EPSILON) {
    return null;
  }
  
  const t1 = (dx2 * dy3 - dy2 * dx3) / denominator;
  const t2 = (dx1 * dy3 - dy1 * dx3) / denominator;
  
  // Usar tolerancia más estricta para evitar errores de precisión
  const TOLERANCE = 1e-10;
  
  // Verificar que la intersección esté en el rayo (t1 >= 0) y en el segmento (0 <= t2 <= 1)
  if (t1 >= TOLERANCE && t2 >= -TOLERANCE && t2 <= 1 + TOLERANCE) {
    return {
      x: origin.x + t1 * dx1,
      y: origin.y + t1 * dy1,
      distance: t1
    };
  }
  
  return null;
}

/**
 * Convierte un muro en segmentos de línea para el cálculo de visibilidad
 * @param {Object} wall - Muro con coordenadas y puntos
 * @returns {Array} Array de segmentos
 */
function wallToSegments(wall) {
  // Solo considerar muros cerrados y secretos como obstáculos para la luz
  // Las puertas abiertas no bloquean la luz
  if (wall.door === 'open') {
    return [];
  }
  
  const [x1, y1, x2, y2] = wall.points;
  const startX = wall.x + x1;
  const startY = wall.y + y1;
  const endX = wall.x + x2;
  const endY = wall.y + y2;
  
  // Asegurar que el segmento tenga longitud mínima para evitar problemas de precisión
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length < 1) {
    return []; // Ignorar muros muy pequeños
  }
  
  // Extender ligeramente el muro en ambas direcciones para evitar huecos
  // Calculamos la dirección normalizada
  const dirX = dx / length;
  const dirY = dy / length;
  
  // Extendemos 2 unidades en cada extremo
  const extensionLength = 2;
  const extendedStartX = startX - dirX * extensionLength;
  const extendedStartY = startY - dirY * extensionLength;
  const extendedEndX = endX + dirX * extensionLength;
  const extendedEndY = endY + dirY * extensionLength;
  
  return [{
    start: { x: extendedStartX, y: extendedStartY },
    end: { x: extendedEndX, y: extendedEndY }
  }];
}

/**
 * Convierte un array de muros en segmentos utilizables por el algoritmo de visibilidad
 * @param {Array} walls
 * @returns {Array}
 */
export function createVisibilitySegments(walls = []) {
  const segments = [];
  walls.forEach(wall => {
    const wallSegments = wallToSegments(wall);
    if (wallSegments.length > 0) {
      segments.push(...wallSegments);
    }
  });
  return segments;
}

function computeVisibilityFromSegments(
  origin,
  segments,
  { rays = 720, maxDistance = 500 } = {}
) {
  const effectiveSegments = Array.isArray(segments) ? segments : [];

  // Si no hay muros, devolver un círculo completo
  if (effectiveSegments.length === 0) {
    const points = [];
    const angleStep = (2 * Math.PI) / 64; // Más puntos para círculo suave
    for (let i = 0; i < 64; i++) {
      const angle = i * angleStep;
      points.push({
        x: origin.x + Math.cos(angle) * maxDistance,
        y: origin.y + Math.sin(angle) * maxDistance,
        angle: angle
      });
    }
    return points;
  }
  
  // Recopilar todos los puntos críticos (esquinas de muros)
  const criticalPoints = new Set();
  
  effectiveSegments.forEach(segment => {
    [segment.start, segment.end].forEach(point => {
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Solo considerar puntos dentro del rango de luz
      if (distance > 0.1 && distance <= maxDistance) {
        const angle = Math.atan2(dy, dx);
        
        // Agregar múltiples rayos alrededor de cada esquina para capturar correctamente los bordes
        const offsets = [-0.01, -0.005, -0.001, 0, 0.001, 0.005, 0.01];
        offsets.forEach(offset => {
          criticalPoints.add(angle + offset);
        });
      }
    });
  });
  
  // Generar ángulos base uniformemente distribuidos
  const baseAngles = [];
  const angleStep = (2 * Math.PI) / rays;
  for (let i = 0; i < rays; i++) {
    baseAngles.push(i * angleStep);
  }
  
  // Combinar ángulos base con puntos críticos
  const allAngles = [...baseAngles, ...Array.from(criticalPoints)];
  
  // Normalizar ángulos al rango [0, 2π) para evitar problemas de ordenamiento
  const normalizedAngles = allAngles.map(angle => {
    let normalized = angle % (2 * Math.PI);
    if (normalized < 0) normalized += 2 * Math.PI;
    return normalized;
  });
  
  // Eliminar duplicados con mayor precisión y ordenar
  const uniqueAngles = [...new Set(normalizedAngles.map(a => Math.round(a * 1000000) / 1000000))];
  uniqueAngles.sort((a, b) => a - b);
  
  // Calcular intersecciones para cada rayo
  const intersections = [];
  
  uniqueAngles.forEach(angle => {
    const direction = {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };
    
    const ray = { origin, direction };
    let closestIntersection = null;
    let minDistance = maxDistance;
    
    // Encontrar la intersección más cercana con mayor precisión
    effectiveSegments.forEach(segment => {
      const intersection = raySegmentIntersection(ray, segment);
      if (intersection && intersection.distance > 0.01 && intersection.distance < minDistance) {
        minDistance = intersection.distance;
        closestIntersection = {
          x: intersection.x,
          y: intersection.y,
          angle: angle,
          distance: intersection.distance
        };
      }
    });
    
    // Si no hay intersección, usar el punto máximo
    if (!closestIntersection) {
      closestIntersection = {
        x: origin.x + direction.x * maxDistance,
        y: origin.y + direction.y * maxDistance,
        angle: angle,
        distance: maxDistance
      };
    }
    
    intersections.push(closestIntersection);
  });
  
  // Ordenar por ángulo para crear polígono correcto
  intersections.sort((a, b) => a.angle - b.angle);
  
  // Filtrar puntos muy cercanos para evitar artefactos, pero sin suavizado agresivo
  const filteredIntersections = [];
  const MIN_ANGLE_DIFF = 0.001; // Diferencia mínima de ángulo para considerar puntos separados
  
  for (let i = 0; i < intersections.length; i++) {
    const current = intersections[i];
    const lastAdded = filteredIntersections[filteredIntersections.length - 1];
    
    // Solo agregar si es suficientemente diferente del último punto agregado
    if (!lastAdded || 
        Math.abs(current.angle - lastAdded.angle) > MIN_ANGLE_DIFF ||
        Math.abs(current.distance - lastAdded.distance) > 1) {
      filteredIntersections.push({
        x: current.x,
        y: current.y,
        angle: current.angle
      });
    }
  }
  
  // Asegurar que tenemos suficientes puntos para formar un polígono válido
  if (filteredIntersections.length < 3) {
    // Fallback: crear un círculo simple
    const fallbackPoints = [];
    const angleStep = (2 * Math.PI) / 32;
    for (let i = 0; i < 32; i++) {
      const angle = i * angleStep;
      fallbackPoints.push({
        x: origin.x + Math.cos(angle) * maxDistance,
        y: origin.y + Math.sin(angle) * maxDistance,
        angle: angle
      });
    }
    return fallbackPoints;
  }
  
  return filteredIntersections;
}

/**
 * Calcula el polígono de visibilidad desde un punto de origen
 * @param {Object} origin - Punto de origen {x, y}
 * @param {Array} wallsOrSegments - Array de muros o segmentos precomputados
 * @param {Object} options - Opciones de configuración
 * @returns {Array} Array de puntos que forman el polígono visible
 */
export function computeVisibility(origin, wallsOrSegments, options = {}) {
  if (!wallsOrSegments) {
    return computeVisibilityFromSegments(origin, [], options);
  }

  const firstItem = wallsOrSegments[0];
  const isSegment = firstItem && typeof firstItem === 'object' && 'start' in firstItem && 'end' in firstItem;

  const segments = isSegment ? wallsOrSegments : createVisibilitySegments(wallsOrSegments);
  return computeVisibilityFromSegments(origin, segments, options);
}

/**
 * Helper expuesto para calcular la visibilidad directamente con segmentos precomputados
 */
export function computeVisibilityWithSegments(origin, segments, options = {}) {
  return computeVisibilityFromSegments(origin, segments, options);
}

/**
 * Calcula si un punto está dentro del polígono de visibilidad
 * @param {Object} point - Punto a verificar {x, y}
 * @param {Array} polygon - Polígono de visibilidad
 * @returns {boolean} True si el punto está visible
 */
export function isPointVisible(point, polygon) {
  if (polygon.length < 3) return false;
  
  let inside = false;
  let j = polygon.length - 1;
  
  for (let i = 0; i < polygon.length; i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
    j = i;
  }
  
  return inside;
}

/**
 * Combina múltiples polígonos de visibilidad en uno solo
 * @param {Array} polygons - Array de polígonos
 * @returns {Array} Polígono combinado
 */
export function combineVisibilityPolygons(polygons) {
  if (polygons.length === 0) return [];
  if (polygons.length === 1) return polygons[0];
  
  // Implementación simple: unir todos los puntos y crear un hull convexo
  // Para una implementación más avanzada, se podría usar una librería de geometría
  const allPoints = [];
  polygons.forEach(polygon => {
    allPoints.push(...polygon);
  });
  
  return allPoints;
}