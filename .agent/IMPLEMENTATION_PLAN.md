# Plan de Implementación - Sistema de Edición de Clases

## ✅ Completado
1. Reemplazo de emojis por iconos SVG de Lucide React
   - ✅ Icono de espada (Sword) en "Cartas de Equipo"
   - ✅ Icono de escudo (Shield) en equipamiento y talentos

## 🔄 Pendiente de Implementación

### 1. Campos Editables en Vista Overview
**Ubicación**: `ClassList.jsx` - caso 'overview' en `renderActiveView()`

**Campos a hacer editables**:
- Nombre de la clase (línea ~2862)
- Subtítulo (línea ~2837)
- Descripción/Lore (línea ~2867)
- Dificultad (línea ~2854)
- Rol (línea ~2857)
- Dado de Golpe (hitDie)
- Habilidad Principal (primaryAbility)
- Salvaciones (saves)

**Implementación**:
- Crear componente `EditableText` inline que permita click-to-edit
- Al hacer click, mostrar input/textarea
- Guardar cambios en `editingClass` state
- Mantener estilos visuales actuales

### 2. Niveles Editables en Constelación
**Ubicación**: `ProgressionView.jsx`

**Funcionalidad requerida**:
- Editar título de cada nivel
- Editar descripción de cada nivel
- Marcar/desmarcar como "adquirido" (toggle)
- Pasar callbacks desde ClassList para actualizar el estado

**Props necesarios**:
```javascript
<ProgressionView 
  dndClass={dndClass}
  onUpdateLevel={(levelIndex, field, value) => {...}}
  onToggleAcquired={(levelIndex) => {...}}
/>
```

### 3. Buscador de Equipamiento en Mazo Inicial
**Ubicación**: `LoadoutView.jsx`

**Funcionalidad requerida**:
- Input de búsqueda para filtrar armas/armaduras/habilidades
- Mostrar resultados de Firebase (usar `equipmentCatalog` de ClassList)
- Botón "Agregar" para cada item
- Actualizar `dndClass.equipment` al agregar

**Props necesarios**:
```javascript
<LoadoutView 
  dndClass={dndClass}
  equipmentCatalog={{weapons, armor, abilities}}
  onAddEquipment={(item) => {...}}
  onRemoveEquipment=(index) => {...}}
/>
```

## Estructura de Datos

### editingClass state
```javascript
{
  id: string,
  name: string,
  subtitle: string,
  description: string,
  difficulty: string, // 'Baja' | 'Media' | 'Alta' | 'Legendaria'
  role: string,
  hitDie: string, // 'd6', 'd8', 'd10', 'd12'
  primaryAbility: string,
  saves: string[], // ['Fortaleza', 'Voluntad']
  level: number,
  classLevels: [{
    title: string,
    description: string,
    completed: boolean
  }],
  equipment: [{
    name: string,
    type: string,
    detail: string,
    description: string
  }]
}
```

## Funciones de Actualización Necesarias

```javascript
// En ClassList.jsx
const handleUpdateClassField = (field, value) => {
  setEditingClass(prev => ({
    ...prev,
    [field]: value
  }));
};

const handleUpdateLevel = (levelIndex, field, value) => {
  setEditingClass(prev => ({
    ...prev,
    classLevels: prev.classLevels.map((level, idx) => 
      idx === levelIndex ? {...level, [field]: value} : level
    )
  }));
};

const handleToggleLevelAcquired = (levelIndex) => {
  setEditingClass(prev => ({
    ...prev,
    classLevels: prev.classLevels.map((level, idx) => 
      idx === levelIndex ? {...level, completed: !level.completed} : level
    )
  }));
};

const handleAddEquipment = (item) => {
  setEditingClass(prev => ({
    ...prev,
    equipment: [...(prev.equipment || []), item]
  }));
};

const handleRemoveEquipment = (index) => {
  setEditingClass(prev => ({
    ...prev,
    equipment: prev.equipment.filter((_, idx) => idx !== index)
  }));
};
```

## Componente EditableText (Inline)

```javascript
const EditableText = ({ value, onChange, className, multiline = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleSave = () => {
    onChange(tempValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return multiline ? (
      <textarea
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        className={className}
        autoFocus
      />
    ) : (
      <input
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        className={className}
        autoFocus
      />
    );
  }

  return (
    <div onClick={() => setIsEditing(true)} className={`${className} cursor-pointer hover:opacity-80`}>
      {value}
    </div>
  );
};
```

## Orden de Implementación Sugerido

1. **Paso 1**: Crear funciones de actualización en ClassList
2. **Paso 2**: Implementar EditableText component
3. **Paso 3**: Hacer editables los campos de Overview
4. **Paso 4**: Actualizar ProgressionView con edición
5. **Paso 5**: Implementar buscador en LoadoutView
6. **Paso 6**: Testing y ajustes finales

¿Deseas que proceda con la implementación completa?
