import React from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { GiShoppingBag, GiBackpack } from 'react-icons/gi';
import { FiCheckCircle } from 'react-icons/fi';

const PurchaseAnimation = ({ event }) => {
  return (
    <AnimatePresence>
      {event ? (
        <motion.div
          key={event.key}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.9 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="pointer-events-none absolute left-14 top-6 z-[999] w-72"
        >
          <motion.div
            layout
            className="relative overflow-hidden rounded-2xl border border-emerald-400/60 bg-slate-900/95 px-5 py-4 text-white shadow-[0_18px_45px_rgba(15,118,110,0.45)] backdrop-blur"
          >
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05, duration: 0.3, ease: 'easeOut' }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-200">
                <GiShoppingBag className="text-xl" />
              </span>
              <div className="flex-1">
                <p className="text-[0.65rem] uppercase tracking-[0.35em] text-amber-200">
                  Compra exitosa
                </p>
                <p className="text-sm font-semibold text-slate-100">
                  {event.itemName || 'Objeto adquirido'}
                </p>
                <p className="text-xs text-slate-300">
                  ¡Guardado en el inventario de {event.playerName || 'tu héroe'}!
                </p>
              </div>
            </motion.div>
            <motion.div
              className="relative mt-4 h-14"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.3, ease: 'easeOut' }}
            >
              <span className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-amber-400/60 bg-amber-500/10 text-amber-200">
                <GiShoppingBag className="text-lg" />
              </span>
              <span className="absolute left-16 right-16 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-400 via-emerald-300 to-emerald-500" />
              <span className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/10 text-emerald-200">
                <GiBackpack className="text-lg" />
              </span>
              <motion.span
                className="absolute left-16 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0.6, 1, 1],
                  opacity: [0, 1, 1, 0],
                  x: [0, 80, 140],
                  backgroundColor: ['#fbbf24', '#facc15', '#34d399'],
                }}
                transition={{ duration: 1.8, ease: 'easeInOut', times: [0, 0.35, 0.9, 1] }}
              />
              <motion.span
                className="absolute right-0 top-1/2 -translate-y-1/2 text-emerald-300"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 0, 1], scale: [0.8, 0.9, 1] }}
                transition={{ delay: 0.85, duration: 0.6, ease: 'easeOut' }}
              >
                <FiCheckCircle className="text-xl" />
              </motion.span>
            </motion.div>
            {event.typeLabel || event.rarity ? (
              <motion.div
                className="mt-4 flex items-center justify-between text-[0.65rem] uppercase tracking-[0.3em] text-slate-300"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3, ease: 'easeOut' }}
              >
                <span>{event.typeLabel || 'Objeto'}</span>
                <span className="text-emerald-300">{event.rarity || 'Inventario'}</span>
              </motion.div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

PurchaseAnimation.propTypes = {
  event: PropTypes.shape({
    key: PropTypes.string.isRequired,
    itemName: PropTypes.string,
    typeLabel: PropTypes.string,
    rarity: PropTypes.string,
    playerName: PropTypes.string,
  }),
};

PurchaseAnimation.defaultProps = {
  event: null,
};

export default PurchaseAnimation;
