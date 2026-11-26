// Conversion only: the actual combat calculations are bundled from NOMA.
export const SYSTEM = 'noma-roguelite';
export const BASE = `systems/${SYSTEM}`;
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const clone = value => JSON.parse(JSON.stringify(value));
export function itemProfile(item) {
  const s = item.system;
  return {...s.source, id:item.id, name:item.name, nombre:item.name, type:item.type,
    dano:s.damage, damage:s.damage, alcance:s.range, range:s.range, actionCost:s.cost,
    handsRequired:s.hands, rasgos:s.traits, defenseClass:s.cd, img:item.img};
}
export function tokenProfile(token, gridSize=100) {
  const a = token.actor, s = a.system;
  const position=token.toObject ? token.toObject() : token;
  const equipped = [...a.items].filter(i => i.system.equipped && (i.type !== 'weapon' || i.system.weaponSet === s.activeSet)).map(itemProfile);
  const stat = n => ({current:n,max:n});
  return {id:token.id,name:token.name,portrait:token.texture?.src || a.img,type:'token',
    profileType:a.type==='hero'?'rogueliteClass':'rogueliteEnemy',
    teamId:token.disposition < 0 ? 'enemies':'players',
    linkedClassId:s.classId, linkedEnemyId:s.sourceId || a.id,classIdentity:a.name,
    actionDice:s.actionDice,initiativeBase:s.initiative,fixedInitiative:s.initiative,
    offenseBase:s.offense,threatDie:s.threatDie,status:s.status,
    x:position.x,y:position.y,width:position.width*gridSize,height:position.height*gridSize,
    equippedItems:equipped,inventory:equipped,
    stats:{vida:{current:s.health.value,max:s.health.max},cd:stat(s.cd),movimiento:stat(s.movement),iniciativa:stat(s.initiative),ofensiva:stat(s.offense)},
  };
}
// The current tabletop master gives ties to players. Keep this adapter local;
// do not change the existing web's comparator during the Foundry experiment.
export function tabletopBlocks(state) {
  const sorted=Object.values(state.participants).filter(p=>Number.isFinite(p.initiative)).sort((a,b)=>b.initiative-a.initiative || (a.side===b.side?a.orderIndex-b.orderIndex:a.side==='players'?-1:1));
  const blocks=[];
  for(const p of sorted) {
    const last=blocks.at(-1);
    if(last && last.side===p.side && (p.side==='players'||(last.profileId===p.profileId&&last.initiative===p.initiative))) last.memberIds.push(p.tokenId);
    else blocks.push({id:`block-${blocks.length+1}-${p.side}`,side:p.side,profileId:p.profileId,initiative:p.initiative,memberIds:[p.tokenId],actedIds:[]});
  }
  return {...state,blocks,activeBlockIndex:0};
}
export function canAct(state,id) {
  const block=state?.blocks?.[state.activeBlockIndex];
  return state?.status==='active' && state.roundPhase==='turns' && block?.memberIds.includes(id) && !block.actedIds.includes(id);
}
