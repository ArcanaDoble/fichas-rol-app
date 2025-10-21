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
      ...rest
    },
    ref
  ) => {
    const { activeLayer, onAssetDrop } = rest;
    void activeLayer;
    void onAssetDrop;
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
          sprite.off('battlemap:tokenResize', handler);
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
            layer: token.layer || token.capa || token.layerId,
            rotation: Number(token.angle ?? token.rotation ?? 0),
            opacity: token.opacity,
            zIndex: token.zIndex,
            tintColor: token.tintColor ?? token.tint,
            vision: token.vision,
            metadata: {
              name: token.name,
              customName: token.customName,
              enemyId: token.enemyId,
              tokenSheetId: token.tokenSheetId,
              controlledBy: token.controlledBy,
              barsVisibility: token.barsVisibility,
            },
          });

          const existingListener = listenersRef.current.get(id);
          if (existingListener) {
            existingListener.sprite.off('battlemap:tokenDrop', existingListener.handler);
            existingListener.sprite.off('battlemap:tokenResize', existingListener.handler);
          }

          if (!sprite) {
            continue;
          }

          const handler = ({ x, y, data }) => {
            if (!onTokensChange) {
              return;
            }
            onTokensChange((prev) => {
              if (!prev) {
                return prev;
              }
              let didChange = false;
              const next = prev.map((entry) => {
                if (String(entry.id ?? entry.key) !== id) {
                  return entry;
                }
                const payload = data && typeof data === 'object' ? data : null;
                let entryChanged = false;
                const updated = { ...entry };

                if (Number.isFinite(x) && updated.x !== x) {
                  updated.x = x;
                  entryChanged = true;
                }
                if (Number.isFinite(y) && updated.y !== y) {
                  updated.y = y;
                  entryChanged = true;
                }

                if (payload) {
                  Object.entries(payload).forEach(([key, value]) => {
                    if (updated[key] !== value) {
                      updated[key] = value;
                      entryChanged = true;
                    }
                  });
                }

                if (entryChanged) {
                  didChange = true;
                  return updated;
                }
                return entry;
              });
              return didChange ? next : prev;
            });
          };

          sprite.on('battlemap:tokenDrop', handler);
          sprite.on('battlemap:tokenResize', handler);
          listenersRef.current.set(id, { sprite, handler });
        }

        const removals = [];
        listenersRef.current.forEach(({ sprite, handler }, id) => {
          if (seen.has(id)) {
            return;
          }
          sprite.off('battlemap:tokenDrop', handler);
          sprite.off('battlemap:tokenResize', handler);
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

    useEffect(() => {
      const map = mapRef.current;
      if (!map) {
        return undefined;
      }
      const unsubscribe = map.on('token:remove', ({ id }) => {
        if (!id) {
          return;
        }
        const key = String(id);
        const listener = listenersRef.current.get(key);
        if (!listener) {
          return;
        }
        listener.sprite.off('battlemap:tokenDrop', listener.handler);
        listener.sprite.off('battlemap:tokenResize', listener.handler);
        listenersRef.current.delete(key);
      });
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }, []);

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
        async getSnappedPositionFromClient(clientX, clientY) {
          const map = mapRef.current;
          const container = stageRef.current;
          if (!map || !container) {
            return null;
          }
          await map.ready;
          const rect = container.getBoundingClientRect();
          const normalizedClientX = Number(clientX);
          const normalizedClientY = Number(clientY);
          const screenX =
            (Number.isFinite(normalizedClientX) ? normalizedClientX : 0) - rect.left;
          const screenY =
            (Number.isFinite(normalizedClientY) ? normalizedClientY : 0) - rect.top;
          return map.getSnappedWorldPosition({ x: screenX, y: screenY });
        },
        async updateToken(id, patch) {
          const map = mapRef.current;
          if (!map) {
            return null;
          }
          await map.ready;
          return map.updateToken(id, patch);
        },
        async centerOn(x, y, scale) {
          const map = mapRef.current;
          if (!map) {
            return;
          }
          await map.ready;
          await map.centerOn(x, y, scale);
        },
        async deleteSelection() {
          const map = mapRef.current;
          if (!map) {
            return [];
          }
          return map.deleteSelection();
        },
        copySelection() {
          const map = mapRef.current;
          if (!map) {
            return { tokens: [] };
          }
          return map.copySelection();
        },
        async pasteAt(x, y) {
          const map = mapRef.current;
          if (!map) {
            return [];
          }
          return map.pasteAt(x, y);
        },
        setTool(toolId) {
          const map = mapRef.current;
          if (!map) {
            return;
          }
          map.setTool(toolId);
        },
        createLayer(options) {
          const map = mapRef.current;
          if (!map) {
            return null;
          }
          return map.createLayer(options);
        },
        setLayerVisibility(layerId, visible) {
          const map = mapRef.current;
          if (!map) {
            return;
          }
          map.setLayerVisibility(layerId, visible);
        },
        lockLayer(layerId, locked) {
          const map = mapRef.current;
          if (!map) {
            return;
          }
          map.lockLayer(layerId, locked);
        },
        async addLight(options) {
          const map = mapRef.current;
          if (!map) {
            return null;
          }
          return map.addLight(options);
        },
        async removeLight(id) {
          const map = mapRef.current;
          if (!map) {
            return;
          }
          await map.removeLight(id);
        },
        async setTokenVision(id, vision) {
          const map = mapRef.current;
          if (!map) {
            return null;
          }
          return map.setTokenVision(id, vision);
        },
        toggleFog(enabled, options) {
          const map = mapRef.current;
          if (!map) {
            return;
          }
          map.toggleFog(enabled, options);
        },
        getSelection() {
          const map = mapRef.current;
          if (!map) {
            return [];
          }
          return map.getSelection();
        },
        setSelection(ids) {
          const map = mapRef.current;
          if (!map) {
            return;
          }
          map.setSelection(ids);
        },
        on(eventName, handler) {
          const map = mapRef.current;
          if (!map) {
            return () => {};
          }
          return map.on(eventName, handler);
        },
        off(eventName, handler) {
          const map = mapRef.current;
          if (!map) {
            return;
          }
          map.off(eventName, handler);
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
      <div className="relative w-full h-full min-h-[400px]">
        <div
          id="pixi-stage"
          ref={stageRef}
          className="absolute inset-0 rounded-xl bg-black overflow-hidden"
          style={{ minHeight: '400px' }}
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
  activeLayer: PropTypes.string,
  onAssetDrop: PropTypes.func,
};

export default PixiMapCanvas;
