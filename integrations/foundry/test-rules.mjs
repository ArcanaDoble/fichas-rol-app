import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as rules from './noma-roguelite/scripts/rules.mjs';
import {tokenProfile,tabletopBlocks,canAct} from './noma-roguelite/scripts/adapter.mjs';
const data=JSON.parse(await readFile(new URL('./noma-roguelite/data/catalog.json',import.meta.url)));
function token(a,id,x,side){return tokenProfile({id,name:a.name,actor:{...a,id:'actor-'+id,system:{status:[],activeSet:0,...a.system},items:(a.items||[]).map((i,n)=>({...i,id:'item-'+n,system:{weaponSet:0,...i.system}}))},x,y:400,width:1,height:1,disposition:side,texture:{src:a.img}},100);}
const barb=token(data.classes.find(a=>a.name==='Bárbaro'),'barb',400,1),goblin=token(data.enemies.find(a=>a.name==='Duende'),'goblin',500,-1),second={...goblin,id:'goblin-2'};
let s=rules.createCanvasCombatState([barb,goblin,second]);
assert.equal(Object.keys(s.participants).length,3);
s=rules.submitActionDice(s,'barb',[6,3,2]);s=tabletopBlocks(s);
assert.equal(s.blocks[0].side,'players','Player wins initiative tie at 8');
assert.equal(s.blocks[1].memberIds.length,2,'Enemies of one profile group');
assert(canAct(s,'barb'));
const d=s.participants.barb.actionDice[0];
s=rules.spendActionDieForSprint(s,'barb',d.id);
assert.equal(rules.getAvailableMovement(s.participants.barb),8);
s=rules.recordParticipantMovement(s,'barb',{from:{x:400,y:400},to:{x:500,y:400},cost:1});
assert.equal(rules.getAvailableMovement(s.participants.barb),7);
s=rules.markParticipantActed(s,'barb');assert(!canAct(s,'barb'));
s=rules.undoParticipantActivation(s,'barb');assert(canAct(s,'barb'),'Reopening restores activation');
const weapon=rules.getCanvasEquippedWeapons(barb)[0];assert(weapon,'Imported class has a weapon');
assert(rules.evaluateCanvasAttackRange({attacker:barb,target:goblin,weapon,gridConfig:{cellWidth:100,cellHeight:100},items:[barb,goblin]}).legal);
const attack=rules.calculateCanvasAttackPressure({attacker:barb,actionDice:[{value:5}],weaponResults:[4],weapon});assert.equal(attack.total,9);
const damage=rules.resolveCanvasAttackDamage({attackPressure:9,defenseDice:[{value:2}],target:goblin,weapon:{}});
assert.equal(damage.lifeLost,1);assert.equal(damage.nextLife,4);
const blocked=rules.resolveCanvasAttackDamage({attackPressure:5,defenseDice:[{value:8}],target:goblin,weapon:{}});assert.equal(blocked.surplus,3);assert.equal(blocked.lifeLost,0);
console.log('PASS: import, player ties, groups, sprint, movement, reopen, equipped weapons, reach, pressure, damage, surplus.');

const defenseSelection=rules.resolveCanvasEnemyDefenseSelection({token:goblin,equipmentIds:rules.getDefaultCanvasEnemyDefenseSelection(goblin)});
assert(defenseSelection.legal&&defenseSelection.items.length);
const enemyDefense=rules.rollCanvasEnemyDefense({equipments:defenseSelection.items,random:()=>0.5});
assert(enemyDefense.totalDefense>0,'Enemy equipment produces defense dice');

console.log('PASS: native adapter enemy defense selection and roll.');
process.exit(0);
