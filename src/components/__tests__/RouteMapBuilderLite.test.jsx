import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import RouteMapBuilderLite from '../RouteMapBuilderLite';

jest.mock('../../firebase', () => ({
  db: {},
}));

jest.mock('../../utils/storage', () => ({
  getOrUploadFile: jest.fn(() => Promise.resolve({ url: 'https://example.com/icon.png' })),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  onSnapshot: jest.fn((ref, onNext) => {
    const snapshot = {
      exists: () => false,
      data: () => ({}),
    };
    onNext(snapshot);
    return jest.fn();
  }),
  serverTimestamp: jest.fn(() => 'timestamp'),
  setDoc: jest.fn(() => Promise.resolve()),
}));

describe('RouteMapBuilderLite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  const setup = () => {
    const utils = render(<RouteMapBuilderLite onBack={jest.fn()} />);
    const canvas = utils.getByTestId('route-map-lite-canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1024, height: 768 });
    return { ...utils, canvas };
  };

  it('allows creating and connecting nodes', async () => {
    const { getByText, getAllByText, canvas, container } = setup();

    fireEvent.click(getByText('Crear Nodo'));
    fireEvent.pointerDown(canvas, { clientX: 240, clientY: 180, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    await waitFor(() => {
      expect(getByText('Normal 2')).toBeInTheDocument();
    });

    fireEvent.click(getByText('Conectar'));
    const startNode = getAllByText('Inicio').find((node) => node.tagName?.toLowerCase() === 'text');
    expect(startNode).toBeTruthy();
    fireEvent.pointerDown(startNode, { clientX: 320, clientY: 220, pointerId: 2 });
    const targetNode = getAllByText('Normal 2').find((node) => node.tagName?.toLowerCase() === 'text');
    expect(targetNode).toBeTruthy();
    fireEvent.pointerDown(targetNode, { clientX: 420, clientY: 320, pointerId: 3 });
    fireEvent.pointerUp(canvas, { pointerId: 3 });

    await waitFor(() => {
      const edges = container.querySelectorAll('line');
      expect(edges.length).toBeGreaterThan(0);
    });
  });

  it('duplicates selected nodes preserving data structure', async () => {
    const { getByText, getAllByText, canvas } = setup();

    fireEvent.click(getByText('Crear Nodo'));
    fireEvent.pointerDown(canvas, { clientX: 320, clientY: 220, pointerId: 4 });
    fireEvent.pointerUp(canvas, { pointerId: 4 });

    await waitFor(() => {
      expect(getByText('Normal 2')).toBeInTheDocument();
    });

    const selectableNode = getAllByText('Normal 2').find((node) => node.tagName?.toLowerCase() === 'text');
    expect(selectableNode).toBeTruthy();
    fireEvent.pointerDown(selectableNode, { clientX: 360, clientY: 260, pointerId: 5 });
    fireEvent.pointerUp(canvas, { pointerId: 5 });

    fireEvent.click(getByText('Duplicar'));

    await waitFor(() => {
      expect(getByText('Normal 2 (copia)')).toBeInTheDocument();
    });
  });
});
