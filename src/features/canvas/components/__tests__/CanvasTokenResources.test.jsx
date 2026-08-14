import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CanvasTokenResources from '../CanvasTokenResources';

const createToken = () => ({
  profileType: 'rogueliteClass',
  stats: {
    vida: { current: 8, max: 10, label: 'Vida', color: '#e7a0a8' },
    cd: { current: 3, max: 4, label: 'CD', color: '#c8c6be' },
    movimiento: { current: 2, max: 3, label: 'Movimiento', color: '#86bfe2' },
    iniciativa: { current: 2, max: 3, label: 'Iniciativa', color: '#d7b867' },
    recurso: { current: 2, max: 4, label: 'Furia', color: '#aa1515' },
  },
});

describe('CanvasTokenResources', () => {
  it('shows all Roguelite stats and permits editing current and maximum values', () => {
    const onUpdate = jest.fn();
    render(<CanvasTokenResources token={createToken()} onUpdate={onUpdate} />);

    expect(screen.getByText('Furia')).toBeInTheDocument();
    expect(screen.getByText('Movimiento')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar máximo de Vida' }));

    expect(onUpdate).toHaveBeenCalledWith({
      stats: expect.objectContaining({
        vida: expect.objectContaining({ current: 8, max: 11 }),
      }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Fijar Vida en 4' }));
    expect(onUpdate).toHaveBeenLastCalledWith({
      stats: expect.objectContaining({
        vida: expect.objectContaining({ current: 4, max: 10 }),
      }),
    });
  });

  it('mirrors the current enemy initiative and offense into their runtime fields', () => {
    const onUpdate = jest.fn();
    const token = {
      profileType: 'rogueliteEnemy',
      stats: {
        vida: { current: 6, max: 6 },
        cd: { current: 2, max: 2 },
        movimiento: { current: 2, max: 2 },
        iniciativa: { current: 3, max: 3 },
        ofensiva: { current: 4, max: 4 },
      },
    };
    render(<CanvasTokenResources token={token} onUpdate={onUpdate} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Fijar Iniciativa en 2' })[0]);
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ velocidad: 2, fixedInitiative: 2 }));

    fireEvent.click(screen.getByRole('button', { name: 'Fijar Base ofensiva en 2' }));
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ offenseBase: 2 }));
  });
});
