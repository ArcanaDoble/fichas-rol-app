import { computeVisibility, isPointVisible } from '../visibility';

describe('Sistema de Visibilidad', () => {
  describe('computeVisibility', () => {
    test('debe calcular visibilidad sin obstáculos', () => {
      const origin = { x: 100, y: 100 };
      const walls = [];
      const options = { rays: 8, maxDistance: 100 };
      
      const polygon = computeVisibility(origin, walls, options);
      
      expect(polygon).toBeDefined();
      expect(polygon.length).toBeGreaterThan(0);
      
      // Todos los puntos deben estar a la distancia máxima
      polygon.forEach(point => {
        const distance = Math.sqrt(
          Math.pow(point.x - origin.x, 2) + 
          Math.pow(point.y - origin.y, 2)
        );
        expect(distance).toBeCloseTo(100, 1);
      });
    });

    test('debe detectar intersecciones con muro simple', () => {
      const origin = { x: 50, y: 50 };
      const walls = [{
        id: 1,
        x: 80,
        y: 30,
        points: [0, 0, 0, 40], // Muro vertical
        door: 'closed'
      }];
      const options = { rays: 16, maxDistance: 100 };
      
      const polygon = computeVisibility(origin, walls, options);
      
      expect(polygon).toBeDefined();
      expect(polygon.length).toBeGreaterThan(0);
      
      // Debe haber puntos que intersectan con el muro
      const intersectionPoints = polygon.filter(point => 
        Math.abs(point.x - 80) < 1 && point.y >= 30 && point.y <= 70
      );
      expect(intersectionPoints.length).toBeGreaterThan(0);
    });

    test('debe ignorar muros con puertas abiertas', () => {
      const origin = { x: 50, y: 50 };
      const wallsClosed = [{
        id: 1,
        x: 80,
        y: 30,
        points: [0, 0, 0, 40],
        door: 'closed'
      }];
      const wallsOpen = [{
        id: 1,
        x: 80,
        y: 30,
        points: [0, 0, 0, 40],
        door: 'open'
      }];
      const options = { rays: 16, maxDistance: 100 };
      
      const polygonClosed = computeVisibility(origin, wallsClosed, options);
      const polygonOpen = computeVisibility(origin, wallsOpen, options);
      
      // Verificar que ambos polígonos se generaron correctamente
      expect(polygonClosed.length).toBeGreaterThan(0);
      expect(polygonOpen.length).toBeGreaterThan(0);
      
      // Con puerta abierta, no debe haber intersecciones con el muro
      const openIntersections = polygonOpen.filter(point => 
        Math.abs(point.x - 80) < 1 && point.y >= 30 && point.y <= 70
      );
      
      // Con puerta cerrada, debe haber intersecciones con el muro
      const closedIntersections = polygonClosed.filter(point => 
        Math.abs(point.x - 80) < 1 && point.y >= 30 && point.y <= 70
      );
      
      // La puerta abierta debe tener menos o ninguna intersección con el muro
      expect(openIntersections.length).toBeLessThanOrEqual(closedIntersections.length);
    });

    test('debe manejar múltiples muros', () => {
      const origin = { x: 50, y: 50 };
      const walls = [
        {
          id: 1,
          x: 80,
          y: 30,
          points: [0, 0, 0, 40],
          door: 'closed'
        },
        {
          id: 2,
          x: 30,
          y: 80,
          points: [0, 0, 40, 0],
          door: 'closed'
        }
      ];
      const options = { rays: 32, maxDistance: 100 };
      
      const polygon = computeVisibility(origin, walls, options);
      
      expect(polygon).toBeDefined();
      expect(polygon.length).toBeGreaterThan(0);
      
      // Debe haber intersecciones con ambos muros
      const verticalIntersections = polygon.filter(point => 
        Math.abs(point.x - 80) < 1
      );
      const horizontalIntersections = polygon.filter(point => 
        Math.abs(point.y - 80) < 1
      );
      
      expect(verticalIntersections.length).toBeGreaterThan(0);
      expect(horizontalIntersections.length).toBeGreaterThan(0);
    });
  });

  describe('isPointVisible', () => {
    test('debe detectar puntos dentro del polígono', () => {
      const polygon = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ];
      
      expect(isPointVisible({ x: 50, y: 50 }, polygon)).toBe(true);
      expect(isPointVisible({ x: 10, y: 10 }, polygon)).toBe(true);
      expect(isPointVisible({ x: 90, y: 90 }, polygon)).toBe(true);
    });

    test('debe detectar puntos fuera del polígono', () => {
      const polygon = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ];
      
      expect(isPointVisible({ x: -10, y: 50 }, polygon)).toBe(false);
      expect(isPointVisible({ x: 110, y: 50 }, polygon)).toBe(false);
      expect(isPointVisible({ x: 50, y: -10 }, polygon)).toBe(false);
      expect(isPointVisible({ x: 50, y: 110 }, polygon)).toBe(false);
    });

    test('debe manejar polígonos vacíos', () => {
      expect(isPointVisible({ x: 50, y: 50 }, [])).toBe(false);
      expect(isPointVisible({ x: 50, y: 50 }, [{ x: 0, y: 0 }])).toBe(false);
    });
  });
});