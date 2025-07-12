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
import { useDrag, useDrop, useDragLayer } from 'react-dnd';
import { getOrUploadFile } from '../utils/storage';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const EMPTY_IMAGE = new Image();
EMPTY_IMAGE.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

export const AssetTypes = { IMAGE: 'asset-image' };

const AssetSidebar = ({ onAssetSelect, onDragStart, onDragEnd, className = '' }) => {
  const [folders, setFolders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  
  // Image preview data {url, x, y} shown on hover
  const [preview, setPreview] = useState(null);
  const isDragging = useDragLayer((monitor) => monitor.isDragging());

  useEffect(() => {
    const ref = doc(db, 'assetSidebar', 'state');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const normalize = (arr) =>
            arr.map((f) => ({
              ...f,
              assets: f.assets || [],
              folders: normalize(f.folders || []),
              open: f.open ?? false,
            }));
          setFolders(normalize(data.folders || []));
        } else {
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
          } else {
            setFolders([
              { id: nanoid(), name: 'Enemigos', assets: [], folders: [], open: true },
            ]);
          }
        }
        setLoaded(true);
      },
      (error) => {
        console.error(error);
        setLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem('assetSidebar', JSON.stringify(folders));
    setDoc(doc(db, 'assetSidebar', 'state'), { folders }).catch(console.error);
  }, [folders, loaded]);

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

  const handleFilesUpload = async (folderId, files) => {
    if (!files) return;
    const uploads = await Promise.all(
      Array.from(files).map(async (file) => {
        const name = file.name.replace(/\.[^/.]+$/, '');
        try {
          const { url } = await getOrUploadFile(file, 'canvas-assets');
          return { id: nanoid(), name, url };
        } catch (e) {
          alert(e.message);
          return null;
        }
      })
    );
    setFolders((fs) =>
      updateFolders(fs, folderId, (f) => ({
        ...f,
        assets: [
          ...f.assets,
          ...uploads.filter(
            (u) => u && !f.assets.some((a) => a.url === u.url)
          ),
        ],
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

  const moveAsset = (fromId, toId, asset) => {
    if (fromId === toId) return;
    const removeRec = (list) =>
      list.map((f) => ({
        ...f,
        assets:
          f.id === fromId ? f.assets.filter((a) => a.id !== asset.id) : f.assets,
        folders: removeRec(f.folders),
      }));
    const addRec = (list) =>
      list.map((f) => ({
        ...f,
        assets:
          f.id === toId && !f.assets.some((a) => a.id === asset.id)
            ? [...f.assets, asset]
            : f.assets,
        folders: addRec(f.folders),
      }));
    setFolders((fs) => addRec(removeRec(fs)));
  };

  // Show preview of asset under the pointer
  const showPreview = (asset, e) => {
    if (isDragging) return;
    setPreview({ url: asset.url, x: e.clientX, y: e.clientY });
  };
  const movePreview = (e) => {
    if (isDragging) return;
    setPreview((p) => (p ? { ...p, x: e.clientX, y: e.clientY } : null));
  };
  const hidePreview = () => {
    if (!isDragging) setPreview(null);
  };

  const handleDragStart = () => {
    setPreview(null);
  };

  const handleDragEnd = () => {
    // nothing extra
  };
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

  const FolderItem = ({ folder, level = 0 }) => {
    const [{ isOver }, drop] = useDrop(
      () => ({
        accept: AssetTypes.IMAGE,
        drop: (item) =>
          moveAsset(item.fromFolderId, folder.id, {
            id: item.id,
            name: item.name,
            url: item.url,
          }),
        collect: (monitor) => ({ isOver: monitor.isOver() }),
      }),
      [folder]
    );

    return (
      <motion.div
        ref={drop}
        key={folder.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={level > 0 ? 'pl-4 space-y-1' : 'space-y-1'}
      >
        <div
          className={`flex items-center justify-between ${isOver ? 'bg-[#2a3344]' : ''}`}
          onDoubleClick={() => openWindow(folder.id)}
        >
          <button
            onClick={() => toggleFolder(folder.id)}
            className="flex-1 text-left flex items-center gap-2 p-1 rounded transition-colors duration-150 hover:bg-[#2a3344]"
          >
            {folder.open ? <FiChevronDown /> : <FiChevronRight />}
            {level === 0 ? (
              <FiFolder className="text-yellow-400" />
            ) : (
              <FiFolderPlus className="text-yellow-400 rounded-sm" />
            )}
            <span className="text-gray-200 font-semibold truncate">{folder.name}</span>
          </button>
          <button
            onClick={() => removeFolder(folder.id)}
            className="text-xs bg-[#374151] hover:bg-[#4b5563] rounded px-2 py-1 transition-colors duration-150"
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
              className="overflow-hidden space-y-2"
            >
              <div className="flex gap-2">
                <button
                  onClick={() => addFolder(folder.id)}
                  className="text-xs bg-[#374151] hover:bg-[#4b5563] rounded px-2 py-1 transition-colors duration-150"
                >
                  + Carpeta
                </button>
                <label className="text-xs bg-[#374151] hover:bg-[#4b5563] rounded px-2 py-1 transition-colors duration-150 cursor-pointer">
                  Examinar
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFilesUpload(folder.id, e.target.files)}
                    className="hidden"
                  />
                </label>
              </div>
              {folder.folders.length > 0 && (
                <div className="space-y-2">
                  {folder.folders.map((sub) => (
                    <FolderItem key={sub.id} folder={sub} level={level + 1} />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {folder.assets.map((asset) => (
                  <DraggableAssetItem
                    key={asset.id}
                    asset={asset}
                    folderId={folder.id}
                    onAssetSelect={onAssetSelect}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
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
  };

  return (
    <div className={`fixed right-0 top-0 h-screen w-[320px] bg-[#1f2937] border-l border-[#2d3748] p-3 flex flex-col overflow-y-auto overscroll-y-contain scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent ${className}`}>
      <div className="mb-3">
        <button
          onClick={addFolder}
          className="w-full text-xs bg-[#374151] hover:bg-[#4b5563] rounded px-2 py-1 transition-colors duration-150"
        >
          + Carpeta
        </button>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <AnimatePresence>
          {folders.map((folder) => (
            <FolderItem key={folder.id} folder={folder} level={0} />
          ))}
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
      <DragLayerPreview />
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
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onMoveAsset={moveAsset}
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
  onDragEnd: PropTypes.func,
  className: PropTypes.string,
};

const DraggableAssetItem = ({
  asset,
  folderId,
  onAssetSelect,
  onDragStart,
  onDragEnd,
  onRemove,
  showPreview,
  movePreview,
  hidePreview,
}) => {
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: AssetTypes.IMAGE,
      item: { id: asset.id, name: asset.name, url: asset.url, fromFolderId: folderId },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [asset, folderId]
  );

  useEffect(() => {
    preview(EMPTY_IMAGE, { captureDraggingState: true });
  }, [preview]);

  useEffect(() => {
    if (isDragging) {
      onDragStart?.({ id: asset.id, name: asset.name, url: asset.url, fromFolderId: folderId });
    } else {
      onDragEnd?.();
    }
  }, [isDragging, asset, folderId, onDragStart, onDragEnd]);
  return (
    <div className="text-center text-xs">
      <div
        ref={drag}
        className="relative group hover:bg-[#2a3344] rounded p-1"
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        <img
          src={asset.url}
          alt={asset.name}
          className="w-14 h-14 object-contain rounded cursor-pointer hover:ring-2 hover:ring-blue-500 mx-auto"
          onClick={() => onAssetSelect?.(asset)}
          onMouseEnter={(e) => showPreview(asset, e)}
          onMouseMove={movePreview}
          onMouseLeave={hidePreview}
        />
        <button
          onClick={() => onRemove(folderId, asset.id)}
          className="absolute -top-1 -right-1 bg-[#374151] hover:bg-[#4b5563] rounded-full p-0.5 text-gray-300 transition-colors duration-150"
        >
          <FiTrash />
        </button>
      </div>
      <span className="truncate block w-14 mx-auto text-gray-300">{asset.name}</span>
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
  onDragEnd: PropTypes.func,
  onRemove: PropTypes.func.isRequired,
  showPreview: PropTypes.func.isRequired,
  movePreview: PropTypes.func.isRequired,
  hidePreview: PropTypes.func.isRequired,
};

const FolderIcon = ({ folder, onOpen, onMoveAsset }) => {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: AssetTypes.IMAGE,
      drop: (item) =>
        onMoveAsset?.(item.fromFolderId, folder.id, {
          id: item.id,
          name: item.name,
          url: item.url,
        }),
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [folder, onMoveAsset]
  );
  return (
    <div
      ref={drop}
      className={`text-center text-xs cursor-pointer hover:bg-[#2a3344] rounded p-1 ${isOver ? 'bg-[#2a3344]' : ''}`}
      onDoubleClick={() => onOpen(folder.id)}
    >
      <div className="relative group">
        <FiFolderPlus className="w-12 h-12 mx-auto text-yellow-400 rounded-sm" />
      </div>
      <span className="truncate block w-16 mx-auto text-gray-300">{folder.name}</span>
    </div>
  );
};

FolderIcon.propTypes = {
  folder: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  onOpen: PropTypes.func.isRequired,
  onMoveAsset: PropTypes.func,
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
  onDragEnd,
  onMoveAsset,
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
              className="text-xs bg-[#374151] hover:bg-[#4b5563] rounded px-2 py-1 transition-colors duration-150"
            >
              + Carpeta
            </button>
            <label className="text-xs bg-[#374151] hover:bg-[#4b5563] rounded px-2 py-1 transition-colors duration-150 cursor-pointer">
              Examinar
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => onUpload(folder.id, e.target.files)}
                className="hidden"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {folder.folders.map((sub) => (
              <FolderIcon
                key={sub.id}
                folder={sub}
                onOpen={onOpenFolder}
                onMoveAsset={onMoveAsset}
              />
            ))}
            {folder.assets.map((asset) => (
              <DraggableAssetItem
                key={asset.id}
                asset={asset}
                folderId={folder.id}
                onAssetSelect={onAssetSelect}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
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
  onDragEnd: PropTypes.func,
  onMoveAsset: PropTypes.func,
  showPreview: PropTypes.func.isRequired,
  movePreview: PropTypes.func.isRequired,
  hidePreview: PropTypes.func.isRequired,
};

const DragLayerPreview = () => {
  const { isDragging, item, currentOffset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    item: monitor.getItem(),
    currentOffset: monitor.getClientOffset(),
  }));

  if (!isDragging || !item || !currentOffset) return null;

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{ top: currentOffset.y + 10, left: currentOffset.x + 10 }}
    >
      {item.url && (
        <img src={item.url} alt={item.name} className="w-16 h-16 object-contain" />
      )}
    </div>
  );
};

export default AssetSidebar;

