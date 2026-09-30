import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CanvasPotionPreparation from '../CanvasPotionPreparation';

jest.mock('../../../../hooks/useCustomEquipmentImages', () => ({ useCustomEquipmentImages: () => new Map(), getCustomImage: () => null }));

const die = { id: 'd8-a', kind: 'action-die', sides: 8, value: 6, status: 'available' };
const base = () => ({ session: { id: 'use-1', definitionId: 'healing-potion', item: { name: 'Poción de curación' }, context: {} },
    token: { name: 'Bárbaro', stats: { vida: { current: 3, max: 8 } } }, resources: [die],
    onSelectResource: jest.fn(), onConfirm: jest.fn(), onCancel: jest.fn() });

test('prepares in a HUD region and selecting a cost does not consume the potion', () => {
    const props = base();
    const { rerender } = render(<CanvasPotionPreparation {...props} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Beber poción' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Dado de acción d8/ }));
    expect(props.onSelectResource).toHaveBeenCalledWith(die);
    expect(props.onConfirm).not.toHaveBeenCalled();
    rerender(<CanvasPotionPreparation {...props} session={{ ...props.session, context: { resource: die } }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Beber poción' }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/su valor se ignora/)).toBeInTheDocument();
    expect(screen.getByLabelText('Vida: 3 de 8').querySelectorAll('i[data-filled="true"]')).toHaveLength(3);
});

test('enemy chooses an action or movement, with manual Threat available without a reserve', () => {
    const props = base();
    props.resources = [
        { id: 'main', kind: 'enemy-action', status: 'spent' },
        { id: 'move', kind: 'enemy-movement', status: 'available' },
        { id: 'manual-d20', kind: 'manual-threat', sides: 20, value: 0, status: 'available' },
    ];
    render(<CanvasPotionPreparation {...props} />);
    expect(screen.getByRole('button', { name: 'Acción principal' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Movimiento' }));
    expect(props.onSelectResource).toHaveBeenLastCalledWith(props.resources[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Amenaza' }));
    fireEvent.click(screen.getByRole('button', { name: 'Amenaza manual d20' }));
    expect(props.onSelectResource).toHaveBeenLastCalledWith(props.resources[2]);
    expect(props.onConfirm).not.toHaveBeenCalled();
});

test('a selected resource that became spent cannot be confirmed', () => {
    const props = base();
    props.session.context.resource = die;
    props.resources = [{ ...die, status: 'spent' }];
    render(<CanvasPotionPreparation {...props} />);
    expect(screen.getByRole('button', { name: 'Beber poción' })).toBeDisabled();
});

test('poison blocks confirmation while full Life warns without inventing a prohibition', () => {
    const props = base();
    props.session.context.resource = die;
    props.token.statusEffects = ['envenenado'];
    const { rerender } = render(<CanvasPotionPreparation {...props} />);
    expect(screen.getByRole('button', { name: 'Beber poción' })).toBeDisabled();
    props.token = { ...props.token, statusEffects: [], stats: { vida: { current: 8, max: 8 } } };
    rerender(<CanvasPotionPreparation {...props} />);
    expect(screen.getByText(/sin recuperar más/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Beber poción' })).toBeEnabled();
});

test('commit locks cost and cancel controls and Escape cannot interrupt consumption', () => {
    const props = base();
    const { container } = render(<CanvasPotionPreparation {...props} busy />);
    screen.getAllByRole('button').forEach(button => expect(button).toBeDisabled());
    fireEvent.keyDown(container.firstChild, { key: 'Escape' });
    expect(props.onCancel).not.toHaveBeenCalled();
});
