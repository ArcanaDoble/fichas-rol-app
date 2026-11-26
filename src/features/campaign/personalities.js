export const CAMPAIGN_PERSONALITIES = [
  { id: 'yerma', name: 'Yerma', src: '/yerma/Yerma.webp' },
  { id: 'taiga', name: 'Taiga', src: '/yerma/Taiga.webp' },
  { id: 'tundra', name: 'Tundra', src: '/yerma/Tundra.webp' },
];

export const resolveCampaignPersonality = (name) => CAMPAIGN_PERSONALITIES.find(
  (personality) => personality.id === String(name || '').trim().toLowerCase(),
) || null;
