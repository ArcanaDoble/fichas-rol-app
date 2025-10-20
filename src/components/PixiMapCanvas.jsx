import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import PropTypes from 'prop-types';
import PixiBattleMap from '../battlemap/pixiAdapter';
import { DEFAULT_GRID_SIZE } from '../utils/grid';

const DEFAULT_FALLBACK_WIDTH = 1400;
const DEFAULT_FALLBACK_HEIGHT = 900;

const PixiMapCanvas = forwardRef(
  (
    {
      backgroundImage,
      gridSize = DEFAULT_GRID_SIZE,
      gridColor = '#ffffff',
      gridOpacity = 0.2,
      showGrid = true,
      tokens = [],
      onTokensChange,
    },
    ref
  ) => {
    const stageRef = useRef(null);
    const mapRef = useRef(null);
    const listenersRef = useRef(new Map());
    const unmountedRef = useRef(false);

    useEffect(() => {
      const container = stageRef.current;
      if (!container) {
        return undefined;
      }

      unmountedRef.current = false;
      const map = new PixiBattleMap(container, { cellSize: gridSize });
      mapRef.current = map;

      let cancelled = false;

      const initializeGrid = async () => {
        try {
          await map.ready;
        } catch (error) {
          console.error('[PixiMapCanvas] Error esperando a PixiBattleMap.ready:', error);
          return;
        }

        if (cancelled || unmountedRef.current || mapRef.current !== map) {
          return;
        }

        await map.setGrid({
          cellSize: gridSize,
          color: gridColor,
          opacity: gridOpacity,
          visible: showGrid,
        });
      };

      initializeGrid();

      return () => {
        cancelled = true;
        unmountedRef.current = true;
        listenersRef.current.forEach(({ sprite, handler }) => {
          sprite.off('battlemap:tokenDrop', handler);
        });
        listenersRef.current.clear();
        map.destroy();
        if (mapRef.current === map) {
          mapRef.current = null;
        }
      };
    }, []);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) {
        return undefined;
      }

      let cancelled = false;

      const loadBackground = async () => {
        try {
          await map.ready;
        } catch (error) {
          console.error('[PixiMapCanvas] Error esperando ready antes de loadMap:', error);
          return;
        }
        if (cancelled || unmountedRef.current || mapRef.current !== map) {
          return;
        }

        const fallbackWidth =
          Number.isFinite(gridSize) && gridSize > 0
            ? gridSize * 20
            : DEFAULT_FALLBACK_WIDTH;
        const fallbackHeight =
          Number.isFinite(gridSize) && gridSize > 0
            ? gridSize * 15
            : DEFAULT_FALLBACK_HEIGHT;

        if (!backgroundImage) {
          await map.loadMap(null, fallbackWidth, fallbackHeight);
          return;
        }

        const image = new Image();
        image.crossOrigin = 'anonymous';
        const dimensions = await new Promise((resolve) => {
          image.onload = () => {
            resolve({
              width: image.naturalWidth || image.width || fallbackWidth,
              height: image.naturalHeight || image.height || fallbackHeight,
            });
          };
          image.onerror = () => {
            resolve({ width: fallbackWidth, height: fallbackHeight });
          };
          image.src = backgroundImage;
        });

        if (cancelled || unmountedRef.current || mapRef.current !== map) {
          return;
        }

        await map.loadMap(backgroundImage, dimensions.width, dimensions.height);
      };
      loadBackground();

      return () => {
        cancelled = true;
      };
    }, [backgroundImage, gridSize]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) {
        return undefined;
      }
      let cancelled = false;

      const applyGrid = async () => {
        try {
          await map.ready;
        } catch (error) {
          console.error('[PixiMapCanvas] Error esperando ready al actualizar cuadrícula:', error);
          return;
        }
        if (cancelled || unmountedRef.current || mapRef.current !== map) {
          return;
        }
        await map.setGrid({
          cellSize: gridSize,
          color: gridColor,
          opacity: gridOpacity,
          visible: showGrid,
        });
      };

      applyGrid();

      return () => {
        cancelled = true;
      };
    }, [gridSize, gridColor, gridOpacity, showGrid]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) {
        return undefined;
      }

      let cancelled = false;

      const syncTokens = async () => {
        try {
          await map.ready;
        } catch (error) {
          console.error('[PixiMapCanvas] Error esperando ready al sincronizar tokens:', error);
          return;
        }
        if (cancelled || unmountedRef.current || mapRef.current !== map) {
          return;
        }

        const seen = new Set();
        const list = Array.isArray(tokens) ? tokens : [];

        for (const token of list) {
          if (!token) {
            continue;
          }
          const tokenId = token.id ?? token.key ?? token.name;
          if (tokenId === undefined || tokenId === null) {
            continue;
          }
          const id = String(tokenId);
          seen.add(id);

          const baseUnits = Math.max(
            Number(token.w) || 1,
            Number(token.h) || 1,
            1
          );
          const providedSize = Number(token.size);
          const pixelSize =
            Number.isFinite(providedSize) && providedSize > 0
              ? providedSize
              : baseUnits * gridSize;

          const parsedX = Number(token.x);
          const parsedY = Number(token.y);

          const sprite = await map.addToken({
            id,
            textureUrl: token.url || token.textureUrl || token.image,
            x: Number.isFinite(parsedX) ? parsedX : 0,
            y: Number.isFinite(parsedY) ? parsedY : 0,
            size: pixelSize,
          });

          const existingListener = listenersRef.current.get(id);
          if (existingListener) {
            existingListener.sprite.off('battlemap:tokenDrop', existingListener.handler);
          }

          if (!sprite) {
            continue;
          }

          const handler = ({ x, y }) => {
            if (!onTokensChange) {
              return;
            }
            onTokensChange((prev) => {
              if (!prev) {
                return prev;
              }
              let changed = false;
              const next = prev.map((entry) => {
                if (String(entry.id ?? entry.key) !== id) {
                  return entry;
                }
                if (entry.x === x && entry.y === y) {
                  return entry;
                }
                changed = true;
                return { ...entry, x, y };
              });
              return changed ? next : prev;
            });
          };

          sprite.on('battlemap:tokenDrop', handler);
          listenersRef.current.set(id, { sprite, handler });
        }

        const removals = [];
        listenersRef.current.forEach(({ sprite, handler }, id) => {
          if (seen.has(id)) {
            return;
          }
          sprite.off('battlemap:tokenDrop', handler);
          listenersRef.current.delete(id);
          removals.push(map.removeToken(id));
        });
        await Promise.all(removals);
      };

      syncTokens();

      return () => {
        cancelled = true;
      };
    }, [tokens, gridSize, onTokensChange]);

    useImperativeHandle(
      ref,
      () => ({
        async loadMap(url, width, height) {
          const map = mapRef.current;
          if (!map) {
            return;
          }
          await map.ready;
          await map.loadMap(url, width, height);
        },
        async setGrid(options) {
          const map = mapRef.current;
          if (!map) {
            return;
          }
          await map.ready;
          await map.setGrid(options);
        },
        async addToken(options) {
          const map = mapRef.current;
          if (!map) {
            return null;
          }
          await map.ready;
          return map.addToken(options);
        },
        async centerOn(x, y, scale) {
          const map = mapRef.current;
          if (!map) {
            return;
          }
          await map.ready;
          await map.centerOn(x, y, scale);
        },
        destroy() {
          const map = mapRef.current;
          if (map) {
            map.destroy();
            mapRef.current = null;
          }
        },
      }),
      []
    );

    return (
      <div className="relative w-full h-full">
        <div
          id="pixi-stage"
          ref={stageRef}
          className="absolute inset-0 rounded-xl bg-gray-900 overflow-hidden"
        />
      </div>
    );
  }
);

PixiMapCanvas.displayName = 'PixiMapCanvas';

PixiMapCanvas.propTypes = {
  backgroundImage: PropTypes.string,
  gridSize: PropTypes.number,
  gridColor: PropTypes.string,
  gridOpacity: PropTypes.number,
  showGrid: PropTypes.bool,
  tokens: PropTypes.arrayOf(PropTypes.object),
  onTokensChange: PropTypes.func,
};

export default PixiMapCanvas;
