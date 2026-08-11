import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import RogueliteTalentsPanel from '../RogueliteTalentsPanel';

jest.mock(
  'react-easy-crop',
  () =>
    function CropperMock() {
      return <div data-testid="cropper" />;
    }
);

jest.mock('../../utils/storage', () => ({ uploadDataUrl: jest.fn() }));

describe('RogueliteTalentsPanel overlays', () => {
  test('mounts the image editor directly under document.body above every sheet stacking context', () => {
    render(
      <div style={{ transform: 'translateZ(0)' }}>
        <RogueliteTalentsPanel
          role="master"
          classId="barbarian"
          resource={{ name: 'Furia', image: 'resource.png' }}
          talentCatalog={[]}
          equippedTalentIds={[]}
        />
      </div>
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Editar imagen del recurso de clase' })
    );

    const dialog = screen.getByRole('dialog', { name: 'Ajustar imagen' });
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog).toHaveStyle({ zIndex: '2147483647' });
    expect(screen.getByTestId('cropper')).toBeInTheDocument();
  });
});
