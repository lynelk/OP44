import { Link } from 'react-router-dom';
import { TrendingUp, Shield, PiggyBank, Zap, Users, BarChart2, ChevronRight, Star, CheckCircle } from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/6a0ed744d2266f7b5226f8a2/89362eefa_OpFin_73x.png';

const FEATURES = [
  { icon: PiggyBank, title: 'Smart Savings', desc: 'Automated pockets, streaks & challenges to build your savings habit', color: 'bg-emerald-100 text-emerald-700' },
  { icon: TrendingUp, title: 'Auto-Invest', desc: 'Risk-profiled portfolios that automatically allocate your surplus', color: 'bg-blue-100 text-blue-700' },
  { icon: Shield, title: 'Micro-Insurance', desc: 'Affordable life, health & asset protection from UGX 500/day', color: 'bg-purple-100 text-purple-700' },
  { icon: Zap, title: 'Instant Loans', desc: 'Credit score-based loans disbursed in minutes to your wallet', color: 'bg-orange-100 text-orange-700' },
  { icon: BarChart2, title: 'Budget AI', desc: 'Snap receipts to track expenses — AI extracts & categorizes automatically', color: 'bg-pink-100 text-pink-700' },
  { icon: Users, title: 'Group Savings', desc: 'Save collectively with friends, family or community groups', color: 'bg-teal-100 text-teal-700' },
];

const STATS = [
  { label: 'Active Users', value: '50K+' },
  { label: 'Loans Disbursed', value: 'UGX 2B+' },
  { label: 'Savings Mobilised', value: 'UGX 800M+' },
  { label: 'Avg. Return', value: '14%' },
];

const TESTIMONIALS = [
  { name: 'Aisha N.', role: 'Trader, Kampala', text: 'OpFin helped me save UGX 1.2M in 3 months just by setting a pocket and forgetting about it.', stars: 5 },
  { name: 'David K.', role: 'Bodaboda Rider', text: 'I got a loan in 10 minutes and paid it back through small weekly deductions. Life changing.', stars: 5 },
  { name: 'Grace M.', role: 'Teacher, Entebbe', text: 'The receipt scanner is magic — I finally know where my money goes every month.', stars: 5 },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100 sticky top-0 z-30">
        <img src={LOGO_URL} alt="OpFin" className="h-8 object-contain" />
        <Link to="/" className="bg-[#1a3a6b] text-white text-sm font-semibold px-5 py-2 rounded-full">
          Open App
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#0d2247] via-[#1a3a6b] to-[#0e4d92] text-white px-5 pt-14 pb-20 overflow-hidden">
        {/* Background circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#f97316]/20 rounded-full" />

        <div className="relative max-w-md mx-auto text-center">
          <img src={LOGO_URL} alt="OpFin" className="h-20 object-contain mx-auto mb-6 invert brightness-0 invert" />
          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            Your money,<br />
            <span className="text-[#f97316]">working smarter.</span>
          </h1>
          <p className="text-blue-200 text-base leading-relaxed mb-8">
            Save, invest, borrow and protect — all from one app built for everyday Ugandans.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/" className="bg-[#f97316] text-white font-bold py-4 px-8 rounded-2xl text-base flex items-center justify-center gap-2 shadow-xl shadow-orange-900/30">
              Get Started Free <ChevronRight className="w-5 h-5" />
            </Link>
            <a href="#features" className="text-blue-200 text-sm underline underline-offset-2">
              See how it works ↓
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#0d2247] text-white px-5 py-8">
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {STATS.map(stat => (
            <div key={stat.label} className="bg-white/10 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-[#f97316]">{stat.value}</p>
              <p className="text-blue-300 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-5 py-12 bg-gray-50">
        <div className="max-w-md mx-auto">
          <p className="text-xs font-bold text-[#f97316] uppercase tracking-widest mb-2">Everything you need</p>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-8">One app. Full financial freedom.</h2>
          <div className="grid grid-cols-1 gap-4">
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-2xl p-4 flex items-start gap-4 shadow-sm">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${f.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{f.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-12 bg-white">
        <div className="max-w-md mx-auto">
          <p className="text-xs font-bold text-[#f97316] uppercase tracking-widest mb-2">Simple as 1-2-3</p>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-8">Start in minutes</h2>
          {[
            { step: '01', title: 'Create your account', desc: 'Sign up with your phone number and verify your identity with a national ID.' },
            { step: '02', title: 'Set your goals', desc: 'Choose a savings target, set a risk profile for investing, or apply for a loan.' },
            { step: '03', title: 'Watch your money grow', desc: 'Automated savings, AI-optimised investments and real-time budget tracking.' },
          ].map(item => (
            <div key={item.step} className="flex gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#1a3a6b] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-bold text-gray-800">{item.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-5 py-12 bg-gray-50">
        <div className="max-w-md mx-auto">
          <p className="text-xs font-bold text-[#f97316] uppercase tracking-widest mb-2">Real stories</p>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-8">Trusted by thousands</h2>
          <div className="space-y-4">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex gap-0.5 mb-3">
                  {Array(t.stars).fill(0).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-3">"{t.text}"</p>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#1a3a6b] to-[#0e4d92] text-white px-5 py-16">
        <div className="max-w-md mx-auto text-center">
          <img src={LOGO_URL} alt="OpFin" className="h-12 object-contain mx-auto mb-5 invert brightness-0 invert" />
          <h2 className="text-3xl font-extrabold mb-3">Ready to take control?</h2>
          <p className="text-blue-200 mb-8 text-sm">Join 50,000+ Ugandans already building wealth with OpFin</p>
          <div className="space-y-3">
            <Link to="/" className="block bg-[#f97316] text-white font-bold py-4 px-8 rounded-2xl text-base shadow-xl">
              Start for Free →
            </Link>
            <div className="flex items-center justify-center gap-2 text-blue-300 text-xs">
              <CheckCircle className="w-3 h-3" /> No monthly fees
              <CheckCircle className="w-3 h-3 ml-2" /> Bank-level security
              <CheckCircle className="w-3 h-3 ml-2" /> FSAU regulated
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0d2247] text-blue-300 px-5 py-8">
        <div className="max-w-md mx-auto">
          <img src={LOGO_URL} alt="OpFin" className="h-7 object-contain mb-4 invert brightness-0 invert opacity-60" />
          <p className="text-xs leading-relaxed mb-4">OpFin is a financial technology platform registered in Uganda, providing savings, investment, credit and insurance services to underserved communities.</p>
          <div className="flex gap-4 text-xs">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Use</a>
            <a href="#" className="hover:text-white">Contact Us</a>
          </div>
          <p className="text-xs mt-4 opacity-40">© 2026 OpFin Technologies Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}