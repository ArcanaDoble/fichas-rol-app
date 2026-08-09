export const CARD_BUILDER_PROJECT_FORMAT = 'fichas-rol-card-project';
export const CARD_BUILDER_PROJECT_VERSION = 1;
export const CARD_BUILDER_PNG_KEYWORD = 'FichasRolCardProject';

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

const encodeUtf8 = (value = '') => {
  const bytes = [];
  for (const character of String(value)) {
    const point = character.codePointAt(0);
    if (point <= 0x7f) {
      bytes.push(point);
    } else if (point <= 0x7ff) {
      bytes.push(0xc0 | (point >> 6), 0x80 | (point & 0x3f));
    } else if (point <= 0xffff) {
      bytes.push(
        0xe0 | (point >> 12),
        0x80 | ((point >> 6) & 0x3f),
        0x80 | (point & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (point >> 18),
        0x80 | ((point >> 12) & 0x3f),
        0x80 | ((point >> 6) & 0x3f),
        0x80 | (point & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
};

const decodeUtf8 = (bytes = []) => {
  let result = '';
  for (let index = 0; index < bytes.length;) {
    const first = bytes[index];
    let point;
    let size;
    if (first < 0x80) {
      point = first;
      size = 1;
    } else if ((first & 0xe0) === 0xc0) {
      point = ((first & 0x1f) << 6) | (bytes[index + 1] & 0x3f);
      size = 2;
    } else if ((first & 0xf0) === 0xe0) {
      point = ((first & 0x0f) << 12)
        | ((bytes[index + 1] & 0x3f) << 6)
        | (bytes[index + 2] & 0x3f);
      size = 3;
    } else if ((first & 0xf8) === 0xf0) {
      point = ((first & 0x07) << 18)
        | ((bytes[index + 1] & 0x3f) << 12)
        | ((bytes[index + 2] & 0x3f) << 6)
        | (bytes[index + 3] & 0x3f);
      size = 4;
    } else {
      throw new Error('INVALID_UTF8');
    }
    if (index + size > bytes.length) throw new Error('INVALID_UTF8');
    result += String.fromCodePoint(point);
    index += size;
  }
  return result;
};

const readUint32 = (bytes, offset) => (
  (((bytes[offset] << 24) >>> 0)
    | (bytes[offset + 1] << 16)
    | (bytes[offset + 2] << 8)
    | bytes[offset + 3]) >>> 0
);

const writeUint32 = (bytes, offset, value) => {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
};

const concatBytes = (...parts) => {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
};

const getChunkType = (bytes, offset) => String.fromCharCode(
  bytes[offset + 4],
  bytes[offset + 5],
  bytes[offset + 6],
  bytes[offset + 7],
);

const assertPng = (bytes) => {
  if (!(bytes instanceof Uint8Array) || bytes.length < PNG_SIGNATURE.length) {
    throw new Error('INVALID_PNG');
  }
  const validSignature = PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
  if (!validSignature) throw new Error('INVALID_PNG');
};

const buildChunk = (type, data) => {
  const typeBytes = new Uint8Array([...type].map((character) => character.charCodeAt(0)));
  const chunk = new Uint8Array(12 + data.length);
  writeUint32(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  writeUint32(chunk, 8 + data.length, crc32(concatBytes(typeBytes, data)));
  return chunk;
};

const readProjectFromInternationalText = (data) => {
  const keywordEnd = data.indexOf(0);
  if (keywordEnd < 0) return null;
  const keyword = String.fromCharCode(...data.slice(0, keywordEnd));
  if (keyword !== CARD_BUILDER_PNG_KEYWORD) return null;

  const compressionFlagOffset = keywordEnd + 1;
  const compressionFlag = data[compressionFlagOffset];
  if (compressionFlag !== 0) throw new Error('UNSUPPORTED_PNG_METADATA_COMPRESSION');

  let cursor = compressionFlagOffset + 2;
  const languageEnd = data.indexOf(0, cursor);
  if (languageEnd < 0) throw new Error('INVALID_PNG_METADATA');
  cursor = languageEnd + 1;
  const translatedKeywordEnd = data.indexOf(0, cursor);
  if (translatedKeywordEnd < 0) throw new Error('INVALID_PNG_METADATA');
  cursor = translatedKeywordEnd + 1;
  return decodeUtf8(data.slice(cursor));
};

export const createCardBuilderProject = (card, exportedAt = new Date().toISOString()) => ({
  format: CARD_BUILDER_PROJECT_FORMAT,
  version: CARD_BUILDER_PROJECT_VERSION,
  exportedAt,
  card: JSON.parse(JSON.stringify(card || {})),
});

export const parseCardBuilderProject = (input) => {
  let project;
  try {
    project = typeof input === 'string' ? JSON.parse(input) : input;
  } catch (error) {
    throw new Error('INVALID_CARD_PROJECT_JSON');
  }
  if (!project || project.format !== CARD_BUILDER_PROJECT_FORMAT || !project.card) {
    throw new Error('INVALID_CARD_PROJECT');
  }
  if (!Number.isInteger(project.version) || project.version < 1) {
    throw new Error('INVALID_CARD_PROJECT_VERSION');
  }
  if (project.version > CARD_BUILDER_PROJECT_VERSION) {
    throw new Error('CARD_PROJECT_VERSION_TOO_NEW');
  }
  return project;
};

export const embedCardBuilderProjectInPng = (pngBytes, projectInput) => {
  const bytes = pngBytes instanceof Uint8Array ? pngBytes : new Uint8Array(pngBytes);
  assertPng(bytes);
  const project = parseCardBuilderProject(projectInput);
  const keyword = new Uint8Array([...CARD_BUILDER_PNG_KEYWORD].map((character) => character.charCodeAt(0)));
  const text = encodeUtf8(JSON.stringify(project));
  const metadata = concatBytes(
    keyword,
    new Uint8Array([0, 0, 0, 0, 0]),
    text,
  );
  const metadataChunk = buildChunk('iTXt', metadata);

  const chunks = [bytes.slice(0, PNG_SIGNATURE.length)];
  let offset = PNG_SIGNATURE.length;
  let foundEnd = false;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error('INVALID_PNG');
    const type = getChunkType(bytes, offset);
    if (type === 'IEND') {
      chunks.push(metadataChunk);
      chunks.push(bytes.slice(offset, end));
      foundEnd = true;
      break;
    }
    chunks.push(bytes.slice(offset, end));
    offset = end;
  }
  if (!foundEnd) throw new Error('INVALID_PNG');
  return concatBytes(...chunks);
};

export const extractCardBuilderProjectFromPng = (pngBytes) => {
  const bytes = pngBytes instanceof Uint8Array ? pngBytes : new Uint8Array(pngBytes);
  assertPng(bytes);
  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const dataStart = offset + 8;
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error('INVALID_PNG');
    const type = getChunkType(bytes, offset);
    if (type === 'iTXt') {
      const projectText = readProjectFromInternationalText(bytes.slice(dataStart, dataStart + length));
      if (projectText) return parseCardBuilderProject(projectText);
    }
    if (type === 'IEND') break;
    offset = end;
  }
  throw new Error('CARD_PROJECT_NOT_FOUND');
};
