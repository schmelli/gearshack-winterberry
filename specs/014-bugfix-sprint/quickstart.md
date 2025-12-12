# Quickstart: Final Polish & Bugfix Sprint

**Feature**: 014-bugfix-sprint
**Date**: 2025-12-05

## Prerequisites

- Node.js 18+
- npm installed
- Access to repository

## Setup

```bash
# Switch to feature branch
git checkout 014-bugfix-sprint

# Install dependencies
npm install

# Start dev server
npm run dev
```

## Files to Modify

| File | Changes |
|------|---------|
| `components/auth/BackgroundRotator.tsx` | Remove rotation, fix viewport |
| `components/layout/SyncIndicator.tsx` | Update icon colors to white |
| `components/layout/UserMenu.tsx` | Update button styling |
| `components/gear-editor/GearEditorForm.tsx` | Pill tabs, validation toast |
| `components/gear-editor/sections/GeneralInfoSection.tsx` | Required asterisk |
| `components/gear-editor/sections/MediaSection.tsx` | Image search popover |
| `hooks/useGearEditor.ts` | Validation trigger on save |

## Key Patterns

### 1. Static Random Background

```typescript
// Instead of rotation interval, select once on mount:
const [imageIndex] = useState(() =>
  Math.floor(Math.random() * images.length)
);
// Use images[imageIndex] for display
```

### 2. Full Viewport Background

```typescript
// Use fixed positioning with full screen dimensions:
<div className="fixed inset-0 w-screen h-screen -z-10">
  <Image
    src={selectedImage}
    fill
    className="object-cover"
    sizes="100vw"
  />
</div>
```

### 3. Validation Toast on Save

```typescript
// In handleSubmit, trigger validation first:
const isValid = await form.trigger();
if (!isValid) {
  toast.error('Please fix errors before saving');
  return;
}
// Proceed with actual submission
```

### 4. Required Field Asterisk

```typescript
<FormLabel>
  Name <span className="text-destructive">*</span>
</FormLabel>
```

### 5. White Header Icons

```typescript
// SyncIndicator - use white for all states:
return <Cloud className="h-4 w-4 text-white" />;

// Syncing state - white with animation:
return <Loader2 className="h-4 w-4 text-white animate-spin" />;
```

### 6. Pill-Style Tabs

```typescript
<TabsList className="bg-muted rounded-full p-1">
  <TabsTrigger className="rounded-full data-[state=active]:bg-background">
    Tab Name
  </TabsTrigger>
</TabsList>
```

### 7. Image Search Popover

```typescript
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">
      <Search className="w-4 h-4" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-64">
    <p className="text-sm text-muted-foreground">
      Image Search coming in V2
    </p>
  </PopoverContent>
</Popover>
```

## Testing Checklist

1. [ ] Login page shows static background (no rotation)
2. [ ] No white bars on login page at any viewport size
3. [ ] Header icons (bell, sync, avatar) are white/visible
4. [ ] Gear editor tabs have pill styling
5. [ ] Clicking Save with empty Name shows error toast
6. [ ] Required Name field has red asterisk
7. [ ] Image upload completes before form saves
8. [ ] Search icon in media section opens popover

## Validation Commands

```bash
# Check for lint errors
npm run lint

# Verify build passes
npm run build

# Run dev server for manual testing
npm run dev
```
