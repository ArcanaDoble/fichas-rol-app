import React from 'react';
import { act, render, screen } from '@testing-library/react';
import TokenInventoryReceipt from '../components/TokenInventoryReceipt';

jest.mock('framer-motion', () => ({
    AnimatePresence: ({ children }) => children,
    useReducedMotion: () => true,
    motion: { div: ({ children, initial, animate, exit, ...props }) => <div {...props}>{children}</div> },
}));

describe('TokenInventoryReceipt', () => {
    test('identifies the recipient before releasing an object', () => {
        render(<TokenInventoryReceipt pendingItem={{ name: 'Elixir' }} recipientName="Bárbaro" />);
        expect(screen.getByRole('status')).toHaveTextContent('SoltarBárbaro');
        expect(screen.getByRole('status')).toHaveAccessibleName('Suelta para recoger Elixir: Bárbaro');
    });
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    test('does not announce existing inventory, then acknowledges a collected object', () => {
        const inventory = [{ name: 'Espada' }];
        const { rerender } = render(<TokenInventoryReceipt inventory={inventory} />);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        rerender(<TokenInventoryReceipt inventory={[...inventory, { nombre: 'Elixir' }]} />);
        expect(screen.getByRole('status')).toHaveTextContent('Elixir');
        // Equipment edits or a removal must not cancel expiry and leave feedback stuck.
        rerender(<TokenInventoryReceipt inventory={[{ ...inventory[0], isEquipped: true }]} />);
        act(() => jest.advanceTimersByTime(1800));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    test('uses a single HUD message when a new drop overlaps a previous receipt', () => {
        const { rerender } = render(<TokenInventoryReceipt inventory={[]} />);
        const inventory = [{ name: 'Elixir' }];
        rerender(<TokenInventoryReceipt inventory={inventory} />);
        rerender(<TokenInventoryReceipt inventory={inventory} pendingItem={{ name: 'Varita' }} />);
        expect(screen.getAllByRole('status')).toHaveLength(1);
        expect(screen.getByRole('status')).toHaveAccessibleName('Suelta para recoger Varita');
        expect(screen.getByRole('status')).not.toHaveTextContent('Elixir');
    });

    test('groups additions and renews the acknowledgement for the next pickup', () => {
        const { rerender } = render(<TokenInventoryReceipt inventory={[]} />);
        const inventory = [{ name: 'Llave' }, { name: 'Elixir' }];
        rerender(<TokenInventoryReceipt inventory={inventory} />);
        expect(screen.getByRole('status')).toHaveTextContent('2 objetos');
        act(() => jest.advanceTimersByTime(1000));
        rerender(<TokenInventoryReceipt inventory={[...inventory, { name: 'Mapa' }]} />);
        act(() => jest.advanceTimersByTime(900));
        expect(screen.getByRole('status')).toHaveTextContent('Mapa');
        act(() => jest.advanceTimersByTime(900));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
});
