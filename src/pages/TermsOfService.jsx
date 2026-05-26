import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By downloading, installing, or using the OpFin application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the App. These Terms form a legally binding agreement between you and OpFin Technologies Ltd.`,
  },
  {
    title: '2. Eligibility',
    body: `To use OpFin, you must:
• Be at least 18 years of age
• Be a resident of Uganda or an eligible East African country
• Provide accurate, current, and complete registration information
• Not be prohibited from receiving financial services under applicable laws
• Have a valid phone number capable of receiving SMS verification`,
  },
  {
    title: '3. Services Provided',
    body: `OpFin provides the following financial services through its licensed and regulated platform:
• Savings pockets and automated goal-based savings
• Peer-to-peer (P2P) micro-lending
• Micro-insurance products (life, health, asset)
• Budget tracking and expense management
• AI-powered financial coaching and credit scoring
• Group savings pools (ROSCAs and savings groups)
• Investment products through licensed investment managers

All financial products are subject to separate product terms, interest rates, and fee schedules disclosed at the point of application.`,
  },
  {
    title: '4. Account Registration & KYC',
    body: `You must complete identity verification (KYC) before accessing credit, insurance, or P2P lending features. You agree to:
• Submit accurate and genuine identity documents
• Update your information if it changes materially
• Not create multiple accounts or impersonate another person
• Notify us immediately if your account is compromised

We reserve the right to suspend or terminate accounts where fraudulent information is detected.`,
  },
  {
    title: '5. Financial Terms',
    body: `Loan terms:
• Interest rates are disclosed before acceptance — rates range from 3% to 8% per month depending on your risk profile
• Late payment fees: 2% of outstanding balance per week after a 3-day grace period
• Early repayment is permitted with no penalty
• Default may result in credit bureau reporting and debt recovery proceedings

Savings terms:
• Savings pockets are not insured by the Uganda Deposit Protection Fund (UDPF) unless otherwise stated
• Interest rates on savings are indicative and may vary

All fees are disclosed transparently in the app before you confirm any transaction.`,
  },
  {
    title: '6. Prohibited Uses',
    body: `You may not use Pipiya to:
• Engage in money laundering, terrorist financing, or other illegal financial activities
• Submit false or misleading information
• Attempt to hack, reverse-engineer, or disrupt the platform
• Use the platform on behalf of sanctioned individuals or entities
• Conduct transactions that violate Uganda's AML/CTF legislation`,
  },
  {
    title: '7. Intellectual Property',
    body: `All content, software, logos, designs, and features of the OpFin App are owned by OpFin Technologies Ltd and protected under Ugandan and international intellectual property laws. You may not copy, modify, distribute, or create derivative works without written permission.`,
  },
  {
    title: '8. Data & Privacy',
    body: `Your use of Pipiya is subject to our Privacy Policy (available at pipiya.ug/privacy), which forms part of these Terms. We process your data in accordance with the Uganda Data Protection and Privacy Act 2019 and ISO/IEC 27701 standards.`,
  },
  {
    title: '9. Service Availability',
    body: `We aim to maintain 99.5% uptime but do not guarantee uninterrupted service. We are not liable for losses arising from planned maintenance, technical failures, force majeure events, or third-party service disruptions (e.g., mobile money gateway outages). We will provide advance notice of planned downtime where possible.`,
  },
  {
    title: '10. Limitation of Liability',
    body: `To the maximum extent permitted by Ugandan law, OpFin's total liability to you for any claim shall not exceed the amount you paid to OpFin in fees in the 3 months preceding the claim. We are not liable for indirect, consequential, or punitive damages. Nothing in these Terms limits liability for fraud, gross negligence, or death/personal injury caused by our negligence.`,
  },
  {
    title: '11. Dispute Resolution',
    body: `Disputes should first be raised through our support channel at support@opfin.ug. If unresolved within 30 days, disputes shall be referred to mediation under the Uganda Arbitration Centre rules. If mediation fails, disputes shall be resolved in the courts of Uganda under Ugandan law.`,
  },
  {
    title: '12. Termination',
    body: `You may close your account at any time via Profile → Delete Account, subject to settling any outstanding obligations. We may suspend or terminate your account with notice if you breach these Terms or if required by law or regulatory direction. Upon termination, we retain data as required by our Privacy Policy and applicable regulations.`,
  },
  {
    title: '13. Changes to Terms',
    body: `We may amend these Terms with 14 days' notice via in-app notification. Continued use after the effective date constitutes acceptance. If you disagree with changes, you may close your account before the effective date.`,
  },
  {
    title: '14. Governing Law',
    body: `These Terms are governed by the laws of Uganda. Our financial services are regulated by the Financial Services Authority of Uganda (FSAU). We comply with the Microfinance Institutions Act, the AML/CFT Act, and all applicable financial sector regulations.`,
  },
  {
    title: '15. Contact',
    body: `Pipiya Technologies Ltd
Kampala, Uganda
legal@pipiya.ug | +256 700 000 000
Data Protection Officer: privacy@pipiya.ug`,
  },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#F2F5F9] font-poppins">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <Link to="/landing">
          <span className="text-2xl font-black text-[#0D1BFF] tracking-tight">Op<span className="text-[#32B4FF]">Fin</span></span>
        </Link>
        <Link to="/" className="bg-[#0D1BFF] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#0a15cc] transition-colors">
          Open App
        </Link>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-5 pt-14 pb-16 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-[#32B4FF]/20 rounded-full blur-3xl" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-5">
            <FileText className="w-3.5 h-3.5 text-[#00C48C]" />
            <span className="text-[#00C48C] text-xs font-semibold uppercase tracking-wider">Legal Agreement</span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight mb-3 font-poppins">Terms of Service</h1>
          <p className="text-blue-100 text-sm">Last updated: 23 May 2026 — Version 2.0</p>
          <p className="text-blue-200 text-sm mt-2 leading-relaxed">
            Please read these terms carefully before using OpFin. By using our app you agree to be bound by these terms.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-5 py-10 space-y-8" id="main-content">
        {SECTIONS.map(s => (
          <section key={s.title}>
            <h2 className="text-base font-bold text-[#0D1BFF] mb-2 font-poppins">{s.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</p>
          </section>
        ))}

        <div className="text-xs text-gray-400 border-t pt-6">
          <p>© 2026 OpFin Technologies Ltd. Registered in Uganda. FSAU Regulated.</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1A1D29] text-blue-300 px-5 py-8">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <div className="text-xl font-black text-white mb-2 tracking-tight">Op<span className="text-[#32B4FF]">Fin</span></div>
            <p className="text-xs opacity-50">© 2026 OpFin Technologies Ltd.</p>
          </div>
          <div className="flex gap-5 text-xs">
            <Link to="/terms" className="hover:text-white">Terms of Use</Link>
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}