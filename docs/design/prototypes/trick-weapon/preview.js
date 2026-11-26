/* Isolated interaction proposal. No Firebase, character writes or real dice. */
const initialForms = [
  { id:'cane', label:'Estoque', damage:'1d12', range:'Cercano', hands:1, cost:1, competence:'Simple', traits:'Perforante, Torso, Crítico', image:'/armas/estoque.webp' },
  { id:'whip', label:'Látigo', damage:'2d4', range:'Intermedio', hands:1, cost:1, competence:'Simple', traits:'Crítico, Sangrado, Barrido, Sin guardia', image:'./assets/latigo.png' },
];
const state = {view:'forge', editForm:0, mobilePanel:'edit', name:'Bastón enroscado', rarity:'Legendaria', forms:structuredClone(initialForms), activeForm:0, choosing:false, selectedDie:null, dice:[6,4,2].map((value,index)=>({id:index,value,spent:false}))};
const app=document.getElementById('app');
const escapeHtml = value => String(value).replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const turnIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 8h12l-3-3m3 3-3 3M20 16H8l3-3m-3 3 3 3"/></svg>';
const effect='Gasta 1 dado de acción e ignora su valor para cambiar entre estoque y látigo.';
let noticeTimer;
function notify(message){const el=document.getElementById('notice');el.textContent=message;el.classList.add('is-visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.classList.remove('is-visible'),3500);}
function card(index, editing=false){const f=state.forms[index];return `<article class="weapon-card${editing?' is-editing':''}" data-form="${f.id}">
  <div class="weapon-hero"><img src="${escapeHtml(f.image)}" alt="${escapeHtml(f.label)}"><div><div class="eyebrow">ARMA · ${escapeHtml(f.label)}</div><h3 class="weapon-name">${escapeHtml(state.name)}</h3><div class="weapon-rarity">${escapeHtml(state.rarity)}</div></div></div>
  <div class="damage-line"><span class="tiny-label">Daño</span><strong>${escapeHtml(f.damage)}</strong></div>
  <dl class="weapon-stats"><div><dt>Alcance</dt><dd>${escapeHtml(f.range)}</dd></div><div><dt>Coste</dt><dd>${f.cost} DA</dd></div><div><dt>Empuñadura</dt><dd>${f.hands===1?'Una mano':'Dos manos'}</dd></div></dl>
  <div class="traits"><span class="trait is-trick">Truco</span>${f.traits.split(',').filter(Boolean).map(t=>`<span class="trait">${escapeHtml(t.trim())}</span>`).join('')}</div>
  ${state.view==='forge'?`<div class="weapon-effect"><span class="tiny-label">Transformación</span>${effect}</div>`:''}
  </article>`;}
const input=(name,label,value,extra='')=>`<label ${extra}><span class="field-name">${label}</span><input class="control" data-field="${name}" value="${escapeHtml(value)}"></label>`;
const select=(name,label,value,options)=>`<label><span class="field-name">${label}</span><select class="control" data-field="${name}">${options.map(o=>`<option value="${escapeHtml(o[0])}"${String(value)===String(o[0])?' selected':''}>${escapeHtml(o[1])}</option>`).join('')}</select></label>`;
function forge(){const f=state.forms[state.editForm];return `
  <div class="page-title"><div><h1>Editar arma</h1><p class="subtle">Forja · Bastón enroscado</p></div><span class="eyebrow">Truco · Dos formas</span></div>
  <div class="mobile-forge-tabs"><button class="mode-tab" data-mobile="edit" aria-pressed="${state.mobilePanel==='edit'}">Datos del arma</button><button class="mode-tab" data-mobile="preview" aria-pressed="${state.mobilePanel==='preview'}">Ver las dos formas</button></div>
  <div class="forge-grid">
    <aside class="forge-previews${state.mobilePanel==='preview'?' mobile-visible':''}"><div class="preview-title"><h2>Vista en inventario</h2><small>En tiempo real</small></div>
      ${state.forms.map((form,i)=>`${i?`<div class="form-bridge">${turnIcon} Transformar · 1 DA</div>`:''}<div class="form-label"><span class="eyebrow">Forma ${i+1} · ${escapeHtml(form.label)}</span><button data-edit="${i}">Editar esta forma</button></div>${card(i,state.editForm===i)}`).join('')}
      <p class="common-note">Ilustración de estoque provisional para esta maqueta.</p>
    </aside>
    <section class="forge-fields${state.mobilePanel==='edit'?' mobile-visible':''}">
      <div class="editor"><header class="editor-head"><h2>Datos y reglas</h2><p class="subtle">Un arma, dos formas que puedes configurar.</p></header><div class="editor-body">
      <div class="field-grid">${input('name','Nombre del arma',state.name)}${select('rarity','Rareza',state.rarity,[['Raro','Raro'],['Legendaria','Legendaria']])}<div class="full"><span class="field-name">Rasgo del arma</span><div class="trait-field"><span>◆ Truco</span><small>Habilita una segunda forma</small></div></div></div>
      <div class="form-editor-tabs">${state.forms.map((form,i)=>`<button class="mode-tab" data-edit="${i}" aria-pressed="${state.editForm===i}">${escapeHtml(form.label)} · Forma ${i+1}</button>`).join('')}</div>
      <div class="field-grid">${input('label','Nombre de esta forma',f.label)}${input('damage','Perfil de daño',f.damage)}${select('range','Alcance',f.range,['Toque','Cercano','Intermedio','Lejano','Extremo'].map(v=>[v,v]))}${select('cost','Dados de acción',f.cost,[[1,'1 dado'],[2,'2 dados'],[3,'3 dados']])}${select('hands','Empuñadura',f.hands,[[1,'Una mano'],[2,'Dos manos']])}${select('competence','Competencia',f.competence,['Simple','Marcial','Arcana'].map(v=>[v,v]))}${input('traits','Rasgos de esta forma',f.traits,'class="full"')}</div>
      <div class="section-caption">Arte de ${escapeHtml(f.label)}</div><div class="image-picker"><img src="${escapeHtml(f.image)}" alt="Arte de la forma"><div><button class="plain-button" data-upload>Subir imagen de esta forma</button><input type="file" id="image-file" accept="image/*" hidden><small>Cada forma conserva su propia ilustración.</small></div></div>
      <div class="cost-picker"><strong>Transformación</strong><span>1 dado de acción · Cualquier valor</span></div>
      <p class="common-note">${effect}</p>
      </div></div><div class="mobile-actions"><button class="plain-button" data-save>Guardar en la maqueta</button></div>
    </section>
  </div>`;}
function dice(choose=false){return state.dice.map(die=>`<${choose?'button':'div'} ${choose?'type="button"':''} class="die${die.spent?' is-spent':''}" ${choose?`data-die="${die.id}" aria-label="Gastar dado de acción ${die.value}" aria-pressed="${state.selectedDie===die.id}" ${die.spent?'disabled':''}`:''}>${die.value}<small>${die.spent?'GASTADO':'D6'}</small></${choose?'button':'div'}>`).join('');}
function play(){const combat=state.view==='combat', f=state.forms[state.activeForm], next=state.forms[1-state.activeForm], available=state.dice.filter(d=>!d.spent).length;return `
  <div class="play-stage"><header class="play-head"><div><span class="eyebrow">${combat?'Canvas · Turno activo':'Ficha de Campaña · Manos'}</span><h1>Equipo de Yuuzu</h1></div><span class="subtle">${combat?'Ronda 2 · Preparación':'Fuera de combate'}</span></header>
  <div class="play-grid"><section class="play-card"><div class="form-status"><span class="eyebrow">Mano principal</span><strong>Forma: ${escapeHtml(f.label)}</strong></div>${card(state.activeForm)}
  <button class="transform-button" data-transform ${combat&&!available?'disabled':''}>${turnIcon} ${combat?'Transformar en':'Preparar forma'} ${escapeHtml(next.label.toLowerCase())}<span>${combat?'· 1 DA':''}</span></button>
  ${combat?`<div class="transform-fold" ${state.choosing?'':'hidden'}><h3>Elige el dado que gastas</h3><div class="action-pool">${dice(true)}</div><p class="subtle">Se consume el dado; su valor no se suma al daño.</p><button class="plain-button" data-confirm ${state.selectedDie===null?'disabled':''}>Transformar en ${escapeHtml(next.label.toLowerCase())}</button><button class="reset" data-cancel>Cancelar</button></div>`:''}
  </section><aside class="play-side">
    ${combat&&!state.choosing?`<section class="resources"><h2>Dados de acción</h2><div class="action-pool">${dice()}</div><p class="subtle">${available} de 3 disponibles</p></section>`:''}
    <section class="rule-summary"><strong>Para atacar</strong><p>${escapeHtml(f.damage)} · ${escapeHtml(f.range)} · ${f.cost} DA</p></section>
    <section class="rule-summary"><strong>Para defender</strong><p>${f.traits.toLowerCase().includes('sin guardia')?'Sin guardia: esta forma no puede usarse para hacer parry.':'Puedes usar el estoque para hacer parry.'}</p></section>
    <section class="rule-summary"><strong>Forma activa</strong><p>${escapeHtml(f.label)}. ${combat?'La transformación conserva el turno y las acciones restantes.':'La carta del equipo muestra la forma que llevarás preparada.'}</p></section>
    <button class="reset" data-reset>Reiniciar ejemplo</button>
  </aside></div></div>`;}
function render(){document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.view===state.view));app.innerHTML=state.view==='forge'?forge():play();}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.view){state.view=button.dataset.view;state.choosing=false;state.selectedDie=null;render();window.scrollTo(0,0);}
  if(button.dataset.mobile){state.mobilePanel=button.dataset.mobile;render();}
  if(button.hasAttribute('data-edit')){state.editForm=Number(button.dataset.edit);state.mobilePanel='edit';render();}
  if(button.hasAttribute('data-save'))notify('Maqueta actualizada. No modifica el catálogo ni los personajes.');
  if(button.hasAttribute('data-upload'))document.getElementById('image-file').click();
  if(button.hasAttribute('data-transform')){if(state.view==='sheet'){state.activeForm=1-state.activeForm;render();notify('Forma preparada: '+state.forms[state.activeForm].label);}else{state.choosing=!state.choosing;state.selectedDie=null;render();}}
  if(button.hasAttribute('data-die')){state.selectedDie=Number(button.dataset.die);render();}
  if(button.hasAttribute('data-cancel')){state.choosing=false;state.selectedDie=null;render();}
  if(button.hasAttribute('data-confirm')){const die=state.dice.find(d=>d.id===state.selectedDie);if(!die||die.spent)return;die.spent=true;state.activeForm=1-state.activeForm;state.choosing=false;state.selectedDie=null;render();notify('Dado '+die.value+' gastado · Forma '+state.forms[state.activeForm].label);}
  if(button.hasAttribute('data-reset')){state.activeForm=0;state.dice.forEach(d=>d.spent=false);state.choosing=false;state.selectedDie=null;render();notify('Ejemplo reiniciado');}
});
document.addEventListener('change',event=>{
  const input=event.target;
  if(input.id==='image-file'&&input.files[0]){state.forms[state.editForm].image=URL.createObjectURL(input.files[0]);render();return;}
  const key=input.dataset.field;if(!key)return;
  if(['name','rarity'].includes(key))state[key]=input.value;
  else state.forms[state.editForm][key]=['hands','cost'].includes(key)?Number(input.value):input.value;
  render();
});
render();
