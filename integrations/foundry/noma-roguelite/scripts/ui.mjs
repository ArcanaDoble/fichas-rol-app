const art = path => esc(new URL(path, document.baseURI).href);
import {BASE,SYSTEM,esc,canAct} from './adapter.mjs';
import {state,participant,command,rules,recent,token,profile} from './combat.mjs';
import {openCatalogue} from './sheets.mjs';
let root,selectedId=null,selectedDice=new Set(),selectedWeapons=new Set(),targetId='',timer;
const safe=fn=>async event=>{try{await fn(event);}catch(e){console.error(e);ui.notifications.warn(e.message);}};
const button=(action,text,extra='',cls='')=>`<button type="button" data-op="${action}" ${extra} class="${cls}">${text}</button>`;
const tokenList=()=>canvas.scene?.tokens.filter(t=>t.actor&&(game.user.isGM||t.actor.isOwner||(!t.hidden&&t.object?.isVisible)))||[];
const current=()=>token(selectedId)||canvas.tokens?.controlled[0]?.document;
const icon=(name)=>`<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;
function die(d,i){const selected=selectedDice.has(d.id);return `<div class="noma-die-wrap"><button class="noma-die ${selected?'selected':''} ${d.status}" data-die="${esc(d.id)}" title="${d.status==='committed'?'Reservado para defensa':d.status==='spent'?'Gastado':'Seleccionar dado'}" ${d.status==='spent'?'disabled':''}>${rules.renderActionDie({faces:d.sides||6,value:d.value??'?',status:d.status,selected,accent:'gold'})}<small>D${d.sides||6}</small></button>${d.id?`<button class="noma-reserve" data-reserve="${esc(d.id)}" ${d.status==='spent'?'disabled':''}>${d.status==='committed'?'◆ Reservado':'◇ Reservar'}</button>`:''}</div>`;}
function stat(label,path,value,max){return `<div class="noma-stat"><span>${label}</span><div>${button('adjust','−',`data-path="${path}" data-delta="-1" aria-label="Reducir ${esc(label)}"`)}<input aria-label="${esc(label)}" inputmode="numeric" data-stat="${path}" value="${value}">${max!==undefined?`<small>/ ${max}</small>`:''}${button('adjust','+',`data-path="${path}" data-delta="1" aria-label="Aumentar ${esc(label)}"`)}</div></div>`;}
function renderInspector(doc,s){
  if(!doc?.actor) return `<aside class="noma-inspector"><div class="noma-empty"><small>EL UMBRAL</small><h2>Elige un personaje</h2><p>Haz clic en un retrato o en su token para ver sus dados, equipo y acciones.</p>${button('catalog','Explorar clases')}</div></aside>`;
  const a=doc.actor,p=s?.participants?.[doc.id],v=a.system;
  const weapons=a.items.filter(i=>i.type==='weapon'&&i.system.equipped&&i.system.weaponSet===v.activeSet);
  if(!weapons.some(w=>selectedWeapons.has(w.id))){selectedWeapons.clear();if(weapons[0])selectedWeapons.add(weapons[0].id);}
  const armor=a.items.find(i=>i.type==='armor'&&i.system.equipped);
  const editable=a.isOwner;
  return `<aside class="noma-inspector"><header class="noma-portrait" style="--art:url('${art(a.img)}')"><small>${a.type==='hero'?'CLASE DE HÉROE':'BESTIARIO'}</small><h1>${esc(doc.name)}</h1>${button('sheet',icon('pen'),'aria-label="Editar ficha"','noma-edit')}</header>
    <div class="noma-inspector-body ${editable?'':'readonly'}"><h3>Estadísticas</h3>${stat('Vida','health.value',v.health.value,v.health.max)}<div class="noma-life">${Array.from({length:Math.min(v.health.max,40)},(_,i)=>`<span class="${i<v.health.value?'filled':''}"></span>`).join('')}</div>${stat('CD','cd',v.cd)}${stat('Movimiento','movement',v.movement)}${p?`<p class="noma-muted">${rules.getAvailableMovement(p)} casillas disponibles${p.defensiveReposition?.remaining?` · ${p.defensiveReposition.remaining} de reposición`:''}</p>`:''}${a.type==='hero'&&v.resource.name!=='Recurso'?stat(v.resource.name,'resource.value',v.resource.value,v.resource.max):''}${a.type==='enemy'?stat('Ofensiva','offense',v.offense):''}
    <h3>Equipo · conjunto ${v.activeSet+1}</h3><div class="noma-weapons">${weapons.map(w=>`<button data-weapon="${w.id}" class="noma-weapon ${selectedWeapons.has(w.id)?'selected':''}" style="--art:url('${art(w.img)}')"><small>${esc(w.system.rarity)}</small><b>${esc(w.name)}</b><span>${esc(w.system.damage)} · ${esc(w.system.range)} · ${w.system.cost} acción</span><em>${esc(w.system.traits.join(' · '))}</em></button>`).join('')||'<p>No hay armas equipadas en este conjunto.</p>'}</div>${armor?`<button class="noma-armor" data-item="${armor.id}" style="--art:url('${art(armor.img)}')"><b>${esc(armor.name)}</b><span>CD ${armor.system.cd}</span></button>`:''}<div class="noma-toolbar">${button('switchSet','Cambiar conjunto')}${button('inventory','Inventario')}</div>
    ${v.talents.some(t=>t.prepared)?`<h3>Talentos</h3>${v.talents.map((t,i)=>t.prepared?`<button class="noma-talent ${t.spent?'spent':''}" data-talent="${i}" ${t.spent?'disabled':''} title="${esc(t.description)}">${icon(t.spent?'check':'star')} ${esc(t.name)}</button>`:'').join('')}`:''}
    ${a.items.some(i=>i.type==='ability')?`<h3>Habilidades</h3>${a.items.filter(i=>i.type==='ability').map(i=>`<button class="noma-ability" data-item="${i.id}">${icon('bolt')} ${esc(i.name)}</button>`).join('')}`:''}
    ${game.user.isGM&&p?button('reopen','Reabrir activación','','noma-subtle'):''}</div></aside>`;
}
function renderDock(doc,s){
  const p=s?.participants?.[doc?.id],a=doc?.actor,pending=s?.pendingAttack;
  if(!doc)return '';
  if(pending){const defender=token(pending.targetId),mine=defender?.actor?.isOwner;
    if(doc.id!==pending.targetId)return `<section class="noma-dock noma-pending"><div><small>ATAQUE EN CURSO</small><h2>${pending.pressure} de Presión</h2><p>${esc(token(pending.attackerId)?.name)} → ${esc(defender?.name)}</p></div>${button('selectDefense','Resolver defensa',`data-id="${pending.targetId}" ${mine?'':'disabled'}`,'noma-primary')}</section>`;
    const targetP=participant(doc.id),enemy=a.type==='enemy';
    return `<section class="noma-dock noma-pending"><div><small>DEFENSA · ${esc(token(pending.attackerId)?.name)}</small><h2>${pending.pressure} de Presión</h2><p>Selecciona tus dados reservados o recibe el impacto.</p></div>${enemy?`<div><p>La defensa activa gasta la acción principal.</p>${targetP.threatValue!=null?`<label><input id="noma-threat" type="checkbox"> Usar Amenaza ${targetP.threatValue}</label>`:''}${button('defendEnemy','Defender con equipo',targetP.enemyActions.find(x=>x.id==='attack')?.status==='available'?'':'disabled')}</div>`:`<div class="noma-dice">${targetP.actionDice.filter(d=>d.status==='committed').map(die).join('')||'<span>Sin dados reservados</span>'}</div>`}<div class="noma-dock-actions">${button('defend','Resolver impacto','','noma-primary')}${button('noDefense','Recibir sin defender')}</div></section>`;
  }
  if(s?.surplus?.defenderId===doc.id)return `<section class="noma-dock"><div><small>DEFENSA SUPERADA</small><h2>${s.surplus.value} de sobrante</h2><p>Contraataca con el arma seleccionada o gana reposición.</p></div>${button('counter','Contraatacar')}${button('reposition','Reposicionarse')}${button('skipSurplus','Continuar')}</section>`;
  if(!s||s.status==='finished')return `<section class="noma-dock"><div><small>EXPLORACIÓN</small><h2>Todo listo para entrar</h2><p>Arrastra tu token. Abre el archivo para añadir criaturas y equipo.</p></div>${game.user.isGM?button('start','Preparar combate','','noma-primary'):''}</section>`;
  if(p?.awaitingRoll)return `<section class="noma-dock"><div><small>RONDA ${s.round}</small><h2>Prepara tus acciones</h2><p>La iniciativa se fija con el dado más alto de la primera ronda.</p></div><div class="noma-dice">${a.system.actionDice.map((x,i)=>die({sides:Number(x.slice(1)),status:'available'},i)).join('')}</div>${button('roll','Tirar dados','','noma-primary')}</section>`;
  if(!p)return '';
  const act=canAct(s,doc.id),hero=a.type==='hero';
  const targets=tokenList().filter(t=>t.id!==doc.id&&t.disposition!==doc.disposition&&t.actor.system.health.value>0);
  if(!targets.some(t=>t.id===targetId))targetId=targets[0]?.id||'';
  return `<section class="noma-dock"><div class="noma-dock-heading"><small>RONDA ${s.round} · ${act?'TU ACTIVACIÓN':'EN ESPERA'}</small><h2>${esc(doc.name)}</h2><p>${hero?'Selecciona dados para actuar. Reserva para defender.':'Una acción de movimiento y una acción principal.'}</p></div><div class="noma-dice">${hero?p.actionDice.map(die).join(''):`<div class="noma-enemy-actions">${p.enemyActions.map(x=>`<span class="${x.status}">${x.id==='attack'?'Acción principal':'Movimiento'} ${x.status==='spent'?'✓':'◆'}</span>`).join('')}${p.threatValue!=null?`<label><input id="noma-threat" type="checkbox"> Amenaza ${p.threatValue}</label>`:''}</div>`}</div><div class="noma-dock-actions"><select id="noma-target" aria-label="Objetivo">${targets.map(t=>`<option value="${t.id}" ${targetId===t.id?'selected':''}>${esc(t.name)}</option>`).join('')}</select><div>${button('attack','Atacar',act?'':'disabled','noma-primary')}${button('sprint','Correr',act?'':'disabled')}${button('end','Finalizar',act?'':'disabled')}</div></div></section>`;
}
function renderTimeline(s){if(!s||s.status==='finished')return '<div class="noma-phase">Exploración · El umbral</div>';return `<div class="noma-timeline" aria-label="Orden de iniciativa">${(s.blocks||[]).map((b,i)=>`<div class="noma-block ${i===s.activeBlockIndex?'active':''}"><small>${b.side==='players'?'Héroes':'Enemigos'} · ${b.initiative}</small><div>${b.memberIds.map(id=>{const p=s.participants[id];if(!tokenList().some(t=>t.id===id))return '';return `<button data-select="${id}" class="${b.actedIds.includes(id)?'acted':''}" title="${esc(p.name)}"><img src="${esc(p.portrait)}"><span>${esc(p.name)}</span></button>`;}).join('')}</div></div>`).join('')||'<p>Esperando las tiradas de acción…</p>'}</div>`;}
export function mountUI(){
  if(root)return refreshUI();
  document.body.classList.add('noma-world');root=document.createElement('div');root.id='noma-ui';document.body.append(root);
  document.body.classList.toggle('noma-tools',game.settings.get(SYSTEM,'tools'));
  Hooks.on('nomaEffect',playEffect);
  window.render_game_to_text=()=>JSON.stringify({mode:'Foundry NOMA Roguelite',coordinates:'Scene pixels; origin top-left; x right, y down; each cell 100px',scene:canvas.scene?.name,selected:selectedId,combat:state(),tokens:tokenList().map(t=>({id:t.id,name:t.name,x:t.x,y:t.y,hp:t.actor.system.health,cd:t.actor.system.cd}))});
  window.advanceTime=()=>refreshUI();
  refreshUI();
}
export function refreshUI(){clearTimeout(timer);timer=setTimeout(render,25);}
function render(){
  if(!root||!canvas.ready)return;
  const controlled=canvas.tokens.controlled[0]?.document;if(controlled&&controlled.id!==selectedId){selectedId=controlled.id;selectedDice.clear();selectedWeapons.clear();}
  if(!token(selectedId))selectedId=tokenList().find(t=>t.actor.isOwner)?.id;
  const doc=current(),s=state(),scroll=root.querySelector('.noma-inspector-body')?.scrollTop||0,rail=root.querySelector('.noma-timeline')?.scrollLeft||0;
  const usable=new Set((s?.participants?.[doc?.id]?.actionDice||[]).filter(d=>d.status!=='spent').map(d=>d.id));
  selectedDice=new Set([...selectedDice].filter(id=>usable.has(id)));
  const focus=document.activeElement;if(root.contains(focus)&&focus.tagName==='INPUT')return;
  root.innerHTML=`<header class="noma-top"><div class="noma-brand">NOMA <span>ROGUELITE</span></div><div class="noma-scene-title">${esc(canvas.scene.name)}</div><nav>${button('catalog','Archivo')}${button('journal','Guía')}${button('tools',icon('sliders'),'title="Herramientas de escena" aria-label="Herramientas de escena"')}${game.user.isGM?button('roundMenu',s?.status==='active'?`Ronda ${s.round}`:'Encuentro'):''}</nav></header>${renderTimeline(s)}<div class="noma-party">${tokenList().filter(t=>t.disposition>=0).map(t=>`<button data-select="${t.id}" class="${selectedId===t.id?'selected':''}"><img src="${esc(t.actor.img)}"><span>${esc(t.name)}</span><small>${t.actor.system.health.value} / ${t.actor.system.health.max}</small></button>`).join('')}</div>${renderInspector(doc,s)}${renderDock(doc,s)}<div class="noma-events" aria-live="polite">${recent().slice(0,2).map(t=>`<p>${esc(t)}</p>`).join('')}</div><div class="noma-canvas-hint">ARRASTRAR · Mover token <span>RUEDA · Zoom</span><span>CLIC DERECHO + ARRASTRAR · Cámara</span></div>`;
  root.querySelector('.noma-inspector-body')?.scrollTo(0,scroll);root.querySelector('.noma-timeline')?.scrollTo(rail,0);
  root.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>select(b.dataset.select));
  root.querySelectorAll('[data-op]').forEach(b=>b.onclick=safe(()=>act(b.dataset.op,b.dataset)));
  root.querySelectorAll('[data-die]').forEach(b=>b.onclick=()=>{const id=b.dataset.die;if(!id)return;selectedDice.has(id)?selectedDice.delete(id):selectedDice.add(id);refreshUI();});
  root.querySelectorAll('[data-reserve]').forEach(b=>b.onclick=safe(()=>command('reserve',{id:doc.id,dieId:b.dataset.reserve})));
  root.querySelectorAll('[data-weapon]').forEach(b=>b.onclick=()=>{const id=b.dataset.weapon;selectedWeapons.has(id)?selectedWeapons.delete(id):selectedWeapons.add(id);refreshUI();});
  root.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>doc.actor.items.get(b.dataset.item).sheet.render(true));
  root.querySelectorAll('[data-talent]').forEach(b=>b.onclick=safe(()=>command('talent',{id:doc.id,index:Number(b.dataset.talent)})));
  root.querySelectorAll('[data-stat]').forEach(input=>input.onchange=safe(async()=>{const n=Number(input.value);if(!Number.isInteger(n)||n<0)throw new Error('Introduce un entero positivo.');await doc.actor.update({[`system.${input.dataset.stat}`]:n});input.blur();refreshUI();}));
  root.querySelector('#noma-target')?.addEventListener('change',e=>{targetId=e.target.value;});
  const timeline=root.querySelector('.noma-timeline');if(timeline){let start;timeline.onpointerdown=e=>{if(e.button===0)start={x:e.clientX,left:timeline.scrollLeft};};timeline.onpointermove=e=>{if(start&&e.buttons===1&&Math.abs(e.clientX-start.x)>5){timeline.scrollLeft=start.left-e.clientX+start.x;timeline.dataset.dragging='true';}};timeline.onpointerup=()=>{start=null;setTimeout(()=>delete timeline.dataset.dragging,0);};timeline.addEventListener('click',e=>{if(timeline.dataset.dragging){e.stopPropagation();e.preventDefault();}},true);}
}
function select(id){selectedId=id;selectedDice.clear();selectedWeapons.clear();const t=token(id);if(t?.isOwner)t.object.control({releaseOthers:true});else canvas.tokens.releaseAll();refreshUI();}
async function act(op,data){
  const doc=current(),id=doc?.id;
  if(op==='catalog')return openCatalogue();
  if(op==='sheet'||op==='inventory')return doc.actor.sheet.render(true);
  if(op==='journal')return game.journal.find(j=>j.name.startsWith('Empieza')).sheet.render(true);
  if(op==='tools'){const value=!game.settings.get(SYSTEM,'tools');await game.settings.set(SYSTEM,'tools',value);document.body.classList.toggle('noma-tools',value);return;}
  if(op==='roundMenu')return roundMenu();
  if(op==='selectDefense')return select(data.id);
  if(op==='adjust'){const path=data.path,value=foundry.utils.getProperty(doc.actor.system,path);return doc.actor.update({[`system.${path}`]:Math.max(path==='cd'?1:0,value+Number(data.delta))});}
  if(op==='start'||op==='rollAll'||op==='next'||op==='finish'||op==='rest')return command(op);
  if(op==='reopen'||op==='end'||op==='roll')return command(op,{id});
  if(op==='sprint'||op==='switchSet')return command(op,{id,dieId:[...selectedDice][0]});
  if(op==='attack'){await command('attack',{id,targetId,weapons:[...selectedWeapons],dice:[...selectedDice],useThreat:!!root.querySelector('#noma-threat')?.checked});selectedDice.clear();refreshUI();return;}
  if(op==='defend'||op==='noDefense'||op==='defendEnemy'){await command('defend',{id,dice:op==='noDefense'?[]:[...selectedDice],active:op==='defendEnemy',useThreat:!!root.querySelector('#noma-threat')?.checked});selectedDice.clear();return;}
  if(op==='counter'||op==='reposition'||op==='skipSurplus')return command('surplus',{id,choice:op==='counter'?'counter':op==='reposition'?'move':'skip',weaponId:[...selectedWeapons][0]});
}
async function roundMenu(){
  const s=state();
  const actions=[...(!s||s.status==='finished'?[['start','Preparar combate']]:[]),...(s?.roundPhase==='rolling'?[['rollAll','Tirar por todos']]:[]),...(s?.status==='active'&&s.activeBlockIndex>=s.blocks.length?[['next','Siguiente ronda']]:[]),...(s?.status==='active'?[['finish','Terminar combate']]:[]),...(!s||s.status==='finished'?[['rest','Descanso completo · 3 monedas']]:[])];
  return foundry.applications.api.DialogV2.wait({window:{title:'Encuentro · NOMA'},content:'<p>Gestiona la ronda y las activaciones del encuentro.</p>',buttons:actions.map(([action,label])=>({action,label,callback:()=>command(action)}))});
}
function playEffect({from,to,kind,value}){
  const a=token(from)?.object,b=token(to)?.object;if(!b)return;
  const points=[a?.center||b.center,b.center].map(p=>canvas.stage.toGlobal(new PIXI.Point(p.x,p.y)));
  const [p1,p2]=points;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('noma-effect');svg.setAttribute('viewBox',`0 0 ${window.innerWidth} ${window.innerHeight}`);
  svg.innerHTML=`<defs><filter id="noma-glow"><feGaussianBlur stdDeviation="3"/></filter></defs><path d="M ${p1.x} ${p1.y} Q ${(p1.x+p2.x)/2} ${Math.min(p1.y,p2.y)-65} ${p2.x} ${p2.y}" class="noma-slash"/><circle cx="${p2.x}" cy="${p2.y}" r="45" class="noma-impact ${kind}"/>${kind!=='attack'?`<text x="${p2.x}" y="${p2.y-40}" class="noma-damage">${value?`−${value}`:'DEFENSA'}</text>`:''}`;
  document.body.append(svg);setTimeout(()=>svg.remove(),1100);
}
