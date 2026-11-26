import React from 'react';
import { render, screen } from '@testing-library/react';
import { CombatLogPanel } from '../../../tactical-shared/components/sidebar/CombatLogPanel';
import { campaignAttackForViewer, campaignCombatForViewer } from '../campaignCombatVisibility';
import { canControlCampaignToken } from '../campaignAttackRules';

test('a same-team delegated NPC is not permission to read the opposing player resources', () => {
  const tokens = [{ id: 'npc', teamId: 'allies', controlledBy: ['Ada'] }, { id: 'pj', teamId: 'allies', controlledBy: ['Leo'] }];
  const maySee = id => canControlCampaignToken(tokens.find(t => t.id === id), { isPlayerView: true, playerName: 'Ada' });
  const pending = { attackerId: 'pj', targetId: 'npc', actionValue: 931, resources: [{ value: 931 }],
    defense: { value: 413, resources: [{ value: 413 }] }, result: { impact: 940, roll: 9, defenseValue: 413, hits: [{ impact: 940, rd: 2, damage: 938, dice: [{ value: 9 }] }] } };
  const visible = campaignAttackForViewer(pending, maySee);
  expect(visible.actionValue).toBeUndefined();
  expect(visible.resources).toEqual([]);
  expect(visible.defense.value).toBe(413);
  expect(visible.result.hits[0]).toEqual({ damage: 938 });
  const state = campaignCombatForViewer({ pendingAttack: pending, participants: { pj: { actionDice: [{ value: 931 }] } } }, maySee);
  expect(state.pendingAttack.actionValue).toBeUndefined();
  expect(state.participants.pj.actionDice).toEqual([]);
  expect(pending.actionValue).toBe(931); // projection does not destroy master data
  expect(campaignAttackForViewer(pending, () => true)).toEqual(pending);
});

test('the player combat log contains outcomes, never exact attack or defense expenditure', () => {
  render(<CombatLogPanel activeTab="COMBAT_LOG" isPlayerView isBoardMode={false} combatLog={[{
    id: 'exchange', canvasCampaign: true, attackerName: 'Enemigo', targetName: 'Henry', weaponName: 'Espada',
    attackTotal: 931, defenderTotal: 413, fixedAttackPressure: 927, finalDamage: 2, reactionType: 'evadir',
    resourcesSpent: [{ label: 'Acción principal · 927' }], attackerDice: [{ value: 931 }], defenderDice: [{ value: 413 }],
  }]} />);
  expect(screen.getByText('Enemigo → Henry')).toBeInTheDocument();
  expect(screen.getByText('Espada · 2 de daño')).toBeInTheDocument();
  expect(screen.queryByText(/931|413|927/)).not.toBeInTheDocument();
});
