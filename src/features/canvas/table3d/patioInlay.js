// Taracea and turned metal from Patio de Ceniza. The six bitmap masters were
// baked from walnut(), stone(), compass(), ashSprig() and makeBezel() at their
// native resolutions. A large map reuses the same 48 numbered stone cuts.
const art = (name) =>
  (process.env.PUBLIC_URL || '') + '/canvas3d/visual/' + name + '.webp';
// mineral(x,y) samples the original lattice exactly at an integer grid corner.
let mineralSeed = 147124;
const grain = Float32Array.from({ length: 256 * 256 }, () => {
  mineralSeed = (Math.imul(mineralSeed, 1664525) + 1013904223) >>> 0;
  return mineralSeed / 4294967296;
});
function line(g, x1, y1, x2, y2, color, width = 1) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
}
function polygon(g, points) {
  g.beginPath();
  g.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
  g.closePath();
}
function chamfer(g, x, y, w, h, cut) {
  polygon(g, [
    [x + cut, y],
    [x + w - cut, y],
    [x + w, y + cut],
    [x + w, y + h - cut],
    [x + w - cut, y + h],
    [x + cut, y + h],
    [x, y + h - cut],
    [x, y + cut],
  ]);
}
function floorDisc(g, x, y, r, fill) {
  g.fillStyle = fill;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}
function herringbone(g, length, width) {
  const count = Math.max(8, Math.round(length / (width * 2)));
  const unit = length / count;
  g.fillStyle = '#353932';
  g.fillRect(0, 0, length, width);
  for (let i = 0; i < count; i++) {
    const x = i * unit;
    polygon(g, [
      [x, 0],
      [x + unit * 0.51, 0],
      [x + unit, width * 0.5],
      [x + unit * 0.49, width * 0.5],
    ]);
    g.fillStyle = i % 4 === 0 ? '#b68a62' : '#c6ae86';
    g.fill();
    polygon(g, [
      [x + unit * 0.49, width * 0.5],
      [x + unit, width * 0.5],
      [x + unit * 0.51, width],
      [x, width],
    ]);
    g.fillStyle = i % 4 === 0 ? '#9c6c4e' : '#998e72';
    g.fill();
    line(
      g,
      x,
      0,
      x + unit * 0.5,
      width * 0.5,
      '#30291f',
      Math.max(0.6, width * 0.075)
    );
  }
}
function drawFrame(g, W, H, s, wood) {
  const b = s * 0.15,
    edge = s * 0.068,
    cut = s * 0.075;
  g.save();
  g.shadowColor = '#090b09';
  g.shadowBlur = Math.max(8, s * 0.12);
  g.shadowOffsetY = edge * 1.3;
  chamfer(g, -b, -b, W + 2 * b, H + 2 * b + edge, cut);
  g.fillStyle = '#33291f';
  g.fill();
  g.restore();
  chamfer(g, -b, -b, W + 2 * b, H + 2 * b, cut);
  g.save();
  g.clip();
  if (wood) g.drawImage(wood, -b, -b, W + 2 * b, H + 2 * b);
  const rim = g.createLinearGradient(0, -b, W * 0.58, H);
  rim.addColorStop(0, '#a9825155');
  rim.addColorStop(0.44, '#65442c70');
  rim.addColorStop(1, '#88664380');
  g.fillStyle = rim;
  g.fillRect(-b, -b, W + 2 * b, H + 2 * b);
  g.strokeStyle = '#af956d';
  g.lineWidth = s * 0.009;
  chamfer(g, -b + 2, -b + 2, W + 2 * b - 4, H + 2 * b - 4, cut);
  g.stroke();
  const inset = b * 0.68,
    strip = b * 0.33;
  for (const [x, y, length, rot] of [
    [0, -inset, W, 0],
    [W + inset, 0, H, Math.PI / 2],
    [W, H + inset, W, Math.PI],
    [-inset, H, H, -Math.PI / 2],
  ]) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    herringbone(g, length, strip);
    g.restore();
  }
  for (const [x, y] of [
    [-b * 0.54, -b * 0.54],
    [W + b * 0.54, -b * 0.54],
    [W + b * 0.54, H + b * 0.54],
    [-b * 0.54, H + b * 0.54],
  ]) {
    g.save();
    g.translate(x, y);
    g.rotate(Math.PI / 4);
    g.fillStyle = '#3e3930';
    g.fillRect(-b * 0.29, -b * 0.29, b * 0.58, b * 0.58);
    g.strokeStyle = '#b4a07c';
    g.lineWidth = 1;
    g.strokeRect(-b * 0.29, -b * 0.29, b * 0.58, b * 0.58);
    floorDisc(g, 0, 0, b * 0.12, '#b7a079');
    g.restore();
  }
  g.restore();
  g.strokeStyle = '#cfb892';
  g.lineWidth = Math.max(1, s * 0.011);
  g.strokeRect(-s * 0.026, -s * 0.026, W + s * 0.052, H + s * 0.052);
}

export function paintFrame(ctx, width, height, cols, rows, get) {
  const s = width / (cols + 0.3);
  ctx.save();
  ctx.scale(1, height / ((rows + 0.3) * s));
  ctx.translate(s * 0.15, s * 0.15);
  drawFrame(ctx, cols * s, rows * s, s, get(art('nogal-patio')));
  ctx.restore();
}
export function paintBoard(ctx, width, height, scene, get, drawMapImage) {
  const cols = scene.cols,
    rows = scene.rows,
    s = width / cols,
    heightScale = height / (rows * s);
  const stones = get(art('losas-patio')),
    rose = get(art('rosa-patio')),
    sprig = get(art('fresno-patio'));
  ctx.save();
  ctx.scale(1, heightScale);
  const W = cols * s,
    H = rows * s;
  ctx.fillStyle = '#41524b';
  ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const id = (r * cols + c) % 48,
        x = c * s,
        y = r * s;
      if (stones)
        ctx.drawImage(
          stones,
          (id % 8) * 144,
          Math.floor(id / 8) * 144,
          144,
          144,
          x,
          y,
          s,
          s
        );
      const sheen = ctx.createLinearGradient(x, y, x + s, y + s);
      sheen.addColorStop(0, '#eed7a414');
      sheen.addColorStop(1, '#151e201a');
      ctx.fillStyle = sheen;
      ctx.fillRect(x, y, s, s);
    }
  if (sprig)
    for (const [x, y, dx, dy] of [
      [0, 0, 1, 1],
      [W, 0, -1, 1],
      [W, H, -1, -1],
      [0, H, 1, -1],
    ]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dx, dy);
      ctx.drawImage(sprig, 0, 0, s, s);
      ctx.restore();
    }
  if (rose)
    ctx.drawImage(rose, W * 0.5 - s * 0.8, H * 0.5 - s * 0.8, s * 1.6, s * 1.6);
  // The illustration is below the same joints that cross the brass compass.
  drawMapImage(W, H);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = c * s,
        y = r * s,
        chip =
          0.018 * s * (1 + grain[((r + 2) & 255) * 256 + ((c + 10) & 255)]);
      line(ctx, x, y, x + s, y, '#282e2b', Math.max(1.7, s * 0.019));
      line(ctx, x, y, x, y + s, '#28302c', Math.max(1.7, s * 0.019));
      line(
        ctx,
        x + chip,
        y + s * 0.018,
        x + s - chip,
        y + s * 0.018,
        '#d8d4b550',
        Math.max(0.7, s * 0.008)
      );
      line(
        ctx,
        x + s * 0.014,
        y + chip,
        x + s * 0.014,
        y + s - chip,
        '#ced1b43f',
        Math.max(0.65, s * 0.007)
      );
      polygon(ctx, [
        [x, y],
        [x + chip * 1.8, y],
        [x + chip * 0.61, y + chip * 0.39],
        [x, y + chip * 1.2],
      ]);
      ctx.fillStyle = '#3a3d34';
      ctx.fill();
    }
  ctx.restore();
}

export function paintMedallion(ctx, W, H, p, get) {
  const radius = Math.min(W, H) * 0.5;
  const outer = radius,
    inner = outer * 0.865;
  const bezel = get(art(p.kind === 'enemy' ? 'cerco-cobre' : 'cerco-oro'));
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  if (bezel)
    ctx.drawImage(
      bezel,
      (-outer * 512) / 498,
      (-outer * 512) / 498,
      (outer * 1024) / 498,
      (outer * 1024) / 498
    );
  ctx.beginPath();
  ctx.arc(0, 0, inner, 0, Math.PI * 2);
  ctx.clip();
  const image = get(p.image);
  if (image) {
    const side = Math.min(image.width, image.height),
      vertical = p.kind === 'enemy' ? 0.36 : 0.06;
    ctx.drawImage(
      image,
      (image.width - side) / 2,
      (image.height - side) * vertical,
      side,
      side,
      -inner,
      -inner,
      2 * inner,
      2 * inner
    );
  } else {
    ctx.fillStyle = '#353b32';
    ctx.fillRect(-inner, -inner, 2 * inner, 2 * inner);
    ctx.fillStyle = '#ecdbb4';
    ctx.font = '600 ' + inner + 'px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((p.name || '?').slice(0, 1), 0, 0);
  }
  const glaze = ctx.createLinearGradient(-inner, -inner, inner, inner);
  glaze.addColorStop(0, '#fff1bc27');
  glaze.addColorStop(0.48, '#fff2cd00');
  glaze.addColorStop(1, '#0e0d161d');
  ctx.fillStyle = glaze;
  ctx.fillRect(-inner, -inner, 2 * inner, 2 * inner);
  ctx.restore();
}
