import { Link } from 'react-router-dom';
import { Accessibility } from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/6a0ed744d2266f7b5226f8a2/5220bc5cd_Pipiya_Master_Logo.png';

export default function AccessibilityStatement() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] font-poppins">
      <nav className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <Link to="/landing">
          <img src={LOGO_URL} alt="Pipiya" className="h-10 object-contain" />
        </Link>
        <Link to="/" className="bg-[#006B3C] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#005530] transition-colors">
          Open App
        </Link>
      </nav>

      <section className="bg-gradient-to-br from-[#006B3C] to-[#005530] text-white px-5 pt-14 pb-16">
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-5">
            <Accessibility className="w-3.5 h-3.5 text-[#7BC943]" />
            <span className="text-[#7BC943] text-xs font-semibold uppercase tracking-wider">WCAG 2.1 AA Target</span>
          </div>
          <h1 className="text-3xl font-extrabold mb-3">Accessibility Statement</h1>
          <p className="text-green-100 text-sm">Last updated: 23 May 2026</p>
        </div>
      </section>

      <main className="max-w-2xl mx-auto px-5 py-10 space-y-8" id="main-content">
        <section>
          <h2 className="text-base font-bold text-[#006B3C] mb-2">Our Commitment</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Pipiya Technologies Ltd is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant accessibility standards to achieve this goal.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#006B3C] mb-2">Conformance Status</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            We are working toward <strong>WCAG 2.1 Level AA</strong> conformance. The app is partially conformant, meaning some parts may not fully meet all accessibility standards. We are actively addressing known issues.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#006B3C] mb-2">Technical Specifications</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">Pipiya relies on the following technologies for conformance:</p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc ml-5">
            <li>HTML5 semantic elements (nav, main, section, header, footer)</li>
            <li>ARIA landmark roles and labels</li>
            <li>React with accessible component patterns</li>
            <li>Minimum 4.5:1 colour contrast ratio for normal text</li>
            <li>Touch target sizes of at least 44×44 CSS pixels</li>
            <li>Focus-visible indicators on all interactive elements</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#006B3C] mb-2">Known Limitations</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">The following areas are under active improvement:</p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc ml-5">
            <li>Some chart components may lack sufficient text alternatives for screen readers</li>
            <li>Complex financial tables may not be fully keyboard navigable in all browsers</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#006B3C] mb-2">Platform Support</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            The app is tested and supported on iOS 15+ (Safari), Android 8+ (Chrome), and modern web browsers. We support TalkBack (Android) and VoiceOver (iOS) screen readers for core user journeys.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#006B3C] mb-2">Feedback & Contact</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            We welcome feedback on the accessibility of Pipiya. If you experience accessibility barriers, please contact us:
          </p>
          <div className="mt-3 bg-green-50 rounded-xl p-4 text-sm">
            <p><strong>Email:</strong> <a href="mailto:accessibility@pipiya.ug" className="text-[#006B3C] underline">accessibility@pipiya.ug</a></p>
            <p className="mt-1"><strong>Phone:</strong> +256 700 000 000</p>
            <p className="mt-1">We aim to respond within 5 business days.</p>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-[#006B3C] mb-2">Enforcement</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            If you are not satisfied with our response, you may contact the relevant national accessibility enforcement body or human rights commission in Uganda.
          </p>
        </section>

        <div className="text-xs text-gray-400 border-t pt-6">
          <p>© 2026 Pipiya Technologies Ltd. Apple App Store, Google Play, and Huawei AppGallery compliant.</p>
        </div>
      </main>

      <footer className="bg-[#004d2b] text-green-300 px-5 py-8">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <img src={LOGO_URL} alt="Pipiya" className="h-8 object-contain mb-2" style={{ filter: 'brightness(0) invert(1)' }} />
            <p className="text-xs opacity-50">© 2026 Pipiya Technologies Ltd.</p>
          </div>
          <div className="flex gap-5 text-xs">
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms of Use</Link>
            <Link to="/accessibility" className="hover:text-white">Accessibility</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}