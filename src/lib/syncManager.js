import { db } from './offlineDb';
import { base44 } from '@/api/base44Client';

// All entities to sync, with optional user-scoped filter field
const SYNC_ENTITIES = [
  // User-scoped (only fetch records for current user)
  { name: 'UserProfile',        userField: 'user_id' },
  { name: 'CreditScore',        userField: 'user_id' },
  { name: 'LoanApplication',    userField: 'user_id' },
  { name: 'Repayment',          userField: 'user_id' },
  { name: 'SavingsPocket',      userField: 'user_id' },
  { name: 'SavingsGoal',        userField: 'user_id' },
  { name: 'GoalContribution',   userField: 'user_id' },
  { name: 'InsurancePolicy',    userField: 'user_id' },
  { name: 'InsuranceClaim',     userField: 'user_id' },
  { name: 'Notification',       userField: 'user_id' },
  { name: 'GamificationBadge',  userField: 'user_id' },
  { name: 'LoyaltyReward',      userField: 'user_id' },
  { name: 'KYCDocument',        userField: 'user_id' },
  { name: 'Expense',            userField: 'user_id' },
  { name: 'BudgetCategory',     userField: 'user_id' },
  { name: 'UserAsset',          userField: 'user_id' },
  { name: 'UserLiability',      userField: 'user_id' },
  { name: 'FinancialHealthReport', userField: 'user_id' },
  { name: 'UserConsent',        userField: 'user_id' },
  { name: 'CoachingNudge',      userField: 'user_id' },
  { name: 'WellnessActivity',   userField: 'user_id' },
  { name: 'UserSavingsChallenge', userField: 'user_id' },
  { name: 'ReferralEvent',      userField: 'user_id' },
  { name: 'RiskProfile',        userField: 'user_id' },
  { name: 'SupportTicket',      userField: 'user_id' },
  // Lender-scoped
  { name: 'Device',             userField: 'lender_id' },
  { name: 'GPSTracker',         userField: 'lender_id' },
  { name: 'GPSAlert',           userField: 'lender_id' },
  { name: 'Geofence',           userField: 'lender_id' },
  { name: 'DeviceMaintenanceRequest', userField: 'lender_id' },
  { name: 'LenderInvestment',   userField: 'lender_id' },
  // Borrower-scoped P2P
  { name: 'P2PLoan',            userField: 'borrower_id' },
  { name: 'P2PRepayment',       userField: null },
  { name: 'RentalAgreement',    userField: 'borrower_id' },
  { name: 'RentalPaymentTransaction', userField: null },
  // Group membership
  { name: 'GroupMember',        userField: 'user_id' },
  { name: 'GroupContribution',  userField: 'user_id' },
  // Reference data (global, no user filter)
  { name: 'LoanProduct',        userField: null },
  { name: 'InsuranceProduct',   userField: null },
  { name: 'BusinessRule',       userField: null },
  { name: 'P2PConfig',          userField: null },
  { name: 'SavingsGroup',       userField: null },
  { name: 'SavingsChallenge',   userField: null },
  { name: 'GroupChallenge',     userField: null },
];

let _userId = null;
let _syncing = false;
let _listeners = [];
let _listenersRegistered = false;

export const syncManager = {
  // Subscribe to sync state changes
  subscribe(fn) {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(l => l !== fn); };
  },

  _emit(state) {
    _listeners.forEach(fn => fn(state));
  },

  async init(userId) {
    _userId = userId;
    // Guard: only register window listeners once to prevent accumulation
    if (!_listenersRegistered) {
      _listenersRegistered = true;
      window.addEventListener('online', () => syncManager.syncAll());
      window.addEventListener('offline', () => syncManager._emit({ status: 'offline' }));
    }
    if (navigator.onLine) await this.syncAll();
    else this._emit({ status: 'offline' });
  },

  async syncAll() {
    if (_syncing || !_userId) return;
    _syncing = true;
    this._emit({ status: 'syncing' });

    try {
      // 1. Push outbox (offline mutations) first
      await this._pushOutbox();

      // 2. Pull fresh data for all entities
      await this._pullAll();

      this._emit({ status: 'synced', lastSynced: new Date() });
    } catch (err) {
      console.warn('[SyncManager] sync error:', err);
      this._emit({ status: 'error', error: err.message });
    } finally {
      _syncing = false;
    }
  },

  async _pullAll() {
    // Pull in batches to avoid overloading
    const BATCH_SIZE = 5;
    for (let i = 0; i < SYNC_ENTITIES.length; i += BATCH_SIZE) {
      const batch = SYNC_ENTITIES.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(e => this._pullEntity(e)));
    }
  },

  async _pullEntity({ name, userField }) {
    const entityClient = base44.entities[name];
    if (!entityClient) return;

    const meta = await db._syncMeta.get(name);
    const lastSync = meta?.last_synced_at;

    // Build filter: user-scoped + delta (only records updated since last sync)
    const filter = {};
    if (userField && _userId) filter[userField] = _userId;
    if (lastSync) filter['updated_date'] = { $gte: lastSync };

    const records = lastSync
      ? await entityClient.filter(filter, '-updated_date', 200)
      : await entityClient.filter(userField && _userId ? { [userField]: _userId } : {}, '-updated_date', 500);

    if (records.length > 0) {
      // "Online always wins" - just bulkPut, server data overwrites local
      await db[name].bulkPut(records);
    }

    await db._syncMeta.put({ entity: name, last_synced_at: new Date().toISOString() });
  },

  async _pushOutbox() {
    const pending = await db._outbox.where('synced_at').equals('').toArray();
    for (const item of pending) {
      const entityClient = base44.entities[item.entity];
      if (!entityClient) continue;
      try {
        if (item.operation === 'create') {
          await entityClient.create(item.data);
        } else if (item.operation === 'update') {
          await entityClient.update(item.record_id, item.data);
        } else if (item.operation === 'delete') {
          await entityClient.delete(item.record_id);
        }
        await db._outbox.update(item.id, { synced_at: new Date().toISOString() });
      } catch (err) {
        console.warn(`[SyncManager] outbox push failed for ${item.entity}:`, err);
      }
    }
    // Clean up synced items older than 7 days
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await db._outbox.where('synced_at').below(cutoff).delete();
  },

  // Queue a mutation for offline sync
  async queueMutation(entity, operation, data, record_id = null) {
    await db._outbox.add({
      entity,
      operation,
      data,
      record_id,
      synced_at: '',
      created_at: new Date().toISOString(),
    });
  },
};

export default syncManager;