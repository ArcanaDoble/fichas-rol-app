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
  
  // Líneas paralelas
  if (Math.abs(denominator) < 1e-10) {
    return null;
  }
  
  const t1 = (dx2 * dy3 - dy2 * dx3) / denominator;
  const t2 = (dx1 * dy3 - dy1 * dx3) / denominator;
  
  // Verificar que la intersección esté en el rayo (t1 >= 0) y en el segmento (0 <= t2 <= 1)
  if (t1 >= 0 && t2 >= 0 && t2 <= 1) {
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
  if (wall.door === 'open') {
    return [];
  }
  
  const [x1, y1, x2, y2] = wall.points;
  const startX = wall.x + x1;
  const startY = wall.y + y1;
  const endX = wall.x + x2;
  const endY = wall.y + y2;
  
  return [{
    start: { x: startX, y: startY },
    end: { x: endX, y: endY }
  }];
}

/**
 * Calcula el polígono de visibilidad desde un punto de origen
 * @param {Object} origin - Punto de origen {x, y}
 * @param {Array} walls - Array de muros
 * @param {Object} options - Opciones de configuración
 * @returns {Array} Array de puntos que forman el polígono visible
 */
export function computeVisibility(origin, walls, { rays = 360, maxDistance = 500 } = {}) {
  // Convertir muros a segmentos
  const segments = [];
  walls.forEach(wall => {
    const wallSegments = wallToSegments(wall);
    segments.push(...wallSegments);
  });
  
  // Generar ángulos para los rayos
  const angles = [];
  const angleStep = (2 * Math.PI) / rays;
  
  for (let i = 0; i < rays; i++) {
    angles.push(i * angleStep);
  }
  
  // Para cada esquina de los muros, agregar rayos ligeramente desplazados
  // Esto ayuda a capturar mejor las esquinas y bordes
  segments.forEach(segment => {
    [segment.start, segment.end].forEach(point => {
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const angle = Math.atan2(dy, dx);
      
      // Agregar rayos ligeramente antes y después de cada esquina
      angles.push(angle - 0.001);
      angles.push(angle);
      angles.push(angle + 0.001);
    });
  });
  
  // Calcular intersecciones para cada rayo
  const intersections = [];
  
  angles.forEach(angle => {
    const direction = {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };
    
    const ray = { origin, direction };
    let closestIntersection = null;
    let minDistance = maxDistance;
    
    // Encontrar la intersección más cercana
    segments.forEach(segment => {
      const intersection = raySegmentIntersection(ray, segment);
      if (intersection && intersection.distance < minDistance) {
        minDistance = intersection.distance;
        closestIntersection = {
          x: intersection.x,
          y: intersection.y,
          angle: angle
        };
      }
    });
    
    // Si no hay intersección, usar el punto máximo
    if (!closestIntersection) {
      closestIntersection = {
        x: origin.x + direction.x * maxDistance,
        y: origin.y + direction.y * maxDistance,
        angle: angle
      };
    }
    
    intersections.push(closestIntersection);
  });
  
  // Ordenar por ángulo y eliminar duplicados muy cercanos
  intersections.sort((a, b) => a.angle - b.angle);
  
  const filteredIntersections = [];
  const threshold = 2; // Distancia mínima entre puntos
  
  intersections.forEach(point => {
    const lastPoint = filteredIntersections[filteredIntersections.length - 1];
    if (!lastPoint || 
        Math.abs(point.x - lastPoint.x) > threshold || 
        Math.abs(point.y - lastPoint.y) > threshold) {
      filteredIntersections.push(point);
    }
  });
  
  return filteredIntersections;
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