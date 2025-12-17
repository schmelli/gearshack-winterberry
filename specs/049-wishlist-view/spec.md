# Feature Specification: Wishlist View with Community Availability and Price Monitoring

**Feature Branch**: `049-wishlist-view`
**Created**: 2025-12-16
**Status**: Draft
**Input**: User description: "Wishlist View with Community Availability and Price Monitoring - As a GearShack user, I want to toggle between my actual Inventory and a Wishlist view on the Inventory page, so I can track gear I'm interested in acquiring and get notified when it becomes available."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Manage Wishlist Items (Priority: P1)

As a GearShack user, I want to switch between my inventory and wishlist views, add items to my wishlist, and view basic item details, so I can track gear I'm interested in acquiring.

**Why this priority**: Core functionality that enables users to create and maintain a wishlist. Without this, the feature has no value.

**Independent Test**: Can be fully tested by creating a wishlist, adding items, viewing them in different card sizes (small/medium/large), and switching between inventory and wishlist tabs. Delivers standalone value as a digital wish tracking system.

**Acceptance Scenarios**:

1. **Given** I am on the Inventory page, **When** I click the "Wishlist" toggle/tab, **Then** I see my wishlist items displayed in the same grid layout as my inventory
2. **Given** I am viewing my wishlist, **When** I click "Add to Wishlist", **Then** I see the gear item editor modal with "Add to Wishlist" as the title
3. **Given** I have added wishlist items, **When** I change the card size selector, **Then** wishlist cards resize to small, medium, or large views just like inventory cards
4. **Given** I am viewing my wishlist, **When** I use the search field, **Then** wishlist items are filtered by search query
5. **Given** I am viewing my wishlist, **When** I apply filter controls, **Then** wishlist items are filtered by category, activity type, or other criteria
6. **Given** I am viewing my wishlist, **When** I change sort options, **Then** wishlist items reorder accordingly (alphabetical, date added, price, etc.)
7. **Given** I am viewing a wishlist item card, **When** I examine it, **Then** I see all item information EXCEPT availability markers (for sale, lendable, tradeable)

---

### User Story 2 - View Community Availability (Priority: P2)

As a GearShack user viewing my wishlist, I want to see which community members have the same gear items available for sale, trade, or lending, so I can potentially acquire the item from the community instead of purchasing new.

**Why this priority**: Differentiates GearShack from simple wishlist apps by connecting users to gear availability within the community. Builds on P1 functionality.

**Independent Test**: Can be tested independently by viewing medium-sized wishlist cards and verifying that community availability panels display other users' matching items with quick actions to view their cards and initiate messaging. Delivers community marketplace value.

**Acceptance Scenarios**:

1. **Given** I am viewing medium-sized wishlist cards, **When** a wishlist item matches gear marked as for-sale/tradeable/lendable by other users, **Then** I see a "Community Availability" panel showing the availability status
2. **Given** I see community availability for a wishlist item, **When** I click the "View Item" quick action, **Then** I am taken to that user's inventory card detail view to verify it's the right item
3. **Given** I see community availability for a wishlist item, **When** I click the "Message User" quick action, **Then** the in-app messaging system opens with that user pre-selected
4. **Given** I am viewing medium-sized wishlist cards, **When** no community members have that item available, **Then** the community availability panel shows "Not currently available in community" or similar message
5. **Given** multiple community members have the same wishlist item available, **When** I view the community availability panel, **Then** I see all available matches with clear user identification

---

### User Story 3 - Transfer Item from Wishlist to Inventory (Priority: P3)

As a GearShack user who has acquired a wishlist item, I want to move that item from my wishlist to my actual inventory, so I can track it as owned gear without re-entering all the information.

**Why this priority**: Quality-of-life improvement that reduces data entry friction when users acquire wishlist items. Depends on P1 for wishlist management and inventory integration.

**Independent Test**: Can be tested independently by opening a wishlist item detail modal and clicking "Move to Inventory", then verifying the item appears in inventory and is removed from wishlist. Delivers workflow efficiency value.

**Acceptance Scenarios**:

1. **Given** I am viewing a wishlist item detail modal, **When** I click the "Move to Inventory" button, **Then** the item is removed from my wishlist and added to my inventory with all existing data preserved
2. **Given** I have moved an item to inventory, **When** I switch to the "My Gear" tab, **Then** I see the newly moved item in my inventory view
3. **Given** I have moved an item to inventory, **When** I switch back to the "Wishlist" tab, **Then** the moved item no longer appears in my wishlist
4. **Given** I am viewing a wishlist item detail modal, **When** I click "Move to Inventory", **Then** I receive confirmation feedback (toast notification) indicating successful transfer
5. **Given** I accidentally click "Move to Inventory", **When** the action is triggered, **Then** I am asked to confirm before the transfer occurs (optional confirmation dialog)

---

### User Story 4 - View Price Information (Priority: P4 - Future)

As a GearShack user, I want to see current best prices and price history for wishlist items, so I can make informed purchasing decisions and buy when prices are favorable.

**Why this priority**: Valuable for purchase planning but requires external price data integration. Marked as future enhancement with stubs in the current iteration.

**Independent Test**: Can be tested by viewing medium/large wishlist cards and verifying stub indicators are displayed (e.g., "Price monitoring coming soon"). Full test requires price API integration.

**Acceptance Scenarios** (for future implementation):

1. **Given** I am viewing medium-sized wishlist cards, **When** price data is available, **Then** I see a "Best Price" indicator showing the lowest current price and retailer name
2. **Given** I am viewing large-sized wishlist cards, **When** I examine the card, **Then** I see a "Price History" chart stub showing where the visual trend will appear
3. **Given** I am viewing price information, **When** the data is a stub, **Then** I see clear messaging like "Price monitoring coming soon" to avoid user confusion

---

### Edge Cases

- What happens when a user tries to move a wishlist item to inventory but they already have that exact item in inventory (duplicate detection)?
- How does the system handle when a community member deletes or changes the availability status of an item that appeared in someone's wishlist community availability panel (stale data)?
- What happens when a user searches for wishlist items but no results match the query?
- How does the system handle when a user applies filters that result in zero wishlist items being displayed?
- What happens when a user tries to add the same item to their wishlist multiple times?
- How does the system handle when a wishlist item image fails to load?
- What happens when a user deletes a wishlist item accidentally (undo capability)?
- How does the system handle very long wishlist item names or descriptions in different card sizes?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a toggle/tab control on the Inventory page to switch between "My Gear" (existing inventory) and "Wishlist" views
- **FR-002**: Wishlist view MUST maintain the same layout paradigm as inventory: three card sizes (small, medium, large), search field, filter controls, and sort options
- **FR-003**: Wishlist cards MUST display the same information as inventory cards EXCEPT availability markers (for sale, lendable, tradeable)
- **FR-004**: System MUST reuse existing card component patterns with wishlist-specific modifications to ensure UI consistency
- **FR-005**: Medium-sized wishlist cards MUST include a "Community Availability" panel showing if the gear item is marked as for-sale, tradeable, or lendable by other users
- **FR-006**: Community Availability panel MUST provide a quick action to view the other user's inventory card detail
- **FR-007**: Community Availability panel MUST provide a quick action to initiate in-app messaging with the other user
- **FR-008**: Medium-sized wishlist cards MUST include a "Best Price Indicator" stub showing placeholder content for future price monitoring
- **FR-009**: Large-sized wishlist cards MUST include a "Price History Chart" stub showing placeholder content for future price trend visualization
- **FR-010**: System MUST open a detail modal when a wishlist card is clicked, following the same pattern as inventory detail modals
- **FR-011**: Wishlist detail modal MUST show all item information consolidated with Edit and Close icons
- **FR-012**: Wishlist detail modal MUST include a "Move to Inventory" button to transfer the item to the user's actual inventory
- **FR-013**: System MUST provide an "Add to Wishlist" modal reusing the existing "Add Item" functionality with adjusted labels
- **FR-014**: "Add to Wishlist" modal MUST use the same fields and validation as the inventory "Add Item" modal
- **FR-015**: System MUST persist wishlist items separately from inventory items with clear data separation
- **FR-016**: System MUST support search functionality on wishlist items using the same search logic as inventory
- **FR-017**: System MUST support filter controls on wishlist items (category, activity type, etc.) using the same filter logic as inventory
- **FR-018**: System MUST support sort options on wishlist items (alphabetical, date added, price, etc.)
- **FR-019**: When "Move to Inventory" is triggered, system MUST transfer the item data from wishlist to inventory and remove it from the wishlist
- **FR-020**: Stub sections for price monitoring and price history MUST be clearly marked to avoid user confusion
- **FR-021**: Community Availability panel MUST handle cases where no community members have the item available with appropriate messaging
- **FR-022**: System MUST match wishlist items with community inventory items based on brand and model name using fuzzy matching to catch variations in naming (e.g., "Osprey Atmos 65" matches "Atmos 65 AG")
- **FR-023**: System MUST prevent duplicate wishlist items by detecting matching brand and model names (case-insensitive) and display a warning when users attempt to add an item that already exists in their wishlist

### Key Entities

- **Wishlist Item**: Represents gear a user wants to acquire. Contains all the same attributes as an inventory item (name, brand, model, category, weight, price, images, etc.) but marked as "wishlist" status. Does not include availability markers (for sale, lendable, tradeable) since the user doesn't own it yet.

- **Community Availability**: Represents a match between a user's wishlist item and another user's inventory item that is marked as for-sale, tradeable, or lendable. Contains references to the wishlist item, the matching inventory item, the owner user, and the availability status.

- **Price Stub**: Placeholder entity for future price monitoring. Contains fields for best price, retailer name, and price history data that will be populated when price monitoring is implemented.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can switch between Inventory and Wishlist views in under 2 seconds with no page reload
- **SC-002**: Users can add a new item to their wishlist in under 3 minutes using the familiar "Add Item" workflow
- **SC-003**: Wishlist cards display in all three size variations (small, medium, large) with the same visual consistency as inventory cards
- **SC-004**: Community availability information loads and displays within 3 seconds when viewing medium-sized wishlist cards
- **SC-005**: Users can complete the "Move to Inventory" action in under 5 seconds with confirmation feedback
- **SC-006**: Search and filter operations on wishlist items complete in under 2 seconds for lists up to 500 items
- **SC-007**: 90% of users successfully identify and use the "Move to Inventory" button when they acquire a wishlist item
- **SC-008**: Users viewing stub sections (price monitoring, price history) understand these are future features, not broken functionality
- **SC-009**: Community availability quick actions (view item, message user) complete in under 3 seconds
- **SC-010**: Users can seamlessly navigate between a community member's inventory card and their own wishlist without losing context

## Assumptions

- Users are already familiar with the existing inventory page layout and card-based interface
- The in-app messaging system is already implemented and functional for initiating conversations
- Inventory items already have availability markers (for sale, lendable, tradeable) that can be queried for community availability
- Price monitoring and price history features will be implemented in a future iteration after initial wishlist functionality is validated
- Notification/alert system for availability changes will be implemented in a future iteration
- Users will tolerate clearly marked stub sections for price features in the initial release

## Future Enhancements (Out of Scope for Initial Release)

The following features are explicitly deferred to future iterations:

- **Price Monitoring Integration**: Real-time price tracking from online retailers, local shops, and eBay listings
- **Price History Data**: Historical price trends and visualization in large card view
- **Retailer Integrations**: Direct links and affiliate integration with gear retailers
- **Alert/Notification System**: Automated notifications when wishlist items become available or drop in price
- **Maximum Price / Budget**: Per-item budget thresholds for deal alerts
- **Priority Levels**: Ability to mark wishlist items as urgent vs. someday
- **Wishlist Sharing**: Share wishlist for gift ideas or group trip planning
- **AI-Powered Alternatives**: Suggest similar gear when exact items aren't available
- **Personal Notes**: Add custom notes or reminders to wishlist items
- **Notification Preferences**: Per-item settings for what triggers alerts (price drops, community availability, etc.)
