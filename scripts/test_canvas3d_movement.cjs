// Run against npm start. A separate disposable room is created for each input device.
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const { chromium, firefox } = require(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const origin = process.env.CANVAS3D_URL || 'http://localhost:3193';
const output = process.env.CANVAS3D_SCREENSHOTS;
async function exercise(browser, touch) {
  const page = await browser.newPage({
    viewport: touch
      ? { width: 412, height: 820 }
      : { width: 1200, height: 820 },
    hasTouch: touch,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /shader|Canvas 3D/i.test(m.text()))
      errors.push(m.text());
  });
  try {
    await page.goto(origin + '/canvas-3d?direccion');
    await page.getByRole('button', { name: 'Abrir mesa como máster' }).click();
    await page.waitForFunction(
      () =>
        window.render_game_to_text &&
        JSON.parse(window.render_game_to_text()).pieces.some(
          (p) => p.kind === 'enemy'
        )
    );
    // Seed a map through the same authorized commands used by the book.
    await page.evaluate(async () => {
      const id = sessionStorage.getItem('noma.canvas3d.room.last');
      const seat = JSON.parse(
        sessionStorage.getItem('noma.canvas3d.room.' + id)
      );
      const endpoint = '/api/canvas3d/rooms/' + id,
        headers = {
          Authorization: 'Bearer ' + seat.token,
          'Content-Type': 'application/json',
          'X-Canvas-Hand': 'cartografia',
        };
      const decorations = [
        { kind: 'smoke', id: 'humo', x: 1, z: 4.5, width: 2, depth: 2 },
        { kind: 'wall', id: 'muro', x: 3, z: 4, x1: 3, z1: 3, x2: 3, z2: 5 },
        {
          kind: 'window',
          id: 'vidrio',
          x: 3.5,
          z: 5,
          x1: 3,
          z1: 5,
          x2: 4,
          z2: 5,
        },
        {
          kind: 'door',
          id: 'puerta',
          x: 4.5,
          z: 5,
          x1: 4,
          z1: 5,
          x2: 5,
          z2: 5,
        },
        {
          kind: 'light',
          id: 'luz',
          x: 4,
          z: 4.5,
          radius: 2,
          color: '#ffdfa3',
          intensity: 0.9,
          flicker: true,
        },
      ];
      let revision = (
        await (await fetch(endpoint + '/view', { headers })).json()
      ).revision;
      for (const terrain of decorations) {
        const response = await fetch(endpoint + '/commands', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            operationId: crypto.randomUUID(),
            baseRevision: revision,
            command: { type: 'terrain', terrain },
          }),
        });
        const receipt = await response.json();
        if (!response.ok) throw Error(receipt.error);
        revision = receipt.revision;
      }
    });
    await page.waitForFunction(() =>
      JSON.parse(window.render_game_to_text()).scene.terrain.some(
        (t) => t.id === 'luz'
      )
    );
    const id = await page.evaluate(
      () =>
        JSON.parse(window.render_game_to_text()).pieces.find(
          (p) => p.kind === 'enemy'
        ).id
    );
    const destination = { x: 4.5, z: 1.5 };
    const [start, end] = await page.evaluate(
      ([id, to]) => [
        window.canvas3dTable.screenPoint({ pieceId: id }),
        window.canvas3dTable.screenPoint(to),
      ],
      [id, destination]
    );
    const pen = touch ? await page.context().newCDPSession(page) : null;
    if (pen)
      await pen.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [start],
      });
    else {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
    }
    for (let i = 1; i <= 12; i++) {
      const p = {
        x: start.x + ((end.x - start.x) * i) / 12,
        y: start.y + ((end.y - start.y) * i) / 12,
      };
      if (pen)
        await pen.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [p],
        });
      else await page.mouse.move(p.x, p.y);
    }
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text());
      return (
        state.held && state.destination?.x === 4 && state.destination.z === 1
      );
    });
    if (output)
      await page.screenshot({
        path: path.join(
          output,
          touch ? 'loseta-tactil.png' : 'loseta-firefox.png'
        ),
      });
    // The old snapshot is deliberately kept on screen for several frames.
    await page.route('**/commands', async (route) => {
      await new Promise((r) => setTimeout(r, 550));
      await route.continue();
    });
    if (pen)
      await pen.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
    else await page.mouse.up();
    await page.waitForFunction(
      (id) => JSON.parse(window.render_game_to_text()).settling.includes(id),
      id
    );
    const frames = await page.evaluate(async (id) => {
      const values = [];
      for (let i = 0; i < 7; i++) {
        const p = JSON.parse(window.render_game_to_text()).pieces.find(
          (p) => p.id === id
        );
        values.push({ x: p.x, z: p.z });
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      return values;
    }, id);
    for (const p of frames)
      assert.ok(
        Math.hypot(p.x - destination.x, p.z - destination.z) < 0.35,
        JSON.stringify(frames)
      );
    await page.waitForFunction(
      ([id, to]) => {
        const view = JSON.parse(window.render_game_to_text()),
          p = view.pieces.find((p) => p.id === id);
        return (
          Math.abs(p.x - to.x) < 0.015 &&
          Math.abs(p.z - to.z) < 0.015 &&
          !view.settling.includes(id) &&
          !view.destination
        );
      },
      [id, destination]
    );
    if (pen) await pen.detach();
    assert.deepEqual(errors, []);
    console.log(
      (touch ? 'Tacto Chromium' : 'Ratón Firefox') +
        ' · casilla elevada, mismo destino durante la espera de red y al confirmar. ' +
        (await page.evaluate(
          () => JSON.parse(window.render_game_to_text()).renderer
        ))
    );
  } finally {
    await page.close();
  }
}
(async () => {
  if (output) await mkdir(output, { recursive: true });
  const chrome = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const fox = await firefox.launch();
  try {
    await exercise(fox, false);
    await exercise(chrome, true);
  } finally {
    await fox.close();
    await chrome.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
