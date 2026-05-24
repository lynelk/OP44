import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ChevronLeft, RefreshCw, Wallet, TrendingUp, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const ACCOUNT_ICONS = {
  MTN_Float: '📱',
  Airtel_Float: '📱',
  Escrow: '🔒',
  Reserve_Fund: '🏦',
  Operating_Account: '💼',
};

export default function AdminAccountBalances() {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fundingAmount, setFundingAmount] = useState('');
  const [fundingProvider, setFundingProvider] = useState('MTN');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [fundingLoading, setFundingLoading] = useState(false);

  const loadBalances = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('accountBalanceManager', {
      action: 'get_all_balances',
    });
    setBalances(res.data.accounts || []);
    setLoading(false);
  };

  useEffect(() => {
    loadBalances();
  }, []);

  const handleSync = async (provider) => {
    const res = await base44.functions.invoke('accountBalanceManager', {
      action: 'sync_mobile_money',
      provider,
    });
    toast.success(`${provider} balance synced`);
    loadBalances();
  };

  const handleFundFloat = async () => {
    if (!fundingAmount || !recipientNumber) {
      toast.error('Please fill in all fields');
      return;
    }

    setFundingLoading(true);
    try {
      const res = await base44.functions.invoke('accountBalanceManager', {
        action: 'fund_float',
        provider: fundingProvider,
        amount: parseFloat(fundingAmount),
        recipient_number: recipientNumber,
      });
      toast.success(`Funded ${fundingProvider} float with UGX ${parseFloat(fundingAmount).toLocaleString()}`);
      setFundingAmount('');
      setRecipientNumber('');
      loadBalances();
    } catch (error) {
      toast.error('Funding failed: ' + error.message);
    }
    setFundingLoading(false);
  };

  const totalBalance = balances.reduce((sum, b) => sum + (b.balance || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Admin
        </Link>
        <h1 className="text-xl font-bold">Account Balances</h1>
        <p className="text-blue-200 text-xs mt-0.5">MTN, Airtel, Escrow & float management</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Total Balance */}
        <Card className="bg-gradient-to-r from-[#006B3C] to-[#004d2b] text-white">
          <CardContent className="p-4">
            <p className="text-green-200 text-xs mb-1">Total Platform Balance</p>
            <p className="text-2xl font-bold">UGX {(totalBalance / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>

        {/* Account Balances */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Account Balances</p>
            <Button variant="outline" size="sm" onClick={loadBalances} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {balances.map((account) => (
            <Card key={account.account_name}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{ACCOUNT_ICONS[account.account_name] || '💰'}</div>
                    <div>
                      <p className="font-semibold text-sm">{account.account_name.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-400">
                        {account.last_synced_at ? `Updated: ${new Date(account.last_synced_at).toLocaleString()}` : 'Never updated'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#006B3C]">UGX {(account.balance || 0).toLocaleString()}</p>
                    {(account.account_name === 'MTN_Float' || account.account_name === 'Airtel_Float') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 text-xs"
                        onClick={() => handleSync(account.account_name.includes('MTN') ? 'MTN' : 'Airtel')}
                      >
                        Sync
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Fund Float */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-4 h-4 text-[#006B3C]" />
              <p className="font-semibold text-sm">Fund Mobile Money Float</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Provider</label>
                <select
                  value={fundingProvider}
                  onChange={e => setFundingProvider(e.target.value)}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                >
                  <option value="MTN">MTN</option>
                  <option value="Airtel">Airtel</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount (UGX)</label>
                <Input
                  type="number"
                  value={fundingAmount}
                  onChange={e => setFundingAmount(e.target.value)}
                  placeholder="100000"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Recipient Number</label>
              <Input
                type="tel"
                value={recipientNumber}
                onChange={e => setRecipientNumber(e.target.value)}
                placeholder="256700000000"
              />
            </div>
            <Button
              className="w-full bg-[#006B3C] text-white"
              onClick={handleFundFloat}
              disabled={fundingLoading}
            >
              {fundingLoading ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Processing...</> : 'Fund Float Account'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}