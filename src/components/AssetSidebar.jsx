import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { nanoid } from 'nanoid';
import { FiChevronDown, FiChevronRight, FiTrash } from 'react-icons/fi';

const AssetSidebar = ({ onAssetSelect }) => {
  const [folders, setFolders] = useState(() => [
    { id: nanoid(), name: 'Enemigos', assets: [], open: true },
  ]);

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

  const handleFilesUpload = (folderId, files) => {
    if (!files) return;
    setFolders((fs) =>
      fs.map((f) => {
        if (f.id !== folderId) return f;
        const newAssets = [...f.assets];
        Array.from(files).forEach((file) => {
          const url = URL.createObjectURL(file);
          const name = file.name.replace(/\.[^/.]+$/, '');
          newAssets.push({ id: nanoid(), name, url });
        });
        return { ...f, assets: newAssets };
      })
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
        {folders.map((folder) => (
          <div key={folder.id} className="bg-gray-700 rounded">
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
            {folder.open && (
              <div className="p-2 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFilesUpload(folder.id, e.target.files)}
                  className="text-sm w-full"
                />
                <div className="grid grid-cols-4 gap-2">
                  {folder.assets.map((asset) => (
                    <div key={asset.id} className="text-center text-xs">
                      <div className="relative group">
                        <img
                          src={asset.url}
                          alt={asset.name}
                          className="w-16 h-16 object-cover rounded cursor-pointer hover:ring-2 hover:ring-blue-500"
                          onClick={() => onAssetSelect?.(asset)}
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
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

AssetSidebar.propTypes = {
  onAssetSelect: PropTypes.func,
};

export default AssetSidebar;
