# Feature Specification: Price Discovery & Monitoring for Wishlist Items

**Feature Branch**: `050-price-tracking`
**Created**: 2025-12-17
**Status**: Draft
**Input**: User description: "Price Discovery & Monitoring for Wishlist Items"

## Clarifications

### Session 2025-12-17

- Q: When external price sources (Google Shopping, eBay, retailer APIs) fail or timeout, what should happen? → A: Show partial results with warnings for failed sources
- Q: When a wishlist item name doesn't exactly match retailer product listings, how should the system match items? → A: Use fuzzy matching, require user confirmation for ambiguous matches
- Q: When no price results are found for a wishlist item (all sources return empty), what should the user see? → A: Show helpful message with suggestions (adjust item name, check back later, manually add product links)
- Q: How do retailers send Personal Price Offers to users tracking items? → A: API restricted to verified partner retailers only
- Q: How long should the system retain historical price data for tracked items? → A: 90 days (one quarter)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enable Price Tracking for Wishlist Item (Priority: P1)

A user adds a wishlist item and enables price tracking to discover current prices across retailers, eBay, and local shops. The system searches multiple sources and displays results within 5-10 seconds, showing the top 3 retail sources, eBay listings, and local shops (if location is set). Users can enable price drop alerts.

**Why this priority**: This is the core value proposition - users must be able to opt-in to price tracking and see immediate results. Without this, the feature has no foundation.

**Independent Test**: Can be fully tested by adding a wishlist item, clicking "Track Prices", verifying search results display within 5-10 seconds with at least 3 sources, and confirming alert toggle appears. Delivers immediate price discovery value.

**Acceptance Scenarios**:

1. **Given** a user has a wishlist item "Arc'teryx Beta LT Jacket", **When** they tap "Track Prices" on the gear card, **Then** the system displays a "Finding prices..." loading state
2. **Given** the search is running, **When** results are found within 5-10 seconds, **Then** the system displays top 3 retail sources with name, price, shipping cost estimate, and link
3. **Given** price results are displayed, **When** the user views the results, **Then** eBay listings are shown alongside retail options
4. **Given** the user has set a profile location (e.g., Berlin), **When** results are displayed, **Then** local shops appear first with a "🌱 Local" badge
5. **Given** price tracking is enabled, **When** the user views the results, **Then** an alert toggle "Notify me when price drops" is available
6. **Given** the user enables alerts, **When** they toggle the notification setting, **Then** the system confirms alert is active

---

### User Story 2 - Receive Price Drop Alert (Priority: P2)

A user with price tracking enabled receives a push notification when the price drops below the previously recorded lowest price. The user opens the app, sees the updated price on the wishlist card, and can click through to complete the purchase.

**Why this priority**: This delivers the proactive value - users don't need to manually check prices. However, it depends on P1 being implemented first.

**Independent Test**: Can be tested by enabling price tracking for an item, simulating a price drop (or waiting for a real one), verifying push notification is sent with correct details, and confirming the updated price appears in the app. Delivers automated deal discovery value.

**Acceptance Scenarios**:

1. **Given** a user has enabled price tracking for "MSR Hubba Hubba Tent" at €450, **When** the price drops to €389 at Globetrotter.de, **Then** the user receives a push notification stating "Price drop! MSR Hubba Hubba now €389 at Globetrotter.de"
2. **Given** the user receives a price drop notification, **When** they open the app, **Then** the updated price is displayed on the wishlist card
3. **Given** the user views the updated price, **When** they tap the retailer link, **Then** the product page opens in their browser
4. **Given** the user completes the purchase externally, **When** they mark the item as "Purchased" in the app, **Then** the item moves from wishlist to inventory
5. **Given** the item moves to inventory, **When** the transition is complete, **Then** the conversion is tracked (wishlist → inventory)

---

### User Story 3 - Discover Local Shop Availability (Priority: P2)

A user in Berlin adds a wishlist item and enables price tracking. The system prioritizes local shops in the results with distance information (e.g., "5km away"), allowing users to compare local options with online retailers and eBay.

**Why this priority**: This differentiates the feature by supporting sustainability and community, but requires P1 to be functional. It's equally important as P2 but serves a different user need.

**Independent Test**: Can be tested by setting user location to Berlin, adding a wishlist item, enabling price tracking, and verifying local shops appear first with badge and distance. Delivers local discovery value.

**Acceptance Scenarios**:

1. **Given** a user has set their location to Berlin and adds "Black Diamond Headlamp" to wishlist, **When** they enable price tracking, **Then** results show local shops first with "🌱 Local" badge
2. **Given** local shop results are displayed, **When** the user views the results, **Then** distance information is shown (e.g., "5km away")
3. **Given** the user sees local options, **When** they compare prices, **Then** local shops are displayed above online retailers and eBay
4. **Given** the user prefers the local option, **When** they visit the store and purchase, **Then** they can update the wishlist to mark as purchased
5. **Given** the item is marked as purchased, **When** the user adds it to inventory, **Then** the local shop preference is tracked

---

### User Story 4 - View Community Availability (Priority: P3)

A user views a wishlist item and sees community availability at the top of the gear card (e.g., "3 users have this item"). They can quickly access inventory cards of other users, message them, or compare peer prices with retail options.

**Why this priority**: This enables peer-to-peer comparison, which is valuable but not essential for initial price discovery. Can be delivered independently after P1.

**Independent Test**: Can be tested by having multiple users with the same inventory item, verifying community count displays on wishlist cards, and confirming quick actions (message, view inventory) work. Delivers peer discovery value.

**Acceptance Scenarios**:

1. **Given** 3 users have "Arc'teryx Beta LT Jacket" in their inventory, **When** a user views this item on their wishlist, **Then** the gear card displays "3 users have this item" in the Community Availability section
2. **Given** community availability is shown, **When** the user taps the community count, **Then** quick actions appear: "Message user", "View inventory", "See price comparison"
3. **Given** the user views price comparison, **When** they see both community and retail prices, **Then** peer prices (e.g., "€320-€350") are displayed alongside retail prices
4. **Given** the user decides to buy from a peer, **When** they tap "Message user", **Then** the messaging interface opens with the selected user

---

### User Story 5 - Receive Personal Price Offer (Priority: P3)

A retailer sees a user tracking an item and sends a "Personal Price Offer" (e.g., €220 for an item with €250 best price). The user receives a notification, opens the app, sees the offer badge in the price comparison, and can complete the purchase with the exclusive discount.

**Why this priority**: This is a monetization feature that benefits both users (better prices) and retailers (conversions), but depends on P1 and P2 being functional. Not critical for MVP.

**Independent Test**: Can be tested by simulating a personal offer from a retailer, verifying notification is sent, confirming offer badge appears in price comparison with expiration date, and testing purchase flow. Delivers monetization value.

**Acceptance Scenarios**:

1. **Given** a user tracks "Osprey Atmos 65L Backpack" with €250 best price, **When** Bergzeit.de sends a personal offer of €220 valid for 48 hours, **Then** the user receives a notification: "💎 Bergzeit.de has a personal offer for you"
2. **Given** the user receives the notification, **When** they open the app, **Then** the offer is displayed in the price comparison with a "💎 Personal Offer" badge
3. **Given** the offer is displayed, **When** the user views the details, **Then** the expiration date "Valid for 48 hours" is shown
4. **Given** the user accepts the offer, **When** they tap the offer link, **Then** the product page opens with the exclusive discount applied
5. **Given** the user completes the purchase, **When** they mark the item as purchased, **Then** the personal offer conversion is tracked

---

### User Story 6 - Configure Alert Channels (Priority: P3)

A user configures their notification preferences for price alerts, choosing between push notifications (default: ON) and email alerts (default: OFF). They can adjust these settings at any time from their profile or notification settings.

**Why this priority**: This enhances the alert experience from P2 but is not essential for the core functionality. Users can function with default settings.

**Independent Test**: Can be tested by accessing notification settings, toggling push and email preferences, verifying settings persist, and confirming alerts respect the chosen channels. Delivers preference control value.

**Acceptance Scenarios**:

1. **Given** a user accesses notification settings, **When** they view price alert options, **Then** push notifications are enabled by default and email alerts are disabled
2. **Given** the user wants email alerts, **When** they toggle the email alert setting to ON, **Then** the system saves the preference and sends a confirmation email
3. **Given** the user has email alerts enabled, **When** a price drop occurs, **Then** they receive both push notification and email alert
4. **Given** the user disables push notifications, **When** a price drop occurs, **Then** they receive only email alert (if enabled)

---

### Edge Cases

- No price results found: Display helpful message: "No prices found. Try adjusting item name or check back later. You can manually add product links." Price tracking remains enabled for future periodic checks.
- How does the system handle items with multiple variants (sizes, colors)?
- What happens when a retailer link becomes invalid or the product is out of stock?
- Item name matching: System uses fuzzy text matching to find similar products. When multiple matches exist or confidence is low, user must confirm the correct match before price tracking proceeds. Users can skip confirmation to search manually later.
- What happens when the user has no location set and local shop results are requested?
- How does the system handle price fluctuations (multiple drops and rises)?
- What happens when a personal offer expires while the user is viewing it?
- How does the system handle concurrent price tracking requests for the same item?
- What happens when a community member removes an item from their inventory?
- How does the system prioritize results when multiple retailers have the same price?
- External source failures: Display available results from successful sources, show warning message for failed sources (e.g., "eBay unavailable - showing other results")

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to opt-in to price tracking for any wishlist item via a "Track Prices" button on the gear card
- **FR-002**: System MUST search multiple sources (Google Shopping, integrated retailers, eBay, local shops) when price tracking is enabled
- **FR-003**: System MUST display a "Finding prices..." loading state during price search
- **FR-004**: System MUST return price results within 5-10 seconds of initiating the search
- **FR-005**: System MUST display top 3 retail sources with item name, retailer name, price, shipping cost estimate, and direct product link
- **FR-006**: System MUST include eBay listings alongside retail options in price comparison view
- **FR-007**: System MUST prioritize local shops in results when user has set a profile location
- **FR-008**: System MUST display local shops with a "🌱 Local" badge and distance information
- **FR-009**: System MUST show location-agnostic results (national/international only) when user has no location set
- **FR-010**: System MUST provide an "Notify me when price drops" toggle for users to enable alerts
- **FR-011**: System MUST support push notifications as the default alert channel (enabled by default)
- **FR-012**: System MUST support optional email alerts (disabled by default, user opts-in via settings)
- **FR-013**: System MUST send price drop alerts when price falls below the previously recorded lowest price
- **FR-014**: System MUST send alerts when a local shop adds the item (if previously unavailable)
- **FR-015**: System MUST send alerts when a community member lists the item for sale
- **FR-016**: System MUST send alerts when a retailer makes a "Personal Price Offer"
- **FR-017**: System MUST display a "Community Availability" section showing count of users who have the item (e.g., "3 users have this item")
- **FR-018**: System MUST provide quick actions in Community Availability: "Message user", "View inventory", "See price comparison"
- **FR-019**: System MUST display personal price offers with a "💎 Personal Offer" badge and expiration date
- **FR-020**: System MUST include a timestamp for price updates (e.g., "Updated 2 hours ago")
- **FR-021**: System MUST maintain visual hierarchy: Local shops > Online retailers > eBay
- **FR-022**: System MUST track conversions when items transition from wishlist to inventory
- **FR-023**: System MUST track click-through rates when users click retailer links
- **FR-024**: System MUST periodically check prices to detect drops (daily checks assumed, frequency to be determined in technical planning)
- **FR-025**: System MUST persist price tracking preferences per wishlist item
- **FR-026**: System MUST persist alert channel preferences per user
- **FR-027**: System MUST allow users to disable price tracking for a wishlist item
- **FR-028**: System MUST remove price tracking data when a wishlist item is deleted or moved to inventory
- **FR-029**: System MUST display partial results from successful sources when some external price sources fail or timeout, showing a warning message for each failed source (e.g., "eBay unavailable - showing other results")
- **FR-030**: System MUST use fuzzy text matching to find products when wishlist item name doesn't exactly match retailer listings
- **FR-031**: System MUST require user confirmation when fuzzy matching returns multiple possible matches or low-confidence matches, showing match candidates with product images and details for user selection
- **FR-032**: System MUST allow users to skip match confirmation and manually search for products later
- **FR-033**: System MUST display a helpful message when no price results are found, including suggestions to adjust item name, check back later, or manually add product links. Price tracking remains enabled for future periodic checks.
- **FR-034**: System MUST provide a partner API for verified retailers to submit personal price offers, with authentication, rate limiting, and offer validation
- **FR-035**: System MUST restrict personal price offer creation to verified partner retailers only, rejecting offers from unauthorized sources
- **FR-036**: System MUST retain historical price data for 90 days (one quarter) to support seasonal trend analysis and price drop detection, automatically purging data older than 90 days

### Key Entities

- **Wishlist Item**: Represents a gear item the user wants to purchase. Includes name, category, desired specifications, and price tracking status.
- **Price Result**: Represents a single price from a source (retailer, eBay, local shop). Includes retailer name, price, shipping cost estimate, product link, source type (local/online/eBay), and timestamp. Historical price data is retained for 90 days.
- **Price Alert**: Represents a notification triggered by a price drop, new availability, or personal offer. Includes item reference, alert type, trigger condition, and delivery channels.
- **Community Availability**: Represents the aggregated count of users who have the same item in their inventory. Includes item reference, user count, and price range.
- **Personal Offer**: Represents a retailer-initiated exclusive discount sent via partner API. Includes retailer name, original price, offer price, expiration date, item reference, and partner retailer identifier.
- **Partner Retailer**: Represents a verified retail partner authorized to send personal price offers. Includes retailer name, API credentials, partnership status, and rate limits.
- **User Location**: Represents the user's geographic location for prioritizing local shops. Includes city, country, and coordinates (for distance calculation).
- **Alert Preferences**: Represents the user's notification channel preferences. Includes push notification status (enabled/disabled) and email alert status (enabled/disabled).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can enable price tracking and see results within 5-10 seconds for 95% of requests
- **SC-002**: Click-through rate (CTR) on retailer links reaches at least 15% within the first month
- **SC-003**: Conversion rate (wishlist to inventory transition) for tracked items reaches at least 20% within three months
- **SC-004**: At least 30% of wishlist items have price tracking enabled within the first month of launch
- **SC-005**: Price drop notifications have an open rate of at least 40%
- **SC-006**: At least 25% of users with location set view local shop results first
- **SC-007**: Personal price offers achieve a conversion rate of at least 35%
- **SC-008**: Average time-to-purchase (from tracking enabled to item purchased) is under 14 days
- **SC-009**: Users report increased satisfaction with finding best prices (measured via feedback or survey)
- **SC-010**: System supports at least 100 concurrent price tracking requests without performance degradation
