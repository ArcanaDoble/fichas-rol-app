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
  FiMessageCircle,
  FiX,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag, useDrop, useDragLayer } from 'react-dnd';
import { getOrUploadFile } from '../utils/storage';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import Input from './Input';
import { rollExpression } from '../utils/dice';

const highlightBattleText = (text) =>
  text
    .replace(
      /(recibe daño)/gi,
      '<span class="text-red-400 font-semibold">$1</span>'
    )
    .replace(
      /(bloquea el ataque)/gi,
      '<span class="text-green-400 font-semibold">$1</span>'
    )
    .replace(
      /(resiste el ataque|resiste el daño)/gi,
      '<span class="text-blue-400 font-semibold">$1</span>'
    )
    .replace(
      /(contraataca)/gi,
      '<span class="text-yellow-400 font-semibold">$1</span>'
    );

const MASTER_COLOR = "#FFD700";

const EMPTY_IMAGE = new Image();
EMPTY_IMAGE.src =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

export const AssetTypes = { IMAGE: 'asset-image' };

const AssetSidebar = ({
  onAssetSelect,
  onDragStart,
  onDragEnd,
  className = '',
  isMaster = false,
  playerName = '',
}) => {
  const [folders, setFolders] = useState([]);
  const prevFoldersRef = useRef([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('assets');
  const [messages, setMessages] = useState([]);
  const prevMessagesRef = useRef([]);
  const [message, setMessage] = useState('');
  const [chatLoaded, setChatLoaded] = useState(false);
  const [tokenSearch, setTokenSearch] = useState('');

  // Flags para evitar sobrescribir datos justo tras la carga inicial
  const initialFolders = useRef(true);
  const initialChat = useRef(true);

  // Preview element shown on hover without triggering re-renders
  const previewRef = useRef(null);
  const isDragging = useDragLayer((monitor) => monitor.isDragging());

  useEffect(() => {
    const el = document.createElement('div');
    el.className = 'pointer-events-none fixed z-50 hidden';
    const img = document.createElement('img');
    img.className = 'max-w-[256px] max-h-[256px]';
    el.appendChild(img);
    document.body.appendChild(el);
    previewRef.current = el;
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  useEffect(() => {
    // Determinar el documento de Firebase según el tipo de usuario
    const docPath = isMaster ? 'assetSidebar' : `players/${playerName}/assets`;
    const docId = isMaster ? 'state' : 'folders';
    const ref = doc(db, docPath, docId);

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
          // Configuración inicial diferente para jugadores vs master
          const localStorageKey = isMaster ? 'assetSidebar' : `assetSidebar_${playerName}`;
          const stored = localStorage.getItem(localStorageKey);
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
            // Carpetas por defecto diferentes para jugadores
            const defaultFolders = isMaster
              ? [
                  {
                    id: nanoid(),
                    name: 'Enemigos',
                    assets: [],
                    folders: [],
                    open: true,
                  },
                ]
              : [
                  {
                    id: nanoid(),
                    name: 'Mis Tokens',
                    assets: [],
                    folders: [],
                    open: true,
                  },
                ];
            setFolders(defaultFolders);
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
  }, [isMaster, playerName]);

  // Cargar mensajes de chat desde Firebase (con fallback a localStorage)
  useEffect(() => {
    const ref = doc(db, 'assetSidebar', 'chat');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setMessages(snap.data().messages || []);
        } else {
          const stored = localStorage.getItem('sidebarChat');
          if (stored) {
            try {
              setMessages(JSON.parse(stored));
            } catch {
              // ignore
            }
          }
        }
        setChatLoaded(true);
      },
      (error) => {
        console.error(error);
        const stored = localStorage.getItem('sidebarChat');
        if (stored) {
          try {
            setMessages(JSON.parse(stored));
          } catch {
            // ignore
          }
        }
        setChatLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!chatLoaded) return;
    if (initialChat.current) {
      initialChat.current = false;
      prevMessagesRef.current = messages;
      return;
    }
    if (JSON.stringify(prevMessagesRef.current) === JSON.stringify(messages)) return;
    localStorage.setItem('sidebarChat', JSON.stringify(messages));
    setDoc(doc(db, 'assetSidebar', 'chat'), { messages }).catch(console.error);
    prevMessagesRef.current = messages;
  }, [messages, chatLoaded]);

  useEffect(() => {
    if (!loaded) return;
    if (initialFolders.current) {
      initialFolders.current = false;
      prevFoldersRef.current = folders;
      return;
    }
    if (JSON.stringify(prevFoldersRef.current) === JSON.stringify(folders)) return;

    // Guardar en localStorage con clave específica por usuario
    const localStorageKey = isMaster ? 'assetSidebar' : `assetSidebar_${playerName}`;
    localStorage.setItem(localStorageKey, JSON.stringify(folders));

    // Guardar en Firebase con estructura separada por usuario
    const docPath = isMaster ? 'assetSidebar' : `players/${playerName}/assets`;
    const docId = isMaster ? 'state' : 'folders';
    setDoc(doc(db, docPath, docId), { folders }).catch(console.error);

    prevFoldersRef.current = folders;
  }, [folders, loaded, isMaster, playerName]);

  const updateFolders = (list, id, updater) =>
    list.map((f) =>
      f.id === id
        ? updater(f)
        : { ...f, folders: updateFolders(f.folders, id, updater) }
    );

  const addFolder = (parentId = null) => {
    const name = prompt('Nombre de la carpeta');
    if (!name) return;
    const newFolder = {
      id: nanoid(),
      name,
      assets: [],
      folders: [],
      open: true,
    };
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
          // Usar rutas específicas por usuario para organizar assets
          const basePath = isMaster ? 'canvas-assets' : `canvas-assets/players/${playerName}`;
          const { url } = await getOrUploadFile(file, basePath);
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
          ...uploads.filter((u) => u && !f.assets.some((a) => a.url === u.url)),
        ],
      }))
    );
  };

  const toggleFolder = (id) => {
    setFolders((fs) => updateFolders(fs, id, (f) => ({ ...f, open: !f.open })));
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
          f.id === fromId
            ? f.assets.filter((a) => a.id !== asset.id)
            : f.assets,
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
    const el = previewRef.current;
    if (el) {
      const img = el.firstChild;
      if (img) img.src = asset.url;
      el.style.top = `${e.clientY + 10}px`;
      el.style.left = `${e.clientX + 10}px`;
      el.classList.remove('hidden');
    }
  };
  const movePreview = (e) => {
    if (isDragging) return;
    const el = previewRef.current;
    if (el) {
      el.style.top = `${e.clientY + 10}px`;
      el.style.left = `${e.clientX + 10}px`;
    }
  };
  const hidePreview = () => {
    if (!isDragging && previewRef.current) {
      previewRef.current.classList.add('hidden');
    }
  };

  const handleDragStart = () => {
    if (previewRef.current) previewRef.current.classList.add('hidden');
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

  const searchAssets = (list, term, path = []) => {
    let results = [];
    for (const f of list) {
      const newPath = [...path, f.name];
      results = results.concat(
        f.assets
          .filter((a) => a.name.toLowerCase().includes(term))
          .map((a) => ({ asset: a, folderId: f.id, path: newPath }))
      );
      results = results.concat(searchAssets(f.folders, term, newPath));
    }
    return results;
  };

  // Función para generar color único basado en el nombre del jugador
  const getPlayerColor = (playerName) => {
    if (!playerName || playerName === 'Master') return MASTER_COLOR; // Dorado para master

    // Generar hash simple del nombre
    let hash = 0;
    for (let i = 0; i < playerName.length; i++) {
      hash = playerName.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Convertir hash a color HSL para mejor distribución de colores
    const hue = Math.abs(hash) % 360;
    const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
    const lightness = 55 + (Math.abs(hash) % 15); // 55-70%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const sendMessage = () => {
    const text = message.trim();
    if (!text) return;
    const author = isMaster ? 'Master' : playerName || 'Anónimo';
    let result = null;
    if (/^[0-9dD+\-*/().,% ]+$/.test(text) && /\d/.test(text)) {
      try {
        result = rollExpression(text);
      } catch {
        result = null;
      }
    }
    const newMsg = { id: nanoid(), author, text, result };
    setMessages((msgs) => [...msgs, newMsg]);
    setMessage('');
  };

  const deleteMessage = (id) => {
    setMessages((msgs) => msgs.filter((m) => m.id !== id));
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
            <span className="text-gray-200 font-semibold truncate">
              {folder.name}
            </span>
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
                    onChange={(e) =>
                      handleFilesUpload(folder.id, e.target.files)
                    }
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
    <div
      className={`fixed right-0 top-0 h-screen w-[320px] bg-[#1f2937] border-l border-[#2d3748] p-3 flex flex-col overflow-y-auto overscroll-y-contain scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent ${className}`}
    >
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setTab('chat')}
          className={`p-1 rounded flex-1 flex justify-center ${
            tab === 'chat' ? 'bg-[#374151]' : 'bg-[#1f2937]'
          }`}
        >
          <FiMessageCircle />
        </button>
        <button
          onClick={() => setTab('assets')}
          className={`p-1 rounded flex-1 flex justify-center ${
            tab === 'assets' ? 'bg-[#374151]' : 'bg-[#1f2937]'
          }`}
        >
          <FiFolder />
        </button>
      </div>

      {tab === 'assets' && (
        <>
          <div className="mb-3">
            <button
              onClick={() => addFolder()}
              className="w-full text-xs bg-[#374151] hover:bg-[#4b5563] rounded px-2 py-1 transition-colors duration-150"
            >
              + Carpeta
            </button>
          </div>
          <div className="mb-3">
            <Input
              placeholder="Buscar token..."
              value={tokenSearch}
              onChange={(e) => setTokenSearch(e.target.value)}
              clearable
            />
          </div>
          {tokenSearch.trim() ? (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {searchAssets(folders, tokenSearch.trim().toLowerCase()).map((r) => (
                  <div key={r.asset.id} className="text-center text-xs">
                    <DraggableAssetItem
                      asset={r.asset}
                      folderId={r.folderId}
                      onAssetSelect={onAssetSelect}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onRemove={removeAsset}
                      showPreview={showPreview}
                      movePreview={movePreview}
                      hidePreview={hidePreview}
                    />
                    <span className="block text-gray-400 truncate w-full">
                      {r.path.join(' / ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-2">
              <AnimatePresence>
                {folders.map((folder) => (
                  <FolderItem key={folder.id} folder={folder} level={0} />
                ))}
              </AnimatePresence>
            </div>
          )}
          {/* previewRef portal appended to body */}
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
        </>
      )}

      {tab === 'chat' && (
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex-1 overflow-y-auto space-y-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className="bg-gray-700/50 p-2 rounded flex items-start gap-2"
              >
                <div className="flex-1 mr-2 min-w-0 space-y-1">
                  {m.doorCheck ? (
                    <div className="text-gray-200">
                      <span
                        className="font-semibold mr-1"
                        style={{ color: getPlayerColor(m.author), textShadow: m.author === 'Master' ? '0 0 4px ' + MASTER_COLOR : 'none' }}
                      >
                        {m.author}
                      </span>
                      <span className="mr-1">intenta abrir una puerta.</span>
                      <span className={m.success ? 'text-green-400' : 'text-red-400'}>
                        {m.success ? 'Superado' : 'No superado'}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span
                        className="font-semibold mr-1"
                        style={{ color: getPlayerColor(m.author), textShadow: m.author === 'Master' ? '0 0 4px ' + MASTER_COLOR : 'none' }}
                      >
                        {m.author}:
                      </span>
                      <span
                        className="text-gray-200 break-words"
                        dangerouslySetInnerHTML={{ __html: highlightBattleText(m.text) }}
                      />
                    </div>
                  )}
                  {m.result && (
                    <div className="bg-green-900/20 border border-green-600/50 rounded p-2 ml-4 text-xs text-gray-100 space-y-1">
                      <p className="text-center text-green-400 font-semibold">
                        🎲 Resultado
                      </p>
                      <div className="space-y-1">
                        {m.result.details.map((d, i) => {
                          const match =
                            d.type === 'dice'
                              ? d.formula.match(/d(\d+)/)
                              : null;
                          const sides = match ? match[1] : null;
                          const img =
                            sides &&
                            [4, 6, 8, 10, 12, 20, 100].includes(Number(sides))
                              ? `/dados/calculadora/calculadora-D${sides}.png`
                              : null;
                          return (
                            <div
                              key={i}
                              className="bg-gray-800/50 rounded p-1 text-center"
                            >
                              {d.type === 'dice' && (
                                <span className="flex items-center justify-center gap-1">
                                  {img && (
                                    <img
                                      src={img}
                                      alt={`d${sides}`}
                                      className="w-4 h-4"
                                    />
                                  )}
                                  {d.formula}: [{d.rolls.join(', ')}] ={' '}
                                  {d.subtotal}
                                </span>
                              )}
                              {d.type === 'modifier' && (
                                <span>Modificador: {d.formula}</span>
                              )}
                              {d.type === 'calc' && (
                                <span>Resultado: {d.value}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-center text-green-400 font-bold">
                        Total: {m.result.total}
                      </div>
                    </div>
                  )}
                </div>
                {isMaster && (
                  <button
                    onClick={() => deleteMessage(m.id)}
                    className="text-red-400 hover:text-red-300 flex-shrink-0"
                  >
                    <FiTrash />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder="Mensaje..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
              }}
            />
            <button
              className="text-xs bg-[#374151] hover:bg-[#4b5563] rounded px-2 py-1 transition-colors duration-150"
              onClick={sendMessage}
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

AssetSidebar.propTypes = {
  onAssetSelect: PropTypes.func,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func,
  className: PropTypes.string,
  isMaster: PropTypes.bool,
  playerName: PropTypes.string,
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
      item: () => {
        const data = {
          id: asset.id,
          name: asset.name,
          url: asset.url,
          fromFolderId: folderId,
        };
        onDragStart?.(data);
        return data;
      },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
      end: () => {
        onDragEnd?.();
      },
    }),
    [asset, folderId, onDragStart, onDragEnd]
  );

  useEffect(() => {
    preview(EMPTY_IMAGE, { captureDraggingState: true });
  }, [preview]);
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
          onMouseDown={hidePreview}
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
      <span className="truncate block w-14 mx-auto text-gray-300">
        {asset.name}
      </span>
    </div>
  );
};

DraggableAssetItem.propTypes = {
  asset: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
  }).isRequired,
  folderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
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
      <span className="truncate block w-16 mx-auto text-gray-300">
        {folder.name}
      </span>
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
        <img
          src={item.url}
          alt={item.name}
          className="w-16 h-16 object-contain"
        />
      )}
    </div>
  );
};

export default React.memo(AssetSidebar);
