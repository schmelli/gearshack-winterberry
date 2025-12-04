# Feature Specification: Gear Item Editor

**Feature Branch**: `001-gear-item-editor`
**Created**: 2025-12-04
**Status**: Draft
**Input**: Core CRUD interface for the inventory system - add/edit gear items with 40+ fields

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add New Gear Item (Priority: P1)

As a user, I want to add a new piece of gear to my inventory so that I can track my outdoor equipment collection and know exactly what I own.

**Why this priority**: This is the fundamental action that enables all other inventory features. Without the ability to add gear, the system has no value.

**Independent Test**: Can be fully tested by opening the gear editor, filling in required fields (name, weight), and saving. The new item appears in the inventory list.

**Acceptance Scenarios**:

1. **Given** I am on the inventory screen, **When** I initiate adding new gear, **Then** I see an organized form with logically grouped fields
2. **Given** I am in the gear editor with a new item, **When** I enter a name and weight and save, **Then** the item is created and I return to the inventory
3. **Given** I am in the gear editor, **When** I try to save without a name, **Then** I see a clear validation error on the name field
4. **Given** I am in the gear editor, **When** I try to save with a negative weight, **Then** I see a clear validation error indicating weight must be positive

---

### User Story 2 - Edit Existing Gear Item (Priority: P1)

As a user, I want to edit an existing gear item so that I can update information as my gear changes condition or I learn more details about it.

**Why this priority**: Equal to adding - users need to correct mistakes and update information over time. Essential for data accuracy.

**Independent Test**: Can be tested by selecting an existing item, modifying its fields, and saving. Changes persist and are visible when viewing the item again.

**Acceptance Scenarios**:

1. **Given** I have an existing gear item, **When** I open it for editing, **Then** I see all current values pre-filled in the form
2. **Given** I am editing a gear item, **When** I change the weight and save, **Then** the new weight is persisted
3. **Given** I am editing a gear item, **When** I cancel without saving, **Then** no changes are persisted

---

### User Story 3 - Navigate Complex Form (Priority: P2)

As a user, I want to see gear fields organized into logical groups so that I am not overwhelmed by 40+ fields displayed at once.

**Why this priority**: Critical for usability - an overwhelming form leads to user abandonment. However, the basic add/edit must work first.

**Independent Test**: Can be tested by opening the editor and verifying fields are grouped, only one group is prominent at a time, and navigation between groups is intuitive.

**Acceptance Scenarios**:

1. **Given** I open the gear editor, **When** the form loads, **Then** I see fields organized into distinct sections (General Info, Weight & Specs, Purchase Details, etc.)
2. **Given** I am viewing one section of the form, **When** I want to see another section, **Then** I can easily navigate to it without losing entered data
3. **Given** I have entered data in multiple sections, **When** I navigate between sections, **Then** my entered data persists in each section

---

### User Story 4 - Classify Gear with Taxonomy (Priority: P2)

As a user, I want to classify my gear using a structured taxonomy (Category → Subcategory → Product Type) so that I can organize and filter my inventory effectively.

**Why this priority**: Essential for organization and future features like filtering, but basic add/edit must work first.

**Independent Test**: Can be tested by selecting a category, seeing relevant subcategories appear, selecting a subcategory, and seeing relevant product types appear.

**Acceptance Scenarios**:

1. **Given** I am editing a gear item, **When** I select a Category, **Then** only relevant Subcategories for that category are shown
2. **Given** I have selected a Subcategory, **When** I view Product Type options, **Then** only relevant Product Types for that subcategory are shown
3. **Given** I change the Category, **When** the Subcategory/Product Type become invalid, **Then** they are cleared and I must re-select

---

### User Story 5 - Manage Gear Media (Priority: P3)

As a user, I want to add images to my gear items so that I can visually identify my equipment and document its condition.

**Why this priority**: Important for a complete gear record but the core functionality (name, weight, metadata) must work first.

**Independent Test**: Can be tested by adding an image URL to a gear item and verifying it displays correctly when viewing the item.

**Acceptance Scenarios**:

1. **Given** I am editing a gear item, **When** I add a primary image URL, **Then** a preview of the image is displayed
2. **Given** I am editing a gear item, **When** I add multiple gallery image URLs, **Then** all images are saved and can be viewed
3. **Given** I have entered an invalid image URL, **When** I try to save, **Then** I see appropriate feedback about the invalid URL

---

### Edge Cases

- What happens when the user enters extremely long text in the name or notes field? (System should handle gracefully with appropriate limits)
- What happens when the user enters a weight of 0? (Should be allowed - some items like stuff sacks have negligible weight)
- What happens when the user pastes a malformed URL in the image field? (Should validate and show error)
- What happens when the user has unsaved changes and tries to close the editor? (Should warn about losing changes)
- What happens when the user enters special characters in text fields? (Should be sanitized/escaped appropriately)
- What happens when saving fails due to network issues? (Should show error and allow retry without losing data)
- What happens when the taxonomy changes after a gear item was saved? (Item retains its classification; orphaned values are flagged)

## Requirements *(mandatory)*

### Functional Requirements

#### Core CRUD
- **FR-001**: System MUST allow users to create new gear items with at minimum a name
- **FR-002**: System MUST allow users to edit all fields of existing gear items
- **FR-003**: System MUST validate that the name field is not empty before saving
- **FR-004**: System MUST validate that weight is a positive number (or zero) when provided
- **FR-005**: System MUST allow users to cancel editing and discard changes
- **FR-006**: System MUST warn users before discarding unsaved changes

#### Form Organization
- **FR-007**: System MUST organize fields into logical groups to prevent overwhelming the user
- **FR-008**: System MUST preserve entered data when navigating between form sections
- **FR-009**: System MUST display validation errors clearly adjacent to the relevant fields

#### Taxonomy (Category/Subcategory/ProductType)
- **FR-010**: System MUST provide a hierarchical taxonomy selection: Category → Subcategory → Product Type
- **FR-011**: System MUST filter Subcategory options based on selected Category
- **FR-012**: System MUST filter Product Type options based on selected Subcategory
- **FR-013**: System MUST clear dependent selections when a parent selection changes
- **FR-014**: System MUST source taxonomy data from the GearGraph ontology

#### Enumerated Values
- **FR-015**: System MUST support the following condition values: New, Used, Worn
- **FR-016**: System MUST support the following status values: Active, Wishlist, Sold

#### Media
- **FR-017**: System MUST allow users to add a primary image URL for the gear item
- **FR-018**: System MUST allow users to add multiple gallery image URLs
- **FR-019**: System MUST display image previews when valid URLs are provided

#### Data Storage
- **FR-020**: System MUST store weight in grams as the canonical unit

### Key Entities

#### GearItem (Primary Entity)

Represents a single piece of outdoor gear in the user's inventory. Organized into logical field groups:

**Section 1: General Info**
- Name (required) - User-friendly name for the item
- Brand - Reference to OutdoorBrand entity
- Brand URL - Link to brand website
- Model Number - Manufacturer's model identifier
- Product URL - Link to product page

**Section 2: Classification (from GearGraph Ontology)**
- Category - Top-level classification (GearCategory)
- Subcategory - Mid-level classification (GearSubcategory)
- Product Type - Specific type (ProductType)

**Section 3: Weight & Specifications**
- Weight Value - Numeric weight in grams
- Weight Unit - Display unit preference (g, oz, lb)
- Dimensions - Length, Width, Height (optional)

**Section 4: Purchase Details**
- Price - Purchase price
- Currency - Currency code (USD, EUR, etc.)
- Purchase Date - When acquired
- Store/Retailer - Where purchased
- Store Link - URL to purchase location

**Section 5: Media**
- Primary Image URL - Main product image
- Gallery Image URLs - Additional images (array)

**Section 6: Status & Condition**
- Condition - Physical state (New, Used, Worn)
- Status - Ownership state (Active, Wishlist, Sold)
- Notes - Free-text notes about the item

#### Supporting Entities (from GearGraph Ontology)

- **GearCategory**: Top-level classification (e.g., Shelter, Packs, Clothing, Sleep System)
- **GearSubcategory**: Mid-level classification within a category (e.g., under Shelter: Tents, Tarps, Bivys)
- **ProductType**: Specific product type within subcategory (e.g., under Tents: Freestanding, Non-freestanding, Pyramid)
- **OutdoorBrand**: Manufacturer/brand entity with name and URL

#### Local Enumerations

- **Condition**: New | Used | Worn
- **Status**: Active | Wishlist | Sold

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a new gear item with basic information (name, weight, category) in under 60 seconds
- **SC-002**: Users can find and update any field of an existing gear item in under 30 seconds
- **SC-003**: 95% of users successfully save a gear item on their first attempt (no validation errors due to unclear requirements)
- **SC-004**: Form sections reduce visible fields at any time to fewer than 10, preventing cognitive overload
- **SC-005**: Zero data loss occurs when users navigate between form sections
- **SC-006**: Users can complete the full gear item form (all fields) in under 5 minutes
- **SC-007**: Category → Subcategory → Product Type selection completes in under 15 seconds

## Dependencies

### External Dependencies

- **GearGraph Ontology**: The gear taxonomy (Category/Subcategory/ProductType hierarchy) is sourced from the GearGraph ontology. The ontology file is located at:
  ```
  /Users/schmelli/Coding/geargraph-autumnleaves/geargraph_ontology/geargraph-merged-all.ttl
  ```

  Key classes used:
  - `:GearCategory` - Top-level gear classification
  - `:GearSubcategory` - Mid-level classification (linked via `:hasParentCategory`)
  - `:ProductType` - Specific product type (linked via `:hasParentSubcategory`)
  - `:OutdoorBrand` - Brand/manufacturer entity

  Key relationships:
  - `:belongsToCategory` - GearItem → GearCategory
  - `:belongsToSubcategory` - GearItem → GearSubcategory
  - `:hasProductType` - GearItem → ProductType
  - `:manufacturedBy` - GearItem → OutdoorBrand

## Assumptions

- Users are authenticated before accessing the gear editor (authentication is handled elsewhere)
- Weight is stored in grams; any unit conversion is a display concern handled separately
- Image storage/upload is out of scope - this feature accepts URLs only
- The GearGraph ontology provides the authoritative taxonomy; this feature consumes it but does not modify it
- Currency values are stored as strings (e.g., "USD", "EUR"); currency conversion is out of scope
- The editor will be used on both desktop and mobile devices; responsive design is expected
- The ontology will be converted to a consumable format (JSON) during the planning phase
