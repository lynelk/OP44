import { Link } from 'react-router-dom';
import { TrendingUp, Shield, PiggyBank, Zap, Users, BarChart2, ChevronRight, Star, CheckCircle, Phone, Mail, MapPin } from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/6a0ed744d2266f7b5226f8a2/5220bc5cd_Pipiya_Master_Logo.png';

const FEATURES = [
  { icon: PiggyBank, title: 'Smart Savings', desc: 'Automated pockets, streaks & challenges to build your savings habit', color: 'bg-green-50 text-[#006B3C]' },
  { icon: TrendingUp, title: 'Auto-Invest', desc: 'Risk-profiled portfolios that automatically grow your surplus money', color: 'bg-emerald-50 text-[#7BC943]' },
  { icon: Shield, title: 'Micro-Insurance', desc: 'Affordable life, health & asset protection from UGX 500/day', color: 'bg-yellow-50 text-[#F4B400]' },
  { icon: Zap, title: 'Instant Loans', desc: 'Credit score-based loans disbursed in minutes to your wallet', color: 'bg-green-50 text-[#006B3C]' },
  { icon: BarChart2, title: 'Budget AI', desc: 'Snap receipts to track expenses — AI extracts & categorizes automatically', color: 'bg-lime-50 text-[#7BC943]' },
  { icon: Users, title: 'Group Savings', desc: 'Save collectively with friends, family or your market community', color: 'bg-yellow-50 text-[#F4B400]' },
];

const STATS = [
  { label: 'Active Members', value: '50K+' },
  { label: 'Loans Disbursed', value: 'UGX 2B+' },
  { label: 'Savings Mobilised', value: 'UGX 800M+' },
  { label: 'Avg. Return', value: '14%' },
];

const TESTIMONIALS = [
  { name: 'Aisha N.', role: 'Trader, Kampala', text: 'Pipiya helped me save UGX 1.2M in 3 months just by setting a pocket and forgetting about it. It feels like it was made for people like me.', stars: 5 },
  { name: 'David K.', role: 'Bodaboda Rider', text: 'I got a loan in 10 minutes and paid it back through small weekly deductions. This changed everything for me and my family.', stars: 5 },
  { name: 'Grace M.', role: 'Teacher, Entebbe', text: 'The receipt scanner is magic — I finally know where my money goes every month. My savings have doubled since I started.', stars: 5 },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Create your account', desc: 'Sign up with your phone number and verify your identity with a national ID in minutes.' },
  { step: '02', title: 'Set your hustle goals', desc: 'Choose a savings target, set a risk profile for investing, or apply for a business loan.' },
  { step: '03', title: 'Watch your money grow', desc: 'Automated savings, AI-optimised investments and real-time budget tracking work for you.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] font-poppins">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <img src={LOGO_URL} alt="Pipiya" className="h-10 object-contain" />
        <div className="flex items-center gap-3">
          <Link to="/about" className="text-[#006B3C] text-sm font-medium hidden sm:block hover:underline">About</Link>
          <Link to="/contact" className="text-[#006B3C] text-sm font-medium hidden sm:block hover:underline">Contact</Link>
          <Link to="/" className="bg-[#006B3C] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#005530] transition-colors">
            Open App
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#006B3C] via-[#007a44] to-[#005530] text-white px-5 pt-14 pb-24 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-[#7BC943]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-[#F4B400]/15 rounded-full blur-2xl" />
        {/* Decorative dots like logo */}
        <div className="absolute top-8 right-8 flex gap-1.5">
          <div className="w-2 h-3 bg-[#F4B400] rounded-full rotate-12 opacity-80" />
          <div className="w-1.5 h-2.5 bg-[#7BC943] rounded-full rotate-6 opacity-70" />
          <div className="w-1.5 h-2 bg-[#7BC943] rounded-full opacity-60" />
        </div>

        <div className="relative max-w-md mx-auto text-center">
          <img src={LOGO_URL} alt="Pipiya" className="h-20 object-contain mx-auto mb-6 drop-shadow-lg" style={{ filter: 'brightness(0) invert(1)' }} />
          <div className="inline-flex items-center gap-2 bg-[#7BC943]/20 border border-[#7BC943]/30 rounded-full px-4 py-1.5 mb-5">
            <span className="text-[#7BC943] text-xs font-semibold uppercase tracking-wider">Support for Every Hustle</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight mb-4 font-poppins">
            Your Hustle.<br />
            <span className="text-[#F4B400]">Our Support.</span><br />
            Your Growth.
          </h1>
          <p className="text-green-100 text-base leading-relaxed mb-8">
            Fast and simple mobile financial support built for everyday life — savings, loans, insurance and more.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/" className="bg-[#F4B400] text-[#006B3C] font-bold py-4 px-8 rounded-2xl text-base flex items-center justify-center gap-2 shadow-xl shadow-yellow-900/20 hover:bg-yellow-400 transition-colors">
              Get Started Free <ChevronRight className="w-5 h-5" />
            </Link>
            <Link to="/" className="border border-white/30 text-white font-semibold py-3 px-8 rounded-2xl text-sm hover:bg-white/10 transition-colors">
              Apply in Minutes →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#006B3C] text-white px-5 py-8">
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {STATS.map(stat => (
            <div key={stat.label} className="bg-white/10 rounded-2xl p-4 text-center border border-white/10">
              <p className="text-2xl font-extrabold text-[#F4B400]">{stat.value}</p>
              <p className="text-green-200 text-xs mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-14 bg-white">
        <div className="max-w-md mx-auto">
          <p className="text-xs font-bold text-[#7BC943] uppercase tracking-widest mb-2">Simple as 1-2-3</p>
          <h2 className="text-2xl font-extrabold text-[#006B3C] mb-2 font-poppins">Start in minutes</h2>
          <p className="text-gray-500 text-sm mb-8">No complicated forms. No long queues. Just your phone and your hustle.</p>
          {HOW_IT_WORKS.map((item, i) => (
            <div key={item.step} className={`flex gap-4 mb-6 ${i < HOW_IT_WORKS.length - 1 ? 'pb-6 border-b border-gray-100' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-[#006B3C] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
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
      <section id="features" className="px-5 py-14 bg-[#F8F9FA]">
        <div className="max-w-md mx-auto">
          <p className="text-xs font-bold text-[#7BC943] uppercase tracking-widest mb-2">Everything you need</p>
          <h2 className="text-2xl font-extrabold text-[#006B3C] mb-2 font-poppins">One app. Full financial freedom.</h2>
          <p className="text-gray-500 text-sm mb-8">Built for traders, teachers, riders, vendors — every kind of hustler.</p>
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
          <p className="text-xs font-bold text-[#7BC943] uppercase tracking-widest mb-2">Real stories</p>
          <h2 className="text-2xl font-extrabold text-[#006B3C] mb-2 font-poppins">Stories from Real Hustlers</h2>
          <p className="text-gray-500 text-sm mb-8">Trusted by thousands of everyday earners across Uganda.</p>
          <div className="space-y-4">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-[#F8F9FA] rounded-2xl p-5 border border-gray-100">
                <div className="flex gap-0.5 mb-3">
                  {Array(t.stars).fill(0).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-[#F4B400] fill-[#F4B400]" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-3">"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#006B3C] text-white flex items-center justify-center text-xs font-bold">
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
      <section className="px-5 py-14 bg-[#006B3C] text-white">
        <div className="max-w-md mx-auto text-center">
          <p className="text-xs font-bold text-[#7BC943] uppercase tracking-widest mb-2">Stress-free repayment</p>
          <h2 className="text-2xl font-extrabold mb-3 font-poppins">Simple Repayment</h2>
          <p className="text-green-100 text-sm leading-relaxed mb-8">
            Pay back at your own pace with flexible weekly or monthly installments. No hidden charges, no surprises. Just transparent, fair repayments designed around your income cycle.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {['Flexible terms', 'No hidden fees', 'Mobile payments'].map(item => (
              <div key={item} className="bg-white/10 rounded-2xl p-3 border border-white/10">
                <CheckCircle className="w-5 h-5 text-[#7BC943] mx-auto mb-1" />
                <p className="text-xs text-green-100 text-center font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#F4B400] to-[#e6a800] px-5 py-16">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-[#006B3C] mb-3 font-poppins">Ready to grow your hustle?</h2>
          <p className="text-[#006B3C]/70 mb-8 text-sm">Join 50,000+ Ugandans already building wealth with Pipiya</p>
          <div className="space-y-3">
            <Link to="/" className="block bg-[#006B3C] text-white font-bold py-4 px-8 rounded-2xl text-base shadow-xl hover:bg-[#005530] transition-colors">
              Download Pipiya Free →
            </Link>
            <div className="flex items-center justify-center gap-4 text-[#006B3C]/60 text-xs">
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> No monthly fees</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Bank-level security</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> FSAU regulated</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#004d2b] text-green-300 px-5 py-10">
        <div className="max-w-md mx-auto">
          <img src={LOGO_URL} alt="Pipiya" className="h-10 object-contain mb-4" style={{ filter: 'brightness(0) invert(1)' }} />
          <p className="text-xs leading-relaxed mb-5 text-green-200">
            Pipiya is a friendly financial technology platform registered in Uganda, providing savings, investment, credit and insurance services to youth, women entrepreneurs, market vendors, and everyday earners across East Africa.
          </p>
          <div className="flex flex-wrap gap-4 text-xs mb-5">
            <Link to="/about" className="hover:text-white transition-colors">About Pipiya</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
            <Link to="/accessibility" className="hover:text-white transition-colors">Accessibility</Link>
          </div>
          <div className="flex items-center gap-4 text-xs text-green-400 mb-4">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> +256 700 000 000</span>
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> hello@pipiya.ug</span>
          </div>
          <p className="text-xs mt-2 opacity-40">© 2026 Pipiya Technologies Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}