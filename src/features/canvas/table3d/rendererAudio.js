import { visual } from './rendererSurfaces';

const takes = {
  stone: [4, 4],
  wood: [17, 3],
  dice: [8, 5],
  rub: [13, 4],
  felt: [0, 4],
};
const bagTakes = { open: 0, close: 2, coin: 3 };

export function createTableAudio() {
  let context,
    bus,
    disposed = false,
    muted = false;
  const banks = new Map(),
    previous = new Map();
  async function loadBank(name, audioContext) {
    try {
      const response = await fetch(visual(name));
      if (!response.ok || disposed) return;
      const bytes = await response.arrayBuffer();
      if (disposed) return;
      const decoded = await audioContext.decodeAudioData(bytes);
      if (!disposed) banks.set(name, decoded);
    } catch {
      // The browser can suspend or revoke audio while a sample is loading.
    }
  }
  function unlock() {
    if (disposed || muted) return;
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        context = new Audio({ latencyHint: 'interactive' });
        bus = context.createGain();
        bus.gain.value = 0.65;
        bus.connect(context.destination);
        void loadBank('contactos-dados.wav', context);
        void loadBank('sonidos-bolsa.wav', context);
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch {
      /* Device may be in silent mode. */
    }
  }
  function play(kind, strength = 0.5) {
    if (
      disposed ||
      muted ||
      !context ||
      context.state !== 'running' ||
      document.hidden
    )
      return;
    const bag = Object.prototype.hasOwnProperty.call(bagTakes, kind),
      buffer = banks.get(bag ? 'sonidos-bolsa.wav' : 'contactos-dados.wav');
    if (!buffer) return;
    const now = context.currentTime,
      last = previous.get(kind) || -1;
    if (now - last < (kind === 'rub' ? 0.12 : 0.045)) return;
    previous.set(kind, now);
    const range = takes[kind] || takes.wood,
      offset = bag
        ? bagTakes[kind] * 0.5
        : (range[0] + Math.floor(Math.random() * range[1])) * 0.18;
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = 0.9 + 0.14 * Math.random();
    filter.type = 'lowpass';
    filter.frequency.value =
      (kind === 'rub' ? 3400 : 12000) * (0.34 + 0.65 * Math.min(1, strength));
    gain.gain.value =
      Math.min(0.9, 0.05 + strength * 0.58) *
      (kind === 'rub' ? 0.35 : kind === 'close' ? 0.62 : 1);
    source.connect(filter).connect(gain).connect(bus);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start(now, offset, bag ? 0.42 : 0.158);
  }
  return {
    unlock,
    play,
    mute(value) {
      muted = !!value;
      if (bus) bus.gain.value = muted ? 0 : 0.65;
    },
    dispose() {
      disposed = true;
      if (context) context.close().catch(() => {});
      banks.clear();
    },
  };
}
