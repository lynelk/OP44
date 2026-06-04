import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Database, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function DeleteAccount() {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const logoutTimer = useRef(null);

  useEffect(() => () => { if (logoutTimer.current) clearTimeout(logoutTimer.current); }, []);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') {
      toast.error('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      // Create account deletion request
      await base44.functions.invoke('requestAccountDeletion', {});
      
      toast.success('Account deletion request submitted');
      setDeleted(true);
      
      // Logout after 3 seconds — ref ensures only one timer is ever queued
      logoutTimer.current = setTimeout(() => {
        base44.auth.logout('/');
      }, 3000);
    } catch (error) {
      toast.error('Failed to process deletion request');
    } finally {
      setIsDeleting(false);
    }
  };

  if (deleted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md text-center shadow-sm">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Deletion Request Submitted
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your account deletion request has been received. All your data will be permanently deleted within 30 days.
          </p>
          <p className="text-sm text-gray-500">
            You will be logged out automatically...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white px-5 pt-12 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-6 h-6" />
          <h1 className="text-xl font-bold">Delete Account</h1>
        </div>
        <p className="text-red-100 text-sm">This action is permanent and cannot be undone</p>
      </div>

      <div className="px-4 pt-6 space-y-5 max-w-2xl mx-auto">
        {/* Warning Card */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
                Before You Delete
              </h2>
              <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                <li>• All your data will be permanently deleted</li>
                <li>• Active loans and savings will be affected</li>
                <li>• This action cannot be undone</li>
                <li>• You'll lose access to all features immediately</li>
              </ul>
            </div>
          </div>
        </div>

        {/* What Gets Deleted */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" /> What Will Be Deleted
          </h2>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-red-500" />
              <span>Personal profile and KYC information</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-red-500" />
              <span>Active and historical loan applications</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-red-500" />
              <span>Savings pockets and goals</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-red-500" />
              <span>Investment portfolios</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-red-500" />
              <span>Insurance policies</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-red-500" />
              <span>Transaction history</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-red-500" />
              <span>All uploaded documents</span>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                Important: Outstanding Obligations
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                If you have active loans, savings, or investments, please contact support before deleting your account. 
                All outstanding balances must be settled before account deletion can be completed.
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
            Confirm Deletion
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Type <strong>"DELETE MY ACCOUNT"</strong> in the box below to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE MY ACCOUNT"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
          />
          <Button
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== 'DELETE MY ACCOUNT'}
            className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            {isDeleting ? 'Processing...' : 'Permanently Delete Account'}
          </Button>
        </div>

        {/* Alternative */}
        <div className="text-center">
          <Link to="/profile" className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
            Instead, update your profile settings
          </Link>
        </div>
      </div>
    </div>
  );
}