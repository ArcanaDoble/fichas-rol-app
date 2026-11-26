import {SYSTEM,BASE,clone} from './adapter.mjs';
export async function spawnActor(actor,x,y,scene=canvas.scene) {
  if(!game.user.isGM) return;
  if(actor.type==='hero'&&actor.system.actionDice.length!==3){ui.notifications.warn('Esta clase aún necesita definir sus tres dados de acción.');return;}
  if(actor.type==='hero'&&scene.tokens.some(t=>t.actorId===actor.id)){const data=actor.toObject();delete data._id;data.flags={...data.flags,[SYSTEM]:{instance:true}};actor=await Actor.create(data);}
  const grid=canvas.grid.size;
  const position=x===undefined?canvas.stage.pivot:{x,y};
  const doc=await actor.getTokenDocument({x:Math.round(position.x/grid)*grid,y:Math.round(position.y/grid)*grid,lockRotation:true,actorLink:actor.type==='hero',disposition:actor.type==='hero'?1:-1,name:actor.name,texture:{src:actor.img,anchorY:actor.type==='hero'?0.3:0.5},width:1,height:1,displayName:CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,displayBars:CONST.TOKEN_DISPLAY_MODES.NONE,sight:{enabled:actor.type==='hero',range:8,visionMode:'basic'},bar1:{attribute:'health'}});
  return (await scene.createEmbeddedDocuments('Token',[doc.toObject()]))[0];
}
export async function bootstrap() {
  if(!game.user.isGM||game.settings.get(SYSTEM,'initialized')) return;
  const data=await (await fetch(`${BASE}/data/catalog.json`)).json();
  const folders={};
  for(const [key,name,type] of [['classes','Clases de héroe','Actor'],['enemies','Bestiario','Actor'],['items','Arsenal y habilidades','Item']]) folders[key]=(await Folder.create({name,type,color:key==='enemies'?'#8c4346':'#b89553'})).id;
  await Item.createDocuments(data.items.map(i=>({...i,folder:folders.items})));
  const actors=await Actor.createDocuments([...data.classes.map(a=>({...a,folder:folders.classes})),...data.enemies.map(a=>({...a,folder:folders.enemies}))]);
  const heroes=actors.filter(a=>a.type==='hero'&&a.system.actionDice.length===3);
  const player=await User.create({name:'Jugador de prueba',role:CONST.USER_ROLES.PLAYER,color:'#82b0c8'});
  if(heroes[0]){await heroes[0].update({[`ownership.${player.id}`]:CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER});await player.update({character:heroes[0].id});}
  const scene=await Scene.create({name:'01 · El umbral',width:1600,height:1000,padding:0,levels:[{name:'El umbral',elevation:{bottom:0,top:20},background:{src:`${BASE}/assets/arena.svg`,color:'#080b12'}}],grid:{type:CONST.GRID_TYPES.SQUARE,size:100,distance:1,units:'casillas',color:'#9f875d',alpha:0.16},tokenVision:true,fog:{exploration:true},environment:{darknessLevel:0.22,globalLight:{enabled:true,alpha:0.45}},initial:{x:800,y:500,scale:0.85},navigation:true,active:true});
  await scene.activate();
  for(let i=0;i<heroes.length;i++){await heroes[i].update({'system.gold':6});await spawnActor(heroes[i],400,300+i*100,scene);}
  const goblin=actors.find(a=>a.name==='Duende'),troll=actors.find(a=>a.name==='Trol');
  if(goblin){await spawnActor(goblin,800,400,scene);await spawnActor(goblin,800,600,scene);}
  if(troll)await spawnActor(troll,1100,500,scene);
  const walls=[];
  // The map's stone boundary and four columns are real collision/vision walls.
  for(const [x,y,w,h]of [[200,100,1200,800],[650,250,70,70],[650,750,70,70],[1050,250,70,70],[1050,750,70,70]]){
    for(const c of [[x,y,x+w,y],[x+w,y,x+w,y+h],[x+w,y+h,x,y+h],[x,y+h,x,y]])walls.push({c,move:20,sight:20,light:20,sound:20});
  }
  await scene.createEmbeddedDocuments('Wall',walls);
  await scene.createEmbeddedDocuments('AmbientLight',[[350,200],[1250,200],[350,800],[1250,800]].map(([x,y])=>({x,y,config:{color:'#d3a55d',alpha:0.4,dim:4,bright:1.3,animation:{type:'torch',speed:3,intensity:3}}})));
  await JournalEntry.create({name:'Empieza aquí · NOMA',pages:[{name:'Tu primer encuentro',type:'text',text:{format:1,content:'<h1>NOMA · Roguelite</h1><p>Selecciona un token y pulsa Preparar combate. Tira los dados, reserva alguno para defender y elige tus acciones.</p><p>Arrastra los tokens para moverte. Correr gasta un dado. Los muros y las luces son herramientas nativas de Foundry.</p><p>El Archivo contiene una copia editable del catálogo de NOMA. Los cambios de este mundo no modifican la web.</p><h2>Alcance de esta prueba</h2><p>Iniciativa, activaciones, dados, movimiento, ataque, defensa, CD y Vida usan las reglas importadas. Los efectos específicos de habilidades, talentos y recursos de clase se consultan y anotan manualmente; aún no se automatizan todos. La progresión de run y la generación de salas se incorporarán por etapas.</p>'}}]});
  while(canvas.loading) await new Promise(resolve=>setTimeout(resolve,100));
  await scene.activate();
  await scene.view();
  await game.settings.set(SYSTEM,'initialized',true);
  await game.togglePause(false,{broadcast:true});
}
