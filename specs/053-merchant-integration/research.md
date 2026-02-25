# Research: Merchant Integration

**Feature**: 053-merchant-integration
**Date**: 2025-12-29

## Research Topics

### 1. PostGIS Proximity Queries in Supabase

**Decision**: Use PostGIS `ST_DWithin` with geography type for proximity-based wishlist brokering

**Rationale**:
- Supabase includes PostGIS extension by default
- `ST_DWithin` with geography type handles spherical distance calculations (accurate for km-based buckets)
- Efficient with spatial indexes (GiST) for query performance at scale
- Project already uses location data; extending to merchants is consistent

**Alternatives Considered**:
- **Haversine formula in application code**: Rejected - inefficient for large datasets, can't leverage database indexes
- **Google Maps Distance Matrix API**: Rejected - adds external dependency, per-query costs, latency
- **Simple bounding box**: Rejected - inaccurate at distance boundaries, especially at higher latitudes

**Implementation Pattern**:
```sql
-- Create spatial index on user locations
CREATE INDEX idx_user_location ON user_location_shares USING GIST (location);

-- Proximity query for wishlist brokering (5km bucket example)
SELECT user_id, ST_Distance(location, merchant_location) as distance_m
FROM user_location_shares
WHERE ST_DWithin(location, merchant_location, 5000)  -- meters
AND location_granularity IN ('city', 'neighborhood');
```

---

### 2. Merchant Role-Based Access Control

**Decision**: Extend existing Supabase Auth with custom claims and RLS policies for merchant role

**Rationale**:
- Supabase Auth already handles user authentication
- Custom claims in JWT allow role checking without additional database queries
- RLS policies provide database-level security for merchant data isolation
- Consistent with existing admin role pattern (if present)

**Alternatives Considered**:
- **Separate auth system for merchants**: Rejected - over-engineering, inconsistent UX
- **Role column in profiles table only**: Rejected - requires JOIN on every query, less secure
- **Third-party RBAC service**: Rejected - unnecessary complexity, external dependency

**Implementation Pattern**:
```sql
-- Add merchant role to profiles
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user'
  CHECK (role IN ('user', 'merchant', 'admin'));

-- RLS policy for merchant portal access
CREATE POLICY "Merchants can view own data" ON merchants
  FOR ALL USING (auth.uid() = user_id);

-- RLS policy for merchant loadouts
CREATE POLICY "Public can view published loadouts" ON merchant_loadouts
  FOR SELECT USING (status = 'published');

CREATE POLICY "Merchants can manage own loadouts" ON merchant_loadouts
  FOR ALL USING (merchant_id IN (
    SELECT id FROM merchants WHERE user_id = auth.uid()
  ));
```

---

### 3. Offer State Machine Pattern

**Decision**: Implement offer lifecycle using explicit status enum with state transition validation

**Rationale**:
- Clear state definitions prevent invalid transitions
- Enables analytics by state (pending → viewed → accepted/declined/expired)
- Database constraints ensure data integrity
- Matches constitution requirement for state machines in async flows

**Alternatives Considered**:
- **Boolean flags (is_accepted, is_declined)**: Rejected - allows invalid combinations, no transition history
- **Separate status columns**: Rejected - complex queries, potential inconsistency
- **Event sourcing**: Rejected - over-engineering for MVP scope

**State Transitions**:
```
pending → viewed → accepted → converted
       → viewed → declined
       → viewed → expired (auto, after 14 days)
       → expired (auto, if never viewed)
```

**Implementation Pattern**:
```typescript
// types/merchant-offer.ts
type OfferStatus = 'pending' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'converted';

const VALID_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  pending: ['viewed', 'expired'],
  viewed: ['accepted', 'declined', 'expired'],
  accepted: ['converted', 'expired'],
  declined: [],  // terminal
  expired: [],   // terminal
  converted: [], // terminal
};
```

---

### 4. Bundle Pricing Calculation

**Decision**: Calculate bundle pricing in real-time from individual items with merchant-defined discount percentage

**Rationale**:
- Flexibility: Merchants can adjust discount without re-entering all prices
- Accuracy: Always reflects current catalog prices
- Transparency: Users see both individual and bundle pricing
- Audit trail: Individual prices stored, discount stored, bundle calculated

**Alternatives Considered**:
- **Store bundle price directly**: Rejected - requires manual updates when items change, error-prone
- **Fixed discount tiers**: Rejected - too restrictive for merchant flexibility
- **Complex pricing rules engine**: Rejected - over-engineering for MVP

**Implementation Pattern**:
```typescript
// hooks/merchant/useMerchantLoadouts.ts
const calculateBundlePrice = (items: LoadoutItem[], discountPercent: number) => {
  const individualTotal = items.reduce((sum, item) =>
    sum + (item.price * item.quantity), 0);
  const discountAmount = individualTotal * (discountPercent / 100);
  return {
    individualTotal,
    discountPercent,
    discountAmount,
    bundlePrice: individualTotal - discountAmount,
  };
};
```

---

### 5. Conversion Attribution Window

**Decision**: 30-day attribution window from offer acceptance to purchase marking

**Rationale**:
- Industry standard for e-commerce attribution (similar to affiliate programs)
- Balances merchant expectation of credit with user purchase timeline for outdoor gear (considered purchases)
- Allows time for in-store pickup arrangement
- After 30 days, conversion possible but flagged for review

**Alternatives Considered**:
- **7-day window**: Rejected - too short for outdoor gear purchases (research-heavy)
- **90-day window**: Rejected - too long, unfair to later merchants who may influence purchase
- **No window (unlimited)**: Rejected - creates attribution disputes, gaming potential

**Implementation Pattern**:
```sql
-- Check attribution validity
SELECT * FROM conversions
WHERE offer_id = $1
AND conversion_date <= offer_accepted_at + INTERVAL '30 days';

-- Flag late conversions for review
UPDATE conversions
SET requires_review = true
WHERE conversion_date > offer_accepted_at + INTERVAL '30 days';
```

---

### 6. Notification Delivery Strategy

**Decision**: Use existing notification system with merchant-specific notification types

**Rationale**:
- Leverages existing infrastructure (no new dependencies)
- Consistent UX with other app notifications
- Supports in-app and email delivery (if configured)
- Rate limiting already in place

**Alternatives Considered**:
- **Separate notification service for merchants**: Rejected - inconsistent, duplicate infrastructure
- **Push notifications only**: Rejected - not all users have push enabled
- **Email-first approach**: Rejected - lower engagement, higher spam risk

**Notification Types to Add**:
```typescript
type MerchantNotificationType =
  | 'offer_received'        // User receives offer
  | 'offer_accepted'        // Merchant sees acceptance
  | 'offer_declined'        // Merchant sees decline
  | 'offer_expiring'        // User reminder (2 days before)
  | 'conversion_logged'     // Merchant sees conversion
  | 'merchant_approved'     // Merchant onboarding complete
  | 'merchant_rejected';    // Merchant application denied
```

---

### 7. Fraud Detection Patterns

**Decision**: Rule-based fraud detection with manual review queue for flagged conversions

**Rationale**:
- MVP-appropriate complexity (no ML required)
- Transparent rules merchants can understand
- Human review for edge cases protects both parties
- Scalable to ML-based detection in future

**Alternatives Considered**:
- **ML-based detection from day 1**: Rejected - insufficient training data, over-engineering
- **No fraud detection**: Rejected - essential for merchant trust and platform integrity
- **Third-party fraud service**: Rejected - cost, integration complexity for MVP

**Detection Rules**:
```typescript
const FRAUD_INDICATORS = {
  // Conversion velocity
  multipleConversionsPerDay: (userId: string, date: Date) =>
    getConversionCount(userId, date) > 3,

  // Price anomaly
  unusuallyHighValue: (price: number, avgPrice: number) =>
    price > avgPrice * 3,

  // Pattern matching
  sameUserMerchantLoop: (userId: string, merchantId: string) =>
    getConversionCount(userId, merchantId, '30d') > 5,

  // Time-based
  immediateConversion: (offerAcceptedAt: Date, conversionAt: Date) =>
    differenceInMinutes(conversionAt, offerAcceptedAt) < 5,
};
```

---

### 8. Billing Cycle and Invoicing

**Decision**: Monthly billing cycle with external invoicing (Stripe integration deferred)

**Rationale**:
- Matches spec assumption: "Payment processing is external"
- Monthly cycle aligns with listing fees (per month)
- Allows accumulation of commissions before billing
- External invoicing via email/PDF for MVP; Stripe Connect planned for future

**Alternatives Considered**:
- **Stripe Connect from MVP**: Rejected - spec explicitly defers this
- **Weekly billing**: Rejected - excessive admin overhead for small amounts
- **Per-transaction billing**: Rejected - too granular, high processing overhead

**Implementation Pattern**:
```typescript
// Billing data model
interface MerchantBillingCycle {
  merchantId: string;
  cycleStart: Date;  // 1st of month
  cycleEnd: Date;    // Last of month
  listingFees: number;
  offerFees: number;
  commissions: number;
  totalDue: number;
  status: 'pending' | 'invoiced' | 'paid' | 'overdue';
  invoiceUrl?: string;  // PDF download
}
```

---

## Dependencies Research

### Existing Systems Integration

| System | Integration Point | Verified |
|--------|-------------------|----------|
| Loadout System | Extend `loadouts` table pattern for merchant loadouts | Yes - existing schema supports extension |
| Wishlist System | Add `merchant_id` attribution to wishlist items | Yes - existing `gear_items` table has nullable foreign keys |
| Messaging System | Use existing DM infrastructure for offer acceptance | Yes - `conversations` and `messages` tables exist |
| Notification System | Add merchant notification types | Yes - existing `notifications` table with `type` column |
| Location Framework | Extend for merchant store locations | Yes - `profiles` has location fields, pattern established |

### New Dependencies Required

None - all required technologies already in project constitution.

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| PostGIS availability | Confirmed: Supabase includes PostGIS by default |
| Role-based access pattern | Use custom claims + RLS (existing pattern) |
| Offer state management | Explicit status enum with transition validation |
| Attribution window | 30-day window, late conversions flagged |
| Fraud detection approach | Rule-based with manual review queue |
| Billing implementation | Monthly cycle, external invoicing for MVP |

---

## Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| PostGIS query performance at scale | Low | Medium | Use spatial indexes, query optimization, caching |
| Offer spam from merchants | Medium | High | Rate limiting (1 offer/product/user/30d), reporting |
| Attribution disputes | Medium | Medium | Clear rules, 30-day window, manual review |
| Location privacy concerns | Low | High | Granular opt-in, proximity buckets only, GDPR compliance |
| Billing reconciliation errors | Low | Medium | Audit logging, manual review for large amounts |
