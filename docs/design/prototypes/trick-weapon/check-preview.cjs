async page => {
  const failures=[];
  page.on('pageerror',error=>failures.push(error.message));
  const check=(condition,message)=>{if(!condition)throw new Error(message);};
  const shot=async path=>{
    await page.evaluate(()=>{
      const notice=document.getElementById('notice');
      notice.classList.remove('is-visible');
      notice.style.visibility='hidden';
    });
    await page.screenshot({path,fullPage:true});
  };
  await page.setViewportSize({width:1440,height:1050});
  await page.goto('http://127.0.0.1:4173/docs/design/prototypes/trick-weapon/index.html');
  await page.getByRole('button',{name:'Látigo · Forma 2',exact:true}).click();
  check(await page.getByLabel('Perfil de daño').inputValue()==='2d4','Second profile was not restored');
  await page.getByLabel('Perfil de daño').fill('2d6');
  await page.getByLabel('Perfil de daño').press('Tab');
  check((await page.locator('.weapon-card[data-form=whip] .damage-line').textContent()).includes('2d6'),'Second preview did not update');
  check((await page.locator('.weapon-card[data-form=cane] .damage-line').textContent()).includes('1d12'),'First form was overwritten');
  await page.getByLabel('Perfil de daño').fill('2d4');
  await page.getByLabel('Perfil de daño').press('Tab');
  await shot('docs/design/prototypes/trick-weapon/forge-desktop.png');
  await page.getByRole('button',{name:'Canvas',exact:true}).click();
  await page.locator('[data-transform]').click();
  await page.getByRole('button',{name:'Gastar dado de acción 2',exact:true}).click();
  await page.getByRole('button',{name:'Transformar en látigo',exact:true}).click();
  check(await page.locator('.play-card .weapon-card').getAttribute('data-form')==='whip','Form did not change');
  check((await page.locator('.resources .die.is-spent').textContent()).includes('2'),'Wrong die was spent');
  check(!(await page.locator('.play-card .traits').textContent()).includes('Perforante'),'Old traits survived');
  check((await page.locator('.play-side').textContent()).includes('esta forma no puede usarse para hacer parry'),'Defense did not update');
  await shot('docs/design/prototypes/trick-weapon/canvas-desktop.png');
  for(const value of [4,6]){
    await page.locator('[data-transform]').click();
    await page.getByRole('button',{name:`Gastar dado de acción ${value}`,exact:true}).click();
    await page.locator('[data-confirm]').click();
  }
  check(await page.locator('[data-transform]').isDisabled(),'Transformation bypassed empty resources');
  await page.locator('[data-reset]').click();
  await page.getByRole('button',{name:'Ficha',exact:true}).click();
  await page.locator('[data-transform]').click();
  await page.getByRole('button',{name:'Canvas',exact:true}).click();
  check(await page.locator('.play-card .weapon-card').getAttribute('data-form')==='whip','Views lost the active form');
  check(await page.locator('.resources .die.is-spent').count()===0,'Out-of-combat setup spent a die');
  await page.locator('[data-reset]').click();
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-transform]').click();
  await page.getByRole('button',{name:'Gastar dado de acción 2',exact:true}).click();
  check(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'Mobile Canvas overflows');
  await shot('docs/design/prototypes/trick-weapon/canvas-mobile-choice.png');
  await page.locator('[data-confirm]').click();
  await shot('docs/design/prototypes/trick-weapon/canvas-mobile.png');
  await page.getByRole('button',{name:'Forja',exact:true}).click();
  check(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'Mobile Forge overflows');
  await shot('docs/design/prototypes/trick-weapon/forge-mobile-editor.png');
  await page.getByRole('button',{name:'Ver las dos formas',exact:true}).click();
  check(await page.locator('.forge-previews .weapon-card:visible').count()===2,'Mobile hides a form');
  await shot('docs/design/prototypes/trick-weapon/forge-mobile-previews.png');
  check(failures.length===0,'Browser error: '+failures.join('; '));
  return {result:'passed',checks:['independent profiles','live preview','selected die payment','resource exhaustion','active traits and defense','same form across views','mobile layout'],pageErrors:failures};
}
