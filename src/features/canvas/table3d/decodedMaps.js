// A newly authorized map is decoded before it replaces the one on the table.
// The map hook keeps ownership of the object URL and drops it on replacement.
export const decodedMaps = new Map();
