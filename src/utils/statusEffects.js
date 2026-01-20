import {
    Droplet, Lock, Flame, Wind, Ghost, Zap, BatteryLow,
    EyeOff, Snowflake, ArrowDown, Biohazard, VolumeX,
    Skull, HeartCrack, Sun, Heart, MicOff, AlertCircle,
    Shield, ZapOff, Moon, Cloud, Thermometer, FlaskConical,
    Crosshair, Activity, Anchor, Award, Book, Camera,
    Coffee, Gift, Home, Key, Map, Music, Phone,
    Search, Settings, ShoppingCart, Star, Trash, User
} from 'lucide-react';

export const ICON_MAP = {
    Droplet, Lock, Flame, Wind, Ghost, Zap, BatteryLow,
    EyeOff, Snowflake, ArrowDown, Biohazard, VolumeX,
    Skull, HeartCrack, Sun, Heart, MicOff, AlertCircle,
    Shield, ZapOff, Moon, Cloud, Thermometer, FlaskConical,
    Crosshair, Activity, Anchor, Award, Book, Camera,
    Coffee, Gift, Home, Key, Map, Music, Phone,
    Search, Settings, ShoppingCart, Star, Trash, User
};

export const DEFAULT_STATUS_EFFECTS = {
    'acido': {
        label: 'Ácido',
        iconName: 'Droplet',
        color: 'text-lime-400',
        bg: 'bg-lime-400/10',
        border: 'border-lime-400/50',
        hex: '#a3e635',
        desc: 'Pierdes una propiedad de armadura hasta que tu u otro personaje realice la acción de REPARAR sobre la armadura.'
    },
    'apresado': {
        label: 'Apresado',
        iconName: 'Lock',
        color: 'text-orange-400',
        bg: 'bg-orange-400/10',
        border: 'border-orange-400/50',
        hex: '#fb923c',
        desc: 'No puedes realizar acciones de evasión ni de movimiento hasta que tu u otro personaje realice la acción de LIBERAR sobre ti.'
    },
    'ardiendo': {
        label: 'Ardiendo',
        iconName: 'Flame',
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/50',
        hex: '#ef4444',
        desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de APAGAR sobre ti, pierdes un bloque de cuerpo o de mente.'
    },
    'asfixiado': {
        label: 'Asfixiado',
        iconName: 'Wind',
        color: 'text-slate-400',
        bg: 'bg-slate-400/10',
        border: 'border-slate-400/50',
        hex: '#94a3b8',
        desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de RESPIRAR sobre ti, pierdes un bloque de cuerpo.'
    },
    'asustado': {
        label: 'Asustado',
        iconName: 'Ghost',
        color: 'text-purple-400',
        bg: 'bg-purple-400/10',
        border: 'border-purple-400/50',
        hex: '#c084fc',
        desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de TRANQUILIZAR sobre ti, pierdes un bloque de mente.'
    },
    'aturdido': {
        label: 'Aturdido',
        iconName: 'Zap',
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10',
        border: 'border-yellow-400/50',
        hex: '#facc15',
        desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de ESPABILAR sobre ti, pierdes un bloque de mente.'
    },
    'cansado': {
        label: 'Cansado',
        iconName: 'BatteryLow',
        color: 'text-amber-400',
        bg: 'bg-amber-400/10',
        border: 'border-amber-400/50',
        hex: '#fbbf24',
        desc: 'Por cada tiempo que gastes hasta que realices la acción de DESCANSAR, pierdes un bloque de cuerpo.'
    },
    'cegado': {
        label: 'Cegado',
        iconName: 'EyeOff',
        color: 'text-gray-400',
        bg: 'bg-gray-400/10',
        border: 'border-gray-400/50',
        hex: '#9ca3af',
        desc: 'Por cada tiempo que gastes para realizar una tirada hasta que realices la acción de ACLARAR, se anula un dado del resultado.'
    },
    'congelado': {
        label: 'Congelado',
        iconName: 'Snowflake',
        color: 'text-cyan-400',
        bg: 'bg-cyan-400/10',
        border: 'border-cyan-400/50',
        hex: '#22d3ee',
        desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de CALENTAR sobre ti, pierdes un bloque de cuerpo o de mente.'
    },
    'derribado': {
        label: 'Derribado',
        iconName: 'ArrowDown',
        color: 'text-indigo-400',
        bg: 'bg-indigo-400/10',
        border: 'border-indigo-400/50',
        hex: '#818cf8',
        desc: 'No puedes defenderte ni realizar acciones de movimiento hasta que tu u otro personaje realice la acción de LEVANTAR sobre tí.'
    },
    'enfermo': {
        label: 'Enfermo',
        iconName: 'Biohazard',
        color: 'text-green-500',
        bg: 'bg-green-500/10',
        border: 'border-green-500/50',
        hex: '#22c55e',
        desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de TRATAR sobre ti, pierdes un bloque de cuerpo o de mente.'
    },
    'ensordecido': {
        label: 'Ensordecido',
        iconName: 'VolumeX',
        color: 'text-rose-300',
        bg: 'bg-rose-300/10',
        border: 'border-rose-300/50',
        hex: '#fda4af',
        desc: 'No puedes oir hasta que realices la acción de ACLARAR.'
    },
    'envenenado': {
        label: 'Envenenado',
        iconName: 'Skull',
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/50',
        hex: '#10b981',
        desc: 'No puedes recibir curaciones hasta que tu u otro personaje realice la acción de TRATAR sobre ti.'
    },
    'herido': {
        label: 'Herido',
        iconName: 'HeartCrack',
        color: 'text-red-600',
        bg: 'bg-red-600/10',
        border: 'border-red-600/50',
        hex: '#dc2626',
        desc: 'Puede ser utilizado por el scheduler como una clave que garantiza un fracaso. Desaparece tras un descanso largo.'
    },
    'iluminado': {
        label: 'Iluminado',
        iconName: 'Sun',
        color: 'text-yellow-200',
        bg: 'bg-yellow-200/10',
        border: 'border-yellow-200/50',
        hex: '#fef08a',
        desc: 'Emites luz a tu alrededor.'
    },
    'regeneracion': {
        label: 'Regeneración',
        iconName: 'Heart',
        color: 'text-pink-400',
        bg: 'bg-pink-400/10',
        border: 'border-pink-400/50',
        hex: '#f472b6',
        desc: 'Por cada tiempo que gastes hasta que recibas daño, recuperas un bloque de cuerpo.'
    },
    'sangrado': {
        label: 'Sangrado',
        iconName: 'Droplet',
        color: 'text-red-700',
        bg: 'bg-red-700/10',
        border: 'border-red-700/50',
        hex: '#b91c1c',
        desc: 'Por cada tiempo que gastes hasta que recibas una curación, pierdes un bloque de cuerpo.'
    },
    'silenciado': {
        label: 'Silenciado',
        iconName: 'MicOff',
        color: 'text-slate-500',
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/50',
        hex: '#64748b',
        desc: 'No puedes hablar hasta que realices la acción de ACLARAR.'
    },
};

export const ESTADOS = Object.entries(DEFAULT_STATUS_EFFECTS).map(([id, config]) => ({
    id,
    name: config.label,
    img: `/estados/${config.label}.png`,
    desc: config.desc,
    hex: config.hex
}));
