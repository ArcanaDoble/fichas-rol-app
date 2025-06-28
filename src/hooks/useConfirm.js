import { useCallback } from 'react';

const useConfirm = () => {
  const confirm = useCallback((message) => {
    return window.confirm(message);
  }, []);

  return confirm;
};

export default useConfirm; 