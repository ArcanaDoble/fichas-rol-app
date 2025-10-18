import React from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { GiShoppingBag, GiBackpack } from 'react-icons/gi';
import { FiCheckCircle } from 'react-icons/fi';

const SHOP_CENTER_OFFSET = 28;
const INVENTORY_CENTER_OFFSET = 76;

const PurchaseAnimation = ({ event }) => {
  return (
    <AnimatePresence>
      {event ? (
        <motion.div
          key={event.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute inset-0"
        >
          <motion.span
            className="absolute left-1/2 -translate-x-1/2 rounded-full border border-amber-300/70 bg-amber-400/10"
            style={{ top: SHOP_CENTER_OFFSET, width: 44, height: 44 }}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: [0.75, 1, 1.1], opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.2, ease: 'easeOut', times: [0, 0.6, 1] }}
          />

          <motion.span
            className="absolute left-1/2 -translate-x-1/2 rounded-full border border-emerald-300/70 bg-emerald-400/5"
            style={{ top: INVENTORY_CENTER_OFFSET, width: 44, height: 44 }}
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ opacity: [0, 0, 1], scale: [0.75, 0.9, 1.1, 1] }}
            transition={{ duration: 1.4, ease: 'easeOut', times: [0, 0.55, 0.85, 1] }}
          />

          <motion.span
            className="absolute left-1/2 -translate-x-1/2 w-[6px] origin-top rounded-full bg-gradient-to-b from-amber-300 via-emerald-200 to-emerald-400"
            style={{ top: SHOP_CENTER_OFFSET, height: INVENTORY_CENTER_OFFSET - SHOP_CENTER_OFFSET }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.35, ease: 'easeOut' }}
          />

          <motion.span
            className="absolute left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(248,196,113,0.85)]"
            style={{ top: SHOP_CENTER_OFFSET }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{
              top: [
                SHOP_CENTER_OFFSET,
                (SHOP_CENTER_OFFSET + INVENTORY_CENTER_OFFSET) / 2,
                INVENTORY_CENTER_OFFSET,
              ],
              opacity: [0, 1, 1, 0],
              scale: [0.6, 1, 0.9],
              backgroundColor: ['#fbbf24', '#facc15', '#34d399'],
            }}
            transition={{ duration: 1.6, ease: 'easeInOut', times: [0, 0.5, 0.85, 1] }}
          />

          <motion.span
            className="absolute left-1/2 -translate-x-1/2 text-emerald-200"
            style={{ top: INVENTORY_CENTER_OFFSET }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0, 0, 1], scale: [0.85, 0.95, 1.05, 1] }}
            transition={{ delay: 0.75, duration: 0.6, ease: 'easeOut', times: [0, 0.4, 0.75, 1] }}
          >
            <FiCheckCircle className="text-lg" />
          </motion.span>

          <motion.div
            className="absolute left-[calc(100%+0.75rem)] top-1 w-44 rounded-xl border border-emerald-400/40 bg-slate-900/90 px-3 py-2 text-[0.7rem] text-emerald-50 shadow-[0_8px_24px_rgba(15,118,110,0.35)] backdrop-blur"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-amber-200">
                <GiShoppingBag className="text-sm" />
              </span>
              <div className="flex-1">
                <p className="text-[0.6rem] uppercase tracking-[0.3em] text-amber-200">Compra exitosa</p>
                <p className="font-semibold text-emerald-100">
                  {event.itemName || 'Objeto adquirido'}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[0.65rem] text-emerald-200">
                  <GiBackpack className="text-sm" />
                  Guardado para {event.playerName || 'tu héroe'}
                </p>
              </div>
            </div>
            {(event.typeLabel || event.rarity) && (
              <p className="mt-2 flex items-center justify-between text-[0.55rem] uppercase tracking-[0.25em] text-slate-300">
                <span>{event.typeLabel || 'Objeto'}</span>
                <span className="text-emerald-300">{event.rarity || 'Inventario'}</span>
              </p>
            )}
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
