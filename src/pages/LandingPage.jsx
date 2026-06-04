import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Shield, PiggyBank, Zap, Users, BarChart2, ChevronRight, Star, CheckCircle, Phone, Mail, MapPin } from 'lucide-react';

const LOGO_TEXT = 'OpFin';

const FEATURES = [
  { icon: PiggyBank, title: 'Smart Savings', desc: 'Automated pockets, streaks & challenges to build your savings habit', color: 'bg-blue-50 text-[#0D1BFF]' },
  { icon: TrendingUp, title: 'Auto-Invest', desc: 'Risk-profiled portfolios that automatically grow your surplus money', color: 'bg-sky-50 text-[#32B4FF]' },
  { icon: Shield, title: 'Micro-Insurance', desc: 'Affordable life, health & asset protection from UGX 500/day', color: 'bg-emerald-50 text-[#00C48C]' },
  { icon: Zap, title: 'Instant Loans', desc: 'Credit score-based loans disbursed in minutes to your wallet', color: 'bg-blue-50 text-[#0D1BFF]' },
  { icon: BarChart2, title: 'Budget AI', desc: 'Snap receipts to track expenses — AI extracts & categorizes automatically', color: 'bg-sky-50 text-[#32B4FF]' },
  { icon: Users, title: 'Group Savings', desc: 'Save collectively with friends, family or your market community', color: 'bg-emerald-50 text-[#00C48C]' },
];

const STATS = [
  { label: 'Active Members', value: '50K+' },
  { label: 'Loans Disbursed', value: 'UGX 2B+' },
  { label: 'Savings Mobilised', value: 'UGX 800M+' },
  { label: 'Avg. Return', value: '14%' },
];

const TESTIMONIALS = [
  { name: 'Aisha N.', role: 'Trader, Kampala', text: 'OpFin helped me save UGX 1.2M in 3 months just by setting a pocket and forgetting about it. It feels like it was made for people like me.', stars: 5 },
  { name: 'David K.', role: 'Bodaboda Rider', text: 'I got a loan in 10 minutes and paid it back through small weekly deductions. This changed everything for me and my family.', stars: 5 },
  { name: 'Grace M.', role: 'Teacher, Entebbe', text: 'The receipt scanner is magic — I finally know where my money goes every month. My savings have doubled since I started.', stars: 5 },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Create your account', desc: 'Sign up with your phone number and verify your identity with a national ID in minutes.' },
  { step: '02', title: 'Set your financial goals', desc: 'Choose a savings target, set a risk profile for investing, or apply for a business loan.' },
  { step: '03', title: 'Watch your money grow', desc: 'Automated savings, AI-optimised investments and real-time budget tracking work for you.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) navigate('/', { replace: true });
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F2F5F9] font-poppins">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <img src="https://media.base44.com/images/public/6a0ed744d2266f7b5226f8a2/aa93f20a2_OpFin_83x.png" alt="OpFin" className="h-9 w-auto" />
        <div className="flex items-center gap-3">
          <Link to="/about" className="text-[#0D1BFF] text-sm font-medium hidden sm:block hover:underline">About</Link>
          <Link to="/contact" className="text-[#0D1BFF] text-sm font-medium hidden sm:block hover:underline">Contact</Link>
          <Link to="/login" className="bg-[#0D1BFF] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#0a15cc] transition-colors">
            Open App
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-5 pt-14 pb-24 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-[#32B4FF]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-[#00C48C]/15 rounded-full blur-2xl" />

        <div className="relative max-w-md mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <img src="https://media.base44.com/images/public/6a0ed744d2266f7b5226f8a2/aa93f20a2_OpFin_83x.png" alt="OpFin" className="h-16 w-auto brightness-0 invert" />
          </div>
          <div className="inline-flex items-center gap-2 bg-[#32B4FF]/20 border border-[#32B4FF]/30 rounded-full px-4 py-1.5 mb-5">
            <span className="text-[#32B4FF] text-xs font-semibold uppercase tracking-wider">Smart Finance. Simple Solutions.</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight mb-4 font-poppins">
            Your Finance.<br />
            <span className="text-[#00C48C]">Simplified.</span><br />
            Your Growth.
          </h1>
          <p className="text-blue-100 text-base leading-relaxed mb-8">
            Fast and simple mobile financial solutions — savings, loans, insurance and more. Built for Uganda.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/register" className="bg-[#00C48C] text-white font-bold py-4 px-8 rounded-2xl text-base flex items-center justify-center gap-2 shadow-xl hover:bg-[#00a878] transition-colors">
              Get Started Free <ChevronRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="border border-white/30 text-white font-semibold py-3 px-8 rounded-2xl text-sm hover:bg-white/10 transition-colors">
              Sign In →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#0D1BFF] text-white px-5 py-8">
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {STATS.map(stat => (
            <div key={stat.label} className="bg-white/10 rounded-2xl p-4 text-center border border-white/10">
              <p className="text-2xl font-extrabold text-[#00C48C]">{stat.value}</p>
              <p className="text-blue-200 text-xs mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-14 bg-white">
        <div className="max-w-md mx-auto">
          <p className="text-xs font-bold text-[#32B4FF] uppercase tracking-widest mb-2">Simple as 1-2-3</p>
          <h2 className="text-2xl font-extrabold text-[#0D1BFF] mb-2 font-poppins">Start in minutes</h2>
          <p className="text-gray-500 text-sm mb-8">No complicated forms. No long queues. Just your phone and your goals.</p>
          {HOW_IT_WORKS.map((item, i) => (
            <div key={item.step} className={`flex gap-4 mb-6 ${i < HOW_IT_WORKS.length - 1 ? 'pb-6 border-b border-gray-100' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-[#0D1BFF] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-bold text-gray-800 font-poppins">{item.title}</p>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-5 py-14 bg-[#F2F5F9]">
        <div className="max-w-md mx-auto">
          <p className="text-xs font-bold text-[#32B4FF] uppercase tracking-widest mb-2">Everything you need</p>
          <h2 className="text-2xl font-extrabold text-[#0D1BFF] mb-2 font-poppins">One app. Full financial freedom.</h2>
          <p className="text-gray-500 text-sm mb-8">Built for traders, teachers, riders, vendors — every kind of earner.</p>
          <div className="grid grid-cols-1 gap-4">
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-2xl p-4 flex items-start gap-4 shadow-sm border border-gray-50 hover:shadow-md transition-shadow">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${f.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 font-poppins">{f.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-5 py-14 bg-white">
        <div className="max-w-md mx-auto">
          <p className="text-xs font-bold text-[#32B4FF] uppercase tracking-widest mb-2">Real stories</p>
          <h2 className="text-2xl font-extrabold text-[#0D1BFF] mb-2 font-poppins">Stories from Real Users</h2>
          <p className="text-gray-500 text-sm mb-8">Trusted by thousands of everyday earners across Uganda.</p>
          <div className="space-y-4">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-[#F2F5F9] rounded-2xl p-5 border border-gray-100">
                <div className="flex gap-0.5 mb-3">
                  {Array(t.stars).fill(0).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-[#00C48C] fill-[#00C48C]" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-3">"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#0D1BFF] text-white flex items-center justify-center text-xs font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simple Repayment */}
      <section className="px-5 py-14 bg-[#0D1BFF] text-white">
        <div className="max-w-md mx-auto text-center">
          <p className="text-xs font-bold text-[#32B4FF] uppercase tracking-widest mb-2">Stress-free repayment</p>
          <h2 className="text-2xl font-extrabold mb-3 font-poppins">Simple Repayment</h2>
          <p className="text-blue-100 text-sm leading-relaxed mb-8">
            Pay back at your own pace with flexible weekly or monthly installments. No hidden charges, no surprises. Just transparent, fair repayments designed around your income cycle.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {['Flexible terms', 'No hidden fees', 'Mobile payments'].map(item => (
              <div key={item} className="bg-white/10 rounded-2xl p-3 border border-white/10">
                <CheckCircle className="w-5 h-5 text-[#00C48C] mx-auto mb-1" />
                <p className="text-xs text-blue-100 text-center font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#32B4FF] to-[#0D1BFF] px-5 py-16">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-3 font-poppins">Ready to take control of your finances?</h2>
          <p className="text-blue-100 mb-8 text-sm">Join 50,000+ Ugandans already building wealth with OpFin</p>
          <div className="space-y-3">
            <Link to="/register" className="block bg-white text-[#0D1BFF] font-bold py-4 px-8 rounded-2xl text-base shadow-xl hover:bg-blue-50 transition-colors">
              Get Started with OpFin →
            </Link>
            <div className="flex items-center justify-center gap-4 text-white/70 text-xs">
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> No monthly fees</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Bank-level security</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> FSAU regulated</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A1D29] text-blue-300 px-5 py-10">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <img src="https://media.base44.com/images/public/6a0ed744d2266f7b5226f8a2/aa93f20a2_OpFin_83x.png" alt="OpFin" className="h-9 w-auto brightness-0 invert" />
          </div>
          <p className="text-xs leading-relaxed mb-5 text-blue-200">
            OpFin is a financial technology platform registered in Uganda, providing savings, investment, credit and insurance services to youth, women entrepreneurs, market vendors, and everyday earners across East Africa.
          </p>
          <div className="flex flex-wrap gap-4 text-xs mb-5">
            <Link to="/about" className="hover:text-white transition-colors">About OpFin</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
            <Link to="/accessibility" className="hover:text-white transition-colors">Accessibility</Link>
          </div>
          <div className="flex items-center gap-4 text-xs text-blue-400 mb-4">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> +256 700 000 000</span>
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> hello@opfin.ug</span>
          </div>
          <p className="text-xs mt-2 opacity-40">© 2026 OpFin Technologies Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}