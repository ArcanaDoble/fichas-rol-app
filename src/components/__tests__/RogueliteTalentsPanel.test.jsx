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
  test('campaign uses one editable list with at most three active talents', () => {
    function CampaignFixture() {
      const [ids, setIds] = React.useState(['a', 'b', 'c']);
      const [catalog, setCatalog] = React.useState(['a', 'b', 'c', 'd'].map((id) => ({
        id, name: `Talento ${id}`, description: `Descripción ${id}`,
      })));
      return <RogueliteTalentsPanel role="campaign" classId="yerma" resource={{}}
        talentCatalog={catalog} equippedTalentIds={ids}
        onCatalogChange={setCatalog} onEquippedTalentIdsChange={setIds} />;
    }
    render(<CampaignFixture />);
    expect(screen.queryByText('Catálogo de talentos')).not.toBeInTheDocument();
    expect(screen.getAllByText('Talentos equipados')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Seleccionar talento para ranura/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activar talento Talento d' })).toBeDisabled();
    expect(screen.queryByText(/^(Activo|Inactivo)$/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar talento Talento a' }));
    expect(screen.getByRole('button', { name: 'Editar talento Talento a' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activar talento Talento a', pressed: true })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Editar talento Talento a' }).closest('.noma-token-feature')).toHaveClass('is-used');
    fireEvent.click(screen.getByRole('button', { name: 'Activar talento Talento a' }));
    expect(screen.getByRole('button', { name: 'Desactivar talento Talento a', pressed: false })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Editar talento Talento a' }).closest('.noma-token-feature')).not.toHaveClass('is-used');
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar talento Talento a' }));
    fireEvent.click(screen.getByRole('button', { name: 'Activar talento Talento d' }));
    expect(screen.getByRole('button', { name: 'Desactivar talento Talento d', pressed: false })).toBeEnabled();
    expect(screen.getByText('3 / 3 activos')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir talento al personaje' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre del talento' }), { target: { value: 'Nuevo talento personal' } });
    expect(screen.getByRole('checkbox', { name: 'Talento activo' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar editor de talento' }));
    expect(screen.getByRole('button', { name: 'Activar talento Nuevo talento personal', pressed: true })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: /^(Activar|Desactivar) talento / })).toHaveLength(5);
  });

  test('reading full skill rules does not equip it and metadata stays outside the effect', () => {
    const onChange = jest.fn();
    const effect = 'Gasta un dado de acción para realizar un ataque mediante el Catalizador. ' + 'El objetivo no puede usar defensa activa. '.repeat(5);
    render(<RogueliteTalentsPanel role="player" classId="mage" resource={{ name: 'Maná' }}
      talentCatalog={[]} equippedTalentIds={[]} equippedSkillIds={[null, null, null]}
      abilityCatalog={[{ id: 'bolt', name: 'Proyectil arcano', description: `${effect}Alcance: Catalizador • Rasgos: Conjuro, Distancia` }]}
      onEquippedSkillIdsChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar habilidad para ranura 1' }));
    const expand = screen.getByRole('button', { name: 'Ver reglas completas de Proyectil arcano' });
    fireEvent.click(expand);
    expect(document.getElementById(expand.getAttribute('aria-controls')).textContent).toBe(effect.trim());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Proyectil arcano Alcance/ }));
    expect(onChange).toHaveBeenCalledWith(['bolt', null, null]);
  });

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
