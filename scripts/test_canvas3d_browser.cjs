// Run against a development server. Each participant gets a separate storage jar.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, firefox } = require(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);

const origin = process.env.CANVAS3D_URL || 'http://localhost:3193';
const out = process.env.CANVAS3D_SCREENSHOTS;
const errors = [];
const state = (page) =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function settled(page, predicate, arg) {
  return page.waitForFunction(predicate, arg, { timeout: 26000 });
}
async function pieceIn(page, id, parent, slot) {
  try {
    await settled(
      page,
      ([id, parent, slot]) => {
        const p = JSON.parse(window.render_game_to_text()).pieces.find(
          (p) => p.id === id
        );
        return p && p.parentId === parent && (!slot || p.slot === slot);
      },
      [id, parent, slot]
    );
  } catch (error) {
    const current = await page.evaluate(() => window.render_game_to_text?.());
    const p = current && JSON.parse(current).pieces.find((p) => p.id === id);
    throw new Error(
      'Alojamiento de ' +
        id +
        ' esperado ' +
        parent +
        '/' +
        (slot || '') +
        ', observado ' +
        JSON.stringify(p) +
        (errors.length ? ' · ' + errors.join(' / ') : ''),
      { cause: error }
    );
  }
}
async function drag(page, from, to, touch) {
  const [a, b] = await page.evaluate(
    (points) => points.map((p) => window.canvas3dTable.screenPoint(p)),
    [from, to]
  );
  for (const p of [a, b])
    assert.ok(
      p &&
        p.x > 1 &&
        p.y > 1 &&
        p.x < page.viewportSize().width &&
        p.y < page.viewportSize().height,
      'pieza dentro del encuadre'
    );
  let pen;
  if (touch) {
    pen = await page.context().newCDPSession(page);
    await pen.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [a],
    });
  } else {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
  }
  for (let i = 1; i <= 14; i++) {
    const x = a.x + ((b.x - a.x) * i) / 14,
      y = a.y + ((b.y - a.y) * i) / 14;
    if (touch)
      await pen.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y }],
      });
    else await page.mouse.move(x, y);
    if (i === 3) {
      await page.waitForTimeout(140);
      if (from.pieceId) {
        const table = await state(page);
        assert.equal(
          table.held,
          from.pieceId,
          'la mano levanta la pieza señalada'
        );
      }
    }
  }
  await page.waitForTimeout(220);
  if (touch) {
    await pen.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await pen.detach();
  } else await page.mouse.up();
}
async function focus(page, target, seat) {
  await page.evaluate(
    ([target, seat]) => window.canvas3dTable.focus(target, seat),
    [target, seat]
  );
  await page.waitForTimeout(180);
}
async function snap(page, name) {
  if (out) {
    await fs.mkdir(out, { recursive: true });
    await page.screenshot({ path: path.join(out, name + '.png') });
  }
}
function listen(page) {
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.error('Error en la mesa:', e.message);
  });
  page.on('console', (e) => {
    if (e.type() === 'error' && e.text().includes('Canvas 3D')) {
      errors.push(e.text());
      console.error(e.text());
    }
  });
  return page;
}
async function run() {
  const chrome = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const fox = await firefox.launch();
  const forja = new Set();
  try {
    const gm = listen(
      await chrome.newPage({ viewport: { width: 1260, height: 820 } })
    );
    await gm.goto(origin + '/canvas-3d?direccion');
    await gm.getByRole('button', { name: 'Abrir mesa como máster' }).click();
    await settled(gm, () => !!window.render_game_to_text);
    assert.equal((await state(gm)).scene.id, 'patio');
    const book = () =>
      gm.getByRole('button', { name: 'Libro del máster' }).click();
    await book();
    const urls = [],
      players = [];
    for (let i = 1; i <= 4; i++) {
      const row = gm.locator('.n3-seatrow').nth(i - 1);
      await row.getByRole('button', { name: 'Invitar' }).click();
      const ticket = row.locator('input');
      await ticket.waitFor();
      urls.push(await ticket.inputValue());
    }
    await gm.getByRole('button', { name: 'Cerrar el libro' }).click();
    for (let i = 0; i < 4; i++) {
      const mobile = i === 1;
      const ctx = await (i === 0 ? fox : chrome).newContext({
        viewport: mobile
          ? { width: 412, height: 820 }
          : { width: 1100, height: 780 },
        hasTouch: mobile,
      });
      const page = listen(await ctx.newPage());
      if (i === 0)
        page.on('response', (response) => {
          const url = new URL(response.url());
          if (url.pathname.endsWith('/art') && response.status() === 200)
            forja.add(url.searchParams.get('pieceId'));
        });
      await page.goto(urls[i]);
      await page
        .getByLabel('Tu nombre')
        .fill(['Bran', 'Sombra', 'Acero', 'Niebla'][i]);
      await page.getByRole('button', { name: 'Sentarme a la mesa' }).click();
      if (i === 0 && process.env.CANVAS3D_TEST_SCENARIO) {
        // Mago comes from NOMA, so its arrival distinguishes the live catalog
        // from the two painted sets supplied with the starter box.
        await page
          .locator('.n3-box button')
          .filter({ hasText: 'Mago' })
          .first()
          .waitFor();
      }
      const classCard = page
        .locator('.n3-box button')
        .filter({ hasText: i % 2 === 0 ? 'Bárbaro' : 'Pícaro' })
        .first();
      if (i === 3) {
        await classCard.waitFor();
        await focus(page, 'overview');
        const screen = await page.evaluate(() =>
          window.canvas3dTable.screenPoint({ x: 12, z: 3 })
        );
        const rect = await classCard.boundingBox();
        await page.mouse.move(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(screen.x, screen.y, { steps: 18 });
        await page.mouse.up();
        await settled(page, () =>
          JSON.parse(window.render_game_to_text()).pieces.some(
            (p) =>
              p.id === 'puesto4:mat' &&
              Math.abs(p.x - 12) < 0.4 &&
              Math.abs(p.z - 3) < 0.4
          )
        );
      } else await classCard.click();
      await settled(
        page,
        (id) =>
          window.render_game_to_text &&
          JSON.parse(window.render_game_to_text()).seats.includes(id),
        'puesto' + (i + 1)
      );
      players.push(page);
    }
    const [barbarian, rogue] = players;
    const seat1 = 'puesto1:mat',
      seat2 = 'puesto2:mat';
    const axe = (await state(barbarian)).pieces.find(
      (p) => p.id.startsWith('puesto1:') && p.name === 'Hacha de mano'
    );
    assert.ok(axe, 'pool del bárbaro con su hacha de mano');
    if (process.env.CANVAS3D_TEST_SCENARIO) {
      await settled(
        barbarian,
        (id) =>
          JSON.parse(window.render_game_to_text()).pieces.some(
            (p) => p.id === id && p.artworkReady
          ),
        axe.id
      );
      assert.ok(
        forja.size > 0,
        'el jugador recibió ilustraciones del catálogo por la sala'
      );
    }
    await focus(barbarian, 'seat', 'puesto1');
    await drag(
      barbarian,
      { pieceId: axe.id },
      { pieceId: seat1, slot: 'hand1' }
    );
    await pieceIn(rogue, axe.id, seat1, 'hand1');
    await snap(barbarian, 'ficha-barbaro-firefox');
    await focus(rogue, 'overview');
    await drag(
      rogue,
      { pieceId: axe.id },
      { pieceId: seat2, slot: 'hand2' },
      true
    );
    await pieceIn(barbarian, axe.id, seat2, 'hand2');
    await pieceIn(gm, axe.id, seat2, 'hand2');
    await rogue.reload();
    await settled(rogue, () => !!window.render_game_to_text);
    await pieceIn(rogue, axe.id, seat2, 'hand2');
    await focus(rogue, 'seat', 'puesto2');
    await snap(rogue, 'ficha-picaro-tactil');
    await book();
    await gm.getByRole('button', { name: 'Partida', exact: true }).click();
    await gm.getByRole('button', { name: 'Deshacer jugada' }).click();
    await pieceIn(rogue, axe.id, seat1, 'hand1');
    await gm.getByRole('button', { name: 'Puestos', exact: true }).click();
    await gm.getByRole('button', { name: 'Ver como jugador' }).nth(1).click();
    await gm.getByRole('button', { name: 'Volver a la dirección' }).waitFor();
    assert.deepEqual(
      (await state(gm)).pieces.map((p) => p.id).sort(),
      (await state(rogue)).pieces.map((p) => p.id).sort()
    );
    await gm.getByRole('button', { name: 'Volver a la dirección' }).click();
    await focus(barbarian, 'overview');
    await drag(barbarian, { pieceId: 'puesto1:peana' }, { x: 3.5, z: 2.5 });
    await pieceIn(gm, 'puesto1:peana', null);
    await focus(rogue, 'overview');
    await drag(rogue, { pieceId: 'puesto2:peana' }, { x: 5.5, z: 3.5 }, true);
    await pieceIn(gm, 'puesto2:peana', null);
    const enemy = (await state(barbarian)).pieces.find(
      (p) => p.kind === 'enemy'
    );
    assert.ok(enemy, 'duende visible desde la peana');
    await drag(
      barbarian,
      { pieceId: 'puesto1:accion1' },
      { pieceId: enemy.id }
    );
    await pieceIn(gm, 'puesto1:accion1', enemy.id);
    await drag(barbarian, { pieceId: axe.id }, { pieceId: enemy.id });
    await pieceIn(gm, axe.id, null);
    await pieceIn(rogue, axe.id, null);
    await settled(
      rogue,
      (id) => !JSON.parse(window.render_game_to_text()).flying.includes(id),
      axe.id
    );
    await drag(
      rogue,
      { pieceId: axe.id },
      { pieceId: seat2, slot: 'hand2' },
      true
    );
    await pieceIn(gm, axe.id, seat2, 'hand2');
    await drag(rogue, { pieceId: 'puesto2:peana' }, { x: 0.5, z: 1.5 }, true);
    await drag(barbarian, { pieceId: 'puesto1:peana' }, { x: 3.5, z: 1.5 });
    await settled(gm, () => {
      const p = JSON.parse(window.render_game_to_text()).pieces;
      return (
        p.some((i) => i.id === 'puesto1:peana' && Math.abs(i.z - 1.5) < 0.1) &&
        p.some((i) => i.id === 'puesto2:peana' && Math.abs(i.x - 0.5) < 0.1)
      );
    });
    // These two positions look through the trunk of the original chestnut.
    await settled(
      rogue,
      () =>
        !JSON.parse(window.render_game_to_text()).pieces.some(
          (p) => p.id === 'puesto1:peana'
        )
    );
    await settled(
      barbarian,
      () =>
        !JSON.parse(window.render_game_to_text()).pieces.some(
          (p) => p.id === 'puesto2:peana'
        )
    );
    const floorGear = (await state(gm)).pieces.find(
      (p) => p.kind === 'armor' && !p.parentId && p.id.startsWith('puesto1:')
    );
    assert.ok(floorGear);
    await focus(gm, 'overview');
    await drag(gm, { pieceId: floorGear.id }, { x: 2.5, z: 4.5 });
    await settled(
      gm,
      (id) =>
        JSON.parse(window.render_game_to_text()).pieces.some(
          (p) =>
            p.id === id &&
            !p.parentId &&
            Math.abs(p.x - 2.5) < 0.4 &&
            Math.abs(p.z - 4.5) < 0.4
        ),
      floorGear.id
    );
    const leftAt = (await state(gm)).pieces.find((p) => p.id === floorGear.id);
    await book();
    await gm.getByRole('button', { name: 'Mapa', exact: true }).click();
    await gm.getByLabel('Escenario', { exact: true }).selectOption('aljibe');
    await gm.getByRole('button', { name: 'Llevar al grupo' }).click();
    await settled(
      rogue,
      () => JSON.parse(window.render_game_to_text()).scene.id === 'aljibe'
    );
    assert.equal(
      (await state(gm)).pieces.some((p) => p.id === floorGear.id),
      false
    );
    await book();
    await gm.getByRole('button', { name: 'Mapa', exact: true }).click();
    await gm.getByLabel('Escenario', { exact: true }).selectOption('patio');
    await gm.getByRole('button', { name: 'Llevar al grupo' }).click();
    await settled(
      barbarian,
      () => JSON.parse(window.render_game_to_text()).scene.id === 'patio'
    );
    await pieceIn(barbarian, axe.id, seat2, 'hand2');
    await pieceIn(gm, floorGear.id, null);
    const returned = (await state(gm)).pieces.find(
      (p) => p.id === floorGear.id
    );
    assert.ok(
      Math.abs(returned.x - leftAt.x) < 0.1 &&
        Math.abs(returned.z - leftAt.z) < 0.1
    );
    await focus(gm, 'overview');
    await snap(gm, 'cuatro-puestos');
    if (process.env.CANVAS3D_TEST_SCENARIO) {
      await book();
      await gm.getByRole('button', { name: 'Mapa', exact: true }).click();
      const source = process.env.CANVAS3D_TEST_SCENARIO;
      await gm
        .locator('.n3-book option')
        .filter({ hasText: source })
        .first()
        .waitFor({ state: 'attached' });
      const destination = await gm
        .locator('.n3-book option')
        .filter({ hasText: source })
        .first()
        .getAttribute('value');
      const protectedMap = barbarian.waitForResponse(
        (r) =>
          r.url().includes('/map') &&
          r.request().method() === 'GET' &&
          r.status() === 200,
        { timeout: 25000 }
      );
      await gm
        .getByLabel('Escenario', { exact: true })
        .selectOption(destination);
      await gm.getByRole('button', { name: 'Llevar al grupo' }).click();
      await settled(
        rogue,
        (id) => JSON.parse(window.render_game_to_text()).scene.id === id,
        destination
      );
      assert.ok((await (await protectedMap).body()).length > 250);
      await settled(
        gm,
        () => JSON.parse(window.render_game_to_text()).scene.artworkReady
      );
      await settled(
        barbarian,
        () => JSON.parse(window.render_game_to_text()).scene.artworkReady
      );
      await focus(gm, 'map');
      await gm.waitForTimeout(750);
      await snap(gm, 'escenario-importado');
      console.log(
        'Copia de escenario de NOMA comprobada con fondo individual servido al jugador.'
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      'Firefox y Chromium · 4 puestos, 2 bárbaros, transferencia táctil, deshacer, lanzamiento y recogida del hacha, árbol, reconexión y regreso al equipo dejado en el escenario.'
    );
  } finally {
    await Promise.all([fox.close(), chrome.close()]);
  }
}
run().catch((e) => {
  console.error(
    String(e.stack || e.message).replace(/#invitacion=[^\s]+/g, '#invitacion=…')
  );
  process.exitCode = 1;
});
