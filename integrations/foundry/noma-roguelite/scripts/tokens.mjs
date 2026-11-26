// Portrait clipping and health crowns are renderer overlays; original image files remain intact.
export function installTokenArt(){
  const refresh=t=>{
    if(!t.actor||!t.mesh||!t.visible)return;
    const w=t.w,h=t.h,r=Math.min(w,h)*.43;
    if(!t.nomaMask){t.nomaMask=new PIXI.Graphics();canvas.primary.addChild(t.nomaMask);}
    t.nomaMask.clear().beginFill(0xffffff).drawCircle(t.center.x,t.center.y,r).endFill();
    t.mesh.mask=t.nomaMask;
    if(!t.nomaCrown){t.nomaCrown=new PIXI.Graphics();t.addChild(t.nomaCrown);}
    const g=t.nomaCrown,cx=w/2,cy=h/2,health=t.actor.system.health,max=Math.min(health.max,40),gold=t.document.disposition<0?0xbd7774:0xc8aa6e;
    g.clear().lineStyle(2,gold,.9).drawCircle(cx,cy,r+2);
    for(let i=0;i<max;i++){
      const start=-Math.PI/2+i*2*Math.PI/max+.025,end=-Math.PI/2+(i+1)*2*Math.PI/max-.025;
      g.lineStyle(4,i<health.value?0xdca1ac:0x3e3442,.95).arc(cx,cy,r+8,start,end);
    }
    if(t.controlled)g.lineStyle(1,0xf2d390,.7).drawCircle(cx,cy,r+13);
  };
  Hooks.on('refreshToken',refresh);
  Hooks.on('drawToken',refresh);
  Hooks.on('updateActor',a=>a.getActiveTokens().forEach(refresh));
  Hooks.on('destroyToken',t=>{t.nomaMask?.destroy();t.nomaMask=null;t.nomaCrown=null;});
  Hooks.on('canvasReady',()=>canvas.tokens.placeables.forEach(refresh));
}
