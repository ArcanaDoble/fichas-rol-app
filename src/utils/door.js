export function applyDoorCheck(wall, roll) {
  if (wall.door !== 'closed') return { ...wall };
  if (roll >= (wall.difficulty || 1)) {
    return { ...wall, door: 'open', difficulty: 0 };
  }
  return { ...wall };
}
