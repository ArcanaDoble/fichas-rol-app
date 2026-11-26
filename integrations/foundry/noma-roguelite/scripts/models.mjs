const f = foundry.data.fields;
const number = (initial = 0, min = 0) => new f.NumberField({required: true, nullable: false, integer: true, min, initial});
const text = (initial = '') => new f.StringField({required: true, nullable: false, initial});
const pool = (value, max) => new f.SchemaField({value: number(value), max: number(max)});
export class NomaActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      health: pool(6, 6), cd: number(6, 1), movement: number(2), initiative: number(2), offense: number(3),
      resource: new f.SchemaField({value: number(), max: number(3), name: text('Recurso'), color: text('#c8aa6e')}),
      actionDice: new f.ArrayField(text('d6'), {initial: ['d6','d6','d6']}),
      level: number(1, 1), classId: text(), sourceId: text(), subtitle: text(), description: text(),
      threatDie: text(), size: number(1, 1), activeSet: number(), gold: number(),
      talents: new f.ArrayField(new f.ObjectField(), {initial: []}),
      levels: new f.ArrayField(new f.ObjectField(), {initial: []}),
      equipmentPool: new f.ObjectField({initial: {}}),
      source: new f.ObjectField({initial: {}}),
      status: new f.ArrayField(text(), {initial: []}),
      temporaryLife: number(),
    };
  }
}
export class NomaItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      damage: text('1d6'), range: text('Toque'), cost: number(1), hands: number(1, 1),
      cd: number(6), rarity: text('Común'), description: text(), lore: text(),
      traits: new f.ArrayField(text(), {initial: []}),
      quantity: number(1), equipped: new f.BooleanField({initial: false}),
      weaponSet: number(), slot: text('mainHand'), sourceId: text(),
      source: new f.ObjectField({initial: {}}),
    };
  }
}
