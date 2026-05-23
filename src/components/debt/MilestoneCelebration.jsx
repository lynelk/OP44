import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function MilestoneCelebration({ milestone, onDismiss }) {
  const fired = useRef(false);

  useEffect(() => {
    if (milestone && !fired.current) {
      fired.current = true;
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f97316', '#1a3a6b', '#22c55e', '#f59e0b', '#8b5cf6'],
      });
      const t = setTimeout(onDismiss, 5000);
      return () => clearTimeout(t);
    }
  }, [milestone]);

  return (
    <AnimatePresence>
      {milestone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={onDismiss}
        >
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-6xl mb-3"
            >
              {milestone.emoji}
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{milestone.title}</h2>
            <p className="text-gray-500 text-sm mb-4">{milestone.description}</p>
            {milestone.badge && (
              <div className="bg-gradient-to-r from-orange-100 to-yellow-100 border border-orange-200 rounded-2xl px-4 py-2 mb-4 inline-block">
                <p className="text-sm font-bold text-orange-700">{milestone.badge}</p>
              </div>
            )}
            <button onClick={onDismiss} className="w-full h-11 bg-[#1a3a6b] text-white font-bold rounded-2xl">
              Keep Going! 💪
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}