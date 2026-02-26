# Bulletin Board Rich Content Guide

This document explains how to use rich content features in the Community Bulletin Board.

## Features Implemented

### 1. **Markdown Formatting** ✅

Posts and replies now support standard Markdown syntax:

- **Bold**: `**bold text**` → **bold text**
- *Italic*: `*italic text*` → *italic text*
- Links: `[Link Text](https://example.com)` → [Link Text](https://example.com)

### 2. **YouTube Video Previews** ✅

Simply paste a YouTube URL on its own line and it will automatically render as a rich preview with:
- Video thumbnail
- Video title
- Channel name
- Clickable play button

**Supported formats:**
```
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://www.youtube.com/embed/VIDEO_ID
```

**Example:**
```
Check out this video:

https://www.youtube.com/watch?v=Lu6pCBrMFAI

It's really helpful!
```

### 3. **VIP Profile Mentions** ✅

Link to VIP profiles using markdown link syntax with the `/vip/` path:

**Syntax:**
```markdown
[VIP Name](/vip/slug)
```

**Example:**
```markdown
[Robert Klink](/vip/robert-klink) has great gear recommendations!
```

This renders as a clickable link with a user icon that takes you directly to the VIP's profile page.

### 4. **Gear Item References** ✅

Reference gear items from the catalog using the `#gear:` syntax:

**Syntax:**
```markdown
[Gear Item Name](#gear:item-id)
```

**Example:**
```markdown
I'm using the [Flexgear Zero Power](#gear:flexgear-zero-power-10000) on my trips.
```

This renders as a card with:
- Gear item icon
- Item name
- "Add" button to quickly add to inventory or wishlist

## Usage Examples

### Complete Post Example:

```markdown
[Robert Klink](/vip/robert-klink) just posted a great video about the **Flexgear Zero Power** powerbank!

https://www.youtube.com/watch?v=Lu6pCBrMFAI

This is probably the lightest 10,000 mAh powerbank on the market. You can find it here:

[Flexgear Zero Power 10000](#gear:flexgear-zero-power-10000)

What do you all think? Anyone tried it yet?
```

This will render with:
1. A clickable VIP mention link
2. Bold text for "Flexgear Zero Power"
3. A YouTube video preview card
4. A gear item reference card with quick actions

## Technical Implementation

### Components Created:
- `RichContentRenderer.tsx` - Main content parser and renderer
- `YouTubePreview.tsx` - YouTube video embed preview
- `VipMention.tsx` - VIP profile link component
- `GearItemReference.tsx` - Gear item reference card

### Integration:
- `PostCard.tsx` - Updated to use `RichContentRenderer`
- `ReplyThread.tsx` - Updated to use `RichContentRenderer` for replies

### Features:
- Automatic YouTube URL detection and preview generation via oEmbed API
- Markdown rendering with `react-markdown`
- Special syntax parsing for VIP and gear references
- Internationalized routing support
- External links open in new tabs
- Responsive design with dark mode support

## Future Enhancements

Potential improvements for future iterations:

1. **Auto-detection of VIP names** - Detect VIP names in natural text and auto-link them
2. **Gear item search** - Autocomplete when typing gear item references
3. **Link preview cards** - Generate preview cards for external website links
4. **Image uploads** - Support inline image uploads in posts
5. **@mention autocomplete** - Autocomplete dropdown when typing @mentions
6. **Emoji support** - Emoji picker and rendering
