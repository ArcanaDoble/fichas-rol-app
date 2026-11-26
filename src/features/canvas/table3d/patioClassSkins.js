const folder = (process.env.PUBLIC_URL || '') + '/canvas3d/visual/patio/';
export const patioArt = (name) => folder + name + '.webp';
const family = '"PatioClase", Georgia, serif';

function write(g, text, x, y, size, width, align = 'left', secondary = false) {
  if (!text) return;
  g.save();
  g.font = (secondary ? '500 ' : '600 ') + size + 'px ' + family;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillStyle = secondary ? '#e7d3b0' : '#ffedc8';
  g.fillText(text, x, y, width);
  g.restore();
}

function portrait(image, width, height) {
  const paper = document.createElement('canvas');
  paper.width = Math.ceil(width);
  paper.height = Math.ceil(height);
  const ink = paper.getContext('2d');
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight
  );
  const w = image.naturalWidth * scale,
    h = image.naturalHeight * scale;
  ink.drawImage(image, (width - w) * 0.33, (height - h) * 0.045, w, h);
  ink.globalCompositeOperation = 'destination-in';
  const side = ink.createLinearGradient(0, 0, width, 0);
  for (const [stop, alpha] of [
    [0, 1],
    [0.64, 1],
    [0.84, 0.73],
    [1, 0],
  ])
    side.addColorStop(stop, 'rgba(0,0,0,' + alpha + ')');
  ink.fillStyle = side;
  ink.fillRect(0, 0, width, height);
  const foot = ink.createLinearGradient(0, 0, 0, height);
  for (const [stop, alpha] of [
    [0, 1],
    [0.48, 1],
    [0.8, 0.67],
    [1, 0],
  ])
    foot.addColorStop(stop, 'rgba(0,0,0,' + alpha + ')');
  ink.fillStyle = foot;
  ink.fillRect(0, 0, width, height);
  return paper;
}

// The fixed impression comes from paintClassSurface in Patio. Only the
// character, inscriptions and counters are printed for the current seat.
export function classFace(lib, piece, slots) {
  const key =
    'piece:patioFrame:' +
    [piece.id, piece.image, piece.name, piece.className, piece.maxLife].join(
      '|'
    );
  if (lib.textures.has(key)) return lib.textures.get(key);
  let stats = piece,
    reserved = false,
    face;
  const texture = lib.texture(key, 1792, 464, (g, w, h, get) => {
    const frame = get(patioArt('frame')),
      art = get(piece.image);
    if (frame) g.drawImage(frame, 0, 0, w, h);
    if (art) {
      face ||= portrait(art, w * 0.26, h * 0.921);
      g.drawImage(face, w * 0.0097, h * 0.032);
    }
    write(
      g,
      piece.className,
      w * 0.143,
      h * 0.631,
      h * 0.044,
      w * 0.195,
      'center'
    );
    if (piece.name !== piece.className)
      write(g, piece.name, w * 0.143, h * 0.732, h * 0.091, w * 0.19, 'center');
    if (piece.isBarbarian)
      write(
        g,
        'Exponerse',
        w * 0.127,
        h * 0.879,
        h * 0.054,
        w * 0.133,
        'center',
        true
      );
    write(
      g,
      'CD ' + (stats.defense || stats.baseDefense || 0),
      w * 0.489,
      h * 0.1,
      h * 0.059,
      w * 0.04,
      'right'
    );
    write(
      g,
      reserved ? 'Reserva de defensa' : 'Dados de acción',
      w * 0.75,
      h * 0.1,
      h * 0.06,
      w * 0.147
    );
    write(
      g,
      (stats.life ?? stats.maxLife) + '/' + stats.maxLife,
      w * 0.58,
      h * 0.89,
      h * 0.053,
      w * 0.031,
      'center'
    );
    const tray = slots.find((s) => s.id === 'spent');
    const tw = (tray.width / piece.width) * w,
      th = (tray.depth / piece.depth) * h;
    const tx = (tray.x / piece.width + 0.5) * w - tw / 2,
      ty = (tray.z / piece.depth + 0.5) * h - th / 2;
    const shade = g.createLinearGradient(0, ty, 0, ty + th);
    shade.addColorStop(0, '#1b1812');
    shade.addColorStop(0.3, '#332b23');
    shade.addColorStop(1, '#574733');
    g.beginPath();
    g.roundRect(tx, ty, tw, th, th * 0.15);
    g.fillStyle = shade;
    g.fill();
    g.lineWidth = h * 0.004;
    g.strokeStyle = '#8b7858';
    g.stroke();
    write(g, 'Gastados', w * 0.641, h * 0.889, h * 0.051, w * 0.057);
    if (piece.isBarbarian)
      write(g, 'Furia', w * 0.891, h * 0.889, h * 0.051, w * 0.034);
    for (const s of slots) {
      if (!/^(hp|ember)\d+$/.test(s.id)) continue;
      const x = (s.x / piece.width + 0.5) * w,
        y = (s.z / piece.depth + 0.5) * h;
      const dw = (s.width / piece.width) * w * 0.98,
        dh = (s.depth / piece.depth) * h;
      if (s.id.startsWith('ember')) {
        g.beginPath();
        g.moveTo(x, y - dh / 2);
        g.lineTo(x + dw / 2, y);
        g.lineTo(x, y + dh / 2);
        g.lineTo(x - dw / 2, y);
        g.closePath();
      } else {
        g.beginPath();
        g.roundRect(x - dw / 2, y - dh / 2, dw, dh, Math.min(dw, dh) * 0.12);
      }
      g.fillStyle = '#302a21';
      g.fill();
      g.strokeStyle = '#887552';
      g.lineWidth = h * 0.003;
      g.stroke();
    }
  });
  texture.userData.setClassStats = (next, isReserve) => {
    if (
      stats.life === next.life &&
      stats.defense === next.defense &&
      reserved === isReserve
    )
      return;
    stats = next;
    reserved = isReserve;
    texture.userData.refreshType();
  };
  return texture;
}

function caption(p) {
  if (p.kind === 'weapon') {
    const dice = p.dice || [];
    const profile =
      dice.length && dice.every((n) => n === dice[0])
        ? (dice.length > 1 ? dice.length : '') + 'd' + dice[0]
        : dice.map((n) => 'd' + n).join('+');
    return [profile || '', p.hands === 2 ? '2 manos' : '1 mano']
      .filter(Boolean)
      .join(' · ');
  }
  if (p.kind === 'armor' && p.defense) return 'CD ' + p.defense;
  if (p.kind === 'shield' && p.defenseBonus)
    return '+' + p.defenseBonus + ' CD';
  return '';
}

function illustration(g, art, x, y, w, h, rim = 0) {
  if (!art) return null;
  const factor = Math.min(w / art.naturalWidth, h / art.naturalHeight);
  const width = art.naturalWidth * factor,
    height = art.naturalHeight * factor;
  const left = x + (w - width) / 2,
    top = y + (h - height) / 2;
  if (rim) {
    g.fillStyle = '#a78a61';
    g.fillRect(left - rim, top - rim, width + 2 * rim, height + 2 * rim);
    g.fillStyle = '#30291e';
    g.fillRect(
      left - rim * 0.45,
      top - rim * 0.45,
      width + rim * 0.9,
      height + rim * 0.9
    );
  }
  g.drawImage(art, left, top, width, height);
  return { left, top, width, height };
}

// Gallery print and cloth sleeve from tablillas.js and muestras-mandoble.js.
// Both accept any catalog illustration, preserving its four edges.
export function paintTablet(g, w, h, p, get) {
  const art = get(p.image),
    wood = get(patioArt('wood'));
  const names = {
    'hacha de mano': 'Hacha',
    'armadura acolchada': 'Acolchada',
    'armadura de escamas': 'Escamas',
    'armadura de mallas': 'Mallas',
    'poción de curación': 'Poción',
  };
  const title = names[(p.name || '').toLocaleLowerCase('es')] || p.name || '';
  const detail = title === 'Poción' ? 'Curación' : caption(p);
  const wide = p.hands === 2 && p.kind === 'weapon';
  let startX = w * 0.044,
    startY = h * 0.756,
    maxW = w * ((p.dice || []).length ? 0.64 : 0.912);
  g.clearRect(0, 0, w, h);
  if (wide) {
    const cloth = get(patioArt('pano'));
    const box = illustration(
      g,
      art,
      w * 0.018,
      h * 0.015,
      w * 0.643,
      h * 0.955
    );
    if (box) {
      g.save();
      g.globalCompositeOperation = 'source-atop';
      const shade = g.createLinearGradient(0, h * 0.48, 0, h * 0.89);
      shade.addColorStop(0, 'transparent');
      shade.addColorStop(0.52, '#261e1838');
      shade.addColorStop(1, '#211a15cc');
      g.fillStyle = shade;
      g.fillRect(box.left, box.top, box.width, box.height);
      g.globalCompositeOperation = 'destination-in';
      const horizontal = g.createLinearGradient(
          box.left,
          0,
          box.left + box.width,
          0
        ),
        vertical = g.createLinearGradient(0, box.top, 0, box.top + box.height);
      for (const [grad, a, b] of [
        [horizontal, 0.04, 0.09],
        [vertical, 0.035, 0.36],
      ]) {
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(a, '#000');
        grad.addColorStop(1 - b, '#000');
        grad.addColorStop(1, 'transparent');
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
      }
      g.restore();
    }
    g.save();
    g.globalCompositeOperation = 'destination-over';
    if (cloth || wood) g.drawImage(cloth || wood, 0, 0, w, h);
    g.restore();
    startX = w * 0.055;
    startY = h * 0.77;
    maxW = w * 0.57;
  } else {
    if (wood) g.drawImage(wood, 0, 0, w, h);
    g.fillStyle = '#261b1659';
    g.fillRect(0, 0, w, h);
    const end = h * ((p.dice?.length || 0) > 1 ? 0.57 : 0.685);
    illustration(
      g,
      art,
      w * 0.019,
      end * 0.017,
      w * 0.962,
      end * 0.966,
      w * 0.009
    );
    if (!p.image) {
      // The laboratory used its stamped reverse for cards without a painting.
      const back = get(
        (process.env.PUBLIC_URL || '') + '/canvas3d/visual/rosa-patio.webp'
      );
      if (back) {
        g.save();
        g.globalAlpha = 0.43;
        illustration(g, back, w * 0.19, end * 0.13, w * 0.62, end * 0.73);
        g.restore();
      }
    }
    const rail = g.createLinearGradient(0, end, 0, h);
    rail.addColorStop(0, '#25190faa');
    rail.addColorStop(0.13, '#3c291c7a');
    rail.addColorStop(0.65, '#3a281b61');
    rail.addColorStop(1, '#261a11ac');
    g.fillStyle = rail;
    g.fillRect(0, end, w, h - end);
    g.fillStyle = '#b9945c81';
    g.fillRect(0, end, w, h * 0.004);
    g.fillStyle = '#b9945c55';
    g.fillRect(w * 0.018, h * 0.979, w * 0.964, h * 0.004);
  }
  const size = h * 0.098;
  if (!wide && (p.dice?.length || 0) > 1) {
    startY = h * 0.798;
    maxW = w * 0.91;
  }
  g.font = '600 ' + size + 'px ' + family;
  const words = title.split(' '),
    clipped = words.length > 1 && g.measureText(title).width > maxW;
  if (clipped) {
    let head = words.shift();
    while (
      words.length > 1 &&
      g.measureText(head + ' ' + words[0]).width <= maxW
    )
      head += ' ' + words.shift();
    write(g, head, startX, startY, size, maxW);
    write(g, words.join(' '), startX, startY + h * 0.11, size, maxW);
    if (detail)
      write(
        g,
        detail,
        startX,
        startY + h * 0.194,
        h * 0.061,
        maxW,
        'left',
        true
      );
  } else {
    write(g, title, startX, detail ? startY : startY + h * 0.04, size, maxW);
    write(g, detail, startX, startY + h * 0.134, h * 0.074, maxW, 'left', true);
  }
}
