import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * Unified milestone / savings-challenge celebration overlay.
 *
 * Accepts either prop shape used in the app:
 *   { emoji, title, description, badge }  — debt/challenge style
 *   { emoji, name, desc }                 — milestones style
 *
 * Dismiss via `onClose` or `onDismiss` (either is honoured).
 */
export default function MilestoneCelebration({ milestone, onClose, onDismiss }) {
  const fired = useRef(false);
  const dismiss = onClose || onDismiss || (() => {});

  useEffect(() => {
    if (milestone && !fired.current) {
      fired.current = true;
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f97316', '#1a3a6b', '#22c55e', '#f59e0b', '#8b5cf6'],
      });
      const t = setTimeout(dismiss, 5000);
      return () => clearTimeout(t);
    }
  }, [milestone]);

  // Normalise the two prop shapes into a single view model.
  const title       = milestone?.title || milestone?.name || '';
  const description = milestone?.description || milestone?.desc || '';
  const badge       = milestone?.badge || null;
  const emoji       = milestone?.emoji || '🏆';

  return (
    <AnimatePresence>
      {milestone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={dismiss}
          aria-modal="true"
          role="dialog"
          aria-label={`Milestone reached: ${title}`}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-3xl p-8 text-center shadow-2xl max-w-xs w-full"
            onClick={e => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-6xl mb-3"
              aria-hidden="true"
            >
              {emoji}
            </motion.div>

            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Milestone Reached!</span>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{title}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{description}</p>

            {badge && (
              <div className="bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/40 dark:to-yellow-900/40 border border-orange-200 dark:border-orange-700 rounded-2xl px-4 py-2 mb-4 inline-block">
                <p className="text-sm font-bold text-orange-700 dark:text-orange-300">{badge}</p>
              </div>
            )}

            <Button
              className="w-full bg-[#1a3a6b] hover:bg-[#1a3a6b]/90 text-white font-bold rounded-2xl"
              onClick={dismiss}
            >
              Keep Going! 💪
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
