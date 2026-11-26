import React from 'react';
import { act, render } from '@testing-library/react';
import CanvasTokenArcaneBarrier from '../components/CanvasTokenArcaneBarrier';
import TokenStatusBadges from '../components/TokenStatusBadges';
import { BARRIER_ARRIVAL_MS, BARRIER_REDUCED_ARRIVAL_MS } from '../arcaneBarrierTimeline';

jest.mock('framer-motion', () => ({ useReducedMotion: () => false }));
const token = { id: 'ally', status: ['barrera'], img: '/token-transparent.png', arcaneBarrier: { id: 'cast', spellId: 'runic-barrier', expires: 'combat-end', lastImpactId: 'old' } };
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('a manual state shows one marker and membrane, then removes both with the state', () => {
  const manual = { id: 'ally', status: ['apresado', 'barrera'], img: '/token-transparent.png' };
  const View = ({ value }) => <>
    <CanvasTokenArcaneBarrier token={value} />
    <TokenStatusBadges tokenId={value.id} statusIds={value.status} width={50} height={50} arcaneBarrier={value.arcaneBarrier} />
  </>;
  const { container, rerender } = render(<View value={manual} />);
  expect(container.querySelectorAll('[data-status-id="barrera"]')).toHaveLength(1);
  expect(container.querySelector('[data-barrier-id]')).not.toBeNull();
  rerender(<View value={{ ...manual, status: ['apresado'] }} />);
  expect(container.querySelector('[data-status-id="barrera"]')).toBeNull();
  expect(container.querySelector('[data-barrier-id]')).toBeNull();
  expect(container.querySelector('[data-status-id="apresado"]')).not.toBeNull();
});

test('saved impacts never replay on mount; a new hit flashes once and settles with duplicate snapshots', () => {
  const { container, rerender } = render(<CanvasTokenArcaneBarrier token={token} />);
  const field = () => container.querySelector('[data-barrier-id]');
  expect(field()).toHaveAttribute('data-impact', 'false');
  const hit = { ...token, arcaneBarrier: { ...token.arcaneBarrier, lastImpactId: 'new' } };
  rerender(<CanvasTokenArcaneBarrier token={hit} />);
  expect(field()).toHaveAttribute('data-impact', 'true');
  act(() => jest.advanceTimersByTime(900));
  rerender(<CanvasTokenArcaneBarrier token={{ ...hit }} />);
  expect(field()).toHaveAttribute('data-impact', 'false');
  expect(container.querySelector('.noma-token-barrier__membrane').style.maskImage).toContain('token-transparent.png');
  rerender(<CanvasTokenArcaneBarrier token={{ ...token, status: [], arcaneBarrier: undefined }} />);
  expect(field()).toBeNull();
});

test.each([false, true])('protection and bonus wait for the local arrival clock (reduced: %s), including late receivers', reducedMotion => {
  const presentation = { reducedMotion, effect: { id: 'cast', spellId: 'runic-barrier', targetId: token.id,
    startedAt: Date.now() - 2200, presentationStartedAt: Date.now() } };
  const View = ({ value, clock }) => <>
    <CanvasTokenArcaneBarrier token={value} presentation={clock} />
    <TokenStatusBadges statusIds={value.status || []} width={50} height={50} tokenId={value.id}
      arcaneBarrier={value.arcaneBarrier} barrierPresentation={clock} />
  </>;
  const { container, rerender, unmount } = render(<View value={token} clock={presentation} />);
  expect(container.querySelector('[data-barrier-id]')).toBeNull();
  expect(container.querySelector('[data-status-id="barrera"]')).toBeNull();
  act(() => jest.advanceTimersByTime(300));
  rerender(<View value={{ ...token }} clock={{ ...presentation }} />);
  const arrival = reducedMotion ? BARRIER_REDUCED_ARRIVAL_MS : BARRIER_ARRIVAL_MS;
  act(() => jest.advanceTimersByTime(arrival - 301));
  expect(container.querySelector('[data-barrier-id]')).toBeNull();
  act(() => jest.advanceTimersByTime(1));
  expect(container.querySelector('[data-status-id="barrera"]')).toHaveAttribute('aria-label', 'Barrera rúnica: +1 CD hasta el final del combate');
  expect(container.querySelector('.noma-token-barrier__membrane')).not.toBeNull();
  expect(container.querySelector('[data-barrier-id]')).toHaveAttribute('data-impact', 'false');
  rerender(<View value={{ ...token, status: [], arcaneBarrier: undefined }} clock={presentation} />);
  expect(container.querySelector('[data-status-id="barrera"]')).toBeNull();
  expect(container.querySelector('[data-barrier-id]')).toBeNull();
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});

test('passive and unnamed tokens show the public protection without receiving private resources', () => {
  const { container, rerender } = render(<TokenStatusBadges statusIds={[]} width={50} height={50}
    tokenId={token.id} arcaneBarrier={token.arcaneBarrier} />);
  expect(container.querySelector('[data-status-id="barrera"]')).toHaveAttribute('aria-label', 'Barrera rúnica: +1 CD hasta el final del combate');
  expect(container.querySelector('.noma-token-life-count')).toBeNull();
  expect(container.querySelector('.noma-token-life-name')).toBeNull();
  rerender(<TokenStatusBadges statusIds={[]} width={50} height={50} tokenId={token.id}
    arcaneBarrier={{ ...token.arcaneBarrier }} />);
  expect(container.querySelectorAll('[data-status-id="barrera"]')).toHaveLength(1);
});

test('the public protection preserves the normal status capacity and overflow count', () => {
  const props = { statusIds: ['sangrado', 'envenenado', 'apresado', 'aturdido', 'oculto'],
    width: 50, height: 50, tokenId: token.id };
  const { container, rerender } = render(<TokenStatusBadges {...props} />);
  const markerIds = () => [...container.querySelectorAll('[data-status-id]')].map(marker => marker.dataset.statusId);
  expect(markerIds()).toEqual(['sangrado', 'overflow']);
  const overflow = container.querySelector('[data-status-id="overflow"]');
  const label = overflow.getAttribute('aria-label');
  expect(overflow).toHaveTextContent('+4');
  rerender(<TokenStatusBadges {...props} arcaneBarrier={token.arcaneBarrier} />);
  expect(markerIds()).toEqual(['sangrado', 'overflow', 'barrera']);
  expect(container.querySelector('[data-status-id="overflow"]')).toHaveTextContent('+4');
  expect(container.querySelector('[data-status-id="overflow"]')).toHaveAttribute('aria-label', label);
  expect(container.querySelector('[data-status-id="barrera"]')).toHaveAttribute('aria-label', 'Barrera rúnica: +1 CD hasta el final del combate');
  rerender(<TokenStatusBadges {...props} />);
  expect(markerIds()).toEqual(['sangrado', 'overflow']);
  expect(container.querySelector('[data-status-id="overflow"]')).toHaveTextContent('+4');
});

test('an unrelated cast does not hide saved protection and removing a forming barrier clears its arrival timer', () => {
  const presentation = { effect: { id: 'other', spellId: 'runic-barrier', targetId: token.id, presentationStartedAt: Date.now() } };
  const { container, rerender, unmount } = render(<CanvasTokenArcaneBarrier token={token} presentation={presentation} />);
  expect(container.querySelector('[data-barrier-id]')).not.toBeNull();
  rerender(<CanvasTokenArcaneBarrier token={token} presentation={{ effect: { ...presentation.effect, id: 'cast' } }} />);
  expect(container.querySelector('[data-barrier-id]')).toBeNull();
  rerender(<CanvasTokenArcaneBarrier token={{ ...token, status: [], arcaneBarrier: undefined }} />);
  act(() => jest.advanceTimersByTime(BARRIER_ARRIVAL_MS));
  expect(container.querySelector('[data-barrier-id]')).toBeNull();
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});
