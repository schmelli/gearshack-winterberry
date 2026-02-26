# Feature Specification: Merchant Integration (Business Loadouts & Location-Based Offers)

**Feature Branch**: `053-merchant-integration`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "B2B2C monetization platform enabling outdoor retailers to showcase curated gear loadouts, deliver personalized location-based offers to users with matching wishlist items, and track conversions through GearShack's inventory system."

---

## Overview

A B2B2C monetization platform that connects outdoor retailers (Globetrotter, Camp4, local Berlin shops) with GearShack users through:

1. **Merchant Loadouts**: Professional, trip-ready gear packages created by verified retailers
2. **Wishlist Brokering**: Connecting merchants with users who have matching items on their wishlists
3. **Location-Based Offers**: Personalized discount offers based on user proximity to merchant locations
4. **Conversion Tracking**: Measuring ROI through wishlist-to-inventory movement

### Platform Vision Alignment

This feature supports GearShack's mission by:
- **Supporting local outdoor businesses**: Connecting users with regional retailers
- **Personalized discovery**: Location-aware product recommendations
- **Sustainable monetization**: Revenue from merchant partnerships, not user fees
- **Privacy-first commerce**: Users opt into location sharing for better deals

### Key Separations

**Merchant Section vs. User Marketplace (Feature 003)**:
- Different UI sections: "Merchant Shop" vs. "Community Marketplace"
- Different trust models: Business verification vs. peer ratings
- Different pricing: Fixed merchant prices vs. negotiable P2P
- Clear visual distinction: Badges, colors, layouts

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Add Merchant Loadout to Wishlist (Priority: P1)

Emma is planning a PCT hike and wants to discover professionally curated gear packages from trusted retailers. She browses the Merchant Loadouts section, finds a complete PCT kit from Globetrotter, reviews the bundle pricing and availability, then adds items to her wishlist.

**Why this priority**: This is the primary discovery flow that drives merchant visibility and initial user engagement. Without this, merchants have no way to reach users.

**Independent Test**: Can be fully tested by navigating to merchant section, browsing loadouts, viewing details, and adding items to wishlist. Delivers value by enabling gear discovery and wishlist population.

**Acceptance Scenarios**:

1. **Given** a user is logged in, **When** they navigate to the Community page, **Then** they see clearly separated "Community Loadouts" and "Merchant Loadouts" sections with distinct visual styles
2. **Given** a user views the Merchant Loadouts section, **When** they browse the feed, **Then** they see merchant name, loadout title, total price, and "Featured" badges for promoted loadouts
3. **Given** a user clicks on a merchant loadout, **When** the detail page loads, **Then** they see: merchant badge, description, base weight, total weight, item count, individual total price, bundle discount percentage, bundle price, and nearest store availability with distance
4. **Given** a user views a merchant loadout, **When** they click "Add Entire Loadout to Wishlist", **Then** all items are added to their wishlist with merchant attribution
5. **Given** a user adds merchant items to wishlist, **When** prompted for location sharing, **Then** they can choose: city only, neighborhood, or no location sharing (per-merchant setting)

---

### User Story 2 - Merchant Creates Professional Loadout (Priority: P1)

Camp4 wants to create a "Winter Hiking Bavaria" loadout to showcase their curated gear selection. They log into the Merchant Portal, create a multi-step loadout with items from their catalog, set bundle pricing, specify store availability, and optionally pay for featured placement.

**Why this priority**: Equal priority to user discovery - merchants need the ability to create loadouts before users can browse them. This is the supply side of the marketplace.

**Independent Test**: Can be fully tested by merchant logging in, creating a loadout through the wizard, setting pricing, and publishing. Delivers value by enabling merchants to showcase their expertise.

**Acceptance Scenarios**:

1. **Given** a verified merchant is logged in, **When** they access the Merchant Portal, **Then** they see a dashboard with active loadouts, views, wishlist adds, and conversions
2. **Given** a merchant clicks "Create New Loadout", **When** the wizard opens, **Then** they can enter: name, trip type, season, description
3. **Given** a merchant is in step 2 of the wizard, **When** they search their catalog, **Then** they can add items with quantity and expert notes
4. **Given** a merchant has added items, **When** they proceed to pricing, **Then** they see individual total and can set a bundle discount (system calculates bundle price)
5. **Given** a merchant sets pricing, **When** they proceed to availability, **Then** they can select which store locations have stock
6. **Given** a merchant completes the wizard, **When** they click "Publish", **Then** the loadout appears in the Merchant Loadouts feed (pending admin approval for new merchants)

---

### User Story 3 - Merchant Sends Personalized Offer via Wishlist Brokering (Priority: P2)

Globetrotter wants to reach customers who have specific products on their wishlists. They access the Wishlist Insights panel, see aggregate demand for MSR Hubba Hubba tents within 20km, create a personalized discount offer, and send it to matching users.

**Why this priority**: This is the primary monetization mechanism - merchants pay per offer sent. It enables direct merchant-to-user communication but requires loadouts and wishlists to exist first.

**Independent Test**: Can be fully tested by merchant viewing wishlist insights, filtering by product and radius, creating an offer, and sending to users. Delivers value by connecting motivated buyers with relevant offers.

**Acceptance Scenarios**:

1. **Given** a merchant is in the Merchant Portal, **When** they click "Wishlist Insights", **Then** they see aggregate demand: "[N] users within [X] km have '[Product]' on wishlist"
2. **Given** a merchant clicks on a wishlist insight, **When** the detail view opens, **Then** they see anonymized user list: "User A: Within 5 km, added 3 days ago" (no personal details)
3. **Given** a merchant creates an offer, **When** they fill the form, **Then** they can set: regular price, offer price, message template, expiration (default 14 days)
4. **Given** a merchant clicks "Send Offer", **When** the offer is processed, **Then** the system charges per-offer fee and users receive in-app notification

---

### User Story 4 - User Receives and Responds to Personalized Offer (Priority: P2)

Emma receives a notification that Globetrotter has a special offer on the MSR Hubba Hubba from her wishlist. She views the offer details, accepts it to open a DM with the merchant, arranges in-store pickup, and marks the item as purchased.

**Why this priority**: Completes the offer flow - without user response capability, offers have no path to conversion.

**Independent Test**: Can be fully tested by user receiving notification, viewing offer details, accepting/declining, and marking purchase. Delivers value by enabling users to get personalized deals.

**Acceptance Scenarios**:

1. **Given** a user has an offer, **When** they receive a notification, **Then** it shows: merchant name, product name, "from your wishlist" context
2. **Given** a user opens an offer, **When** the detail page loads, **Then** they see: merchant name and distance, product, regular vs. offer price with discount percentage, message, expiration countdown
3. **Given** a user views an offer, **When** they click "Accept Offer", **Then** a DM thread opens with pre-filled context: "I'm interested in your [price] offer for [product]"
4. **Given** a user views an offer, **When** they click "Decline", **Then** the offer is dismissed without notification to merchant
5. **Given** a user views an offer, **When** they click "Not Interested in Offers from [Merchant]", **Then** the merchant is blocked from sending future offers
6. **Given** a user completes a purchase, **When** they click "Mark as Purchased" and select the merchant, **Then** the item moves from Wishlist to Inventory and conversion is logged

---

### User Story 5 - Conversion Tracking and Commission (Priority: P3)

Emma purchased the MSR tent from Globetrotter. When she marks it as purchased, the system logs the conversion, moves the item to her inventory, and charges Globetrotter a commission on the sale value.

**Why this priority**: Essential for monetization but depends on all prior flows working. This is the business model validation.

**Independent Test**: Can be fully tested by user marking purchase from merchant, verifying inventory update, and merchant seeing conversion in dashboard. Delivers value by proving ROI to merchants.

**Acceptance Scenarios**:

1. **Given** a user has a wishlist item from a merchant offer, **When** they mark it as "Purchased from [Merchant]", **Then** the item moves from Wishlist to Inventory with merchant attribution
2. **Given** a conversion is logged, **When** the merchant views their dashboard, **Then** they see updated conversion count and rate
3. **Given** a conversion is logged, **When** the billing cycle completes, **Then** the merchant is charged the commission percentage on the sale value
4. **Given** a user disputes a conversion, **When** they report incorrect tracking, **Then** the conversion is flagged for review and merchant is notified

---

### User Story 6 - Compare Merchant vs. Community Loadouts (Priority: P3)

Marcus wants to compare Globetrotter's PCT kit to Darwin's VIP loadout to understand the trade-offs between buying a curated bundle vs. following a proven thru-hiker setup.

**Why this priority**: Enhances decision-making but is supplementary to core functionality. Provides transparency and builds trust.

**Independent Test**: Can be fully tested by user selecting merchant loadout, clicking compare, selecting community loadout, and viewing differences. Delivers value by enabling informed purchasing decisions.

**Acceptance Scenarios**:

1. **Given** a user is viewing a merchant loadout, **When** they click "Compare to Community Loadouts", **Then** a modal opens to select a loadout for comparison
2. **Given** a user selects a comparison loadout, **When** the comparison view loads, **Then** they see side-by-side: weight totals, price (merchant only), item count
3. **Given** a comparison is displayed, **When** viewing differences, **Then** items are highlighted showing where loadouts differ (different items for same category)

---

### User Story 7 - Merchant Onboarding by Admin (Priority: P4)

GearShack admin reviews a merchant application from Grüne Wiese Berlin, verifies their business credentials, approves their account, and sets their initial catalog import.

**Why this priority**: Required for merchants to exist in the system but is a one-time setup flow. Can be manual initially.

**Independent Test**: Can be fully tested by admin receiving application, reviewing credentials, approving/rejecting, and merchant receiving access. Delivers value by establishing trust and quality control.

**Acceptance Scenarios**:

1. **Given** a merchant submits an application, **When** admin reviews it, **Then** they see: business name, verification documents, proposed catalog
2. **Given** admin approves a merchant, **When** approval is processed, **Then** merchant receives access to Merchant Portal and can create loadouts
3. **Given** admin rejects a merchant, **When** rejection is processed, **Then** merchant receives notification with reason and can reapply

---

### Edge Cases

- What happens when a merchant unpublishes a loadout that users have in their wishlist?
  - Items remain in wishlist but show "No longer available from [Merchant]"
- How does system handle merchants with no physical locations (online-only)?
  - Online merchants can still create loadouts; offers show "Ships nationwide" instead of distance
- What happens when a user's location permission is revoked?
  - User stops receiving location-based offers; existing offers remain valid until expiration
- How does system handle offer spam?
  - Rate limits on offers per merchant per user (max 1 offer per product per 30 days)
  - Users can report spammy offers; flagged merchants reviewed by admin
- What happens when merchant stock changes after loadout creation?
  - Merchants can update availability anytime; users see "Out of stock at [Location]" in real-time
- What happens when a user accepts an offer but never purchases?
  - Offer marked as "Accepted" but not "Converted"; merchant sees in analytics
  - No commission charged unless user explicitly marks as purchased
- What happens when an offer expires without user response?
  - Offer is auto-archived (removed from user's active offers)
  - Statistics tracked: view count, no-response status, time-to-expiry
  - Merchant sees expiration analytics in dashboard (helps optimize offer timing/pricing)

---

## Requirements *(mandatory)*

### Functional Requirements

#### Merchant Account & Portal

- **FR-001**: System MUST support a "Merchant" account type distinct from regular user accounts
- **FR-002**: Merchants MUST have a dedicated portal separate from the user interface
- **FR-003**: System MUST require admin approval for new merchant accounts (MVP)
- **FR-004**: Merchants MUST be able to upload and manage their product catalog
- **FR-005**: Merchant profiles MUST display: business name, verified badge, store locations, contact info

#### Merchant Loadouts

- **FR-006**: Merchants MUST be able to create loadouts from their product catalog
- **FR-007**: Loadouts MUST include: name, trip type, season, description, expert notes per item
- **FR-008**: System MUST auto-calculate bundle pricing based on individual items and merchant-set discount
- **FR-009**: Merchants MUST specify store availability for each loadout
- **FR-010**: Merchants MUST be able to edit or unpublish loadouts at any time
- **FR-011**: System MUST support featured/promoted loadout placement (premium option)
- **FR-012**: Merchant loadouts MUST be visually distinct from community loadouts (badges, colors, section)

#### Merchant Discovery (User Side)

- **FR-013**: Users MUST be able to browse merchant loadouts in a dedicated section
- **FR-014**: Users MUST be able to filter merchant loadouts by: trip type, price range, location, merchant
- **FR-015**: Users MUST see bundle pricing, savings percentage, and nearest store availability
- **FR-016**: Users MUST be able to add entire loadout or selected items to wishlist
- **FR-017**: Wishlist items MUST retain merchant attribution for conversion tracking

#### Wishlist Brokering (Merchant Side)

- **FR-018**: Merchants MUST see aggregate wishlist demand for products they sell
- **FR-019**: Merchants MUST be able to filter wishlist insights by proximity radius using buckets: 5km, 10km, 25km, 50km, 100km+
- **FR-020**: Users in wishlist insights MUST remain anonymous (show only proximity bucket and recency, never exact location)
- **FR-021**: Merchants MUST be able to create personalized offers: price, message, expiration
- **FR-022**: Merchants MUST be able to send offers to multiple matching users (batch)
- **FR-023**: System MUST charge merchants per offer sent

#### Personalized Offers (User Side)

- **FR-024**: Users MUST receive in-app notifications for personalized offers
- **FR-025**: Offer details MUST show: merchant, distance, product, regular/offer price, discount, expiration
- **FR-026**: Users MUST be able to accept offers (opens DM), decline, or block merchant
- **FR-027**: Accepting an offer MUST open a DM thread with pre-filled context
- **FR-028**: Users MUST be able to report spammy or misleading offers

#### Location & Privacy

- **FR-029**: Users MUST opt into location sharing per merchant (not globally)
- **FR-030**: Users MUST choose location granularity: city only, neighborhood, or no sharing
- **FR-031**: Merchants MUST never see exact user addresses (only proximity buckets)
- **FR-032**: Users MUST be able to revoke location sharing at any time
- **FR-033**: Users without location sharing MUST still see online merchant offers

#### Conversion Tracking

- **FR-034**: Users MUST be able to mark wishlist items as "Purchased from [Merchant]"
- **FR-035**: Marking as purchased MUST move item from Wishlist to Inventory
- **FR-036**: System MUST log conversions with: user, merchant, item, price, date
- **FR-037**: Merchants MUST see conversion analytics: rate, value, trends
- **FR-038**: System MUST charge commission on confirmed conversions
- **FR-039**: Users MUST be able to contest incorrect conversion attribution

#### Admin & Billing

- **FR-040**: Admins MUST be able to approve/reject merchant applications
- **FR-041**: System MUST track listing fees (monthly while loadout is live)
- **FR-042**: System MUST track and invoice: listing fees, per-offer fees, conversion commissions
- **FR-043**: System MUST implement fraud detection for fake conversions

---

### Key Entities

- **Merchant**: Verified business account with catalog, store locations, and portal access
- **Merchant Catalog Item**: Product in merchant's inventory with price, description, SKU
- **Merchant Loadout**: Curated gear package with bundle pricing, availability, and featured status. Lifecycle states: Draft (work in progress) → Pending Review (awaiting admin approval) → Published (visible to users) → Archived (removed from feed, history preserved)
- **Merchant Offer**: Personalized discount sent to user based on wishlist match and proximity
- **Location Share Setting**: Per-merchant user preference for location sharing granularity
- **Conversion**: Record of wishlist item purchased via merchant offer
- **Merchant Transaction**: Billing record for listing fees, offer fees, and commissions

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

#### Merchant Adoption

- **SC-001**: 50 active merchant accounts (20 local shops, 20 chains, 10 online) within 12 months
- **SC-002**: Average of 3 loadouts per merchant
- **SC-003**: 10 German cities with at least 1 local merchant

#### User Engagement

- **SC-004**: 150 views per merchant loadout per month
- **SC-005**: 25% of loadout viewers add items to wishlist
- **SC-006**: 30% of personalized offers accepted by users

#### Conversion & Revenue

- **SC-007**: 15% of wishlist items from merchant offers result in purchase
- **SC-008**: Average order value of EUR 180 per conversion
- **SC-009**: EUR 400 monthly revenue per merchant (listing + commissions)
- **SC-010**: EUR 20,000 total monthly platform revenue within 12 months

#### User Value & Satisfaction

- **SC-011**: 40% of merchant conversions are local pickups (vs. shipped)
- **SC-012**: Merchant NPS of 50+ (merchants recommend platform)
- **SC-013**: Less than 5% of users block merchant offers (offers remain relevant)

#### Quality & Trust

- **SC-014**: 70% of merchants renew loadouts after 3 months
- **SC-015**: Less than 1% of conversions disputed as fraudulent

---

## Assumptions

1. **Merchants provide structured catalogs**: Merchants can provide product data in a format suitable for import (CSV, spreadsheet, or manual entry)
2. **Payment processing is external**: Initial MVP uses external invoicing (Stripe integration planned for future)
3. **Tax compliance is merchant responsibility**: Merchants handle sales tax in their jurisdictions
4. **Local pickup logistics handled by merchants**: GearShack does not manage shipping or fulfillment
5. **Conversion trust model**: Users honestly mark purchases; fraud detection catches abuse patterns
6. **Admin-only merchant onboarding**: No self-service merchant signup in MVP (manual approval)
7. **Existing location framework sufficient**: Current user location implementation can be extended for merchant proximity

---

## Dependencies

### Required (Must exist before implementation)

- **Loadout System**: Existing loadout structure extended for merchant loadouts
- **Wishlist System**: Existing wishlist with merchant attribution fields
- **Inventory System**: Existing inventory for conversion tracking (wishlist to inventory movement)
- **Messaging System**: Existing DM system for merchant-customer communication
- **Location Framework**: Existing user location with granular privacy controls
- **Notification System**: Existing notification infrastructure for offer delivery

### Optional (Enhances but not required)

- **VIP Loadouts (Feature 052)**: Pattern reference for curated content
- **User Marketplace (Feature 003)**: Comparison context (P2P vs. merchant pricing)

---

## Out of Scope

### Explicitly Not Included in MVP

- **In-platform transactions**: No Stripe checkout integration (external payment)
- **Shipping integration**: No tracking, labels, or fulfillment management
- **Real-time inventory sync**: Merchants manually update stock
- **Price monitoring**: No competitor price scraping (planned future feature)
- **Affiliate links**: No Amazon/REI affiliate program
- **Merchant reviews**: No rating system for merchants
- **Wholesale marketplace**: No B2B gear sourcing

### Constraints

- **German/European merchants only initially**: Local focus for MVP
- **Structured catalog required**: Merchants must have product data ready
- **Manual merchant moderation**: Admin approval required for all new merchants

---

## Clarifications

### Session 2025-12-29

- Q: What happens when a merchant offer expires (neither accepted nor declined)? → A: Auto-archive with statistics tracked (views, no-response rate)
- Q: What proximity buckets should merchants see for wishlist brokering? → A: 5km, 10km, 25km, 50km, 100km+ (balanced local + regional)
- Q: What states should a merchant loadout go through? → A: Four states: Draft → Pending Review → Published → Archived

---

## Future Considerations

- Self-service merchant portal with automated verification
- Real-time inventory sync via merchant APIs
- Price monitoring and competitive alerts
- Seasonal campaigns and promotional tools
- Merchant-sponsored shakedowns
- Live chat support between merchants and users
- Gift cards redeemable at partner merchants
