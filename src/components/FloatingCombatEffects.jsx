import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BLOCK_COLORS = {
    vida: '#ef4444',     // Red-500
    armadura: '#d1d5db', // Gray-300
    postura: '#3b82f6'   // Blue-500
};

const BLOCK_LABELS = {
    vida: 'Vida',
    armadura: 'Armadura',
    postura: 'Postura'
};

export default function FloatingCombatEffects({ effect, targetPos, attackerPos }) {
    if (!effect) return null;

    const { reactionType, finalDamage, counterDamage, blocksLost, attackerId, targetId } = effect;

    const flyoffs = [];
    const baseId = `fly-${Date.now()}-${Math.random()}`;
    const highlights = [];

    const hasBlocksLost = blocksLost && (blocksLost.vida > 0 || blocksLost.armadura > 0 || blocksLost.postura > 0);

    // Target received damage
    if (finalDamage > 0 && targetPos) {
        if (hasBlocksLost) {
            highlights.push({
                id: `${baseId}-target-highlight`,
                x: targetPos.x, y: targetPos.y, width: targetPos.width, height: targetPos.height
            });
        }

        const blocks = [];
        if (blocksLost) {
            ['armadura', 'postura', 'vida'].forEach(tipo => {
                if (blocksLost[tipo] && blocksLost[tipo] > 0) {
                    blocks.push({ tipo, cantidad: blocksLost[tipo] });
                }
            });
        }

        if (blocks.length > 0) {
            blocks.forEach((b, idx) => {
                flyoffs.push({
                    id: `${baseId}-target-dmg-${idx}`,
                    x: targetPos.x + targetPos.width / 2 + (idx * 30 - ((blocks.length - 1) * 15)),
                    y: targetPos.y - 10,
                    text: `-${b.cantidad}`,
                    color: BLOCK_COLORS[b.tipo] || '#fff',
                    label: BLOCK_LABELS[b.tipo],
                    type: 'damage'
                });
            });
        } else {
            flyoffs.push({
                id: `${baseId}-target-dmg`,
                x: targetPos.x + targetPos.width / 2,
                y: targetPos.y - 10,
                text: `-${finalDamage}`,
                color: '#ef4444',
                label: 'Daño',
                type: 'damage'
            });
        }
    }

    // Reaction messages for Target
    if (reactionType === 'parar' && targetPos) {
        if (counterDamage > 0) {
            // El defensor anuló el ataque Y además contraatacó
            flyoffs.push({
                id: `${baseId}-target-counter`,
                x: targetPos.x + targetPos.width / 2,
                y: targetPos.y - 30,
                text: '¡Contraataque!',
                color: '#f97316', // Orange-500
                type: 'special'
            });
        } else if (finalDamage === 0) {
            // Parada perfecta: se anuló todo el daño sin contraataque
            flyoffs.push({
                id: `${baseId}-target-perfect`,
                x: targetPos.x + targetPos.width / 2,
                y: targetPos.y - 30,
                text: '¡Bloqueo Perfecto!',
                color: '#eab308', // Yellow-500
                type: 'info'
            });
        } else {
            // La parada redujo el daño pero no lo anuló del todo: Resiste
            flyoffs.push({
                id: `${baseId}-target-resist`,
                x: targetPos.x + targetPos.width / 2,
                y: targetPos.y - 30,
                text: '¡Resiste!',
                color: '#94a3b8', // Slate-400
                type: 'info'
            });
        }
    } else if (reactionType === 'evadir' && targetPos) {
        // Evasión perfecta: el jugador evadió TODOS los dados (flag evadedAll o finalDamage === 0)
        const evadedAll = effect.evadedAll || finalDamage === 0;
        if (evadedAll) {
            flyoffs.push({
                id: `${baseId}-target-evade-perfect`,
                x: targetPos.x + targetPos.width / 2,
                y: targetPos.y - 30,
                text: '¡Evasión Perfecta!',
                color: '#34d399', // Emerald-400
                type: 'info'
            });
        } else {
            flyoffs.push({
                id: `${baseId}-target-evade-partial`,
                x: targetPos.x + targetPos.width / 2,
                y: targetPos.y - 30,
                text: '¡Evasión Parcial!',
                color: '#6ee7b7', // Emerald-300
                type: 'info'
            });
        }
    }

    // Reaction message for Attacker taking Counterattack
    if (counterDamage > 0 && attackerPos) {
        if (hasBlocksLost) {
            highlights.push({
                id: `${baseId}-att-highlight`,
                x: attackerPos.x, y: attackerPos.y, width: attackerPos.width, height: attackerPos.height
            });
        }
        const blocks = [];
        if (blocksLost) {
            ['armadura', 'postura', 'vida'].forEach(tipo => {
                if (blocksLost[tipo] && blocksLost[tipo] > 0) {
                    blocks.push({ tipo, cantidad: blocksLost[tipo] });
                }
            });
        }

        if (blocks.length > 0) {
            blocks.forEach((b, idx) => {
                flyoffs.push({
                    id: `${baseId}-att-dmg-${idx}`,
                    x: attackerPos.x + attackerPos.width / 2 + (idx * 30 - ((blocks.length - 1) * 15)),
                    y: attackerPos.y - 10,
                    text: `-${b.cantidad}`,
                    color: BLOCK_COLORS[b.tipo] || '#fff',
                    label: BLOCK_LABELS[b.tipo],
                    type: 'damage'
                });
            });
        } else {
            flyoffs.push({
                id: `${baseId}-att-dmg`,
                x: attackerPos.x + attackerPos.width / 2,
                y: attackerPos.y - 10,
                text: `-${counterDamage}`,
                color: '#ef4444',
                label: 'Daño',
                type: 'damage'
            });
        }
    }

    return (
        <AnimatePresence>
            {highlights.map(hl => (
                <motion.div
                    key={hl.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                        opacity: [0, 0.4, 0.6, 0.4, 0],
                        scale: [0.8, 1, 1.05, 1, 0.9]
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                    className="absolute pointer-events-none z-[190] bg-red-600 rounded-full mix-blend-overlay blur-sm"
                    style={{
                        left: hl.x,
                        top: hl.y,
                        width: hl.width,
                        height: hl.height,
                        boxShadow: '0 0 40px rgba(220, 38, 38, 0.8)'
                    }}
                />
            ))}
            {flyoffs.map(fly => (
                <motion.div
                    key={fly.id}
                    initial={{ opacity: 0, y: fly.y + 20, x: fly.x, scale: 0.2 }}
                    animate={{
                        opacity: [0, 1, 1, 0],
                        y: fly.y - 120,
                        x: fly.x + (Math.random() * 40 - 20),
                        scale: [0.2, 1.5, 1, 0.8],
                        rotate: [0, fly.type === 'damage' ? (Math.random() * 20 - 10) : 0, 0]
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                        duration: 4.0, // Slow and majestic
                        times: [0, 0.15, 0.85, 1],
                        ease: "easeOut"
                    }}
                    className="absolute pointer-events-none z-[200] flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
                >
                    <div className="relative flex flex-col items-center">
                        <span
                            className="font-fantasy font-black italic tracking-tighter"
                            style={{
                                color: fly.color,
                                fontSize: fly.type === 'damage' ? '48px' : '32px',
                                textShadow: `
                                    0 0 10px ${fly.color}80, 
                                    0 0 20px #000,
                                    -2px -2px 0 #000,
                                    2px -2px 0 #000,
                                    -2px 2px 0 #000,
                                    2px 2px 0 #000,
                                    0 4px 10px rgba(0,0,0,0.8)
                                `,
                                filter: 'drop-shadow(0 0 15px rgba(0,0,0,0.5))'
                            }}
                        >
                            {fly.text}
                        </span>
                        {fly.label && (
                            <span 
                                className="text-[10px] font-bold uppercase tracking-[0.3em] text-white whitespace-nowrap px-2 py-0.5 rounded-sm bg-black/40 backdrop-blur-sm border border-white/10 mt-[-8px]"
                                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                            >
                                {fly.label}
                            </span>
                        )}
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
    );
}
