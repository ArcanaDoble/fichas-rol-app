import { getCustomImage } from '../hooks/useCustomEquipmentImages';
import { hasWeaponTrick, resolveWeaponForm } from '../features/roguelite/weaponForms';

export const resolveEquipmentImage = (item = {}, customImages = null) => {
  if (hasWeaponTrick(item)) return resolveWeaponForm(item).image || null;
  const explicit = item.img || item.image || item.imagen || item.imageUrl || item.imageSource || item.art || item.icon;
  if (explicit) return explicit;
  const custom = getCustomImage(item, customImages);
  if (custom) return custom;

  // Preserve the approved legacy artwork when the master spell uses its canonical name.
  const identity = String(item.name || item.nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  if (identity === 'barrera runica') {
    const legacy = getCustomImage({ name: 'Barrera arcana' }, customImages);
    if (legacy) return legacy;
  }

  const name = String(item.name || item.nombre || '').toLowerCase();
  const mappings = [
    ['armadura acolchada', '/armaduras/armadura_acolchada.webp'],
    ['armadura bandeada', '/armaduras/armadura bandeada.webp'],
    ['armadura de acero reforzado', '/armaduras/armadura_de_acero_reforzado.webp'],
    ['armadura de acero', '/armaduras/armadura_de_acero.webp'],
    ['armadura de coloso', '/armaduras/armadura_de_coloso.webp'],
    ['armadura de hierro', '/armaduras/armadura_de_hierro.webp'],
    ['armadura de escamas', '/armaduras/armadura_de_escamas.webp'],
    ['armadura de cuero tachonado', '/armaduras/armadura_de_cuero_tachonado.webp'],
    ['armadura de cuero', '/armaduras/armadura_de_cuero.webp'],
    ['armadura de placas', '/armaduras/armadura_de_placas.webp'],
    ['armadura de piel', '/armaduras/armadura_de_piel.webp'],
    ['armadura de zarzas', '/armaduras/armadura_de_zarzas.webp'],
    ['cota de malla', '/armaduras/cota_de_malla.webp'],
    ['mallas', '/armaduras/cota_de_malla.webp'],
    ['llave inglesa', '/armas/llave_inglesa.webp'], ['gancho de alcantarilla', '/armas/gancho_de_alcantarilla.webp'],
    ['antorcha', '/armas/antorcha.webp'], ['porra de jade', '/armas/Porra de jade.webp'],
    ['mazo glacial', '/armas/mazo_glacial.webp'], ['cuchillo', '/armas/cuchillo.webp'],
    ['revólver', '/armas/revolver.webp'], ['revolver', '/armas/revolver.webp'], ['pistola', '/armas/pistola.webp'],
    ['rifle', '/armas/rifle.webp'], ['escopeta', '/armas/escopeta.webp'], ['granarco', '/armas/arco_largo.webp'],
    ['arco largo', '/armas/arco_largo.webp'], ['arco', '/armas/arco_corto.webp'], ['gran clava', '/armas/gran_clava.webp'],
    ['jabalina', '/armas/jabalina.webp'], ['lanza', '/armas/lanza.webp'], ['daga', '/armas/daga.webp'],
    ['estilete', '/armas/estoque.webp'], ['estoque', '/armas/estoque.webp'], ['hacha de mano', '/armas/hacha_de_mano.webp'],
    ['honda', '/armas/honda.webp'], ['tirachinas', '/armas/tirachinas.webp'], ['alabarda', '/armas/alabarda.png'],
    ['ballesta pesada', '/armas/ballesta_pesada.webp'], ['ballesta de mano', '/armas/ballesta_de_mano.webp'],
    ['ballesta', '/armas/ballesta_ligera.webp'], ['martillo de guerra', '/armas/martillo_de_guerra.webp'],
    ['gran martillo', '/armas/gran_martillo.webp'], ['espada bastarda', '/armas/espada_bastarda.webp'],
    ['espada larga', '/armas/espada_larga.webp'], ['espada corta', '/armas/espada_corta.webp'],
    ['mandoble', '/armas/mandoble.webp'], ['cimitarra', '/armas/cimitarra.webp'], ['espada', '/armas/espada_de_acero.webp'],
  ];
  return mappings.find(([fragment]) => name.includes(fragment))?.[1] || null;
};
