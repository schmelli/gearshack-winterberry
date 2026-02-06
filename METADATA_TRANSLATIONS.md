# Metadata Translation Keys

Translation keys required for OpenGraph/SEO metadata added to pages.
These keys need to be added to both `messages/en.json` and `messages/de.json`.

## Landing Page (`Landing.meta`)

| Key | EN Value | DE Value |
|-----|----------|----------|
| `Landing.meta.title` | `Gearshack - Outdoor Gear Management` | `Gearshack - Outdoor-Ausr\u00fcstungsverwaltung` |
| `Landing.meta.description` | `Organize, track, and optimize your outdoor gear. Build loadouts, manage your inventory, and connect with the gear community.` | `Organisiere, verfolge und optimiere deine Outdoor-Ausr\u00fcstung. Erstelle Packlisten, verwalte dein Inventar und verbinde dich mit der Gear-Community.` |

## Community Page (`Community.meta`)

| Key | EN Value | DE Value |
|-----|----------|----------|
| `Community.meta.title` | `Community Hub - Gearshack` | `Community Hub - Gearshack` |
| `Community.meta.description` | `Join the Gearshack community. Share gear reviews, discuss loadouts, and connect with fellow outdoor enthusiasts.` | `Tritt der Gearshack-Community bei. Teile Ausr\u00fcstungsbewertungen, diskutiere Packlisten und vernetze dich mit anderen Outdoor-Enthusiasten.` |

## Loadouts Page (`Loadouts.meta`)

| Key | EN Value | DE Value |
|-----|----------|----------|
| `Loadouts.meta.title` | `My Loadouts - Gearshack` | `Meine Packlisten - Gearshack` |
| `Loadouts.meta.description` | `Create and manage your gear loadouts. Optimize pack weight and organize equipment for every adventure.` | `Erstelle und verwalte deine Packlisten. Optimiere das Packgewicht und organisiere Ausr\u00fcstung f\u00fcr jedes Abenteuer.` |

## Admin Dashboard (`Admin.dashboard`)

| Key | EN Value | DE Value |
|-----|----------|----------|
| `Admin.dashboard.metaDescription` | `Gearshack administration dashboard. Manage users, content, and platform settings.` | `Gearshack-Administrations-Dashboard. Verwalte Benutzer, Inhalte und Plattformeinstellungen.` |

**Note:** The `Admin.dashboard.pageTitle` key already exists and is reused.

## Already Existing Keys (no changes needed)

The following pages use translation keys that already exist in the message files:

- **VIP Directory** (`vip.directory.metaTitle`, `vip.directory.metaDescription`) - already existed
- **VIP Profile** (`vip.profile.metaTitle`, `vip.profile.metaDescription`) - already existed with OpenGraph
- **VIP Loadout Detail** (`vip.loadout.metaTitle`, `vip.loadout.metaDescription`) - already existed with OpenGraph
- **Merchant Loadouts Browse** (`MerchantLoadouts.pageTitle`, `MerchantLoadouts.pageDescription`) - already existed
- **Merchant Loadout Detail** - already existed with full OpenGraph and dynamic data

## Pages NOT Updated (limitations)

- **Inventory Page** (`/inventory/page.tsx`): Both the page and its `layout.tsx` are `'use client'` components, so `generateMetadata` cannot be exported from either. The root layout provides the fallback title "Gearshack". To add page-specific metadata, the inventory layout would need to be refactored into a server component, which is outside the scope of this change.
