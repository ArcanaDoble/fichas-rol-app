import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { BoardCardMenu } from '../components/BoardCardMenu';

const card = { id: 'top', type: 'card', name: 'Evento secreto', stackKey: 'pile', stackIds: ['a', 'b'], hideStackContentsForPlayers: true };
const setup = (props = {}) => {
    const onAction = jest.fn();
    const onClose = jest.fn();
    return { onAction, onClose, ...render(<BoardCardMenu menu={{ x: 50, y: 50 }} card={card}
        onAction={onAction} onClose={onClose} onFlip={jest.fn()} {...props} />) };
};
test('master creates a chosen number of copies and shuffles using the same contextual menu', () => {
    const { onAction } = setup();
    fireEvent.change(screen.getByLabelText('Copias nuevas de esta carta'), { target: { value: '29' } });
    fireEvent.click(screen.getByText('Apilar copias'));
    expect(onAction).toHaveBeenCalledWith('copies', 29);
    fireEvent.click(screen.getByText('Barajar boca abajo'));
    expect(onAction).toHaveBeenCalledWith('shuffle');
});
test('players can draw but cannot inspect, flip, copy or shuffle a hidden pile', () => {
    const { onAction } = setup({ isPlayerView: true });
    expect(screen.queryByText('Evento secreto')).toBeNull();
    expect(screen.queryByText('Apilar copias')).toBeNull();
    expect(screen.queryByText('Barajar boca abajo')).toBeNull();
    expect(screen.queryByText('Voltear carta')).toBeNull();
    fireEvent.change(screen.getByLabelText('Cartas a robar'), { target: { value: '2' } });
    fireEvent.click(screen.getByText('Robar'));
    expect(onAction).toHaveBeenCalledWith('draw', 2);
});
test('disables overdraw and closes with Escape or an outside press', () => {
    const { onClose } = setup();
    fireEvent.change(screen.getByLabelText('Cartas a robar'), { target: { value: '4' } });
    expect(screen.getByText('Robar')).toBeDisabled();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
});
test('keeps one last card drawable and blocks actions while confirming', () => {
    setup({ card: { ...card, stackIds: [] }, busy: true, isPlayerView: true });
    expect(screen.getByText('1 carta disponible · Boca abajo')).toBeInTheDocument();
    expect(screen.getByText('Robar')).toBeDisabled();
});

test('touch controls change quantities without native number spinners and clamp manual input', () => {
    const { onAction } = setup({ card: { ...card, stackIds: Array.from({ length: 29 }, (_, i) => `c${i}`) } });
    const input = screen.getByRole('spinbutton', { name: 'Cartas a robar' });
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar cartas a robar' }));
    expect(input).toHaveValue('2');
    fireEvent.click(screen.getByRole('button', { name: 'Reducir cartas a robar' }));
    expect(input).toHaveValue('1');
    fireEvent.click(screen.getAllByRole('button', { name: '10', exact: true })[0]);
    fireEvent.click(screen.getByText('Robar'));
    expect(onAction).toHaveBeenCalledWith('draw', 10);
    fireEvent.change(input, { target: { value: '999' } });
    expect(screen.getByText('Robar')).toBeDisabled();
    fireEvent.blur(input);
    expect(input).toHaveValue('30');
    fireEvent.change(input, { target: { value: 'oops' } });
    expect(input).toHaveValue('30');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveValue('29');
});
