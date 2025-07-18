import { nanoid } from 'nanoid';

export const createToken = (data = {}) => ({
  ...data,
  tokenSheetId: nanoid(),
});
