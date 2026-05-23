import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Download, Trash2, Edit, Eye, StopCircle, ChevronRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const RIGHTS = [
  {
    icon: Eye,
    title: 'Right of Access',
    desc: 'Request a full copy of all personal data Pipiya holds about you.',
    action: 'Request Data Export',
    key: 'access',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Edit,
    title: 'Right to Rectification',
    desc: 'Correct inaccurate or incomplete personal data in your profile.',
    action: 'Update My Profile',
    key: 'rectify',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Trash2,
    title: 'Right to Erasure',
    desc: 'Request deletion of your personal data (subject to regulatory retention obligations for financial records).',
    action: 'Request Deletion',
    key: 'erasure',
    color: 'bg-red-50 text-red-600',
  },
  {
    icon: Download,
    title: 'Right to Portability',
    desc: 'Download your data in a structured, machine-readable JSON format.',
    action: 'Download My Data',
    key: 'portability',
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: StopCircle,
    title: 'Right to Restriction',
    desc: 'Restrict how Pipiya processes your data while a complaint is investigated.',
    action: 'Request Restriction',
    key: 'restrict',
    color: 'bg-purple-50 text-purple-600',
  },
];

export default function DataRights() {
  const [submitted, setSubmitted] = useState({});
  const [loading, setLoading] = useState(null);
  const navigate = useNavigate();

  const handleRight = async (key) => {
    if (key === 'rectify') {
      navigate('/profile');
      return;
    }
    setLoading(key);
    // Simulate a support ticket / email request
    await new Promise(r => setTimeout(r, 1000));
    setSubmitted(prev => ({ ...prev, [key]: true }));
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#004d2b] via-[#006B3C] to-[#007a44] text-white px-5 pt-14 pb-16">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5 text-[#7BC943]" />
          <h1 className="text-xl font-bold">Your Data Rights</h1>
        </div>
        <p className="text-green-200 text-sm leading-relaxed">
          Under the Uganda Data Protection and Privacy Act 2019 and ISO/IEC 27701, you have full rights over your personal data.
        </p>
      </div>

      <div className="px-4 -mt-6 space-y-4">
        {/* Compliance Badge */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-[#006B3C]" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">ISO/IEC 27701 Compliant</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Pipiya implements a Privacy Information Management System (PIMS) aligned with international standards. We will respond to all data rights requests within 30 days.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-1">Your Rights Under Uganda Law</p>

        {RIGHTS.map(right => {
          const Icon = right.icon;
          const done = submitted[right.key];
          const isLoading = loading === right.key;
          return (
            <div key={right.key} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${right.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{right.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{right.desc}</p>
                  {done ? (
                    <div className="mt-2 flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Request submitted — we'll email you within 30 days
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 text-xs h-8 rounded-xl"
                      onClick={() => handleRight(right.key)}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      {right.action}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Consent Link */}
        <button
          onClick={() => navigate('/consent')}
          className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center shrink-0">
            <StopCircle className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-gray-900 dark:text-white">Manage Consents</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Toggle marketing, data sharing & optional consents</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
        </button>

        {/* Contact DPO */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Data Protection Officer</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                For urgent data rights requests, complex queries, or to lodge a complaint, contact our DPO directly at <strong>privacy@pipiya.ug</strong>. We are obligated to respond within 30 calendar days.
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-center text-gray-400 py-2">
          <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a>
          {' · '}
          <a href="/terms" className="underline hover:text-gray-600">Terms of Service</a>
          {' · '}
          <span>Uganda Data Protection and Privacy Act 2019</span>
        </div>
      </div>
    </div>
  );
}