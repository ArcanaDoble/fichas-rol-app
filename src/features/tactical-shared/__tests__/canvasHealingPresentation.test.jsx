import React, { useLayoutEffect } from 'react';
import { act, render, screen, renderHook } from '@testing-library/react';
import { useReducedMotion } from 'framer-motion';
import CanvasTokenLife from '../../canvas/components/CanvasTokenLife';
import CanvasDieOutcomeEffect from '../../../components/CanvasDieOutcomeEffect';
import { useCanvasHealingPresentationEvents } from '../canvasHealingPresentation';

jest.mock('framer-motion', () => ({ ...jest.requireActual('framer-motion'), useReducedMotion: jest.fn(() => false) }));

const token = { id: 'hero', name: 'Bárbaro', x: 0, y: 0, width: 50, height: 50, stats: { vida: { current: 3, max: 8 } } };
const scene = { id: 'scene', items: [token] };
const healedScene = (startedAt, overrides = {}) => ({ ...scene, items: [{ ...token, stats: { vida: { current: 7, max: 8 } },
    canvasHealingEffect: { id: 'healing-1', useId: 'use-1', previousLife: 3, nextLife: 7, roll: 4, healed: 4, startedAt, ...overrides },
}] });

const View = ({ scenario, commits = [] }) => {
    const { events, byToken } = useCanvasHealingPresentationEvents(scenario);
    useLayoutEffect(() => { commits.push(document.querySelector('.noma-token-life')?.getAttribute('aria-label')); });
    return <>
        {scenario.items.map(item => <CanvasTokenLife key={item.id} {...item} healingEffect={byToken[item.id]} />)}
        {events.map(({ id, effect }) => <CanvasDieOutcomeEffect key={id} effect={effect} targetPos={token} />)}
    </>;
};

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(100000); useReducedMotion.mockReturnValue(false); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('the very first committed snapshot keeps old Life until the same instant that the saved roll is revealed', () => {
    const commits = [];
    const { rerender, container } = render(<View scenario={scene} commits={commits} />);
    act(() => jest.advanceTimersByTime(100));
    rerender(<View scenario={healedScene(Date.now())} commits={commits} />);
    expect(commits).toEqual(['Bárbaro · Vida: 3 de 8', 'Bárbaro · Vida: 3 de 8']);
    expect(container.querySelectorAll('[data-filled="true"]')).toHaveLength(3);
    expect(screen.getByRole('status')).toHaveTextContent('Tirada de curación.');
    act(() => jest.advanceTimersByTime(1299));
    expect(screen.getByLabelText('Bárbaro · Vida: 3 de 8')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByLabelText('Bárbaro · Vida: 7 de 8')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('D4: 4. Recupera 4 de Vida.');
    expect(container.querySelectorAll('[data-change="heal"]')).toHaveLength(4);
    act(() => jest.advanceTimersByTime(1900));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('a delayed observer joins the original timeline instead of rolling for another 1300ms', () => {
    const { rerender } = render(<View scenario={scene} />);
    act(() => jest.advanceTimersByTime(1000));
    rerender(<View scenario={healedScene(100100)} />);
    expect(screen.getByLabelText('Bárbaro · Vida: 3 de 8')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(399));
    expect(screen.getByRole('status')).toHaveTextContent('Tirada de curación.');
    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByRole('status')).toHaveTextContent('D4: 4. Recupera 4 de Vida.');
    expect(screen.getByLabelText('Bárbaro · Vida: 7 de 8')).toBeInTheDocument();
});

test('saved metadata on mount or scene re-entry is history, even if its timestamp is recent', () => {
    const { rerender } = render(<View scenario={healedScene(Date.now())} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bárbaro · Vida: 7 de 8')).toBeInTheDocument();
    rerender(<View scenario={{ ...scene, id: 'other-scene' }} />);
    rerender(<View scenario={healedScene(Date.now())} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bárbaro · Vida: 7 de 8')).toBeInTheDocument();
});

test('reconnection drops missed healing outcomes and neither replays the die nor rewinds Life', () => {
    const { rerender } = render(<View scenario={scene} />);
    act(() => jest.advanceTimersByTime(100));
    const update = healedScene(Date.now());
    act(() => { jest.advanceTimersByTime(200); window.dispatchEvent(new Event('online')); });
    rerender(<View scenario={update} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bárbaro · Vida: 7 de 8')).toBeInTheDocument();
});

test('snapshots observed in a hidden tab are not played on returning to it', () => {
    const hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const { rerender } = render(<View scenario={scene} />);
    hidden.mockReturnValue(true);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); jest.advanceTimersByTime(100); });
    const update = healedScene(Date.now());
    rerender(<View scenario={update} />);
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    rerender(<View scenario={{ ...update }} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bárbaro · Vida: 7 de 8')).toBeInTheDocument();
});

test('repeated snapshots deduplicate the event and later damage wins over the pending visual heal', () => {
    const { rerender } = render(<View scenario={scene} />);
    act(() => jest.advanceTimersByTime(100));
    const update = healedScene(Date.now());
    rerender(<View scenario={update} />);
    rerender(<View scenario={{ ...update, items: [...update.items] }} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    rerender(<View scenario={{ ...update, items: [{ ...update.items[0], stats: { vida: { current: 2, max: 8 } } }] }} />);
    expect(screen.getByLabelText('Bárbaro · Vida: 2 de 8')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1300));
    expect(screen.getByLabelText('Bárbaro · Vida: 2 de 8')).toBeInTheDocument();
});

test('reduced motion presents the actual die and new Life immediately', () => {
    useReducedMotion.mockReturnValue(true);
    const { rerender } = render(<View scenario={scene} />);
    act(() => jest.advanceTimersByTime(100));
    rerender(<View scenario={healedScene(Date.now())} />);
    expect(screen.getByLabelText('Bárbaro · Vida: 7 de 8')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('D4: 4. Recupera 4 de Vida.');
});

test('two quick uses reveal each Life gain with its own die, without overlapping or exposing the second gain early', () => {
    const { rerender } = render(<View scenario={scene} />);
    act(() => jest.advanceTimersByTime(100));
    rerender(<View scenario={healedScene(Date.now())} />);
    act(() => jest.advanceTimersByTime(200));
    const second = healedScene(Date.now(), { id: 'healing-2', useId: 'use-2', previousLife: 7, nextLife: 8, roll: 2, healed: 1 });
    second.items[0].stats.vida.current = 8;
    rerender(<View scenario={second} />);
    expect(screen.getByLabelText('Bárbaro · Vida: 3 de 8')).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    act(() => jest.advanceTimersByTime(1100));
    expect(screen.getByLabelText('Bárbaro · Vida: 7 de 8')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('D4: 4. Recupera 4 de Vida.');
    act(() => jest.advanceTimersByTime(1900));
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Tirada de curación.');
    expect(screen.getByLabelText('Bárbaro · Vida: 7 de 8')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1299));
    expect(screen.getByLabelText('Bárbaro · Vida: 7 de 8')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByLabelText('Bárbaro · Vida: 8 de 8')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('D4: 2. Recupera 1 de Vida.');
    act(() => jest.advanceTimersByTime(1900));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('damage between queued heals breaks the old Life sequence instead of restoring obsolete blocks', () => {
    const { rerender } = render(<View scenario={scene} />);
    act(() => jest.advanceTimersByTime(100));
    rerender(<View scenario={healedScene(Date.now())} />);
    act(() => jest.advanceTimersByTime(200));
    const afterDamage = healedScene(Date.now(), { id: 'healing-2', useId: 'use-2', previousLife: 2, nextLife: 4, roll: 2, healed: 2 });
    afterDamage.items[0].stats.vida.current = 4;
    rerender(<View scenario={afterDamage} />);
    expect(screen.getByLabelText('Bárbaro · Vida: 2 de 8')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1100));
    expect(screen.getByLabelText('Bárbaro · Vida: 2 de 8')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(3200));
    expect(screen.getByLabelText('Bárbaro · Vida: 4 de 8')).toBeInTheDocument();
});

test('reconnection clears the entire pending queue and reduced motion never waits behind a previous roll', () => {
    useReducedMotion.mockReturnValue(true);
    const { rerender } = render(<View scenario={scene} />);
    act(() => jest.advanceTimersByTime(100));
    rerender(<View scenario={healedScene(Date.now())} />);
    act(() => jest.advanceTimersByTime(200));
    const second = healedScene(Date.now(), { id: 'healing-2', useId: 'use-2', previousLife: 7, nextLife: 8, roll: 2, healed: 1 });
    second.items[0].stats.vida.current = 8;
    rerender(<View scenario={second} />);
    expect(screen.getByLabelText('Bárbaro · Vida: 8 de 8')).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('D4: 2. Recupera 1 de Vida.');
    act(() => window.dispatchEvent(new Event('online')));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bárbaro · Vida: 8 de 8')).toBeInTheDocument();
});


test('antidote uses the atomic scene timeline once without affecting Life presentation', () => {
    const { result, rerender } = renderHook(({ scenario }) => useCanvasHealingPresentationEvents(scenario),
        { initialProps: { scenario: scene } });
    act(() => jest.advanceTimersByTime(100));
    const next = healedScene(Date.now(), { id: 'antidote-1', effect: 'remove-poison', actorId: 'ally', targetId: 'hero', roll: undefined });
    rerender({ scenario: next });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].effect).toMatchObject({ effect: 'remove-poison', actorId: 'ally', targetId: 'hero' });
    expect(result.current.byToken).toEqual({});
    rerender({ scenario: { ...next } });
    expect(result.current.events).toHaveLength(1);
    act(() => jest.advanceTimersByTime(3200));
    expect(result.current.events).toHaveLength(0);
    rerender({ scenario: { ...next } });
    expect(result.current.events).toHaveLength(0);
});

test('bandage shares its saved clock with the portrait cleanup and never replays an old cure', () => {
    const { result, rerender } = renderHook(({ scenario }) => useCanvasHealingPresentationEvents(scenario),
        { initialProps: { scenario: scene } });
    act(() => jest.advanceTimersByTime(100));
    const next = healedScene(Date.now(), { id: 'bandage-1', effect: 'remove-bleeding', actorId: 'ally', targetId: 'hero', roll: undefined });
    rerender({ scenario: next });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.byToken.hero).toMatchObject({ effect: 'remove-bleeding', presentationStartedAt: Date.now() });
    act(() => jest.advanceTimersByTime(3200));
    expect(result.current.byToken).toEqual({});
    rerender({ scenario: { ...next } });
    expect(result.current.events).toHaveLength(0);
});
