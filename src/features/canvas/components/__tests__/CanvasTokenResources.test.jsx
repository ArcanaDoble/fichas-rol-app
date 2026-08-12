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
});
