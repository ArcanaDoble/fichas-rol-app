import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
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

const withBarrier = token => ({
  ...token,
  status: ['envenenado', 'barrera'],
  arcaneBarrier: {
    id: 'barrier-cast', spellId: 'runic-barrier', expires: 'combat-end',
    negatedTraits: ['critico'],
  },
});

describe('CanvasTokenResources', () => {
  it.each(['rogueliteClass', 'rogueliteEnemy'])('shows %s Barrera as one additional gold CD block without changing base CD', profileType => {
    const token = withBarrier({ ...createToken(), profileType });
    const { container } = render(<CanvasTokenResources token={token} onUpdate={jest.fn()} />);

    expect(screen.getByLabelText('CD temporal: 1')).toHaveTextContent('+1');
    expect(screen.getByLabelText('Máximo de CD: 4')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Valor actual de CD' }).children).toHaveLength(5);
    const temporaryBlock = container.querySelector('[data-cd-temporary]');
    expect(temporaryBlock).toHaveStyle({ backgroundColor: '#dfc885', borderColor: '#dfc885' });
    expect(temporaryBlock).toHaveAttribute('aria-pressed', 'true');
    expect(temporaryBlock).toHaveAttribute('title', '+1 CD temporal · Barrera');
    expect(screen.queryByText(/Barrera · CD/)).not.toBeInTheDocument();
    expect(token.stats.cd).toEqual({ current: 3, max: 4, label: 'CD', color: '#c8c6be' });
  });

  it.each(['Retirar Barrera', 'Retirar Barrera: +1 CD temporal'])('removes all Barrera protection using "%s" even when Life is zero', control => {
    const token = withBarrier(createToken());
    token.stats.vida.current = 0;
    token.stats.vidaTemporal = { current: 2, max: 2 };
    const onUpdate = jest.fn();
    const { container, rerender } = render(<CanvasTokenResources token={token} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: control, exact: true }));

    expect(onUpdate).toHaveBeenCalledWith({ status: ['envenenado'], arcaneBarrier: null });
    const nextToken = { ...token, ...onUpdate.mock.calls[0][0] };
    expect(nextToken.stats).toBe(token.stats);
    expect(nextToken.stats.cd).toEqual(token.stats.cd);
    expect(nextToken.stats.vidaTemporal).toEqual({ current: 2, max: 2 });
    rerender(<CanvasTokenResources token={nextToken} onUpdate={onUpdate} />);
    expect(container.querySelectorAll('[data-cd-temporary]')).toHaveLength(0);
    expect(screen.queryByLabelText('CD temporal: 1')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Valor actual de CD' }).children).toHaveLength(4);
  });

  it('keeps the gold protection block available with no base CD', () => {
    const token = withBarrier(createToken());
    token.stats.cd = { current: 0, max: 0 };
    const onUpdate = jest.fn();
    render(<CanvasTokenResources token={token} onUpdate={onUpdate} />);

    expect(screen.getByLabelText('Máximo de CD: 0')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Valor actual de CD' }).children).toHaveLength(1);
    expect(screen.queryByText('Sin cd')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retirar Barrera: +1 CD temporal' }));
    expect(onUpdate).toHaveBeenCalledWith({ status: ['envenenado'], arcaneBarrier: null });
  });

  it('retains one temporary CD bonus when base CD is corrected manually', () => {
    const token = withBarrier(createToken());
    const onUpdate = jest.fn();
    const { container, rerender } = render(<CanvasTokenResources token={token} onUpdate={onUpdate} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Fijar CD en 2' })[0]);
    expect(onUpdate).toHaveBeenLastCalledWith({
      stats: expect.objectContaining({ cd: expect.objectContaining({ current: 2, max: 4 }) }),
    });
    const corrected = { ...token, ...onUpdate.mock.calls.at(-1)[0] };
    rerender(<CanvasTokenResources token={corrected} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar máximo de CD' }));
    const extended = { ...corrected, ...onUpdate.mock.calls.at(-1)[0] };
    rerender(<CanvasTokenResources token={extended} onUpdate={onUpdate} />);

    expect(extended.stats.cd).toEqual({ current: 2, max: 5, label: 'CD', color: '#c8c6be' });
    expect(extended.arcaneBarrier).toBe(token.arcaneBarrier);
    expect(extended.status).toBe(token.status);
    expect(screen.getByLabelText('CD temporal: 1')).toHaveTextContent('+1');
    expect(container.querySelectorAll('[data-cd-temporary]')).toHaveLength(1);
    expect(screen.getByRole('group', { name: 'Valor actual de CD' }).children).toHaveLength(6);
  });

  it('shows a manually applied Barrera status without inventing repeated bonus blocks', () => {
    const token = { ...createToken(), status: ['barrera', 'barrera'] };
    const onUpdate = jest.fn();
    const { container } = render(<CanvasTokenResources token={token} onUpdate={onUpdate} />);

    expect(screen.getByLabelText('CD temporal: 1')).toHaveTextContent('+1');
    expect(container.querySelectorAll('[data-cd-temporary]')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Retirar Barrera: +1 CD temporal' }));
    expect(onUpdate).toHaveBeenCalledWith({ status: [], arcaneBarrier: null });
  });

  it.each([[false, 1450], [true, 600]])('reveals temporary CD with projectile arrival (reduced motion: %s)', (reducedMotion, arrivalMs) => {
    jest.useFakeTimers();
    jest.setSystemTime(1000000);
    try {
      const token = { ...withBarrier(createToken()), id: 'protected-token' };
      const barrierPresentation = { reducedMotion, effect: {
        id: 'barrier-cast', spellId: 'runic-barrier', targetId: token.id,
        presentationStartedAt: Date.now(),
      } };
      const { container } = render(<CanvasTokenResources token={token} onUpdate={jest.fn()} barrierPresentation={barrierPresentation} />);

      expect(screen.queryByLabelText('CD temporal: 1')).not.toBeInTheDocument();
      expect(container.querySelectorAll('[data-cd-temporary]')).toHaveLength(0);
      act(() => jest.advanceTimersByTime(arrivalMs - 1));
      expect(container.querySelectorAll('[data-cd-temporary]')).toHaveLength(0);
      act(() => jest.advanceTimersByTime(1));
      expect(screen.getByLabelText('CD temporal: 1')).toHaveTextContent('+1');
      expect(container.querySelectorAll('[data-cd-temporary]')).toHaveLength(1);
      expect(screen.getByLabelText('Máximo de CD: 4')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it.each(['rogueliteClass', 'rogueliteEnemy'])('lets %s spend, correct and remove temporary Life without changing normal Life', profileType => {
    const original = createToken();
    original.profileType = profileType;
    original.stats.vidaTemporal = { current: 2, max: 2, source: 'vitality-potion' };
    const onUpdate = jest.fn();
    const { container, rerender } = render(<CanvasTokenResources token={original} onUpdate={onUpdate} />);
    const applyUpdate = () => {
      const updated = { ...original, ...onUpdate.mock.calls.at(-1)[0] };
      expect(updated.stats.vida).toEqual(original.stats.vida);
      rerender(<CanvasTokenResources token={updated} onUpdate={onUpdate} />);
      return updated;
    };
    fireEvent.click(screen.getByRole('button', { name: 'Bloque temporal 1: quitar 1 Vida temporal' }));
    expect(applyUpdate().stats.vidaTemporal).toEqual({ current: 1, max: 2, source: 'vitality-potion' });
    fireEvent.click(screen.getByRole('button', { name: 'Bloque temporal 1: quitar 1 Vida temporal' }));
    expect(applyUpdate().stats.vidaTemporal.current).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Bloque temporal 2: restaurar Vida temporal a 2' }));
    expect(applyUpdate().stats.vidaTemporal).toEqual({ current: 2, max: 2, source: 'vitality-potion' });
    fireEvent.click(screen.getByRole('button', { name: 'Retirar toda la Vida temporal' }));
    expect(applyUpdate().stats).not.toHaveProperty('vidaTemporal');
    expect(container.querySelectorAll('[data-life-temporary]')).toHaveLength(0);
    expect(screen.queryByLabelText('Vida temporal: 0')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retirar toda la Vida temporal' })).not.toBeInTheDocument();
  });
  it('removes an exhausted reserve and its empty slots', () => {
    const token = createToken();
    token.stats.vidaTemporal = { current: 0, max: 2 };
    const onUpdate = jest.fn();
    render(<CanvasTokenResources token={token} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retirar toda la Vida temporal' }));
    expect(onUpdate.mock.calls[0][0].stats).not.toHaveProperty('vidaTemporal');
    expect(onUpdate.mock.calls[0][0].stats.vida).toEqual(token.stats.vida);
  });
  it('mirrors temporary Life on the same bar without adding it to normal Life or making it healable', () => {
    const onUpdate = jest.fn();
    const token = createToken();
    const { container, rerender } = render(<CanvasTokenResources token={token} onUpdate={onUpdate} />);
    const boosted = { ...token, stats: { ...token.stats, vidaTemporal: { current: 2, max: 2 } } };
    rerender(<CanvasTokenResources token={boosted} onUpdate={onUpdate} />);
    expect(screen.getByLabelText('Vida temporal: 2')).toHaveTextContent('+2');
    expect(screen.getByLabelText('Máximo de Vida: 10')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-life-temporary][data-filled="true"]')).toHaveLength(2);
    expect(screen.getByRole('group', { name: 'Valor actual de Vida' }).children).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Fijar Vida en 10' }));
    expect(onUpdate.mock.calls.at(-1)[0].stats.vidaTemporal.current).toBe(2);
    rerender(<CanvasTokenResources token={{ ...boosted, stats: { ...boosted.stats, vidaTemporal: { current: 1, max: 2 } } }} onUpdate={onUpdate} />);
    expect(container.querySelectorAll('[data-life-temporary][data-filled="true"]')).toHaveLength(1);
    expect(screen.getByLabelText('Vida temporal: 1')).toHaveTextContent('+1');
    rerender(<CanvasTokenResources token={token} onUpdate={onUpdate} />);
    expect(container.querySelectorAll('[data-life-temporary]')).toHaveLength(0);
  });
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

  it('identifies Movimiento edits so combat can reconcile the remaining allowance', () => {
    const onUpdate = jest.fn();
    render(<CanvasTokenResources token={createToken()} onUpdate={onUpdate} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Fijar Movimiento en 1' }).at(-1));

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        stats: expect.objectContaining({
          movimiento: expect.objectContaining({ current: 1, max: 3 }),
        }),
      }),
      { resourceId: 'movimiento', field: 'current' },
    );
  });

  it('paints the movement added by Correr with the project gold', () => {
    const token = createToken();
    token.stats.movimiento = {
      ...token.stats.movimiento,
      current: 6,
      max: 7,
    };
    const { container } = render(
      <CanvasTokenResources
        token={token}
        onUpdate={jest.fn()}
        movementRuntime={{ base: 3, modifier: 0, spent: 1, sprintBonus: 4 }}
      />,
    );

    const baseSegments = container.querySelectorAll('[data-movement-segment="base"]');
    const sprintSegments = container.querySelectorAll('[data-movement-segment="sprint"]');

    expect(baseSegments).toHaveLength(3);
    expect(sprintSegments).toHaveLength(4);
    expect(sprintSegments[0]).toHaveStyle({ backgroundColor: '#c8aa6e' });
    expect(sprintSegments[3]).toHaveStyle({ borderColor: 'rgba(200, 170, 110, 0.5)' });
  });
});
