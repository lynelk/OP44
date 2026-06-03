import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, PiggyBank, TrendingUp, Target, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'pipiya_onboarded_v1';

const STEPS = [
  { icon: Target, title: 'Welcome to Pipiya 👋', body: 'Your all-in-one money app — loans, savings, credit health and more. Here’s a quick 30-second tour.', cta: 'Show me around' },
  { icon: CreditCard, title: 'Borrow in minutes', body: 'Check what you qualify for and apply for a loan right from your phone — no paperwork queues.', cta: 'Next', route: '/loans/pre-qualify', routeLabel: 'See my loan offers' },
  { icon: PiggyBank, title: 'Save with a goal', body: 'Create savings pockets, set goals, or join a savings circle to save together with others.', cta: 'Next', route: '/savings', routeLabel: 'Start saving' },
  { icon: TrendingUp, title: 'Grow your credit score', body: 'Track your score, see what moves it, and unlock bigger limits as you build a track record.', cta: 'Get started', route: '/credit-score', routeLabel: 'View my score' },
];

// First-run guided tour. Shows once per device, gated by localStorage.
// Renders nothing for returning users.
export default function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch { /* storage unavailable */ }
  }, []);

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  if (!open) return null;
  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  const next = () => (isLast ? finish() : setStep(step + 1));
  const goRoute = () => { finish(); if (s.route) navigate(s.route); };

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-xl"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
          <div className="bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-6 pt-6 pb-8 relative">
            <button onClick={finish} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-3">
              <Icon className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">{s.title}</h2>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{s.body}</p>

            {/* Progress dots */}
            <div className="flex gap-1.5 mt-5">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-[#0D1BFF] dark:bg-[#32B4FF]' : 'w-1.5 bg-gray-200 dark:bg-gray-700'}`} />
              ))}
            </div>

            <div className="flex flex-col gap-2 mt-5">
              <button onClick={next} className="w-full h-11 bg-[#0D1BFF] text-white font-semibold rounded-xl flex items-center justify-center gap-1.5">
                {s.cta} <ArrowRight className="w-4 h-4" />
              </button>
              {s.route && (
                <button onClick={goRoute} className="w-full h-11 text-[#0D1BFF] dark:text-[#32B4FF] font-semibold rounded-xl border border-[#0D1BFF]/30 dark:border-[#32B4FF]/30">
                  {s.routeLabel}
                </button>
              )}
              {!isLast && (
                <button onClick={finish} className="w-full h-9 text-gray-400 text-sm font-medium">Skip tour</button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
