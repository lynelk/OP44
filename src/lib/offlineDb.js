import Dexie from 'dexie';

// OpFin offline database - mirrors all Base44 entities
export const db = new Dexie('OpFinOfflineDB');

db.version(1).stores({
  // Core user data
  UserProfile:        'id, user_id, account_type, kyc_status, updated_date',
  CreditScore:        'id, user_id, risk_band, calculated_at, updated_date',
  LoanApplication:    'id, user_id, status, updated_date',
  Repayment:          'id, loan_id, user_id, status, due_date, updated_date',
  SavingsPocket:      'id, user_id, status, updated_date',
  SavingsGoal:        'id, user_id, status, updated_date',
  GoalContribution:   'id, user_id, updated_date',
  InsurancePolicy:    'id, user_id, status, updated_date',
  InsuranceClaim:     'id, user_id, status, updated_date',
  Notification:       'id, user_id, is_read, type, updated_date',
  GamificationBadge:  'id, user_id, updated_date',
  LoyaltyReward:      'id, user_id, status, updated_date',
  KYCDocument:        'id, user_id, document_type, status, updated_date',
  Expense:            'id, user_id, updated_date',
  BudgetCategory:     'id, user_id, updated_date',
  UserAsset:          'id, user_id, updated_date',
  UserLiability:      'id, user_id, updated_date',
  FinancialHealthReport: 'id, user_id, updated_date',
  UserConsent:        'id, user_id, updated_date',
  CoachingNudge:      'id, user_id, updated_date',
  WellnessActivity:   'id, user_id, updated_date',
  UserSavingsChallenge: 'id, user_id, updated_date',
  ReferralEvent:      'id, user_id, updated_date',
  RiskProfile:        'id, user_id, updated_date',

  // P2P / Lending
  P2PLoan:            'id, borrower_id, status, updated_date',
  P2PRepayment:       'id, loan_id, updated_date',
  LenderInvestment:   'id, lender_id, loan_id, status, updated_date',

  // Device / Rental
  Device:             'id, lender_id, status, updated_date',
  RentalAgreement:    'id, device_id, borrower_id, lender_id, status, updated_date',
  RentalPaymentTransaction: 'id, rental_id, updated_date',
  GPSTracker:         'id, device_id, lender_id, updated_date',
  GPSAlert:           'id, device_id, lender_id, updated_date',
  Geofence:           'id, lender_id, device_id, updated_date',
  DeviceMaintenanceRequest: 'id, device_id, lender_id, status, updated_date',

  // Groups / Challenges
  SavingsGroup:       'id, updated_date',
  GroupMember:        'id, user_id, updated_date',
  GroupContribution:  'id, user_id, updated_date',
  GroupChallenge:     'id, updated_date',
  SavingsChallenge:   'id, updated_date',

  // Reference / config data
  LoanProduct:        'id, updated_date',
  InsuranceProduct:   'id, updated_date',
  BusinessRule:       'id, updated_date',
  P2PConfig:          'id, updated_date',
  BusinessProfile:    'id, updated_date',

  // Support / misc
  SupportTicket:      'id, user_id, status, updated_date',
  DisputeEvidence:    'id, updated_date',

  // Outbox for offline mutations
  _outbox:            '++id, entity, operation, synced_at, created_at',
  // Sync metadata
  _syncMeta:          'entity',
});

// v2: bank-feed import, P2P secondary market, notification preferences
db.version(2).stores({
  BankConnection:        'id, user_id, status, updated_date',
  BankTransaction:       'id, user_id, connection_id, external_id, imported, updated_date',
  SecondaryListing:      'id, seller_id, buyer_id, status, updated_date',
  NotificationPreference:'id, user_id, updated_date',
});

// Wipe all locally-cached data. Called on logout so PII/financial records
// don't persist for the next user on a shared device.
export async function clearAllData() {
  try {
    await Promise.all(db.tables.map((t) => t.clear()));
  } catch (e) {
    console.error('Failed to clear offline DB:', e);
  }
}

export default db;