import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function MilestoneCelebration({ milestone, onClose }) {
  useEffect(() => {
    // Confetti burst
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#f59e0b', '#fbbf24', '#10b981', '#3b82f6'],
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-4xl">{milestone.emoji}</span>
        </div>

        <div className="flex items-center justify-center gap-1 mb-1">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Milestone Reached!</span>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-1">{milestone.name}</h2>
        <p className="text-slate-500 text-sm mb-4">{milestone.desc}</p>

        <div className="bg-amber-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-amber-700">🏆 Badge awarded: <strong>{milestone.name}</strong></p>
          <p className="text-xs text-amber-600 mt-0.5">+50 OpFin Points earned</p>
        </div>

        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white" onClick={onClose}>
          Awesome! Keep Going 🚀
        </Button>
      </div>
    </div>
  );
}