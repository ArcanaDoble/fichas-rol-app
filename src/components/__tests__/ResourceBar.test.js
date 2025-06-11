import { render } from '@testing-library/react';
import ResourceBar from '../ResourceBar';

test('renders correct number of circles', () => {
  const { container } = render(
    <ResourceBar color="#fff" base={3} actual={1} buff={1} max={5} />
  );
  const circles = container.firstChild.querySelectorAll('div');
  expect(circles).toHaveLength(5);
});
