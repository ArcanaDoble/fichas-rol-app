"""Build an offline catalogue from the read-only NOMA export; no Firebase writes."""
import concurrent.futures, json, pathlib, re, shutil, urllib.request, unicodedata
from catalog_assets import STORAGE_PREFIX, asset_filename, offline_images
ROOT=pathlib.Path(__file__).resolve().parents[2]
DEST=pathlib.Path(__file__).parent/'noma-roguelite'
ASSETS=DEST/'assets'; ASSETS.mkdir(exist_ok=True)
DATA=json.loads((ROOT/'output/foundry/catalog.json').read_text(encoding='utf8'))
PREFIX='systems/noma-roguelite/'
def norm(s): return ''.join(c for c in unicodedata.normalize('NFD',str(s or '')).lower() if unicodedata.category(c)!='Mn')
def slug(s): return re.sub('[^a-z0-9]+','',norm(s))
images={slug(x.get('itemName')):x.get('imageUrl') for x in DATA['equipment_images']}
files={slug(p.stem):p for folder in ['armas','armaduras','objetos','accesorios','cabecera'] for p in (ROOT/'public'/folder).glob('*') if p.is_file()}
jobs={}
def art(obj, fallback='icons/svg/item-bag.svg'):
    name=obj.get('nombre') or obj.get('name') or ''
    source=images.get(slug(name)) or obj.get('image') or obj.get('imageSource') or obj.get('imageUrl') or obj.get('portraitSource')
    if source and source.startswith(STORAGE_PREFIX):
        filename=asset_filename(source)
        jobs[source]=filename
        return PREFIX+'assets/'+filename
    local=files.get(slug(name))
    if local:
        filename='local-'+slug(name)+local.suffix; shutil.copy2(local,ASSETS/filename)
        return PREFIX+'assets/'+filename
    return fallback
def num(value, default=0):
    try: return int(float(value))
    except (ValueError,TypeError): return default
def item(x,kind):
    name=x.get('nombre') or x.get('name') or 'Sin nombre'
    traits=x.get('rasgos',x.get('traits',[])); traits=traits if isinstance(traits,list) else traits.split(',')
    return {'name':name,'type':kind,'img':art(x),'system':{
        'damage':str(x.get('dano',x.get('damage',''))),'range':str(x.get('alcance',x.get('range','Toque'))),
        'cost':num(x.get('actionCost'),max(1,str(x.get('consumo',x.get('consumption',''))).count('🟡'))),
        'hands':num(x.get('handsRequired'),2 if 'dos manos' in norm(traits) else 1),
        'cd':max(0,num(x.get('defenseClass',x.get('defensa',x.get('defense',6))),6)),
        'rarity':x.get('rareza',x.get('rarity','Común')) or 'Común',
        'description':x.get('descripcion',x.get('description',x.get('desc',''))) or '',
        'lore':x.get('descripcionLore',x.get('lore','')) or '', 'traits':[str(t).strip() for t in traits if t],
        'sourceId':x.get('id') or x.get('templateId') or slug(name),'source':x,
    }}
catalog={}
for collection,kind in [('weapons','weapon'),('armors','armor'),('abilities','ability')]:
    for obj in DATA[collection]:
        if not obj.get('deleted'): catalog[kind+':'+slug(obj.get('nombre') or obj.get('name'))]=item(obj,kind)
for obj in DATA['customItems']:
    if obj.get('category')=='objects': catalog['consumable:'+slug(obj.get('nombre') or obj.get('name'))]=item(obj,'consumable')
classes=[]
for x in DATA['classes']:
    r=x.get('roguelite',{}); resource={**x.get('resource',{}),**r.get('resource',{})}
    pool=x.get('equipment',{}); loadout=[]; name=norm(x['name'])
    preferred={'barbaro':['Hacha de mano','Armadura de escamas'],'picaro':['Estoque','Armadura acolchada'],'mago':['Bastón arcano','Túnica arcana']}.get(name,[])
    for category,kind in [('weapons','weapon'),('armor','armor'),('abilities','ability'),('objects','consumable'),('accessories','accessory')]:
        for source in pool.get(category,[]):
            if not isinstance(source,dict): continue
            entry=item(source,kind); key=kind+':'+slug(entry['name'])
            existing=catalog.get(key)
            # Canonical database values and configured art take precedence over old pool snapshots.
            if existing: entry=existing
            catalog[key]=entry
            if entry['name'] in preferred or (kind=='ability' and name=='mago'):
                equipped=json.loads(json.dumps(entry)); equipped['system'].update(equipped=True,slot='body' if kind=='armor' else 'mainHand')
                loadout.append(equipped)
    talents=r.get('talentCatalog',x.get('talentCatalog',[]))
    system={'health':{'value':num(r.get('lifeInitial',x.get('maxLife',6)),6),'max':num(r.get('maxLife',x.get('maxLife',6)),6)},
        'cd':max(1,num(r.get('defenseClass',x.get('defenseClass')),6)), 'movement':num(r.get('movement',x.get('movement')),2),
        'initiative':num(r.get('initiativeBase',x.get('initiativeBase')),2), 'resource':{'value':num(resource.get('initial')), 'max':num(resource.get('maximum'),3), 'name':resource.get('name') or 'Recurso','color':resource.get('color') or '#c8aa6e'},
        'actionDice':r.get('actionDice',x.get('actionDice')) or [], 'classId':x['id'],'sourceId':x['id'], 'level':1,
        'description':x.get('description',''), 'subtitle':x.get('subtitle',''), 'source':x,
        'levels':x.get('classLevels',[]), 'equipmentPool':pool,
        'talents':[{'name':t['name'],'description':t.get('description',t.get('desc','')),'spent':False,'prepared':i<3,'img':art(t,'icons/svg/upgrade.svg')} for i,t in enumerate(talents) if t.get('available',True)],
    }
    if name=='barbaro': system['description']='El Bárbaro acepta riesgo para generar Furia y transforma ese recurso en Presión, movilidad, defensa y supervivencia. Reserva: 0–3 de Furia en nivel 1. El detalle del núcleo figura en el documento maestro v0.2.42; en esta prueba su recurso se controla manualmente.'
    body=next((i for i in loadout if i['type']=='armor'),None)
    if body: system['cd']=max(1,body['system']['cd'])
    classes.append({'name':x['name'].title(),'type':'hero','img':art(x,'icons/svg/mystery-man.svg'),'system':system,'items':loadout})
enemies=[]
for x in DATA['rogueliteEnemies']:
    stats=x.get('stats',{}); v=lambda key,default:num(stats.get(key,{}).get('max'),default)
    items=[]
    for obj in x.get('equipmentSlots',[]):
        if not obj: continue
        entry=catalog.get(obj.get('type','weapon')+':'+slug(obj.get('nombre',obj.get('name')))) or item(obj,obj.get('type','weapon'))
        entry=json.loads(json.dumps(entry)); entry['system'].update(equipped=True,slot='body' if entry['type']=='armor' else 'mainHand');items.append(entry)
    for obj in x.get('abilitySlots',[]):
        if obj: items.append(item(obj,'ability'))
    enemies.append({'name':x['name'].title(),'type':'enemy','img':art(x,'icons/svg/skull.svg'),'items':items,'system':{
        'health':{'value':v('vida',5),'max':v('vida',5)},'cd':max(1,next((i['system']['cd'] for i in items if i['type']=='armor'),v('cd',4))),'movement':v('movimiento',2),
        'initiative':v('iniciativa',7),'offense':v('ofensiva',3),'threatDie':x.get('threatDie',''),
        'classId':x['id'],'sourceId':x['id'],'actionDice':[],'description':x.get('description',''),'source':x,
    }})
def download(entry):
    url,filename=entry; dest=ASSETS/filename
    if dest.exists(): return
    try:
        with urllib.request.urlopen(url,timeout=40) as response: dest.write_bytes(response.read())
    except Exception as exc: print('Asset unavailable:',filename,type(exc).__name__)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor: list(executor.map(download,jobs.items()))
shutil.copy2(ROOT/'src/assets/fonts/cinzel-latin-700.woff2',ASSETS/'cinzel.woff2')
shutil.copy2(ROOT/'public/interfaz/stardust.png',ASSETS/'stardust.png')
for p in (ROOT/'public/dados').glob('D*.webp'): shutil.copy2(p,ASSETS/p.name)
(DEST/'data').mkdir(exist_ok=True)
offline_catalog = offline_images({'classes':classes,'enemies':enemies,'items':list(catalog.values()),'source':'Catálogo NOMA · 16/10/2026'}, ASSETS)
(DEST/'data/catalog.json').write_text(json.dumps(offline_catalog,ensure_ascii=False),encoding='utf8')
print('Prepared:',len(classes),'classes,',len(enemies),'enemies,',len(catalog),'items,',len(jobs),'images')
