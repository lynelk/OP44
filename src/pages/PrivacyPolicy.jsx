import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Mail, Phone } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Who We Are',
    body: `OpFin Technologies Ltd ("OpFin", "we", "our", "us") is a financial technology company registered in Uganda (Registration No. TBD), regulated by the Financial Services Authority of Uganda (FSAU). Our registered address is Kampala, Uganda. Contact: privacy@opfin.ug.`,
  },
  {
    title: '2. Data We Collect',
    body: `We collect the following categories of personal data:
• Identity data: full name, date of birth, gender, national ID number, photograph
• Contact data: phone number, email address, physical address, district
• Financial data: income, employment status, bank account details, mobile money account, transaction history, credit score
• Device data: device ID, IP address, operating system, app version
• Usage data: features used, loan applications, savings activity, login timestamps
• KYC/AML data: identity documents, verification results, risk assessments
• Communications: support tickets, in-app messages`,
  },
  {
    title: '3. Why We Process Your Data (Legal Basis)',
    body: `We process your data under the following legal bases:
• Contract: to provide loan, savings, insurance, and investment services you have requested
• Legal obligation: KYC/AML compliance, credit bureau reporting, regulatory requirements (Bank of Uganda, FSAU)
• Legitimate interests: fraud prevention, platform security, service improvement
• Consent: marketing communications, optional data sharing (you may withdraw consent at any time via Settings → Data & Consent)`,
  },
  {
    title: '4. How We Use Your Data',
    body: `Your data is used to:
• Verify your identity and assess creditworthiness
• Process loan applications, savings transactions, and insurance claims
• Generate your credit score and financial health reports
• Send account notifications, repayment reminders, and security alerts
• Improve our AI models and financial advice features (using anonymised/pseudonymised data)
• Comply with anti-money laundering (AML), counter-terrorism financing (CTF), and tax reporting obligations`,
  },
  {
    title: '5. Data Sharing',
    body: `We share your data only where necessary:
• Credit Reference Bureaus (CRB): with your consent, for creditworthiness assessment
• Mobile money providers (MTN, Airtel): to process disbursements and repayments
• Licensed insurance partners: to underwrite micro-insurance policies
• Regulatory authorities: Bank of Uganda, Uganda Revenue Authority, Financial Intelligence Authority — as required by law
• Cloud infrastructure providers: data is processed in ISO 27001-certified data centres
We never sell your personal data to third parties.`,
  },
  {
    title: '6. International Data Transfers',
    body: `Where we use cloud infrastructure or third-party processors located outside Uganda, we ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) or equivalent protections, consistent with Uganda's Data Protection and Privacy Act 2019.`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your data for as long as necessary to provide our services and comply with legal obligations:
• Active account data: retained for the duration of your account plus 7 years (financial regulatory requirement)
• KYC documents: retained for 5 years after account closure (AML regulations)
• Transaction records: retained for 7 years
• Marketing data: retained until consent is withdrawn
After retention periods expire, data is securely deleted or anonymised.`,
  },
  {
    title: '8. Your Rights',
    body: `Under the Uganda Data Protection and Privacy Act 2019, you have the right to:
• Access: request a copy of the personal data we hold about you
• Rectification: correct inaccurate or incomplete data
• Erasure: request deletion of your data (subject to regulatory retention obligations)
• Portability: receive your data in a structured, machine-readable format
• Restriction: limit how we process your data
• Objection: object to processing based on legitimate interests
• Withdraw consent: at any time for optional consents, via Settings → Data & Consent
To exercise any of these rights, contact privacy@pipiya.ug or use the Data Rights section in your Profile.`,
  },
  {
    title: '9. Security',
    body: `We implement technical and organisational measures aligned with ISO/IEC 27001 standards, including:
• AES-256 encryption for data at rest
• TLS 1.3 for all data in transit
• Role-based access controls and least-privilege principles
• Regular penetration testing and vulnerability assessments
• Multi-factor authentication for administrative access
• Incident response procedures with 72-hour breach notification`,
  },
  {
    title: '10. Cookies & Device Identifiers',
    body: `Our app uses device identifiers and local storage to maintain your session, remember preferences, and detect fraud. We do not use advertising tracking cookies. You can clear app data through your device settings at any time.`,
  },
  {
    title: '11. Children',
    body: `Our services are not directed to persons under the age of 18. We do not knowingly collect personal data from children. If we become aware that a child has provided us with personal data, we will delete it promptly.`,
  },
  {
    title: '12. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of material changes via in-app notification at least 14 days before changes take effect. Continued use of the app after the effective date constitutes acceptance of the updated policy.`,
  },
  {
    title: '13. Contact & Complaints',
    body: `Data Protection Officer: privacy@opfin.ug
General enquiries: hello@opfin.ug | +256 700 000 000
If you are unsatisfied with our response, you may lodge a complaint with the Personal Data Protection Office of Uganda (PDPO).`,
  },
];

export default function PrivacyPolicy() {
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
            <Shield className="w-3.5 h-3.5 text-[#00C48C]" />
            <span className="text-[#00C48C] text-xs font-semibold uppercase tracking-wider">ISO/IEC 27701 Compliant</span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight mb-3 font-poppins">Privacy Policy</h1>
          <p className="text-blue-100 text-sm">
            Last updated: 23 May 2026 — Version 2.0
          </p>
          <p className="text-blue-200 text-sm mt-2 leading-relaxed">
            OpFin is committed to protecting your personal data and respecting your privacy rights under the Uganda Data Protection and Privacy Act 2019 and international best practices.
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

        {/* Rights CTA */}
        <div className="bg-[#0D1BFF] rounded-2xl p-5 text-white">
          <h3 className="font-bold mb-2">Exercise Your Data Rights</h3>
          <p className="text-sm text-green-100 mb-4">Request data access, correction, or deletion directly through the app.</p>
          <Link to="/consent" className="inline-flex items-center gap-2 bg-[#00C48C] text-white font-bold py-2.5 px-5 rounded-xl text-sm hover:bg-[#00a878] transition-colors">
            Manage My Data & Consents
          </Link>
        </div>

        <div className="text-xs text-gray-400 border-t pt-6">
          <p>© 2026 OpFin Technologies Ltd. All rights reserved. Registered in Uganda.</p>
          <p className="mt-1">FSAU Regulated | ISO/IEC 27001 Certified Infrastructure | Uganda Data Protection and Privacy Act 2019 Compliant</p>
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