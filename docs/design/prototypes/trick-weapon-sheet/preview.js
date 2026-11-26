const forms=[
  {id:'primary',name:'Estoque',damage:'1d12',range:'Cercano',traits:['Perforante','Torso','Crítico'],image:'/armas/estoque.webp'},
  {id:'secondary',name:'Látigo',damage:'2d4',range:'Intermedio',traits:['Crítico','Sangrado','Barrido','Sin guardia'],image:'/docs/design/prototypes/trick-weapon/assets/latigo.png'},
];
const state={active:0,combat:false,selected:null,dice:[{value:6,spent:false},{value:4,spent:false},{value:1,spent:false}]};
const byId=id=>document.getElementById(id);
function closePayment(){byId('payment').hidden=true;state.selected=null;byId('confirm').disabled=true;}
function draw(){
  const current=forms[state.active],next=forms[1-state.active];
  document.querySelector('.trick').dataset.form=current.id;
  byId('weapon-art').style.backgroundImage=`url('${current.image}')`;
  byId('current-form').textContent=current.name;
  byId('damage').textContent=current.damage;
  byId('range').textContent=current.range;
  byId('traits').replaceChildren(...current.traits.map(trait=>{const span=document.createElement('span');span.textContent='◆ '+trait;return span;}));
  byId('transform').disabled=state.combat&&state.dice.every(die=>die.spent);
  byId('transform').setAttribute('aria-label',`Transformar en ${next.name.toLowerCase()}${state.combat?' · 1 DA':''}`);
  byId('transform').title=`Transformar en ${next.name.toLowerCase()}${state.combat?' · 1 DA':''}`;
  byId('dice').replaceChildren(...state.dice.map((die,index)=>{const button=document.createElement('button');button.type='button';button.textContent=die.value;button.disabled=die.spent;button.setAttribute('aria-label',`Gastar dado de valor ${die.value}`);button.setAttribute('aria-pressed',state.selected===index);button.addEventListener('click',()=>{state.selected=index;draw();byId('confirm').disabled=false;});return button;}));
}
function transform(){
  if(state.combat){if(state.selected===null||state.dice[state.selected].spent)return;state.dice[state.selected].spent=true;}
  const paid=state.combat;
  state.active=1-state.active;closePayment();draw();
  byId('notice').textContent=paid?`Dado gastado. Forma activa: ${forms[state.active].name}.`:`Forma preparada: ${forms[state.active].name}.`;
}
byId('transform').addEventListener('click',()=>{if(!state.combat){transform();return;}byId('payment').hidden=!byId('payment').hidden;byId('payment').scrollIntoView({behavior:'smooth',block:'nearest'});});
byId('confirm').addEventListener('click',transform);
byId('cancel').addEventListener('click',closePayment);
byId('combat-mode').addEventListener('change',event=>{state.combat=event.target.checked;closePayment();draw();byId('notice').textContent=state.combat?'Al transformar, eliges el dado de acción que gastas.':'Fuera de combate, preparas la forma con un toque.';});
draw();
