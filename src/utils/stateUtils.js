import { nanoid } from 'nanoid';
import { ESTADOS } from '../components/EstadoSelector';

const catalogById = new Map();
const catalogByName = new Map();

const normalizeKey = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

ESTADOS.forEach((estado) => {
  const idKey = normalizeKey(estado.id);
  const nameKey = normalizeKey(estado.name);
  if (!catalogById.has(idKey)) {
    catalogById.set(idKey, estado);
  }
  if (!catalogByName.has(nameKey)) {
    catalogByName.set(nameKey, estado);
  }
});

const slugify = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const findCatalogMatch = (value = '') => {
  const key = normalizeKey(value);
  if (!key) return null;
  return catalogById.get(key) || catalogByName.get(key) || null;
};

export const normalizeStateEntry = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = findCatalogMatch(trimmed);
    if (match) {
      return {
        id: match.id,
        label: match.name,
        icon: match.img,
        description: match.desc,
        source: 'catalog',
      };
    }
    const slug = slugify(trimmed);
    return {
      id: slug || nanoid(),
      label: trimmed,
      icon: null,
      description: '',
      source: 'custom',
    };
  }

  if (typeof value === 'object') {
    const baseId = value.id || value.slug || '';
    const baseLabel = value.label || value.name || value.nombre || baseId;
    const match = findCatalogMatch(baseId) || findCatalogMatch(baseLabel);
    if (match) {
      return {
        id: match.id,
        label: match.name,
        icon: match.img,
        description: match.desc,
        source: 'catalog',
      };
    }
    const label = baseLabel ? baseLabel.toString().trim() : '';
    const slug = slugify(baseId || label);
    return {
      id: slug || nanoid(),
      label: label || slug || 'Estado',
      icon: value.icon || value.img || null,
      description: value.description || value.desc || '',
      source: 'custom',
    };
  }

  return null;
};

export const normalizeStateList = (list = []) => {
  const map = new Map();
  list.forEach((item) => {
    const entry = normalizeStateEntry(item);
    if (entry && entry.id) {
      map.set(entry.id, entry);
    }
  });
  return Array.from(map.values());
};

export const toggleStateInList = (list = [], state) => {
  const entry = normalizeStateEntry(state);
  if (!entry || !entry.id) return normalizeStateList(list);
  const map = new Map();
  list.forEach((item) => {
    const normalized = normalizeStateEntry(item);
    if (normalized && normalized.id) {
      map.set(normalized.id, normalized);
    }
  });
  if (map.has(entry.id)) {
    map.delete(entry.id);
  } else {
    map.set(entry.id, entry);
  }
  return Array.from(map.values());
};

export const isStateActive = (list = [], state) => {
  const entry = normalizeStateEntry(state);
  if (!entry || !entry.id) return false;
  return list.some((item) => {
    const normalized = normalizeStateEntry(item);
    return normalized?.id === entry.id;
  });
};

export const catalogStates = ESTADOS.map((estado) => ({
  id: estado.id,
  label: estado.name,
  icon: estado.img,
  description: estado.desc,
}));

