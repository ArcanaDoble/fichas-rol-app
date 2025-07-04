import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { nanoid } from 'nanoid';
import { FiChevronDown, FiChevronRight, FiTrash } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from 'react-dnd';

export const AssetTypes = { IMAGE: 'asset-image' };

const AssetSidebar = ({ onAssetSelect, onDragStart }) => {
  const [folders, setFolders] = useState(() => [
    { id: nanoid(), name: 'Enemigos', assets: [], open: true },
  ]);
  
  // Image preview data {url, x, y} shown on hover
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('assetSidebar');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFolders(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('assetSidebar', JSON.stringify(folders));
  }, [folders]);

  const addFolder = () => {
    const name = prompt('Nombre de la carpeta');
    if (name) {
      setFolders((fs) => [...fs, { id: nanoid(), name, assets: [], open: true }]);
    }
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
      fs.map((f) =>
        f.id === folderId ? { ...f, assets: [...f.assets, ...uploads] } : f
      )
    );
  };

  const toggleFolder = (id) => {
    setFolders((fs) => fs.map((f) => (f.id === id ? { ...f, open: !f.open } : f)));
  };

  const removeFolder = (id) => {
    setFolders((fs) => fs.filter((f) => f.id !== id));
  };

  const removeAsset = (folderId, assetId) => {
    setFolders((fs) =>
      fs.map((f) => {
        if (f.id !== folderId) return f;
        return { ...f, assets: f.assets.filter((a) => a.id !== assetId) };
      })
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
  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-gray-800 flex flex-col">
      <div className="p-2 border-b border-gray-700">
        <button
          onClick={addFolder}
          className="w-full bg-gray-700 hover:bg-gray-600 text-sm py-1 rounded"
        >
          + Carpeta
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <AnimatePresence>
          {folders.map((folder) => (
            <motion.div
              key={folder.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-700 rounded"
            >
              <div className="flex items-center justify-between px-2 py-1 hover:bg-gray-600">
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className="flex-1 text-left truncate flex items-center gap-1"
                >
                  {folder.open ? <FiChevronDown /> : <FiChevronRight />}
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
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFilesUpload(folder.id, e.target.files)}
                      className="text-sm w-full"
                    />
                    <div className="grid grid-cols-4 gap-2">
                      {folder.assets.map((asset) => {
                        const [{ isDragging }, drag] = useDrag(
                          () => ({
                            type: AssetTypes.IMAGE,
                            item: { url: asset.url, name: asset.name },
                            collect: (monitor) => ({
                              isDragging: monitor.isDragging(),
                            }),
                            begin: () => onDragStart?.({ url: asset.url, name: asset.name }),
                          }),
                          [asset, onDragStart]
                        );
                        return (
                          <div key={asset.id} className="text-center text-xs">
                            <div ref={drag} className="relative group" style={{ opacity: isDragging ? 0.5 : 1 }}>
                              <img
                                src={asset.url}
                                alt={asset.name}
                                className="w-16 h-16 object-contain rounded cursor-pointer hover:ring-2 hover:ring-blue-500"
                                onClick={() => onAssetSelect?.(asset)}
                                onMouseEnter={(e) => showPreview(asset, e)}
                                onMouseMove={movePreview}
                                onMouseLeave={hidePreview}
                              />
                              <button
                                onClick={() => removeAsset(folder.id, asset.id)}
                                className="absolute -top-1 -right-1 bg-gray-800 rounded-full p-0.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-400"
                              >
                                <FiTrash />
                              </button>
                            </div>
                            <span className="truncate block w-16 mx-auto">{asset.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
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
    </div>
  );
};

AssetSidebar.propTypes = {
  onAssetSelect: PropTypes.func,
  onDragStart: PropTypes.func,
};

export default AssetSidebar;
