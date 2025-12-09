# Feature Specification: Smart Gear Dependencies (Parent/Child Items)

**Feature Branch**: `037-gear-dependencies`
**Created**: 2025-12-09
**Status**: Draft
**Input**: User description: "Feature: Smart Gear Dependencies - Allow users to link accessory items to main gear items so that when a main item is added to a loadout, the system automatically detects dependencies and either adds them or prompts the user."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Link Accessories to Main Gear (Priority: P1)

As a user, I want to link "accessory items" to a "main item" in the Gear Editor so that I can define which items depend on each other.

**Why this priority**: This is the foundation of the feature - without the ability to create dependency links, no other functionality can work. Users must first be able to establish relationships between gear items.

**Independent Test**: Can be fully tested by opening a gear item in the editor, adding dependency links to other items, saving, and verifying the links persist. Delivers the core value of defining gear relationships.

**Acceptance Scenarios**:

1. **Given** I am editing a gear item (e.g., "Packraft"), **When** I access the dependencies section and search for another item (e.g., "Paddle"), **Then** I can select it and add it as a linked accessory
2. **Given** I have linked accessories to a main item, **When** I save the gear item, **Then** the dependency links are persisted and visible when I reopen the item
3. **Given** I am viewing a gear item with linked accessories, **When** I want to remove a link, **Then** I can remove the dependency without deleting either gear item
4. **Given** I have linked multiple accessories to a main item, **When** I view the dependencies, **Then** I see all linked items displayed clearly

---

### User Story 2 - Dependency Detection in Loadout Builder (Priority: P2)

As a user, when I add a "main item" with dependencies to a loadout, I want the system to automatically detect the linked accessories so I don't forget critical items.

**Why this priority**: This story delivers the core user value - preventing packing errors. It depends on P1 (links must exist) but is the primary reason users want this feature.

**Independent Test**: Can be tested by adding a gear item with existing dependencies to a loadout and verifying the system detects and notifies about linked accessories.

**Acceptance Scenarios**:

1. **Given** I am building a loadout and I add a "Packraft" that has "Paddle" and "PFD" as linked accessories, **When** the item is added, **Then** a modal dialog appears listing all missing dependencies with "Add All", "Select", and "Skip" buttons
2. **Given** a main item has dependencies but none are yet in my loadout, **When** I add the main item, **Then** a modal dialog shows all missing accessories (including transitive dependencies)
3. **Given** a main item has dependencies and some are already in my loadout, **When** I add the main item, **Then** the modal dialog only shows accessories not yet present in the loadout

---

### User Story 3 - Add Dependencies to Loadout (Priority: P3)

As a user, when dependencies are detected, I want the option to automatically add them to my loadout or be prompted to decide, so I can quickly complete my packing list.

**Why this priority**: This is the action step that follows detection. It provides convenience but requires both P1 and P2 to function.

**Independent Test**: Can be tested by triggering dependency detection and verifying the user can either auto-add all dependencies or selectively add them.

**Acceptance Scenarios**:

1. **Given** I added a main item with detected missing dependencies, **When** I choose to add all dependencies, **Then** all linked accessories are added to my loadout
2. **Given** I added a main item with detected missing dependencies, **When** I choose to review dependencies, **Then** I can selectively choose which accessories to add
3. **Given** I decline to add dependencies, **When** I continue building the loadout, **Then** the loadout is saved without the dependencies (user made an informed choice)

---

### Edge Cases

- What happens when a linked accessory has been deleted from the inventory? The system gracefully handles broken links by removing invalid references and notifying the user.
- How does the system handle circular dependencies (Item A links to Item B which links to Item A)? The system prevents circular references during link creation.
- What happens when a main item with dependencies is removed from a loadout? The dependencies remain in the loadout since the user added them intentionally.
- How does the system behave when the same accessory is linked to multiple main items and both main items are added to a loadout? The accessory appears only once in the loadout (no duplicates).
- What if a user tries to link an item to itself? The system prevents self-referential links.
- How deep can transitive dependencies go? The system follows all levels of nested dependencies but handles circular references to prevent infinite loops.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to add one or more dependency links from a gear item to other gear items in the inventory
- **FR-002**: System MUST persist dependency relationships when gear items are saved
- **FR-003**: System MUST display linked accessories clearly within the Gear Editor interface
- **FR-004**: System MUST allow users to remove individual dependency links without deleting the gear items themselves
- **FR-005**: System MUST detect when a gear item with dependencies is added to a loadout
- **FR-006**: System MUST notify users of missing dependencies via a modal dialog when adding a main item to a loadout
- **FR-014**: System MUST recursively detect transitive dependencies (dependencies of dependencies) and include them in notifications
- **FR-007**: System MUST provide an option to automatically add all missing dependencies to the loadout
- **FR-008**: System MUST provide an option to review and selectively add dependencies to the loadout
- **FR-009**: System MUST handle deleted accessories gracefully by removing broken links or notifying the user
- **FR-010**: System MUST prevent circular dependency references
- **FR-011**: System MUST ensure accessories already in the loadout are not duplicated when dependencies are added
- **FR-012**: System MUST support one-to-many relationships (one main item can have multiple accessories) with no upper limit
- **FR-013**: System MUST prevent items from being linked to themselves

### Key Entities

- **GearItem**: Extended with a new field for linked dependencies (list of references to other GearItems)
- **Dependency Link**: Represents a relationship between a main item and an accessory item. Contains reference from parent to child item.
- **Loadout**: Existing entity that triggers dependency detection when items are added

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create dependency links between gear items in under 30 seconds
- **SC-002**: Users are notified of missing dependencies 100% of the time when adding a main item with links to a loadout
- **SC-003**: Users can add all missing dependencies to a loadout with a single action
- **SC-004**: Zero duplicate items appear in loadouts when dependencies are added
- **SC-005**: Users can manage (add/remove) dependency links without navigating away from the Gear Editor
- **SC-006**: System prevents packing errors by ensuring linked accessories are either added or explicitly declined by the user

## Clarifications

### Session 2025-12-09

- Q: Should dependencies be transitive (dependencies of dependencies)? → A: Yes, recursively suggest all nested dependencies
- Q: How should dependency notifications appear in the loadout builder? → A: Modal dialog with "Add All" / "Select" / "Skip" buttons
- Q: Should there be a maximum limit on linked accessories per item? → A: No limit

## Assumptions

- Users have an existing gear inventory with items they want to link
- The Gear Editor already supports editing gear item properties
- The Loadout Builder already supports adding items from the inventory
- Dependency relationships are stored at the gear item level (not loadout level)
- A gear item can be both a "main item" with dependencies AND an "accessory" to another item (flexible hierarchy)
- Dependencies are optional suggestions, not hard requirements (user can decline to add them)
