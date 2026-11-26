import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AreaPlacementOverlay, { AreaPlacementControls, getThrowTrajectory } from '../components/AreaPlacementOverlay';

const placement = { x: 200, y: 100, width: 100, height: 100, distance: 3, range: 5, columns: 2, rows: 2,
    valid: true, cells: [{ column: 4, row: 2 }, { column: 5, row: 2 }, { column: 4, row: 3 }, { column: 5, row: 3 }] };
const sourceToken = { x: 0, y: 150, width: 50, height: 50 };

test('mist previews a complete 3×3 square with the label centered on the cloud', () => {
    const mistPlacement = { ...placement, width: 150, height: 150, columns: 3, rows: 3,
        cells: Array.from({ length: 9 }, (_, index) => ({ column: 4 + index % 3, row: 2 + Math.floor(index / 3) })) };
    const { container } = render(<AreaPlacementOverlay system={{ sourceToken, placement: mistPlacement,
        isConfirming: true, session: { definitionId: 'arcane-mist' } }} />);
    const cells = container.querySelectorAll('.noma-area-cell');
    expect(cells).toHaveLength(9);
    expect(cells[4].style.left).toBe(`${100 / 3}%`);
    expect(cells[4].style.top).toBe(`${100 / 3}%`);
    expect(container.querySelector('.noma-area-center').style.left).not.toBe('25%');
});

test('trajectory connects the rendered source to the area center and retains both distance labels', () => {
    const system = { sourceToken, placement, isPlacing: true };
    const { container } = render(<AreaPlacementOverlay system={system} zoom={0.25} />);
    const trajectory = getThrowTrajectory(sourceToken, placement, 0.25);
    expect(trajectory.end).toEqual({ x: 250, y: 150 });
    expect(container.querySelector('.noma-area-trajectory__line')).toHaveAttribute('d', trajectory.path);
    expect(container.querySelector('.noma-area-trajectory__line')).toHaveAttribute('vector-effect', 'non-scaling-stroke');
    expect(container.querySelector('.noma-area-distance').style.transform).toContain('scale(4)');
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
    expect(screen.getByText('3/5')).toBeInTheDocument();
});

test('launch requires a fixed valid destination and controls remain available before placement', () => {
    const system = { isPlacing: true, confirm: jest.fn(), reposition: jest.fn(), cancel: jest.fn() };
    const { rerender } = render(<AreaPlacementControls system={system} />);
    expect(screen.getByRole('button', { name: 'Confirmar uso del objeto' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar uso del objeto' }));
    expect(system.cancel).toHaveBeenCalledTimes(1);
    rerender(<AreaPlacementControls system={{ ...system, isPlacing: false, isConfirming: true, placement }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Recolocar plantilla' }));
    expect(system.reposition).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar uso del objeto' }));
    expect(system.confirm).toHaveBeenCalledTimes(1);
});

test('an invalid placement is marked on both the curve and the controls', () => {
    const system = { sourceToken, placement: { ...placement, valid: false }, isConfirming: true };
    const { container } = render(<><AreaPlacementOverlay system={system} /><AreaPlacementControls system={system} /></>);
    expect(container.querySelector('.noma-area-overlay')).toHaveAttribute('data-valid', 'false');
    expect(screen.getByRole('button', { name: 'Confirmar uso del objeto' })).toBeDisabled();
});

test('explosive placement marks the impact, shows shared pressure and lets the player orient the area', () => {
    const impactCell = { column: 4, row: 2 };
    const option = { ...placement, impactCell, orientation: 'nw' };
    const chooseExplosiveOrientation = jest.fn();
    const system = {
        session: { definitionId: 'explosive-bomb', context: { resource: { value: 4 }, explosiveRolls: [3, 7], impactCommitted: true } },
        sourceToken, placement: option, isConfirming: true, explosivePressure: 11,
        explosiveOrientations: [option, { ...option, orientation: 'ne' }],
        chooseExplosiveOrientation, confirm: jest.fn(), reposition: jest.fn(), cancel: jest.fn(),
    };
    const { container } = render(<><AreaPlacementOverlay system={system} /><AreaPlacementControls system={system} /></>);
    expect(container.querySelector('.noma-area-overlay')).toHaveAttribute('data-explosive', 'true');
    expect(container.querySelectorAll('.noma-area-cell--impact')).toHaveLength(1);
    expect(screen.getByText('Presión compartida')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('−3 Presión')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recolocar plantilla' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar explosión pendiente' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Extender explosión hacia el Noreste' }));
    expect(chooseExplosiveOrientation).toHaveBeenCalledWith('ne');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar área de explosión' }));
    expect(system.confirm).toHaveBeenCalledTimes(1);
});

test('a closed committed explosion exposes a visible resume action', () => {
    const resumeExplosiveBlast = jest.fn();
    render(<AreaPlacementControls system={{ canResumeExplosiveBlast: true, resumeExplosiveBlast }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar explosión pendiente' }));
    expect(resumeExplosiveBlast).toHaveBeenCalledTimes(1);
});


test.each(['healing-potion', 'antidote'])('direct consumable %s never displays launch controls', definitionId => {
    const { container } = render(<AreaPlacementControls system={{
        session: { definitionId }, isConfirming: true, confirm: jest.fn(), cancel: jest.fn(),
    }} />);
    expect(container).toBeEmptyDOMElement();
});
