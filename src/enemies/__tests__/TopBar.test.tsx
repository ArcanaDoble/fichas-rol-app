import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopBar from '../TopBar';

test('calls search handler', async () => {
  const onSearch = jest.fn();
  const onFilter = jest.fn();
  render(<TopBar tags={['orc']} onSearch={onSearch} onFilter={onFilter} />);
  await userEvent.type(screen.getByRole('searchbox'), 'orc');
  expect(onSearch).toHaveBeenCalled();
});
