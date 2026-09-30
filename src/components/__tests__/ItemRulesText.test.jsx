import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ItemRulesText from '../ItemRulesText';

test('shows a short preview and preserves the entire rule when expanded', () => {
    const text = 'Gasta un dado de acción para realizar un ataque mediante el Catalizador. ' + 'El objetivo no puede usar defensa activa. '.repeat(6);
    render(<ItemRulesText text={text} name="Proyectil arcano" />);
    const toggle = screen.getByRole('button', { name: 'Ver reglas completas de Proyectil arcano' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(document.getElementById(toggle.getAttribute('aria-controls')).textContent).toBe(text);
    fireEvent.click(screen.getByRole('button', { name: 'Resumir reglas de Proyectil arcano' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('short descriptions do not introduce an unnecessary toggle', () => {
    render(<ItemRulesText text="Recupera 1d4 de salud." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Recupera 1d4 de salud.')).toBeInTheDocument();
});
