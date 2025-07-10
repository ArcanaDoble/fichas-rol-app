import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmProvider, useConfirm } from '../Confirm';
import React from 'react';

function TestComponent() {
  const confirm = useConfirm();
  const [result, setResult] = React.useState('');
  const handleClick = async () => {
    const ok = await confirm('¿Seguro?');
    setResult(ok ? 'yes' : 'no');
  };
  return (
    <div>
      <button onClick={handleClick}>delete</button>
      <span data-testid="result">{result}</span>
    </div>
  );
}

test('shows confirmation modal and resolves', async () => {
  render(
    <ConfirmProvider>
      <TestComponent />
    </ConfirmProvider>
  );

  fireEvent.click(screen.getByText('delete'));
  expect(screen.getByText('¿Seguro?')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /aceptar/i }));
  expect(screen.queryByText('¿Seguro?')).not.toBeInTheDocument();
  const result = await screen.findByTestId('result');
  expect(result).toHaveTextContent('yes');
});
