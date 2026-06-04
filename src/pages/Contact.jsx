import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, MessageCircle, Send, CheckCircle, Clock, Facebook, Twitter, Instagram } from 'lucide-react';

const CONTACT_METHODS = [
  { icon: Mail, title: 'Email Us', value: 'hello@opfin.ug', sub: 'We reply within 24 hours', href: 'mailto:hello@opfin.ug', color: 'bg-blue-50 text-[#0D1BFF]' },
  { icon: Phone, title: 'Call or WhatsApp', value: '+256 700 000 000', sub: 'Mon–Fri, 8am – 6pm EAT', href: 'tel:+256700000000', color: 'bg-sky-50 text-[#32B4FF]' },
  { icon: MapPin, title: 'Visit Us', value: 'Plot 12, Nakasero Road', sub: 'Kampala, Uganda', href: '#', color: 'bg-emerald-50 text-[#00C48C]' },
];

const FAQS = [
  { q: 'How do I apply for a loan?', a: 'Download OpFin, complete your profile and KYC, then tap "Apply for Loan." Approval takes as little as 10 minutes.' },
  { q: 'Is my money safe with OpFin?', a: 'Yes. We use bank-level encryption and are regulated by the Financial Services Authority of Uganda (FSAU).' },
  { q: 'What are the repayment terms?', a: 'Flexible weekly or monthly installments with no hidden fees. You choose what works for your income cycle.' },
  { q: 'Can I save in a group?', a: 'Absolutely! Create or join a savings group with friends, family, or your market community right from the app.' },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F2F5F9] font-poppins">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <Link to="/landing">
          <span className="text-2xl font-black text-[#0D1BFF] tracking-tight">Op<span className="text-[#32B4FF]">Fin</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/about" className="text-[#0D1BFF] text-sm font-medium hidden sm:block hover:underline">About</Link>
          <Link to="/" className="bg-[#0D1BFF] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#0a15cc] transition-colors">
            Open App
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1A1D29] to-[#0D1BFF] text-white px-5 pt-14 pb-20 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#32B4FF]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#00C48C]/15 rounded-full blur-2xl" />
        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#32B4FF]/20 border border-[#32B4FF]/30 rounded-full px-4 py-1.5 mb-5">
            <MessageCircle className="w-3.5 h-3.5 text-[#32B4FF]" />
            <span className="text-[#32B4FF] text-xs font-semibold uppercase tracking-wider">Get in Touch</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight mb-4 font-poppins">
            We're Here to<br />
            <span className="text-[#00C48C]">Support You</span>
          </h1>
          <p className="text-blue-100 text-base leading-relaxed max-w-md mx-auto">
            Have a question, a problem, or just want to say hello? Our friendly team is ready to help you get the most out of OpFin.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="px-5 py-10 -mt-6">
        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CONTACT_METHODS.map(m => {
            const Icon = m.icon;
            return (
              <a key={m.title} href={m.href} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow block">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 ${m.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-800 text-sm mb-0.5 font-poppins">{m.title}</h3>
                <p className="text-[#0D1BFF] text-sm font-semibold">{m.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
              </a>
            );
          })}
        </div>
      </section>

      {/* Contact Form + FAQ */}
      <section className="px-5 py-8">
        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* Form */}
          <div>
            <p className="text-xs font-bold text-[#32B4FF] uppercase tracking-widest mb-2">Drop us a message</p>
            <h2 className="text-xl font-extrabold text-[#0D1BFF] mb-5 font-poppins">Send a Message</h2>

            {submitted ? (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
                <CheckCircle className="w-12 h-12 text-[#00C48C] mx-auto mb-3" />
                <h3 className="font-bold text-[#0D1BFF] text-lg mb-1">Message received!</h3>
                <p className="text-gray-600 text-sm">Thanks {form.name}! We'll get back to you within 24 hours.</p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', message: '' }); }}
                  className="mt-4 text-[#0D1BFF] text-sm font-semibold underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Sarah Nakato"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1BFF]/30 focus:border-[#0D1BFF] bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1BFF]/30 focus:border-[#0D1BFF] bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+256 7XX XXX XXX"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1BFF]/30 focus:border-[#0D1BFF] bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Message *</label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Tell us how we can help you..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0D1BFF]/30 focus:border-[#0D1BFF] bg-white resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0D1BFF] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-[#0a15cc] transition-colors disabled:opacity-60"
                >
                  {loading ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Social Links */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-gray-500 mb-3">Follow us</p>
              <div className="flex gap-3">
                {[
                  { icon: Facebook, label: 'Facebook', href: '#', color: 'bg-blue-50 text-blue-600' },
                  { icon: Twitter, label: 'Twitter/X', href: '#', color: 'bg-sky-50 text-sky-500' },
                  { icon: Instagram, label: 'Instagram', href: '#', color: 'bg-pink-50 text-pink-500' },
                  { icon: MessageCircle, label: 'WhatsApp', href: 'https://wa.me/256700000000', color: 'bg-emerald-50 text-[#00C48C]' },
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <a key={s.label} href={s.href} title={s.label}
                      className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center hover:opacity-80 transition-opacity`}>
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div>
            <p className="text-xs font-bold text-[#32B4FF] uppercase tracking-widest mb-2">Quick answers</p>
            <h2 className="text-xl font-extrabold text-[#0D1BFF] mb-5 font-poppins">Common Questions</h2>
            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <h4 className="font-bold text-gray-800 text-sm mb-1.5 font-poppins">{faq.q}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>

            {/* Business Hours */}
            <div className="mt-5 bg-[#0D1BFF]/5 border border-[#0D1BFF]/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[#0D1BFF]" />
                <h4 className="font-bold text-[#0D1BFF] text-sm">Support Hours</h4>
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Monday – Friday</span>
                  <span className="font-semibold">8:00am – 6:00pm EAT</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span className="font-semibold">9:00am – 1:00pm EAT</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span className="text-gray-400">Closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A1D29] text-blue-300 px-5 py-8 mt-10">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <div className="text-xl font-black text-white mb-2 tracking-tight">Op<span className="text-[#32B4FF]">Fin</span></div>
            <p className="text-xs opacity-50">© 2026 OpFin Technologies Ltd.</p>
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