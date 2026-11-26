import * as rules from './rules.mjs';
import {SYSTEM,clone,esc,itemProfile,tokenProfile,tabletopBlocks,canAct} from './adapter.mjs';
export const state = () => canvas.scene?.getFlag(SYSTEM,'combat') || null;
export const token = id => canvas.scene?.tokens.get(id);
export const profile = id => tokenProfile(token(id),canvas.grid.size);
export const participant = id => state()?.participants?.[id];
export const activeGM = () => game.users.activeGM?.id === game.user.id;
let queue=Promise.resolve();
const serial = fn => { const p=queue.then(fn); queue=p.catch(console.error); return p; };
const save = async value => canvas.scene.setFlag(SYSTEM,'combat',value);
const fail = text => { throw new Error(text); };
const assert = (condition,text) => { if(!condition) fail(text); };
const own = (user,id) => token(id)?.actor?.testUserPermission(user,'OWNER');
const running = s => s?.status==='active' && s.roundPhase==='turns';
const messages=[];
export function notice(text) { messages.unshift(text); messages.splice(6); Hooks.callAll('nomaRefresh'); }
export const recent = () => messages;
export async function command(type,data={}) {
  if(game.user.isGM) return serial(()=>execute(type,data,game.user));
  assert(game.users.activeGM,'El máster debe estar conectado.');
  // Foundry authenticates the message author; never trust an arbitrary socket userId.
  return ChatMessage.create({content:`<p>Solicitud NOMA: ${esc(type)}</p>`,whisper:ChatMessage.getWhisperRecipients('GM').map(u=>u.id),flags:{[SYSTEM]:{command:{type,data,sceneId:canvas.scene.id}}}});
}
async function log(text,effect) {
  await ChatMessage.create({content:`<article class="noma-log"><b>NOMA · Roguelite</b><p>${esc(text)}</p></article>`,flags:{[SYSTEM]:{notice:text,effect:effect||null}}});
}
function validateTurn(s,id) { assert(running(s)&&canAct(s,id),'Este personaje no tiene la activación abierta.'); assert(!s.pendingAttack,'Resuelve primero el ataque pendiente.'); assert(!s.surplus,'Resuelve primero el sobrante de defensa.'); }
function availableDice(p,ids,status='available') {
  assert(Array.isArray(ids)&&new Set(ids).size===ids.length,'Selección de dados inválida.');
  const selected=ids.map(id=>p.actionDice.find(d=>d.id===id));
  assert(selected.every(d=>d?.status===status),'Esos dados ya no están disponibles.');
  return selected;
}
function rangeCheck(attacker,target,weapon) {
  const result=rules.evaluateCanvasAttackRange({attacker:profile(attacker),target:profile(target),weapon,items:canvas.scene.tokens.contents.map(t=>tokenProfile(t,canvas.grid.size)),gridConfig:{cellWidth:canvas.grid.size,cellHeight:canvas.grid.size}});
  assert(result.legal,result.reason);
  const a=token(attacker),b=token(target);
  assert(!CONFIG.Canvas.polygonBackends.sight.testCollision(a.getCenterPoint(a.toObject()),b.getCenterPoint(b.toObject()),{type:'sight',mode:'any'}),'Un muro bloquea la línea de visión.');
  return result;
}
async function execute(type,data,user) {
  let s=clone(state());
  const id=data.id,p=s?.participants?.[id],doc=token(id),actor=doc?.actor;
  const gmOnly=['start','rollAll','next','finish','reopen','rest'];
  assert(!gmOnly.includes(type)||user.isGM,'Acción reservada al máster.');
  if(!gmOnly.includes(type)) assert(own(user,id),'No puedes controlar ese personaje.');
  if(type==='start') {
    const tokens=canvas.scene.tokens.filter(t=>t.actor && ['hero','enemy'].includes(t.actor.type) && t.actor.system.health.value>0);
    assert(tokens.length,'Añade personajes al encuentro.');
    s=rules.createCanvasCombatState(tokens.map(t=>tokenProfile(t,canvas.grid.size)));
    if(s.roundPhase==='turns') s=tabletopBlocks(s);
    await log('Comienza el encuentro. Tirad los dados de acción.');
  } else if(type==='roll'||type==='rollAll') {
    assert(s?.roundPhase==='rolling','Ya se han fijado los dados de esta ronda.');
    const ids=type==='rollAll'?Object.values(s.participants).filter(p=>p.awaitingRoll).map(p=>p.tokenId):[id];
    for(const actorId of ids) if(s.participants[actorId]?.awaitingRoll) s=rules.rollParticipantActionDice(s,actorId);
    if(s.roundPhase==='turns' && s.round===1) s=tabletopBlocks(s);
  } else if(type==='next') {
    assert(s && !s.pendingAttack && !s.surplus && s.activeBlockIndex>=s.blocks.length,'Termina las activaciones antes de avanzar de ronda.');
    s=rules.startNextRound(s);
  } else if(type==='finish') {
    assert(s&&!s.pendingAttack&&!s.surplus,'Resuelve el ataque y su sobrante antes de terminar.'); s=rules.finishCanvasCombat(s);
  } else if(type==='reopen') {
    assert(p,'Ese token no participa.'); s=rules.undoParticipantActivation(s,id);
  } else if(type==='end') {
    validateTurn(s,id); s=rules.markParticipantActed(s,id);
  } else if(type==='reserve') {
    assert(running(s)&&p && !s.pendingAttack,'No puedes cambiar reservas durante un ataque.');
    const d=p.actionDice.find(d=>d.id===data.dieId);
    assert(d&&d.status!=='spent','Ese dado ya se ha gastado.');
    s=rules.setActionDieStatus(s,id,d.id,d.status==='committed'?'available':'committed');
  } else if(type==='sprint') {
    validateTurn(s,id);
    if(actor.type==='hero') { availableDice(p,[data.dieId]); s=rules.spendActionDieForSprint(s,id,data.dieId); }
    else s=rules.rechargeEnemyMovementWithAttack(s,id);
  } else if(type==='attack') {
    validateTurn(s,id); assert(actor.system.health.value>0,'El atacante está caído.');
    const target=token(data.targetId); assert(target?.actor && s.participants[target.id],'Elige un objetivo del encuentro.');
    assert(target.actor.system.health.value>0,'El objetivo está caído.');
    const selected=actor.type==='hero'?availableDice(p,data.dice||[]):[];
    const weapons=(data.weapons||[]).map(itemId=>actor.items.get(itemId));
    assert(weapons.length>=1&&weapons.length<=2&&new Set(data.weapons).size===weapons.length,'Elige una o dos armas.');
    assert(weapons.every(w=>w?.type==='weapon'&&w.system.equipped&&w.system.weaponSet===actor.system.activeSet),'El arma debe estar equipada en el conjunto activo.');
    assert(weapons.length===1||weapons.every(w=>w.system.hands===1),'El ataque doble requiere dos armas a una mano.');
    const cost=weapons.length===2?2:rules.getCanvasWeaponActionCost(itemProfile(weapons[0]),profile(id));
    assert(actor.type==='enemy'||selected.length>=cost,`Este ataque necesita ${cost} dados de acción.`);
    if(actor.type==='enemy') assert(p.enemyActions.find(a=>a.id==='attack')?.status==='available','Ya has gastado la acción principal.');
    const parts=weapons.map(w=>{const weapon=itemProfile(w),range=rangeCheck(id,target.id,weapon),dice=rules.parseWeaponDiceProfile(weapon);
      assert(dice.length,'El perfil de daño necesita dados definidos.');
      const results=rules.rollWeaponDice(dice),critical=rules.rollCriticalWeaponDice(dice,results,weapon,range.suppressTraits);
      return {weaponId:w.id,weapon,weaponResults:results,criticalResults:critical,range};});
    const threat=data.useThreat&&p.threatValue!=null?p.threatValue:0;
    const total=parts.reduce((sum,part,index)=>sum+rules.calculateCanvasAttackPressure({attacker:index===0?profile(id):{profileType:'rogueliteClass'},actionDice:index===0?selected:[],weapon:part.weapon,weaponResults:part.weaponResults,criticalResults:part.criticalResults,distance:part.range.distance,suppressTraits:part.range.suppressTraits,threatValue:index===0?threat:0}).total,0);
    s=rules.queueCanvasAttack(s,{id:foundry.utils.randomID(),attackerId:id,targetId:target.id,actionDieIds:selected.map(d=>d.id),actionDice:selected,attackParts:parts,pressure:total,usedThreat:!!threat,weapon:parts[0].weapon,suppressTraits:parts[0].range.suppressTraits});
    await log(`${doc.name} ataca a ${target.name}: ${total} de Presión. ${parts.map(x=>`${x.weapon.name} [${x.weaponResults.join(', ')}]`).join(' + ')}`,{from:id,to:target.id,kind:'attack'});
  } else if(type==='defend') {
    const attack=s?.pendingAttack;
    assert(attack?.targetId===id,'No hay un ataque pendiente contra este personaje.');
    let dice=[],cdBonus=0;
    if(actor.type==='hero') dice=availableDice(p,data.dice||[],'committed');
    else if(data.active) {
      assert(p.enemyActions.find(a=>a.id==='attack')?.status==='available','La defensa consume la acción principal.');
      const targetProfile=profile(id);const selection=rules.resolveCanvasEnemyDefenseSelection({token:targetProfile,equipmentIds:rules.getDefaultCanvasEnemyDefenseSelection(targetProfile)});
      assert(selection.legal,'No hay equipo válido para defender.'); cdBonus=selection.cdBonus;
      const rolled=rules.rollCanvasEnemyDefense({equipments:selection.items,storedThreatValue:p.threatValue,storedThreatDie:p.threatDie,useThreat:!!data.useThreat});
      dice=[...rolled.defenseDice,...rolled.defenseThreatDice];
      s=rules.setEnemyActionStatus(s,id,'attack','spent');
      if(rolled.consumedStoredThreat) s.participants[id].threatValue=null;
    }
    const result=rules.resolveCanvasAttackDamage({attackPressure:attack.pressure,defenseDice:dice,target:profile(id),weapon:attack.weapon,suppressTraits:attack.suppressTraits,defenseCdBonus:cdBonus});
    const next=rules.resolveQueuedCanvasAttack(s,{attackId:attack.id,defenseDieIds:actor.type==='hero'?dice.map(d=>d.id):[],...result});
    assert(!next.pendingAttack,'No se ha podido resolver la defensa.');s=next;
    await actor.update({'system.health.value':result.nextLife});
    if(result.surplus>0) s.surplus={defenderId:id,attackerId:attack.attackerId,value:result.surplus};
    await log(`${doc.name}: ${attack.pressure} − ${result.defense} = ${result.finalPressure} de Presión / CD ${result.effectiveCd}. Pierde ${result.lifeLost} de Vida.${result.surplus?` Sobrante: ${result.surplus}.`:''}`,{from:attack.attackerId,to:id,kind:result.lifeLost?'damage':'defense',value:result.lifeLost});
  } else if(type==='surplus') {
    const surplus=s?.surplus;assert(surplus?.defenderId===id,'No hay sobrante disponible.');
    if(data.choice==='move') s.participants[id].defensiveReposition={remaining:surplus.value};
    else if(data.choice==='counter') {
      const weapon=actor.items.get(data.weaponId);assert(weapon?.system.equipped,'Elige un arma equipada.');
      const range=rangeCheck(id,surplus.attackerId,itemProfile(weapon));
      const result=rules.resolveCanvasAttackDamage({attackPressure:surplus.value,target:profile(surplus.attackerId),weapon:itemProfile(weapon),suppressTraits:range.suppressTraits});
      await token(surplus.attackerId).actor.update({'system.health.value':result.nextLife});
      await log(`${doc.name} contraataca con ${surplus.value} de sobrante: ${result.lifeLost} de Vida.`,{from:id,to:surplus.attackerId,kind:'damage',value:result.lifeLost});
    } else assert(data.choice==='skip','Opción de sobrante inválida.');
    delete s.surplus;
  } else if(type==='switchSet') {
    if(running(s)) {validateTurn(s,id);availableDice(p,[data.dieId]);s=rules.setActionDieStatus(s,id,data.dieId,'spent');}
    await actor.update({'system.activeSet':actor.system.activeSet===0?1:0});
  } else if(type==='talent') {
    const talents=clone(actor.system.talents),talent=talents[data.index];
    assert(talent?.prepared&&!talent.spent,'Este talento no está preparado o ya fue usado.');talent.spent=true;
    await actor.update({'system.talents':talents});await log(`${doc.name} utiliza ${talent.name}. ${talent.description}`);
  } else if(type==='rest') {
    assert(!running(s),'Termina primero el combate.');
    const heroes=canvas.scene.tokens.filter(t=>t.actor?.type==='hero');
    assert(heroes.every(t=>t.actor.system.gold>=3),'El descanso cuesta 3 monedas por personaje.');
    for(const t of heroes) await t.actor.update({'system.health.value':t.actor.system.health.max,'system.gold':t.actor.system.gold-3,'system.talents':t.actor.system.talents.map(x=>({...x,spent:false}))});
    await log('Descanso completo: Vida y talentos recuperados.');
  } else fail('Acción desconocida.');
  if(s) await save(s);
  Hooks.callAll('nomaRefresh');
  return s;
}
export function installCombatHooks() {
  Hooks.on('createChatMessage',msg=>{
    const flag=msg.getFlag(SYSTEM,'command'),text=msg.getFlag(SYSTEM,'notice');
    if(text) notice(text);
    if(flag&&activeGM()&&flag.sceneId===canvas.scene?.id) serial(()=>execute(flag.type,flag.data,msg.author)).catch(e=>ui.notifications.warn(e.message));
    const effect=msg.getFlag(SYSTEM,'effect');if(effect) Hooks.callAll('nomaEffect',effect);
  });
  Hooks.on('preMoveToken',(doc,movement,options)=>{
    if(options.nomaCorrection) return;
    const s=state(),p=s?.participants?.[doc.id]; if(!running(s)||!p) return;
    const cost=Math.ceil(movement.passed?.cost??movement.cost??0),defense=p.defensiveReposition?.remaining||0;
    if((!canAct(s,doc.id)&&!defense)||s.pendingAttack||s.surplus) {ui.notifications.warn('No es su activación. Puedes reabrirla desde el inspector.');return false;}
    if(cost>(defense||rules.getAvailableMovement(p))) {ui.notifications.warn('Movimiento insuficiente. Gasta un dado en Correr.');return false;}
  });
  Hooks.on('moveToken',(doc,movement,options)=>{
    if(!activeGM()||options.nomaCorrection||!running(state())||!participant(doc.id)) return;
    const cost=Math.ceil(movement.passed?.cost??0);if(!cost) return;
    serial(()=>save(rules.recordParticipantMovement(state(),doc.id,{cost,from:movement.origin,to:{x:doc.toObject().x,y:doc.toObject().y}})));
  });
}
export {rules};
