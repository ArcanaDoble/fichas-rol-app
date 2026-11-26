const art = path => esc(new URL(path, document.baseURI).href);
import {BASE,esc,clone} from './adapter.mjs';
const number=(label,name,value)=>`<label>${label}<input name="${name}" inputmode="numeric" type="number" min="0" value="${esc(value)}"></label>`;
const input=(label,name,value)=>`<label>${label}<input name="${name}" value="${esc(value)}"></label>`;
const check=(label,name,value)=>`<label class="noma-check"><input name="${name}" type="checkbox" ${value?'checked':''}>${label}</label>`;
const field=(label,name,value)=>`<label class="noma-wide">${label}<textarea name="${name}" rows="4">${esc(value)}</textarea></label>`;
const stats = (a) => `<div class="noma-form-grid">${input('Nombre','name',a.name)}${input('Ilustración · ruta o URL','img',a.img)}${number('Vida actual','system.health.value',a.system.health.value)}${number('Vida máxima','system.health.max',a.system.health.max)}${number('CD','system.cd',a.system.cd)}${number('Movimiento','system.movement',a.system.movement)}${number('Iniciativa base','system.initiative',a.system.initiative)}${number('Ofensiva','system.offense',a.system.offense)}${input('Dados de acción (d8, d6, d4)','dice',a.system.actionDice.join(', '))}${input('Amenaza (d6, d8… o vacío)','system.threatDie',a.system.threatDie)}${input('Recurso de clase','system.resource.name',a.system.resource.name)}${number('Recurso actual','system.resource.value',a.system.resource.value)}${number('Recurso máximo','system.resource.max',a.system.resource.max)}${number('Oro','system.gold',a.system.gold)}${field('Notas y reglas de clase','system.description',a.system.description)}</div>`;
export class NomaActorSheet extends foundry.applications.sheets.ActorSheetV2 {
  static DEFAULT_OPTIONS={classes:['noma','noma-sheet'],position:{width:870,height:760},window:{resizable:true}};
  async _renderHTML() {
    const a=this.actor;
    return `<header class="noma-sheet-hero"><img src="${esc(a.img)}"><div><small>${a.type==='hero'?'Clase de héroe':'Enemigo'} · NIVEL ${a.system.level}</small><h1>${esc(a.name)}</h1><p>Vida ${a.system.health.value}/${a.system.health.max} · CD ${a.system.cd} · ${esc(a.system.actionDice.join(' / '))}</p></div></header>
      <nav class="noma-sheet-tabs"><button type="button" data-tab="stats">Ficha</button><button type="button" data-tab="equipment">Equipo y conjuntos</button><button type="button" data-tab="talents">Talentos</button></nav>
      <section data-page="stats">${stats(a)}</section>
      <section data-page="equipment" hidden><div class="noma-toolbar"><h2>Inventario</h2><button type="button" data-op="catalog">+ Abrir catálogo</button></div><p>Conjunto activo: ${a.system.activeSet+1}. Las armas a dos manos ocupan ambas manos.</p><div class="noma-inventory">${a.items.map(i=>`<article class="noma-item-row"><img src="${esc(i.img)}"><div><b>${esc(i.name)}</b><small>${esc(i.type==='armor'?`CD ${i.system.cd}`:i.system.damage)} · ${esc(i.system.range)}</small></div><label><input type="checkbox" data-equip="${i.id}" ${i.system.equipped?'checked':''}> Equipar</label>${i.type==='weapon'?`<select aria-label="Conjunto de ${esc(i.name)}" data-set="${i.id}"><option value="0" ${i.system.weaponSet===0?'selected':''}>Conjunto 1</option><option value="1" ${i.system.weaponSet===1?'selected':''}>Conjunto 2</option></select>`:''}<button type="button" data-edit="${i.id}" aria-label="Editar ${esc(i.name)}">✎</button><button type="button" data-remove="${i.id}" aria-label="Retirar ${esc(i.name)}">×</button></article>`).join('')}</div></section>
      <section data-page="talents" hidden><div class="noma-toolbar"><h2>Talentos preparados</h2><button type="button" data-op="talent">+ Talento</button></div><p>Hasta tres preparados. Los usos se recuperan al descansar.</p>${a.system.talents.map((t,i)=>`<div class="noma-talent-edit">${input('Talento',`talent.${i}.name`,t.name)}${check('Preparado',`talent.${i}.prepared`,t.prepared)}${check('Gastado',`talent.${i}.spent`,t.spent)}${field('Efecto',`talent.${i}.description`,t.description)}</div>`).join('')}</section>
      <footer><button class="noma-primary" type="submit">Guardar ficha</button><span class="noma-save-state"></span></footer>`;
  }
  _replaceHTML(html,content){content.innerHTML=html;}
  _onRender(context,options){
    super._onRender(context,options);
    const root=this.element;
    root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{root.querySelectorAll('[data-page]').forEach(p=>p.hidden=p.dataset.page!==b.dataset.tab);});
    root.querySelector('[data-op="catalog"]').onclick=()=>openCatalogue('items',this.actor);
    root.querySelector('[data-op="talent"]').onclick=async()=>{await this.actor.update({'system.talents':[...this.actor.system.talents,{name:'Nuevo talento',description:'',prepared:false,spent:false}]});};
    root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>this.actor.items.get(b.dataset.edit).sheet.render(true));
    root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{await this.actor.deleteEmbeddedDocuments('Item',[b.dataset.remove]);});
    root.querySelectorAll('[data-equip]').forEach(b=>b.onchange=async()=>{try{await equip(this.actor,this.actor.items.get(b.dataset.equip),b.checked);}catch(e){b.checked=!b.checked;ui.notifications.warn(e.message);}});
    root.querySelectorAll('[data-set]').forEach(b=>b.onchange=()=>this.actor.items.get(b.dataset.set).update({'system.weaponSet':Number(b.value),'system.equipped':false}));
    root.addEventListener('submit',event=>event.preventDefault());
  }
  _processFormData(event,form,formData){
    const raw=formData.object;
    const talents=clone(this.actor.system.talents);
    for(const [key,value]of Object.entries(raw)) if(key.startsWith('talent.')){const [,index,field]=key.split('.');talents[index][field]=value;delete raw[key];}
    if(talents.filter(x=>x.prepared).length>3) throw new Error('Prepara como máximo tres talentos.');
    raw['system.talents']=talents;
    raw['system.actionDice']=String(raw.dice||'').split(/[ ,/]+/).filter(Boolean).map(x=>x.toLowerCase());delete raw.dice;
    if(raw['system.actionDice'].some(x=>!/^d(4|6|8|10|12|20)$/.test(x))||raw['system.actionDice'].length>3) throw new Error('Usa hasta tres dados: d4, d6, d8, d10, d12 o d20.');
    return foundry.utils.expandObject(raw);
  }
}
export async function equip(actor,item,equipped){
  const changes=[{_id:item.id,'system.equipped':equipped}];
  if(equipped && item.type==='weapon') {
    const others=actor.items.filter(i=>i.id!==item.id&&i.type==='weapon'&&i.system.equipped&&i.system.weaponSet===item.system.weaponSet);
    if(item.system.hands===2) changes.push(...others.map(i=>({_id:i.id,'system.equipped':false})));
    else {for(const i of others.filter(i=>i.system.hands===2))changes.push({_id:i.id,'system.equipped':false}); if(others.filter(i=>i.system.hands===1).length>=2)throw new Error('Solo puedes llevar dos armas a una mano en cada conjunto.');}
  }
  if(equipped&&item.type==='armor') {changes.push(...actor.items.filter(i=>i.type==='armor'&&i.id!==item.id&&i.system.equipped).map(i=>({_id:i.id,'system.equipped':false})));await actor.update({'system.cd':item.system.cd});}
  await actor.updateEmbeddedDocuments('Item',changes);
}
export class NomaItemSheet extends foundry.applications.sheets.ItemSheetV2 {
  static DEFAULT_OPTIONS={classes:['noma','noma-sheet'],position:{width:650,height:690},window:{resizable:true}};
  async _renderHTML(){const i=this.document,s=i.system;return `<header class="noma-sheet-hero"><img src="${esc(i.img)}"><div><small>${esc(s.rarity)}</small><h1>${esc(i.name)}</h1></div></header><div class="noma-form-grid">${input('Nombre','name',i.name)}${input('Ilustración · ruta o URL','img',i.img)}${input('Daño / dados de defensa','system.damage',s.damage)}${input('Alcance','system.range',s.range)}${number('Dados de acción','system.cost',s.cost)}${number('Manos','system.hands',s.hands)}${number('CD de armadura','system.cd',s.cd)}${input('Rareza','system.rarity',s.rarity)}${input('Rasgos separados por comas','traits',s.traits.join(', '))}${number('Cantidad','system.quantity',s.quantity)}${field('Efecto y reglas','system.description',s.description)}${field('Historia','system.lore',s.lore)}</div><footer><button type="submit" class="noma-primary">Guardar objeto</button></footer>`;}
  _replaceHTML(html,content){content.innerHTML=html;}
  _processFormData(event,form,formData){const raw=formData.object;raw['system.traits']=String(raw.traits||'').split(',').map(x=>x.trim()).filter(Boolean);delete raw.traits;return foundry.utils.expandObject(raw);}
}
let catalogApp;
export function openCatalogue(tab='classes',actor=null){if(catalogApp)catalogApp.close();catalogApp=new Catalogue({tab,actor});catalogApp.render(true);}
class Catalogue extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS={id:'noma-catalogue',classes:['noma','noma-catalogue'],window:{title:'Archivo de NOMA',resizable:true},position:{width:1050,height:760}};
  constructor({tab,actor}){super();this.tab=tab;this.actor=actor;this.query='';}
  async _renderHTML(){
    const entries=this.tab==='items'?game.items.contents:game.actors.filter(a=>a.type===(this.tab==='classes'?'hero':'enemy')&&!a.getFlag('noma-roguelite','instance'));
    this.entries=entries;
    return `<header><small>ARCHIVO DE NOMA</small><h1>${this.actor?`Equipo para ${esc(this.actor.name)}`:'Elige tu próxima aventura'}</h1><p>Clases, criaturas y objetos del catálogo. Puedes editar y crear contenido.</p></header><nav class="noma-catalog-tabs"><button data-tab="classes">Clases</button><button data-tab="enemies">Enemigos</button><button data-tab="items">Equipo y habilidades</button><input aria-label="Buscar en el catálogo" placeholder="Buscar…" value="${esc(this.query)}" id="noma-search">${game.user.isGM?'<button data-new>+ Crear</button>':''}</nav><div class="noma-catalog-grid">${entries.map(i=>`<article data-name="${esc(i.name.toLowerCase())}" class="noma-catalog-card" style="--art:url('${art(i.img)}')"><div class="noma-card-caption"><small>${esc(i.system.rarity|| (i.type==='hero'?'Clase de héroe':'Criatura'))}</small><h2>${esc(i.name)}</h2><p>${esc(this.tab==='items'?(i.type==='armor'?`CD ${i.system.cd}`:`${i.system.damage} · ${i.system.range}`):`Vida ${i.system.health.max} · CD ${i.system.cd}`)}</p><div><button data-view="${i.id}">Ver ficha</button>${game.user.isGM||this.actor?.isOwner?`<button class="noma-primary" data-add="${i.id}">${this.tab==='items'?(this.actor?'Añadir':'Inspeccionar'):'Al escenario'}</button>`:''}</div></div></article>`).join('')}</div>`;
  }
  _replaceHTML(html,content){content.innerHTML=html;}
  _onRender(){
    this.element.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{this.tab=b.dataset.tab;this.render(true);});
    const search=this.element.querySelector('#noma-search');search.oninput=()=>{this.query=search.value;this.element.querySelectorAll('[data-name]').forEach(e=>e.hidden=!e.dataset.name.includes(search.value.toLowerCase()));};
    this.element.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>this.entries.find(i=>i.id===b.dataset.view).sheet.render(true));
    this.element.querySelectorAll('[data-add]').forEach(b=>b.onclick=async()=>{const entry=this.entries.find(i=>i.id===b.dataset.add);if(this.tab==='items'){if(this.actor){const data=entry.toObject();delete data._id;data.system.equipped=false;await this.actor.createEmbeddedDocuments('Item',[data]);ui.notifications.info(`${entry.name} añadido.`);}else entry.sheet.render(true);}else {const {spawnActor}=await import('./world.mjs');await spawnActor(entry);this.close();}});
    this.element.querySelector('[data-new]')?.addEventListener('click',async()=>{const isItem=this.tab==='items';let kind=this.tab==='classes'?'hero':'enemy';if(isItem){kind=await foundry.applications.api.DialogV2.prompt({window:{title:'Crear objeto'},content:'<label>Tipo <select name="kind"><option value="weapon">Arma</option><option value="armor">Armadura</option><option value="ability">Habilidad</option><option value="talent">Talento</option><option value="consumable">Consumible</option><option value="accessory">Accesorio</option></select></label>',ok:{label:'Crear',callback:(event,button)=>button.form.elements.kind.value},rejectClose:false});if(!kind)return;}const doc=await (isItem?Item:Actor).create({name:isItem?'Nuevo objeto':'Nuevo personaje',type:kind,img:isItem?'icons/svg/item-bag.svg':'icons/svg/mystery-man.svg'});doc.sheet.render(true);this.render(true);});
  }
}
