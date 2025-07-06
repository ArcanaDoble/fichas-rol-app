import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { nanoid } from 'nanoid';
import {
  FiChevronDown,
  FiChevronRight,
  FiTrash,
  FiFolder,
  FiFolderPlus,
  FiX,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from 'react-dnd';

export const AssetTypes = { IMAGE: 'asset-image' };

const AssetSidebar = ({ onAssetSelect, onDragStart }) => {
  const [folders, setFolders] = useState(() => [
    { id: nanoid(), name: 'Enemigos', assets: [], folders: [], open: true },
  ]);
  
  // Image preview data {url, x, y} shown on hover
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('assetSidebar');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const normalize = (arr) =>
          arr.map((f) => ({
            ...f,
            assets: f.assets || [],
            folders: normalize(f.folders || []),
            open: f.open ?? false,
          }));
        setFolders(normalize(parsed));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('assetSidebar', JSON.stringify(folders));
  }, [folders]);

  const updateFolders = (list, id, updater) =>
    list.map((f) =>
      f.id === id
        ? updater(f)
        : { ...f, folders: updateFolders(f.folders, id, updater) }
    );

  const addFolder = (parentId = null) => {
    const name = prompt('Nombre de la carpeta');
    if (!name) return;
    const newFolder = { id: nanoid(), name, assets: [], folders: [], open: true };
    setFolders((fs) => {
      if (!parentId) return [...fs, newFolder];
      return updateFolders(fs, parentId, (f) => ({
        ...f,
        folders: [...f.folders, newFolder],
        open: true,
      }));
    });
  };

  const fileToDataURL = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

  const handleFilesUpload = async (folderId, files) => {
    if (!files) return;
    const uploads = await Promise.all(
      Array.from(files).map(async (file) => {
        const url = await fileToDataURL(file);
        const name = file.name.replace(/\.[^/.]+$/, '');
        return { id: nanoid(), name, url };
      })
    );
    setFolders((fs) =>
      updateFolders(fs, folderId, (f) => ({
        ...f,
        assets: [...f.assets, ...uploads],
      }))
    );
  };

  const toggleFolder = (id) => {
    setFolders((fs) =>
      updateFolders(fs, id, (f) => ({ ...f, open: !f.open }))
    );
  };

  const removeFolder = (id) => {
    const removeRec = (list) =>
      list
        .filter((f) => f.id !== id)
        .map((f) => ({ ...f, folders: removeRec(f.folders) }));
    setFolders((fs) => removeRec(fs));
    setWindows((ws) => ws.filter((w) => w.id !== id));
  };

  const removeAsset = (folderId, assetId) => {
    setFolders((fs) =>
      updateFolders(fs, folderId, (f) => ({
        ...f,
        assets: f.assets.filter((a) => a.id !== assetId),
      }))
    );
  };

  // Show preview of asset under the pointer
  const showPreview = (asset, e) => {
    setPreview({ url: asset.url, x: e.clientX, y: e.clientY });
  };
  const movePreview = (e) => {
    setPreview((p) => (p ? { ...p, x: e.clientX, y: e.clientY } : null));
  };
  const hidePreview = () => setPreview(null);
  const findFolder = (list, id) => {
    for (const f of list) {
      if (f.id === id) return f;
      const found = findFolder(f.folders, id);
      if (found) return found;
    }
    return null;
  };

  const findFolderPath = (list, id, path = []) => {
    for (const f of list) {
      if (f.id === id) return [...path, f.name];
      const child = findFolderPath(f.folders, id, [...path, f.name]);
      if (child) return child;
    }
    return null;
  };

  const [windows, setWindows] = useState([]);
  const [zMax, setZMax] = useState(1000);

  const openWindow = (id) => {
    const folder = findFolder(folders, id);
    if (!folder) return;
    const path = findFolderPath(folders, id) || [folder.name];
    setWindows((ws) => {
      const topZ = Math.max(zMax, ...ws.map((w) => w.z));
      const newZ = topZ + 1;
      setZMax(newZ);
      const existing = ws.find((w) => w.id === id);
      if (existing) {
        return ws.map((w) => (w.id === id ? { ...w, z: newZ } : w));
      }
      return [
        ...ws,
        {
          id,
          x: 100 + ws.length * 20,
          y: 100 + ws.length * 20,
          z: newZ,
          path,
        },
      ];
    });
  };

  const closeWindow = (id) => {
    setWindows((ws) => ws.filter((w) => w.id !== id));
  };

  const bringToFront = (id) => {
    setWindows((ws) => {
      const maxZ = Math.max(...ws.map((w) => w.z), zMax);
      return ws.map((w) => (w.id === id ? { ...w, z: maxZ + 1 } : w));
    });
    setZMax((z) => z + 1);
  };

  const renderFolder = (folder, level = 0) => (
    <motion.div
      key={folder.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-gray-700 rounded"
    >
      <div
        className="flex items-center justify-between px-2 py-1 hover:bg-gray-600"
        style={{ paddingLeft: level * 8 }}
        onDoubleClick={() => openWindow(folder.id)}
      >
        <button
          onClick={() => toggleFolder(folder.id)}
          className="flex-1 text-left truncate flex items-center gap-1"
        >
          {folder.open ? <FiChevronDown /> : <FiChevronRight />}
          {level === 0 ? (
            <FiFolder className="text-yellow-400" />
          ) : (
            <FiFolderPlus className="text-yellow-400" />
          )}
          <span className="truncate">{folder.name}</span>
        </button>
        <button
          onClick={() => removeFolder(folder.id)}
          className="text-gray-400 hover:text-red-400"
        >
          <FiTrash />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {folder.open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden p-2 space-y-2"
          >
            <div className="flex gap-2">
              <button
                onClick={() => addFolder(folder.id)}
                className="bg-gray-700 hover:bg-gray-600 text-xs px-2 rounded"
              >
                + Carpeta
              </button>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFilesUpload(folder.id, e.target.files)}
                className="text-xs"
              />
            </div>
            {folder.folders.length > 0 && (
              <div className="space-y-2">
                {folder.folders.map((sub) => renderFolder(sub, level + 1))}
              </div>
            )}
            <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(4rem,1fr))]">
              {folder.assets.map((asset) => (
                <DraggableAssetItem
                  key={asset.id}
                  asset={asset}
                  folderId={folder.id}
                  onAssetSelect={onAssetSelect}
                  onDragStart={onDragStart}
                  onRemove={removeAsset}
                  showPreview={showPreview}
                  movePreview={movePreview}
                  hidePreview={hidePreview}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-gray-800 flex flex-col rounded-l-lg shadow-lg transition-all duration-200">
      <div className="p-2 border-b border-gray-700">
        <button
          onClick={addFolder}
          className="w-full bg-gray-700 hover:bg-gray-600 text-sm py-1 rounded"
        >
          + Carpeta
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 scrollbar-hide">
        <AnimatePresence>
          {folders.map((folder) => renderFolder(folder, 0))}
        </AnimatePresence>
      </div>
      {preview && (
        <div
          className="pointer-events-none fixed z-50"
          style={{ top: preview.y + 10, left: preview.x + 10 }}
        >
          <img
            src={preview.url}
            alt="preview"
            className="max-w-[256px] max-h-[256px]"
          />
        </div>
      )}
      {windows.map((w) => (
        <FolderWindow
          key={w.id}
          folder={findFolder(folders, w.id)}
          position={w}
          bringToFront={bringToFront}
          onClose={closeWindow}
          onAddFolder={addFolder}
          onUpload={handleFilesUpload}
          onRemoveFolder={removeFolder}
          onRemoveAsset={removeAsset}
          onOpenFolder={openWindow}
          onAssetSelect={onAssetSelect}
          onDragStart={onDragStart}
          showPreview={showPreview}
          movePreview={movePreview}
          hidePreview={hidePreview}
        />
      ))}
    </div>
  );
};

AssetSidebar.propTypes = {
  onAssetSelect: PropTypes.func,
  onDragStart: PropTypes.func,
};

const DraggableAssetItem = ({
  asset,
  folderId,
  onAssetSelect,
  onDragStart,
  onRemove,
  showPreview,
  movePreview,
  hidePreview,
}) => {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: AssetTypes.IMAGE,
      item: () => {
        const data = { url: asset.url, name: asset.name };
        onDragStart?.(data);
        return data;
      },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [asset, onDragStart]
  );
  return (
    <div className="text-center text-xs">
      <div
        ref={drag}
        className="relative group hover:bg-gray-700 rounded p-1"
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        <img
          src={asset.url}
          alt={asset.name}
          className="w-16 h-16 object-contain rounded cursor-pointer hover:ring-2 hover:ring-blue-500 mx-auto"
          onClick={() => onAssetSelect?.(asset)}
          onMouseEnter={(e) => showPreview(asset, e)}
          onMouseMove={movePreview}
          onMouseLeave={hidePreview}
        />
        <button
          onClick={() => onRemove(folderId, asset.id)}
          className="absolute -top-1 -right-1 bg-gray-800 rounded-full p-0.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-400"
        >
          <FiTrash />
        </button>
      </div>
      <span className="truncate block w-16 mx-auto">{asset.name}</span>
    </div>
  );
};

DraggableAssetItem.propTypes = {
  asset: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
  }).isRequired,
  folderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onAssetSelect: PropTypes.func,
  onDragStart: PropTypes.func,
  onRemove: PropTypes.func.isRequired,
  showPreview: PropTypes.func.isRequired,
  movePreview: PropTypes.func.isRequired,
  hidePreview: PropTypes.func.isRequired,
};

const FolderIcon = ({ folder, onOpen }) => (
  <div
    className="text-center text-xs cursor-pointer hover:bg-gray-700 rounded p-1"
    onDoubleClick={() => onOpen(folder.id)}
  >
    <div className="relative group">
      <FiFolderPlus className="w-12 h-12 mx-auto text-yellow-400" />
    </div>
    <span className="truncate block w-16 mx-auto">{folder.name}</span>
  </div>
);

FolderIcon.propTypes = {
  folder: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  onOpen: PropTypes.func.isRequired,
};

const FolderWindow = ({
  folder,
  position,
  bringToFront,
  onClose,
  onAddFolder,
  onUpload,
  onRemoveFolder,
  onRemoveAsset,
  onOpenFolder,
  onAssetSelect,
  onDragStart,
  showPreview,
  movePreview,
  hidePreview,
}) => {
  const [pos, setPos] = useState({ x: position.x, y: position.y });
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    setDragging(true);
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    bringToFront(position.id);
  };
  const handleMouseMove = useCallback(
    (e) => {
      if (!dragging) return;
      setPos({
        x: e.clientX - offset.current.x,
        y: e.clientY - offset.current.y,
      });
    },
    [dragging]
  );
  const handleMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove]);

  if (!folder) return null;

  return createPortal(
    <div
      className="fixed select-none"
      style={{ top: pos.y, left: pos.x, zIndex: position.z }}
    >
      <div className="bg-gray-800 border border-gray-700 rounded shadow-xl max-w-[80vw] max-h-[70vh] overflow-auto">
        <div
          className="flex justify-between items-center bg-gray-700 px-2 py-1 cursor-move"
          onMouseDown={handleMouseDown}
        >
          <span className="font-bold truncate">
            {position.path?.join(' / ') || folder.name}
          </span>
          <button
            onClick={() => onClose(position.id)}
            className="text-gray-400 hover:text-red-400"
          >
            <FiX />
          </button>
        </div>
        <div className="p-2 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => onAddFolder(folder.id)}
              className="bg-gray-700 hover:bg-gray-600 text-xs px-2 rounded"
            >
              + Carpeta
            </button>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => onUpload(folder.id, e.target.files)}
              className="text-xs"
            />
          </div>
          <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(4rem,1fr))]">
            {folder.folders.map((sub) => (
              <FolderIcon key={sub.id} folder={sub} onOpen={onOpenFolder} />
            ))}
            {folder.assets.map((asset) => (
              <DraggableAssetItem
                key={asset.id}
                asset={asset}
                folderId={folder.id}
                onAssetSelect={onAssetSelect}
                onDragStart={onDragStart}
                onRemove={onRemoveAsset}
                showPreview={showPreview}
                movePreview={movePreview}
                hidePreview={hidePreview}
              />
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

FolderWindow.propTypes = {
  folder: PropTypes.object,
  position: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    z: PropTypes.number.isRequired,
    path: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  bringToFront: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  onRemoveFolder: PropTypes.func.isRequired,
  onRemoveAsset: PropTypes.func.isRequired,
  onOpenFolder: PropTypes.func.isRequired,
  onAssetSelect: PropTypes.func,
  onDragStart: PropTypes.func,
  showPreview: PropTypes.func.isRequired,
  movePreview: PropTypes.func.isRequired,
  hidePreview: PropTypes.func.isRequired,
};

export default AssetSidebar;

