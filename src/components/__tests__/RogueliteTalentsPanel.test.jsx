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

  test('renders Habilidades equipadas section and allows equipping duplicate copies', () => {
    const handleSkillChange = jest.fn();
    const abilityCatalog = [
      { id: 'fireball', name: 'Bola de Fuego', description: 'Explosión de fuego', _category: 'abilities' },
      { id: 'heal', name: 'Curación', description: 'Restaura vida', _category: 'abilities' },
    ];

    render(
      <RogueliteTalentsPanel
        role="player"
        classId="mage"
        resource={{ name: 'Maná' }}
        talentCatalog={[]}
        equippedTalentIds={[null, null, null]}
        equippedSkillIds={['fireball', null, null]}
        abilityCatalog={abilityCatalog}
        onEquippedSkillIdsChange={handleSkillChange}
      />
    );

    expect(screen.getByTestId('equipped-skills-section')).toBeInTheDocument();
    expect(screen.getByText('Habilidades equipadas')).toBeInTheDocument();
    expect(screen.getAllByText('Bola de Fuego').length).toBeGreaterThan(0);

    // Click slot 2 to open selector modal
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar habilidad para ranura 2' }));

    expect(screen.getByRole('dialog', { name: 'Elegir habilidad para la ranura 2' })).toBeInTheDocument();

    // Click 'Bola de Fuego' again to equip a second copy in slot 2
    const fireballButtons = screen.getAllByRole('button', { name: /Bola de Fuego/i });
    fireEvent.click(fireballButtons[fireballButtons.length - 1]);

    expect(handleSkillChange).toHaveBeenCalledWith(['fireball', 'fireball', null]);
  });

  test('resolves a stored secondary id instead of exposing it as the skill name', () => {
    render(
      <RogueliteTalentsPanel
        role="player"
        classId="mage"
        resource={{ name: 'Maná' }}
        talentCatalog={[]}
        equippedTalentIds={[null, null, null]}
        equippedSkillIds={['legacy-fireball-id', null, null]}
        abilityCatalog={[{
          id: 'legacy-fireball-id',
          templateId: 'abilities:bola-de-fuego',
          name: 'Bola de Fuego',
          _category: 'abilities',
        }]}
      />
    );

    expect(screen.getAllByText('Bola de Fuego').length).toBeGreaterThan(0);
    expect(screen.queryByText('legacy-fireball-id')).not.toBeInTheDocument();
  });

  test('shows the inventory-associated image in equipped slots and the available skills selector', () => {
    render(
      <RogueliteTalentsPanel
        role="player"
        classId="mage"
        resource={{ name: 'Maná' }}
        talentCatalog={[]}
        equippedTalentIds={[null, null, null]}
        equippedSkillIds={['fireball', null, null]}
        abilityCatalog={[{
          id: 'fireball',
          name: 'Bola de Fuego',
          imageUrl: 'https://assets.example/fireball.webp',
          _category: 'abilities',
        }]}
      />
    );

    expect(document.querySelectorAll('img[src="https://assets.example/fireball.webp"]')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar habilidad para ranura 2' }));

    expect(document.querySelectorAll('img[src="https://assets.example/fireball.webp"]')).toHaveLength(2);
  });
});
