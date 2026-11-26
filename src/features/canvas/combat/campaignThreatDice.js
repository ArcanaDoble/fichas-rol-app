const sides = [4, 6, 8, 10, 12, 20];

export const normalizeCampaignThreatProfile = (profile, legacy) => (Array.isArray(profile) ? profile : legacy ? [legacy] : [])
  .map(die => Number(String(die?.die ?? die).replace(/^d/i, '')))
  .filter(value => sides.includes(value)).map(value => `d${value}`);

// Old encounters keep their single reserve until the next round initializes
// the full profile. IDs identify copies, so two d8s can be spent independently.
export const getCampaignThreatPool = participant => Array.isArray(participant?.campaignThreatDice)
  ? participant.campaignThreatDice.map((die, i) => i === 0 && participant.threatValue === null ? { ...die, status: 'spent' } : die)
  : participant?.threatValue != null ? [{ id: 'threat', die: participant.threatDie, value: participant.threatValue, status: 'available' }] : [];

export const rollCampaignThreatPool = (participant, random, round) => normalizeCampaignThreatProfile(participant.threatDiceProfile, participant.threatDie)
  .map((die, index) => ({ id: `threat-r${round}-${index}`, die, sides: Number(die.slice(1)),
    value: 1 + Math.floor(Math.max(0, Math.min(.999999999, Number(random()) || 0)) * Number(die.slice(1))), status: 'available' }));

export const updateCampaignThreatResource = (participant, resource, spent) => {
  if (resource.source === 'custom') return participant;
  if (!Array.isArray(participant.campaignThreatDice)) return { ...participant, threatValue: spent ? null : resource.value };
  const pool = getCampaignThreatPool(participant).map(die => die.id === resource.id
    ? { ...die, value: resource.value, status: spent ? 'spent' : resource.status || 'available' } : die);
  return { ...participant, campaignThreatDice: pool, threatValue: pool[0]?.status === 'available' ? pool[0].value : null };
};
