import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import LoadingImage, { preloadImage } from '../LoadingImage';

const deferred = () => {
  let resolve;
  const promise = new Promise(finish => { resolve = finish; });
  return { promise, resolve };
};

const controlPreloadedImages = () => {
  const requests = [];
  const constructor = jest.spyOn(window, 'Image').mockImplementation(() => {
    const decoding = deferred();
    const image = {
      complete: false,
      naturalWidth: 0,
      src: '',
      onload: null,
      onerror: null,
      decode: jest.fn(() => decoding.promise),
    };
    requests.push({ image, decoding });
    return image;
  });
  return { requests, constructor };
};

afterEach(() => jest.restoreAllMocks());

test('keeps a new image hidden until it has loaded', () => {
  const { container } = render(
    <div className="relative h-32 w-32">
      <LoadingImage src="https://example.com/new-portrait.webp" alt="Retrato" />
    </div>,
  );

  const image = screen.getByRole('img', { name: 'Retrato' });
  expect(image).toHaveStyle({ opacity: '0' });
  expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();

  fireEvent.load(image);

  expect(image.style.opacity).toBe('');
  expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
});

test('remembers decoded sources so revisiting does not flash a placeholder', () => {
  const source = 'https://example.com/cached-equipment.webp';
  const firstRender = render(<LoadingImage src={source} alt="Equipo" />);
  fireEvent.load(screen.getByRole('img', { name: 'Equipo' }));
  firstRender.unmount();

  const { container } = render(<LoadingImage src={source} alt="Equipo guardado" />);

  expect(screen.getByRole('img', { name: 'Equipo guardado' }).style.opacity).toBe('');
  expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
});

test('hides the previous image while a different source is loading', () => {
  const { rerender } = render(
    <LoadingImage src="https://example.com/first.webp" alt="Objeto" />,
  );
  fireEvent.load(screen.getByRole('img', { name: 'Objeto' }));

  rerender(<LoadingImage src="https://example.com/second.webp" alt="Objeto" />);

  expect(screen.getByRole('img', { name: 'Objeto' })).toHaveStyle({ opacity: '0' });
});

test('deduplicates overlapping preloads and waits for decode before caching visible artwork', async () => {
  const source = 'https://example.com/preload-decoded-armor.webp';
  const { requests, constructor } = controlPreloadedImages();
  const first = preloadImage(source);
  const second = preloadImage(source);
  const settled = jest.fn();
  first.then(settled);

  expect(constructor).toHaveBeenCalledTimes(1);
  const { image, decoding } = requests[0];
  expect(image.src).toBe(source);
  image.complete = true;
  image.naturalWidth = 640;
  image.onload();
  await Promise.resolve();
  expect(image.decode).toHaveBeenCalledTimes(1);
  expect(settled).not.toHaveBeenCalled();

  decoding.resolve();
  await expect(first).resolves.toBe(true);
  await expect(second).resolves.toBe(true);
  const { container } = render(<LoadingImage src={source} alt="Armadura precargada" />);
  expect(screen.getByRole('img', { name: 'Armadura precargada' }).style.opacity).toBe('');
  expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
  await expect(preloadImage(source)).resolves.toBe(true);
  expect(constructor).toHaveBeenCalledTimes(1);
});

test('allows retrying a failed preload without keeping a rejected or successful cache entry', async () => {
  const source = 'https://example.com/preload-retry-armor.webp';
  const { requests, constructor } = controlPreloadedImages();
  const failed = preloadImage(source);
  requests[0].image.onerror();
  await expect(failed).resolves.toBe(false);

  const retry = preloadImage(source);
  expect(constructor).toHaveBeenCalledTimes(2);
  const { image, decoding } = requests[1];
  image.complete = true;
  image.naturalWidth = 640;
  image.onload();
  decoding.resolve();
  await expect(retry).resolves.toBe(true);

  const { container } = render(<LoadingImage src={source} alt="Armadura recuperada" />);
  expect(screen.getByRole('img', { name: 'Armadura recuperada' }).style.opacity).toBe('');
  expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
});

test('a late decode from an unmounted source cannot reveal the next keyed artwork', async () => {
  const firstSource = 'https://example.com/keyed-late-armor-a.webp';
  const secondSource = 'https://example.com/keyed-late-armor-b.webp';
  const firstDecode = deferred();
  const secondDecode = deferred();
  const { rerender, container } = render(<LoadingImage key={firstSource} src={firstSource} alt="Protección" />);
  const firstImage = screen.getByRole('img', { name: 'Protección' });
  firstImage.decode = jest.fn(() => firstDecode.promise);
  fireEvent.load(firstImage);

  rerender(<LoadingImage key={secondSource} src={secondSource} alt="Protección" />);
  const secondImage = screen.getByRole('img', { name: 'Protección' });
  secondImage.decode = jest.fn(() => secondDecode.promise);
  fireEvent.load(secondImage);

  await act(async () => {
    firstDecode.resolve();
    await firstDecode.promise;
  });
  expect(secondImage).not.toBe(firstImage);
  expect(secondImage).toHaveAttribute('src', secondSource);
  expect(secondImage).toHaveStyle({ opacity: '0' });
  expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();

  await act(async () => {
    secondDecode.resolve();
    await secondDecode.promise;
  });
  expect(secondImage.style.opacity).toBe('');
  expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
});
