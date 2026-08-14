import {
  getStorage,
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  getMetadata,
  deleteObject,
} from 'firebase/storage';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

const storage = getStorage();

const LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB
const USAGE_DOC = doc(db, 'storageUsage', 'usage');
const DEFAULT_IMAGE_OPTIMIZATION = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.82,
};

const IMAGE_UPLOAD_PRESETS = {
  CanvasTokens: { maxWidth: 768, maxHeight: 768, quality: 0.86 },
  CanvasCards: { maxWidth: 1400, maxHeight: 1400, quality: 0.86 },
  CanvasMaps: { maxWidth: 4096, maxHeight: 4096, quality: 0.84 },
  'canvas-assets': { maxWidth: 1024, maxHeight: 1024, quality: 0.84 },
  custom_icons: { maxWidth: 512, maxHeight: 512, quality: 0.86 },
  'roguelite-class-assets': { maxWidth: 1600, maxHeight: 1600, quality: 0.86 },
  'roguelite-enemy-assets': { maxWidth: 1600, maxHeight: 1600, quality: 0.86 },
  MinimapaIcons: { maxWidth: 512, maxHeight: 512, quality: 0.86 },
  RouteMapIcons: { maxWidth: 512, maxHeight: 512, quality: 0.86 },
};

const safePath = (path) =>
  path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const isOptimizableImageFile = (file) => (
  file &&
  typeof file.type === 'string' &&
  /^image\/(png|jpe?g|webp)$/i.test(file.type)
);

const getUploadPreset = (basePath = '') => {
  const match = Object.entries(IMAGE_UPLOAD_PRESETS)
    .find(([prefix]) => basePath === prefix || basePath.startsWith(`${prefix}/`));
  return match ? match[1] : DEFAULT_IMAGE_OPTIMIZATION;
};

const getBaseFilename = (name = 'image') => (
  name.replace(/\.[^/.]+$/, '') || 'image'
);

const withWebpExtension = (path) => (
  /\.[^/.]+$/.test(path) ? path.replace(/\.[^/.]+$/, '.webp') : `${path}.webp`
);

const loadImageElement = (file) => new Promise((resolve, reject) => {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('No se pudo optimizar la imagen seleccionada'));
  };
  image.src = objectUrl;
});

const canvasToWebpBlob = (canvas, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) {
      resolve(blob);
    } else {
      reject(new Error('El navegador no pudo generar WebP'));
    }
  }, 'image/webp', quality);
});

export const optimizeImageFile = async (file, options = {}) => {
  if (!isOptimizableImageFile(file)) {
    return {
      file,
      optimized: false,
      originalSize: file?.size || 0,
      optimizedSize: file?.size || 0,
    };
  }
  if (typeof Image === 'undefined' || typeof document === 'undefined' || typeof URL === 'undefined') {
    return {
      file,
      optimized: false,
      originalSize: file.size,
      optimizedSize: file.size,
    };
  }

  const { maxWidth, maxHeight, quality } = {
    ...DEFAULT_IMAGE_OPTIMIZATION,
    ...options,
  };
  const image = await loadImageElement(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) {
    return {
      file,
      optimized: false,
      originalSize: file.size,
      optimizedSize: file.size,
    };
  }

  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx || typeof canvas.toBlob !== 'function') {
    return {
      file,
      optimized: false,
      originalSize: file.size,
      optimizedSize: file.size,
    };
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const blob = await canvasToWebpBlob(canvas, quality);
  const optimizedFile = new File(
    [blob],
    `${getBaseFilename(file.name)}.webp`,
    {
      type: 'image/webp',
      lastModified: file.lastModified || Date.now(),
    }
  );

  return {
    file: optimizedFile,
    optimized: true,
    originalSize: file.size,
    optimizedSize: optimizedFile.size,
    originalType: file.type,
  };
};

const optimizeDataUrl = async (dataUrl, options = {}) => {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return { dataUrl, size: 0, optimized: false };
  }

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], 'image', { type: blob.type || 'image/png' });
  const result = await optimizeImageFile(file, options);
  const reader = new FileReader();

  const optimizedDataUrl = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen optimizada'));
    reader.readAsDataURL(result.file);
  });

  return {
    dataUrl: optimizedDataUrl,
    size: result.optimizedSize,
    optimized: result.optimized,
  };
};

export const getUsage = async () => {
  const snap = await getDoc(USAGE_DOC);
  return snap.exists() ? snap.data().bytesUsed || 0 : 0;
};

const updateUsage = async (delta) => {
  const current = await getUsage();
  await setDoc(USAGE_DOC, { bytesUsed: current + delta });
};

export const uploadFile = async (file, path) => {
  const { file: uploadable, optimized } = await optimizeImageFile(file);
  const uploadPath = optimized
    ? withWebpExtension(path)
    : path;
  const current = await getUsage();
  if (current + uploadable.size > LIMIT_BYTES) {
    throw new Error('Límite de almacenamiento superado');
  }
  const storageRef = ref(storage, safePath(uploadPath));
  try {
    await uploadBytes(storageRef, uploadable, {
      contentType: uploadable.type || file.type || undefined,
    });
  } catch (err) {
    const msg = err?.message?.toLowerCase() || '';
    if (msg.includes('cors') || msg.includes('network')) {
      throw new Error('Error de red o CORS al subir archivo');
    }
    throw err;
  }
  await updateUsage(uploadable.size);
  return getDownloadURL(storageRef);
};

export const uploadDataUrl = async (dataUrl, path) => {
  const optimized = await optimizeDataUrl(dataUrl, getUploadPreset(path));
  const uploadableDataUrl = optimized.dataUrl;
  const uploadPath = optimized.optimized
    ? withWebpExtension(path)
    : path;
  const base64 = uploadableDataUrl.split(',')[1] || '';
  const size = optimized.size || Math.ceil((base64.length * 3) / 4);
  const current = await getUsage();
  if (current + size > LIMIT_BYTES) {
    throw new Error('Límite de almacenamiento superado');
  }
  const storageRef = ref(storage, safePath(uploadPath));
  try {
    await uploadString(storageRef, uploadableDataUrl, 'data_url');
  } catch (err) {
    const msg = err?.message?.toLowerCase() || '';
    if (msg.includes('cors') || msg.includes('network')) {
      throw new Error('Error de red o CORS al subir archivo');
    }
    throw err;
  }
  await updateUsage(size);
  return getDownloadURL(storageRef);
};

export const getFileHash = async (fileOrDataUrl) => {
  let buffer;
  if (typeof fileOrDataUrl === 'string') {
    const base64 = fileOrDataUrl.split(',')[1] || '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    buffer = bytes.buffer;
  } else {
    buffer = await fileOrDataUrl.arrayBuffer();
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const getOrUploadFile = async (file, basePath = 'Mapas') => {
  const optimized = await optimizeImageFile(file, getUploadPreset(basePath));
  const uploadableFile = optimized.file;
  const hash = await getFileHash(uploadableFile);
  const ext = uploadableFile.name.split('.').pop().toLowerCase();
  const path = `${basePath}/${hash}.${ext}`;
  const storageRef = ref(storage, safePath(path));
  let exists = true;
  try {
    await getMetadata(storageRef);
  } catch {
    exists = false;
  }
  if (!exists) {
    const current = await getUsage();
    if (current + uploadableFile.size > LIMIT_BYTES) {
      throw new Error('Límite de almacenamiento superado');
    }
    await uploadBytes(storageRef, uploadableFile, {
      contentType: uploadableFile.type || file.type || undefined,
    });
    await updateUsage(uploadableFile.size);
  }
  const url = await getDownloadURL(storageRef);
  const refDoc = doc(db, 'fileRefs', hash);
  await setDoc(refDoc, {
    url,
    count: increment(1),
    contentType: uploadableFile.type || file.type || null,
    originalSize: optimized.originalSize || file.size || null,
    storedSize: uploadableFile.size || null,
    optimized: optimized.optimized || false,
  }, { merge: true });
  return { url, hash, optimized: optimized.optimized || false };
};

export const releaseFile = async (hash) => {
  const refDoc = doc(db, 'fileRefs', hash);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) return;
  const data = snap.data();
  const newCount = (data.count || 1) - 1;
  if (newCount <= 0) {
    const encoded = data.url.split('/o/')[1].split('?')[0];
    const path = decodeURIComponent(encoded);
    const storageRef = ref(storage, safePath(path));
    let size = 0;
    try {
      const meta = await getMetadata(storageRef);
      size = meta.size || 0;
    } catch {}
    await deleteObject(storageRef);
    await updateUsage(-size);
    await deleteDoc(refDoc);
  } else {
    await updateDoc(refDoc, { count: increment(-1) });
  }
};
