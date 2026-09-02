import React from 'react';
import { render, screen } from '@testing-library/react';

import ActionDieSvg from '../ActionDieSvg';

describe('ActionDieSvg', () => {
  it.each([4, 6, 8, 10, 12])('renders D%s as native SVG geometry', (faces) => {
    const { container } = render(
      <ActionDieSvg faces={faces} value={faces} title={`D${faces}`} />,
    );

    const die = screen.getByRole('img', { name: `D${faces}` });
    expect(die.tagName.toLowerCase()).toBe('svg');
    expect(die).toHaveAttribute('data-action-die', String(faces));
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(die).toHaveTextContent(String(faces));
  });

  it('keeps gradient identifiers unique when several dice share the same tray', () => {
    const { container } = render(
      <>
        <ActionDieSvg faces={8} value={8} title="Primer D8" />
        <ActionDieSvg faces={8} value={4} title="Segundo D8" />
      </>,
    );

    const gradientIds = [...container.querySelectorAll('linearGradient')].map((node) => node.id);
    expect(new Set(gradientIds).size).toBe(gradientIds.length);
  });

  it('exposes spent and committed states without raster fallbacks', () => {
    const { container } = render(
      <>
        <ActionDieSvg faces={6} value={3} status="committed" accent="blue" selected title="Reservado" />
        <ActionDieSvg faces={4} value={2} status="spent" title="Gastado" />
      </>,
    );

    expect(screen.getByRole('img', { name: 'Reservado' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Gastado' })).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('uses the five visible faces from the D10 reference', () => {
    const { container } = render(<ActionDieSvg faces={10} value={7} title="D10" />);

    expect(container.querySelector('polygon[points="60,6 32,54 60,67 88,54"]')).toBeInTheDocument();
    const lowerLeftFace = container.querySelector('polygon[points="29,57 8,62 58,114 58,71 32,59"]');
    const lowerRightFace = container.querySelector('polygon[points="88,59 62,71 62,114 112,62 91,57"]');
    expect(lowerLeftFace).toHaveAttribute('fill-opacity', '0.64');
    expect(lowerRightFace).toHaveAttribute('fill-opacity', '0.78');
    expect(lowerLeftFace).not.toHaveAttribute('opacity');
    expect(lowerRightFace).not.toHaveAttribute('opacity');
    expect(container.querySelector('polygon[points="60,7 103,38 85,104 35,104 17,38"]')).not.toBeInTheDocument();
  });

  it('uses the central pentagon and five surrounding faces from the D12 reference', () => {
    const { container } = render(<ActionDieSvg faces={12} value={12} title="D12" />);

    const centralFace = container.querySelector('polygon[points="47,78 74,78 82,53 60,37 38,53"]');
    const lowerFace = container.querySelector('polygon[points="46,83 33,100 60,109 87,100 74,83"]');
    const numeral = container.querySelector('text');
    expect(centralFace).toBeInTheDocument();
    expect(lowerFace).toHaveAttribute('fill-opacity', '0.7');
    expect(lowerFace).not.toHaveAttribute('opacity');
    expect(numeral).toHaveAttribute('x', '59');
    expect(numeral).toHaveAttribute('y', '60');
    expect(container.querySelector('polygon[points="60,6 92,16 111,43 111,77 92,104 60,114 28,104 9,77 9,43 28,16"]')).not.toBeInTheDocument();
  });
});
