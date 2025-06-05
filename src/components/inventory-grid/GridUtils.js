export const createGrid = (width, height) =>
  Array.from({ length: height }, () => Array(width).fill(null));

export const canPlaceItem = (grid, item, x, y) => {
  if (x < 0 || y < 0) return false;
  if (x + item.width > grid[0].length) return false;
  if (y + item.height > grid.length) return false;
  for (let i = 0; i < item.height; i++) {
    for (let j = 0; j < item.width; j++) {
      if (grid[y + i][x + j]) return false;
    }
  }
  return true;
};

export const placeItem = (grid, item, x, y) => {
  for (let i = 0; i < item.height; i++) {
    for (let j = 0; j < item.width; j++) {
      grid[y + i][x + j] = item.id;
    }
  }
};

export const removeItem = (grid, item) => {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === item.id) grid[row][col] = null;
    }
  }
};
