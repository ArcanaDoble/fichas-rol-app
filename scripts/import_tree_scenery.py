"""Prepare the user's local tree PNGs and reusable canopy contours for the Canvas."""
import argparse
import json
import math
from pathlib import Path
from PIL import Image, ImageFilter


def simplify(points, tolerance):
    if len(points) <= 2:
        return points
    a, b = points[0], points[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dy)
    distances = [abs(dx * (a[1] - p[1]) - (a[0] - p[0]) * dy) / length
                 if length else math.dist(a, p) for p in points[1:-1]]
    if distances and max(distances) > tolerance:
        index = distances.index(max(distances)) + 1
        return simplify(points[:index + 1], tolerance)[:-1] + simplify(points[index:], tolerance)
    return [a, b]


def contour(image):
    # Close small gaps between leaves. Interior pinholes are not passages for sight.
    alpha = image.getchannel('A').resize((192, 192)).filter(ImageFilter.MaxFilter(5))
    radii = []
    count = 96
    for index in range(count):
        angle = index * 2 * math.pi / count
        radius = 0
        for r in range(1, 137):
            x, y = round(95.5 + math.cos(angle) * r), round(95.5 + math.sin(angle) * r)
            if 0 <= x < 192 and 0 <= y < 192 and alpha.getpixel((x, y)) > 48:
                radius = r
        radii.append(radius)
    points = []
    for index in range(count):
        angle = index * 2 * math.pi / count
        radius = sorted([radii[(index - 1) % count], radii[index], radii[(index + 1) % count]])[1]
        points.append([max(0, min(1, .5 + math.cos(angle) * radius / 192)),
                       max(0, min(1, .5 + math.sin(angle) * radius / 192))])
    half = count // 2
    points = simplify(points[:half + 1], .006)[:-1] + simplify(points[half:] + [points[0]], .006)[:-1]
    return [[round(x, 4), round(y, 4)] for x, y in points]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--downloads', type=Path, default=Path.home() / 'Downloads')
    args = parser.parse_args()
    repo = Path(__file__).resolve().parent.parent
    destination = repo / 'public' / 'scenery' / 'trees'
    destination.mkdir(parents=True, exist_ok=True)
    source_metadata = json.loads((args.downloads / 'Arboles_PNG' / 'Origen_y_archivos.json').read_text(encoding='utf-8-sig'))
    labels = {entry['archivo']: entry['etiqueta'] for entry in source_metadata}
    labels.update({'01_Arbol_podrido.png': 'Árbol podrido', '02_Arbol_en_llamas.png': 'Árbol en llamas',
                   '03_Arbol_calcinado_con_brasas.png': 'Árbol calcinado con brasas'})
    catalog = []
    for folder in ['Arboles_PNG', 'Arboles_Nuevos_PNG']:
        for path in sorted((args.downloads / folder).glob('*.png')):
            asset_id = ('fa-' if folder == 'Arboles_PNG' else 'local-') + path.stem.lower().replace('_', '-')
            image = Image.open(path).convert('RGBA')
            width, height = image.size
            preview = image.copy()
            preview.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
            preview.save(destination / (asset_id + '.webp'), format='WEBP', quality=90, method=6)
            thumbnail = image.copy()
            thumbnail.thumbnail((192, 192), Image.Resampling.LANCZOS)
            thumbnail.save(destination / (asset_id + '-thumb.webp'), format='WEBP', quality=82, method=6)
            catalog.append({'id': asset_id, 'name': labels.get(path.name, path.stem),
                            'image': '/scenery/trees/' + asset_id + '.webp',
                            'thumbnail': '/scenery/trees/' + asset_id + '-thumb.webp',
                            'imageWidth': width, 'imageHeight': height, 'canopy': contour(image),
                            'source': folder + '/' + path.name})
    target = repo / 'src' / 'features' / 'tactical-shared' / 'treeCatalog.json'
    target.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    (destination / 'sources.json').write_text(json.dumps(source_metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Imported {len(catalog)} trees; {sum(p.stat().st_size for p in destination.glob("*.webp")):,} bytes')


if __name__ == '__main__':
    main()
