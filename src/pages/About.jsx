import { Link } from 'react-router-dom';
import { Heart, Target, Users, Shield, TrendingUp, Globe, ChevronRight, CheckCircle } from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/6a0ed744d2266f7b5226f8a2/5220bc5cd_Pipiya_Master_Logo.png';

const VALUES = [
  { icon: Heart, title: 'Community First', desc: 'We build for the everyday hustler — not the elite. Every feature is designed with real Ugandan lives in mind.' },
  { icon: Shield, title: 'Trustworthy & Safe', desc: 'Bank-level encryption, FSAU compliance, and full transparency. Your money and data are always protected.' },
  { icon: Target, title: 'Growth-Driven', desc: 'We measure our success by your growth. When you save more, earn more, or repay on time — we celebrate with you.' },
  { icon: Globe, title: 'Built for East Africa', desc: 'Designed specifically for mobile-first markets in Uganda and the wider East African region.' },
];

const TEAM = [
  { name: 'Sarah Nakato', role: 'Co-Founder & CEO', desc: 'Former microfinance officer with 10+ years serving women entrepreneurs in Kampala markets.' },
  { name: 'James Okello', role: 'Co-Founder & CTO', desc: 'Software engineer who previously built mobile money infrastructure for 3 million users across East Africa.' },
  { name: 'Fatuma Hassan', role: 'Head of Community', desc: 'Community organizer and financial literacy advocate who has trained 5,000+ women on digital finance.' },
];

const MILESTONES = [
  { year: '2021', event: 'Pipiya is founded with a mission to serve Uganda\'s underserved earners' },
  { year: '2022', event: 'Launch of savings pockets and first 10,000 active users' },
  { year: '2023', event: 'Micro-loan product launched — UGX 500M disbursed in first year' },
  { year: '2024', event: 'Expansion to group savings, P2P lending and insurance products' },
  { year: '2025', event: '50,000+ active users across Uganda and East Africa' },
  { year: '2026', event: 'AI-powered budget coaching and auto-invest launched' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] font-poppins">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <Link to="/landing">
          <img src={LOGO_URL} alt="Pipiya" className="h-10 object-contain" />
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/contact" className="text-[#006B3C] text-sm font-medium hidden sm:block hover:underline">Contact</Link>
          <Link to="/" className="bg-[#006B3C] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#005530] transition-colors">
            Open App
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#006B3C] via-[#007a44] to-[#005530] text-white px-5 pt-14 pb-20 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-[#7BC943]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-[#F4B400]/15 rounded-full blur-2xl" />
        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#7BC943]/20 border border-[#7BC943]/30 rounded-full px-4 py-1.5 mb-5">
            <span className="text-[#7BC943] text-xs font-semibold uppercase tracking-wider">Our Story</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight mb-5 font-poppins">
            Built for the Hustlers<br />
            <span className="text-[#F4B400]">Who Build Uganda</span>
          </h1>
          <p className="text-green-100 text-base leading-relaxed max-w-xl mx-auto">
            Pipiya was born from a simple belief: that every person with a hustle deserves access to real financial tools — not just the privileged few.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-5 py-14 bg-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-bold text-[#7BC943] uppercase tracking-widest mb-2">Who We Are</p>
          <h2 className="text-2xl font-extrabold text-[#006B3C] mb-6 font-poppins">A financial companion, not a bank</h2>
          <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed space-y-4">
            <p>
              Pipiya is a friendly, growth-driven financial support platform built specifically for youth, women entrepreneurs, market vendors, and everyday earners across Uganda and East Africa. We believe that financial empowerment should not be a luxury — it should be as accessible as a mobile phone.
            </p>
            <p>
              We are not a traditional bank. We are your financial companion — a platform that meets you where you are, speaks your language, and grows alongside you. Whether you're a boda-boda rider saving for a new motorcycle, a market vendor building stock for your stall, a teacher setting aside school fees for your children, or a young graduate starting their first business, Pipiya has tools designed exactly for your life.
            </p>
            <p>
              Our platform offers savings pockets with automated goals, peer-to-peer lending, micro-insurance from as little as UGX 500 per day, AI-powered budget tracking through receipt scanning, group savings pools for communities, and credit score-based loans disbursed directly to your mobile wallet. Everything works on your phone, in minutes, without paperwork.
            </p>
            <p>
              Since our founding in 2021, we have helped over 50,000 Ugandans save smarter, borrow responsibly, and protect what matters most. We have disbursed over UGX 2 billion in loans and mobilised over UGX 800 million in community savings. But beyond the numbers, we have helped real people hit real milestones — paying school fees on time, opening a business, surviving a medical emergency, and building genuine wealth from the ground up.
            </p>
            <p>
              Pipiya is built and operated by a team of Ugandans who understand the market, the challenges, and the incredible resilience of everyday earners. We are FSAU-regulated, transparent in our pricing, and deeply committed to the communities we serve.
            </p>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="px-5 py-14 bg-[#F8F9FA]">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-bold text-[#7BC943] uppercase tracking-widest mb-2">What drives us</p>
          <h2 className="text-2xl font-extrabold text-[#006B3C] mb-8 font-poppins">Our Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {VALUES.map(v => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="w-11 h-11 bg-green-50 rounded-2xl flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-[#006B3C]" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1 font-poppins">{v.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="px-5 py-14 bg-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-bold text-[#7BC943] uppercase tracking-widest mb-2">Our journey</p>
          <h2 className="text-2xl font-extrabold text-[#006B3C] mb-8 font-poppins">How We Got Here</h2>
          <div className="space-y-0">
            {MILESTONES.map((m, i) => (
              <div key={m.year} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[#006B3C] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {m.year.slice(2)}
                  </div>
                  {i < MILESTONES.length - 1 && (
                    <div className="w-0.5 h-8 bg-green-100 my-1" />
                  )}
                </div>
                <div className="pb-6">
                  <p className="text-xs font-bold text-[#7BC943] mb-0.5">{m.year}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{m.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="px-5 py-14 bg-[#F8F9FA]">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-bold text-[#7BC943] uppercase tracking-widest mb-2">The people behind Pipiya</p>
          <h2 className="text-2xl font-extrabold text-[#006B3C] mb-8 font-poppins">Our Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TEAM.map(member => (
              <div key={member.name} className="bg-white rounded-2xl p-5 text-center border border-gray-100 shadow-sm">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#006B3C] to-[#7BC943] text-white flex items-center justify-center text-xl font-bold mx-auto mb-3">
                  {member.name[0]}
                </div>
                <h3 className="font-bold text-gray-800 text-sm font-poppins">{member.name}</h3>
                <p className="text-xs text-[#006B3C] font-semibold mb-2">{member.role}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{member.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#006B3C] to-[#005530] text-white px-5 py-16">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-extrabold mb-3 font-poppins">Join the Pipiya community</h2>
          <p className="text-green-200 mb-6 text-sm">50,000+ hustlers are already growing with Pipiya. It's your turn.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-[#F4B400] text-[#006B3C] font-bold py-4 px-8 rounded-2xl text-base shadow-xl hover:bg-yellow-400 transition-colors">
            Get Started Free <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#004d2b] text-green-300 px-5 py-8">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <img src={LOGO_URL} alt="Pipiya" className="h-8 object-contain mb-2" style={{ filter: 'brightness(0) invert(1)' }} />
            <p className="text-xs opacity-50">© 2026 Pipiya Technologies Ltd.</p>
          </div>
          <div className="flex gap-5 text-xs">
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
            <Link to="/landing" className="hover:text-white">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}