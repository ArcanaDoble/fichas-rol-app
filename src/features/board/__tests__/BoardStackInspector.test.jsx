import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { BoardStackInspector } from '../components/BoardStackInspector';

jest.mock('../../tactical-shared/components/TacticalAssetImage', () => ({ CardImageWithLoader: ({ src, label }) => <img src={src} alt={label} /> }));
const parent = { id: 'top', name: 'Acción', type: 'card', stackIds: ['bottom', 'middle'], faceDown: true, frontImage: '/action.png' };
const items = [parent, { id: 'middle', name: 'Aliado', type: 'card' }, { id: 'bottom', name: 'Evento', type: 'card' }];
const setup = (props = {}) => {
    const onReorder = jest.fn(); const onExtract = jest.fn();
    return { onReorder, onExtract, ...render(<BoardStackInspector parent={parent} items={items} canReorder onReorder={onReorder} onExtract={onExtract} {...props} />) };
};

test('shows all cards top-first and selecting never extracts a card accidentally', () => {
    const { onExtract } = setup();
    expect(screen.getAllByRole('listitem').map(node => node.dataset.stackCardId)).toEqual(['top', 'middle', 'bottom']);
    expect(screen.getByAltText('Acción')).toHaveAttribute('src', '/action.png');
    fireEvent.click(screen.getByRole('button', { name: '2. Aliado' }));
    expect(onExtract).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sacar carta' }));
    expect(onExtract).toHaveBeenCalledWith('top', 'middle');
});

test('keyboard and explicit movement controls include the first and last positions', () => {
    const { onReorder } = setup();
    expect(screen.getByRole('button', { name: 'Subir carta' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Bajar carta' }));
    expect(onReorder).toHaveBeenLastCalledWith(parent, 'top', 'bottom');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Mover Evento, posición 3' }), { key: 'ArrowUp' });
    expect(onReorder).toHaveBeenLastCalledWith(parent, 'bottom', 'middle');
    fireEvent.click(screen.getByRole('button', { name: '2. Aliado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bajar carta' }));
    expect(onReorder).toHaveBeenLastCalledWith(parent, 'middle', null);
});

test('dragging the handle reorders by pointer position and cancellation leaves cards untouched', () => {
    const previous = window.PointerEvent;
    window.PointerEvent = MouseEvent;
    const { container, onReorder, onExtract } = setup();
    const target = container.querySelector('[data-stack-card-id="top"]');
    target.getBoundingClientRect = () => ({ top: 50, height: 120, left: 0, right: 120, bottom: 170 });
    const originalElementFromPoint = document.elementFromPoint;
    document.elementFromPoint = () => target;
    const handle = screen.getByRole('button', { name: 'Mover Evento, posición 3' });
    fireEvent.pointerDown(handle, { clientX: 150, clientY: 200, button: 0 });
    fireEvent.pointerMove(handle, { clientX: 100, clientY: 75 });
    expect(container.querySelector('.drop-before')).toBe(target);
    fireEvent.pointerUp(handle, { clientX: 100, clientY: 75 });
    expect(onReorder).toHaveBeenCalledWith(parent, 'bottom', 'top');
    expect(onExtract).not.toHaveBeenCalled();
    onReorder.mockClear();
    fireEvent.pointerDown(handle, { clientX: 150, clientY: 200, button: 0 });
    fireEvent.pointerMove(handle, { clientX: 100, clientY: 75 });
    fireEvent.pointerCancel(handle);
    fireEvent.pointerUp(handle);
    expect(onReorder).not.toHaveBeenCalled();
    document.elementFromPoint = originalElementFromPoint;
    window.PointerEvent = previous;
});

test('player view has no reorder controls; saving disables modifying actions', () => {
    const { rerender } = setup({ canReorder: false });
    expect(screen.queryByRole('button', { name: /Mover/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Bajar carta' })).toBeNull();
    rerender(<BoardStackInspector parent={parent} items={items} canReorder busy />);
    expect(screen.getByRole('button', { name: 'Sacar carta' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mover Evento, posición 3' })).toBeDisabled();
});

test('touch activates without a compatibility click after dragging, and never extracts twice', () => {
    const previous = window.PointerEvent;
    window.PointerEvent = class extends MouseEvent {
        constructor(type, options) { super(type, options); this.pointerType = options.pointerType; }
    };
    const { onExtract } = setup();
    const extract = screen.getByRole('button', { name: 'Sacar carta' });
    fireEvent.pointerUp(extract, { pointerType: 'touch' });
    expect(onExtract).toHaveBeenCalledTimes(1);
    fireEvent.click(extract, { detail: 1 });
    expect(onExtract).toHaveBeenCalledTimes(1);
    fireEvent.click(extract, { detail: 0 });
    expect(onExtract).toHaveBeenCalledTimes(2);
    window.PointerEvent = previous;
});
