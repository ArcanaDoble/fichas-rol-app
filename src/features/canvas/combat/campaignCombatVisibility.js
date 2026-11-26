// This projection is a UI information boundary, not a Firestore permission.
// The master and each token's controller see their own resources, never a
// rival's values merely because the tokens share a team.
export const campaignCombatForViewer = (combat, maySee) => combat && ({ ...combat,
  pendingAttack: campaignAttackForViewer(combat.pendingAttack, maySee),
  participants: Object.fromEntries(Object.entries(combat.participants || {}).map(([id, p]) => [id, maySee(id) ? p : {
    ...p, campaignHiddenResources: true, actionDice: [], actionDiceProfile: [], enemyActions: [], threatValue: null, threatDie: null,
    campaignThreatDice: [], threatDiceProfile: [],
  }])),
});

export const campaignAttackForViewer = (pending, maySee) => {
  if (!pending) return pending;
  const attack = maySee(pending.attackerId), defense = maySee(pending.targetId);
  return { ...pending,
    ...(!attack ? { actionValue: undefined, pressure: undefined, resources: [], actionDice: [], actionDieIds: [],
      heavyDice: [], attackThreatDice: [] } : {}),
    ...(pending.defense && !defense ? { defense: { ...pending.defense, value: undefined, resources: [] } } : {}),
    ...(pending.result ? { result: { ...pending.result,
      ...(!defense ? { defenseValue: undefined } : {}),
      ...(!attack ? { impact: undefined, roll: undefined, hits: pending.result.hits.map(hit => ({
        zone: hit.zone, zones: hit.zones, damage: hit.damage, cancelled: hit.cancelled,
      })) } : {}),
    } } : {}),
  };
};
