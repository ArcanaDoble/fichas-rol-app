import {NomaActorData,NomaItemData} from './models.mjs';
import {NomaActorSheet,NomaItemSheet} from './sheets.mjs';
import {SYSTEM} from './adapter.mjs';
import {bootstrap} from './world.mjs';
import {installCombatHooks} from './combat.mjs';
import {mountUI,refreshUI} from './ui.mjs';
import {installTokenArt} from './tokens.mjs';
Hooks.once('init',()=>{
  installTokenArt();
  CONFIG.Actor.dataModels={hero:NomaActorData,enemy:NomaActorData};
  CONFIG.Item.dataModels=Object.fromEntries(['weapon','armor','ability','talent','consumable','accessory'].map(t=>[t,NomaItemData]));
  CONFIG.Actor.typeLabels={hero:'TYPES.Actor.hero',enemy:'TYPES.Actor.enemy'};
  CONFIG.Item.typeLabels=Object.fromEntries(['weapon','armor','ability','talent','consumable','accessory'].map(t=>[t,`TYPES.Item.${t}`]));
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor,SYSTEM,NomaActorSheet,{types:['hero','enemy'],makeDefault:true,label:'Ficha NOMA'});
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Item,SYSTEM,NomaItemSheet,{makeDefault:true,label:'Objeto NOMA'});
  game.settings.register(SYSTEM,'initialized',{scope:'world',config:false,type:Boolean,default:false});
  game.settings.register(SYSTEM,'tools',{scope:'client',config:false,type:Boolean,default:false});
  CONFIG.Combat.initiative={formula:'1d6',decimals:0};
});
Hooks.once('ready',async()=>{
  installCombatHooks();
  try{await bootstrap();}catch(error){console.error('NOMA bootstrap',error);ui.notifications.error(`NOMA: ${error.message}`);}
  mountUI();
});
for(const hook of ['canvasReady','controlToken','targetToken','updateActor','updateItem','updateToken','updateScene','createToken','deleteToken','nomaRefresh']) Hooks.on(hook,()=>{if(game.ready)refreshUI();});
