# Community Features Documentation

**Dokumentationsversion:** 1.0
**Letzte Aktualisierung:** 2026-02-06
**Features:** 001-community-shakedowns, 051-community-bulletin-board, 056-community-hub-enhancements

---

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Shakedowns - Expert Feedback System](#shakedowns---expert-feedback-system)
3. [Marketplace - Gear Trading Platform](#marketplace---gear-trading-platform)
4. [Bulletin Board - Community Discussions](#bulletin-board---community-discussions)
5. [Integration Points](#integration-points)
6. [Security & Performance](#security--performance)
7. [Best Practices](#best-practices)

---

## Übersicht

Die Community Features in Gearshack Winterberry umfassen drei eng verzahnte Subsysteme, die zusammen eine lebendige Outdoor-Community ermöglichen:

### **1. Shakedowns** (Expert Feedback System)
- **Zweck**: Experten-Feedback zu Loadout-Konfigurationen vor Trips
- **Kernfunktionen**: Trip-Kontext, Experience Levels, Privacy Settings, Helpful Votes, Badge System
- **Use Case**: "Ich plane einen 5-tägigen Backpacking-Trip - ist mein Loadout optimal?"

### **2. Marketplace** (Gear Trading Platform)
- **Zweck**: Peer-to-peer Gear-Austausch (Verkauf, Tausch, Leihe)
- **Kernfunktionen**: Listing Management, Type Filtering, Search, Seller Profiles
- **Use Case**: "Ich verkaufe mein altes Zelt und suche einen leichteren Schlafsack"

### **3. Bulletin Board** (Community Discussions)
- **Zweck**: Allgemeine Community-Diskussionen und Fragen
- **Kernfunktionen**: Posts, Replies (2-level nesting), Tagging, Moderation, Reports
- **Use Case**: "Hat jemand Erfahrung mit Trail X im Winter?"

### Gemeinsame Architektur-Patterns

Alle drei Features folgen denselben architektonischen Prinzipien:

- **Feature-Sliced Light**: Business Logic in Hooks, stateless UI Components
- **Cursor-Based Pagination**: Effizientes Infinite Scroll mit Timestamp-Cursors
- **Optimistic Updates**: Sofortiges UI-Feedback mit Rollback bei Fehlern
- **Rate Limiting**: PostgreSQL-basierte Rate Limits für Content Creation
- **RLS (Row-Level Security)**: Supabase-native Zugriffskontrollen
- **i18n-Ready**: Alle Labels über `next-intl` internationalisiert

---

## Shakedowns - Expert Feedback System

### Core Concepts

**Shakedowns** sind Feedback-Anfragen für Loadouts vor einem geplanten Trip. Der Begriff stammt aus der Outdoor-Community und bedeutet, die Ausrüstung kritisch zu hinterfragen ("durchzuschütteln"), um Gewicht zu sparen und Ausrüstungsfehler zu vermeiden.

#### Key Features

1. **Trip Context**: Shakedowns sind immer mit einem Trip verknüpft (Start/End Date, Name)
2. **Experience Levels**: Beginner → Intermediate → Experienced → Expert (beeinflusst Feedback-Erwartungen)
3. **Privacy Settings**: Public (alle sehen), Friends Only (nur Freunde), Private (nur über Share Token)
4. **Feedback Tree**: 3-Level nested Feedback mit Parent-Child-Beziehungen
5. **Helpful Votes**: Community kann hilfreiche Feedbacks markieren
6. **Badge System**: Reputation durch Badges (Shakedown Helper, Trail Expert, Community Legend)
7. **Status Workflow**: Open → Completed → Archived (nach 90 Tagen)

### TypeScript-Typen

```typescript
// types/shakedown.ts

// Core Entity
export interface Shakedown {
  id: string;
  ownerId: string;
  loadoutId: string;
  tripName: string;
  tripStartDate: string;
  tripEndDate: string;
  experienceLevel: ExperienceLevel; // 'beginner' | 'intermediate' | 'experienced' | 'expert'
  concerns: string | null;          // Spezifische Bedenken des Users
  privacy: ShakedownPrivacy;        // 'public' | 'friends_only' | 'private'
  shareToken: string | null;        // Für private Shakedowns (32-char token)
  status: ShakedownStatus;          // 'open' | 'completed' | 'archived'
  feedbackCount: number;            // Denormalisiert für Performance
  helpfulCount: number;             // Anzahl Helpful Votes über alle Feedbacks
  isHidden: boolean;                // Moderator-Hide
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
}

// Erweiterte Version mit Author Info (für UI)
export interface ShakedownWithAuthor extends Shakedown {
  authorName: string;
  authorAvatar: string | null;
  loadoutName: string;
  totalWeightGrams: number;
  itemCount: number;
}

// Feedback (3-Level Nesting)
export interface ShakedownFeedback {
  id: string;
  shakedownId: string;
  authorId: string;
  parentId: string | null;          // Für Reply-Threading
  gearItemId: string | null;        // Optional: Feedback zu spezifischem Item
  content: string;
  contentHtml: string | null;       // Pre-rendered HTML (Markdown)
  depth: 1 | 2 | 3;                 // Max 3 Ebenen
  helpfulCount: number;
  isHidden: boolean;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Feedback Tree Node (für UI)
export interface FeedbackNode extends FeedbackWithAuthor {
  children: FeedbackNode[];
}

// Badges
export type ShakedownBadge = 'shakedown_helper' | 'trail_expert' | 'community_legend';

// Konstanten
export const SHAKEDOWN_CONSTANTS = {
  MAX_CONTENT_LENGTH: 2000,         // Max. Feedback-Länge
  MAX_REPLY_DEPTH: 3,               // Max. Nesting-Level
  EDIT_WINDOW_MINUTES: 30,          // Edit-Zeitfenster
  DAILY_FEEDBACK_LIMIT: 50,         // Rate Limit
  ITEMS_PER_PAGE: 20,
  ARCHIVE_AFTER_DAYS: 90,
  BADGE_THRESHOLDS: {
    shakedown_helper: 10,           // 10 Helpful Votes
    trail_expert: 50,               // 50 Helpful Votes
    community_legend: 100,          // 100 Helpful Votes
  },
} as const;
```

### Database Schema

#### Haupttabellen

```sql
-- shakedowns (Core Table)
CREATE TABLE shakedowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,
  trip_name VARCHAR(100) NOT NULL,
  trip_start_date DATE NOT NULL,
  trip_end_date DATE NOT NULL,
  experience_level experience_level NOT NULL, -- ENUM
  concerns TEXT,
  privacy shakedown_privacy NOT NULL DEFAULT 'friends_only', -- ENUM
  share_token VARCHAR(32) UNIQUE,
  status shakedown_status NOT NULL DEFAULT 'open', -- ENUM
  feedback_count INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

-- Indexes für Performance
CREATE INDEX idx_shakedowns_owner ON shakedowns(owner_id);
CREATE INDEX idx_shakedowns_status ON shakedowns(status);
CREATE INDEX idx_shakedowns_created_at ON shakedowns(created_at DESC);
CREATE INDEX idx_shakedowns_privacy ON shakedowns(privacy);
CREATE INDEX idx_shakedowns_share_token ON shakedowns(share_token) WHERE share_token IS NOT NULL;

-- shakedown_feedback (Nested Comments)
CREATE TABLE shakedown_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shakedown_id UUID NOT NULL REFERENCES shakedowns(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES shakedown_feedback(id) ON DELETE CASCADE,
  gear_item_id UUID REFERENCES gear_items(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (length(content) <= 2000),
  content_html TEXT,
  depth INTEGER NOT NULL CHECK (depth BETWEEN 1 AND 3),
  helpful_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_shakedown ON shakedown_feedback(shakedown_id);
CREATE INDEX idx_feedback_parent ON shakedown_feedback(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_feedback_author ON shakedown_feedback(author_id);

-- shakedown_helpful_votes (1 Vote pro User pro Feedback)
CREATE TABLE shakedown_helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES shakedown_feedback(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(feedback_id, voter_id)
);

-- shakedown_bookmarks (User kann Shakedowns bookmarken)
CREATE TABLE shakedown_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shakedown_id UUID NOT NULL REFERENCES shakedowns(id) ON DELETE CASCADE,
  note TEXT CHECK (length(note) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, shakedown_id)
);

-- shakedown_badges (Reputation System)
CREATE TABLE shakedown_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type shakedown_badge NOT NULL, -- ENUM
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);
```

#### Database Views

```sql
-- v_shakedowns_with_author (Performance-optimierte View für Feed)
CREATE VIEW v_shakedowns_with_author AS
SELECT
  s.*,
  p.display_name AS author_name,
  p.avatar_url AS author_avatar,
  l.name AS loadout_name,
  l.total_weight_grams,
  (SELECT COUNT(*) FROM loadout_items WHERE loadout_id = s.loadout_id) AS item_count
FROM shakedowns s
JOIN profiles p ON s.owner_id = p.id
JOIN loadouts l ON s.loadout_id = l.id
WHERE s.is_hidden = false;

-- v_feedback_with_author (Für Feedback-Listen)
CREATE VIEW v_feedback_with_author AS
SELECT
  f.*,
  p.display_name AS author_name,
  p.avatar_url AS author_avatar,
  (SELECT SUM(helpful_count) FROM shakedown_feedback WHERE author_id = f.author_id) AS author_reputation,
  gi.name AS gear_item_name
FROM shakedown_feedback f
JOIN profiles p ON f.author_id = p.id
LEFT JOIN gear_items gi ON f.gear_item_id = gi.id
WHERE f.is_hidden = false;
```

#### RLS Policies

```sql
-- Shakedowns: Read Access
CREATE POLICY "shakedown_read" ON shakedowns FOR SELECT USING (
  -- Public shakedowns: Jeder kann sehen
  privacy = 'public'
  OR
  -- Friends Only: Nur Freunde + Owner
  (privacy = 'friends_only' AND (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM friendships
      WHERE (user_id = auth.uid() AND friend_id = owner_id)
         OR (user_id = owner_id AND friend_id = auth.uid())
    )
  ))
  OR
  -- Private: Nur Owner (Share Token wird über separate Query validiert)
  (privacy = 'private' AND owner_id = auth.uid())
);

-- Shakedowns: Write Access
CREATE POLICY "shakedown_write" ON shakedowns FOR ALL USING (owner_id = auth.uid());

-- Feedback: Read Access (erbt Privacy vom Shakedown)
CREATE POLICY "feedback_read" ON shakedown_feedback FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM shakedowns
    WHERE id = shakedown_id
    AND (
      privacy = 'public'
      OR (privacy = 'friends_only' AND ...)
      OR (privacy = 'private' AND owner_id = auth.uid())
    )
  )
);

-- Feedback: Write Access (nur bei Open-Status)
CREATE POLICY "feedback_write" ON shakedown_feedback FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM shakedowns
    WHERE id = shakedown_id
    AND status = 'open'
    AND (privacy = 'public' OR ...)
  )
  AND author_id = auth.uid()
);
```

### Hooks & Queries

#### useShakedowns Hook (Feed Management)

```typescript
// hooks/shakedowns/useShakedowns.ts

export interface UseShakedownsReturn {
  shakedowns: ShakedownWithAuthor[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  sort: SortOption; // 'recent' | 'popular' | 'unanswered'
  setSort: (sort: SortOption) => void;
  filters: ShakedownFilters;
  setFilters: (filters: ShakedownFilters) => void;
  prependShakedown: (shakedown: ShakedownWithAuthor) => void;
  replaceShakedown: (tempId: string, shakedown: ShakedownWithAuthor) => void;
  removeShakedown: (id: string) => void;
}

export function useShakedowns(
  initialSort: SortOption = 'recent',
  initialFilters: ShakedownFilters = {}
): UseShakedownsReturn {
  const [shakedowns, setShakedowns] = useState<ShakedownWithAuthor[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [filters, setFilters] = useState<ShakedownFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Race Condition Prevention
  const fetchIdRef = useRef(0);

  const fetchInitial = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(sort, filters, null);
      const response = await fetch(`/api/shakedowns?${queryString}`);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: PaginatedShakedowns = await response.json();

      // Ignore stale responses
      if (fetchId !== fetchIdRef.current) return;

      setShakedowns(data.shakedowns);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (err) {
      if (fetchId === fetchIdRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [sort, filters]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !cursor) return;

    setIsLoadingMore(true);

    try {
      const queryString = buildQueryString(sort, filters, cursor);
      const response = await fetch(`/api/shakedowns?${queryString}`);
      const data: PaginatedShakedowns = await response.json();

      setShakedowns(prev => [...prev, ...data.shakedowns]);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoadingMore(false);
    }
  }, [sort, filters, cursor, isLoadingMore, hasMore]);

  // Optimistic Updates
  const prependShakedown = useCallback((shakedown: ShakedownWithAuthor) => {
    setShakedowns(prev => [shakedown, ...prev]);
  }, []);

  const replaceShakedown = useCallback((tempId: string, shakedown: ShakedownWithAuthor) => {
    setShakedowns(prev => prev.map(s => s.id === tempId ? shakedown : s));
  }, []);

  const removeShakedown = useCallback((id: string) => {
    setShakedowns(prev => prev.filter(s => s.id !== id));
  }, []);

  // Auto-fetch on mount and filter/sort changes
  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  return {
    shakedowns,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh: fetchInitial,
    sort,
    setSort,
    filters,
    setFilters,
    prependShakedown,
    replaceShakedown,
    removeShakedown,
  };
}
```

#### useShakedownMutations Hook (CRUD Operations)

```typescript
// hooks/shakedowns/useShakedownMutations.ts

export interface UseShakedownMutationsReturn {
  createShakedown: (input: CreateShakedownInput) => Promise<Shakedown>;
  updateShakedown: (id: string, input: UpdateShakedownInput) => Promise<Shakedown>;
  deleteShakedown: (id: string) => Promise<void>;
  completeShakedown: (id: string, helpfulFeedbackIds?: string[]) => Promise<void>;
  reopenShakedown: (id: string) => Promise<void>;
  archiveShakedown: (id: string) => Promise<void>;
  isProcessing: boolean;
  error: string | null;
}

export function useShakedownMutations(): UseShakedownMutationsReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const createShakedown = useCallback(async (input: CreateShakedownInput) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/shakedowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create shakedown');
      }

      const shakedown = await response.json();
      toast({ title: 'Shakedown created', description: 'Your shakedown is now live!' });
      return shakedown;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const completeShakedown = useCallback(async (id: string, helpfulFeedbackIds?: string[]) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/shakedowns/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpfulFeedbackIds }),
      });

      if (!response.ok) throw new Error('Failed to complete shakedown');

      toast({ title: 'Shakedown completed', description: 'Marked as completed!' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  // ... weitere Mutations
}
```

#### useFeedback Hook (Feedback Management)

```typescript
// hooks/shakedowns/useFeedback.ts

export interface UseFeedbackReturn {
  feedback: FeedbackNode[]; // Tree structure
  isLoading: boolean;
  error: Error | null;
  addFeedback: (input: CreateFeedbackInput) => Promise<void>;
  updateFeedback: (id: string, content: string) => Promise<void>;
  deleteFeedback: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFeedback(shakedownId: string): UseFeedbackReturn {
  const [feedback, setFeedback] = useState<FeedbackNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/shakedowns/${shakedownId}/feedback`);
      if (!response.ok) throw new Error('Failed to fetch feedback');

      const data: FeedbackWithAuthor[] = await response.json();

      // Build tree structure using utility function
      const tree = buildFeedbackTree(data);
      setFeedback(tree);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [shakedownId]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  return { feedback, isLoading, error, addFeedback, updateFeedback, deleteFeedback, refresh: fetchFeedback };
}
```

### Utility Functions

```typescript
// lib/shakedown-utils.ts

/**
 * Builds a tree structure from flat feedback array
 */
export function buildFeedbackTree(feedback: FeedbackWithAuthor[]): FeedbackNode[] {
  const map = new Map<string, FeedbackNode>();
  const roots: FeedbackNode[] = [];

  // First pass: create nodes with empty children arrays
  feedback.forEach((f) => {
    map.set(f.id, { ...f, children: [] });
  });

  // Second pass: build tree by linking children to parents
  feedback.forEach((f) => {
    const node = map.get(f.id)!;
    if (f.parentId) {
      const parent = map.get(f.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node); // Orphaned node
      }
    } else {
      roots.push(node);
    }
  });

  // Sort children by createdAt (oldest first for natural conversation flow)
  const sortChildren = (nodes: FeedbackNode[]) => {
    nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    nodes.forEach((node) => sortChildren(node.children));
  };
  sortChildren(roots);

  return roots;
}

/**
 * Checks if feedback can still be edited (within 30-minute window)
 */
export function canEditFeedback(createdAt: string): boolean {
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const windowMs = SHAKEDOWN_CONSTANTS.EDIT_WINDOW_MINUTES * 60 * 1000;
  return now - createdTime < windowMs;
}

/**
 * Formats shakedown date range for display
 * @example "Dec 15-20, 2025" (same month/year)
 * @example "Dec 15 - Jan 5, 2025" (different months)
 * @example "Dec 28, 2025 - Jan 5, 2026" (different years)
 */
export function formatShakedownDateRange(
  startDate: string,
  endDate: string,
  locale: string = 'en-US'
): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString(locale, { month: 'short' })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
    } else {
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return `${start.toLocaleDateString(locale, options)} - ${end.toLocaleDateString(locale, options)}, ${start.getFullYear()}`;
    }
  } else {
    const fullOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${start.toLocaleDateString(locale, fullOptions)} - ${end.toLocaleDateString(locale, fullOptions)}`;
  }
}

/**
 * Generates a cryptographically secure random share token for private shakedowns
 */
export function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomValues = new Uint32Array(32);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(randomValues[i] % chars.length);
    }
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return token;
}
```

### Rate Limiting & Moderation

#### PostgreSQL RPC Functions

```sql
-- Rate Limit Check (50 Feedbacks pro Tag pro User)
CREATE OR REPLACE FUNCTION check_shakedown_feedback_rate_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  feedback_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO feedback_count
  FROM shakedown_feedback
  WHERE author_id = p_user_id
  AND created_at > now() - INTERVAL '24 hours';

  RETURN feedback_count < 50; -- DAILY_FEEDBACK_LIMIT
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatic Archival (Database Trigger)
CREATE OR REPLACE FUNCTION auto_archive_completed_shakedowns()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status = 'completed'
     AND NEW.completed_at IS NOT NULL
     AND NEW.completed_at < now() - INTERVAL '90 days'
     AND NEW.archived_at IS NULL THEN
    NEW.archived_at := now();
    NEW.status := 'archived';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_archive_shakedowns
BEFORE UPDATE ON shakedowns
FOR EACH ROW
EXECUTE FUNCTION auto_archive_completed_shakedowns();

-- Badge Award Trigger (automatische Badge-Vergabe bei 10/50/100 Helpful Votes)
CREATE OR REPLACE FUNCTION award_shakedown_badges()
RETURNS TRIGGER AS $$
DECLARE
  total_helpful INTEGER;
  feedback_author UUID;
BEGIN
  -- Get feedback author
  SELECT author_id INTO feedback_author
  FROM shakedown_feedback
  WHERE id = NEW.feedback_id;

  -- Count total helpful votes for author
  SELECT SUM(helpful_count) INTO total_helpful
  FROM shakedown_feedback
  WHERE author_id = feedback_author;

  -- Award badges based on thresholds
  IF total_helpful >= 100 THEN
    INSERT INTO shakedown_badges (user_id, badge_type)
    VALUES (feedback_author, 'community_legend')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  ELSIF total_helpful >= 50 THEN
    INSERT INTO shakedown_badges (user_id, badge_type)
    VALUES (feedback_author, 'trail_expert')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  ELSIF total_helpful >= 10 THEN
    INSERT INTO shakedown_badges (user_id, badge_type)
    VALUES (feedback_author, 'shakedown_helper')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_shakedown_badges
AFTER INSERT ON shakedown_helpful_votes
FOR EACH ROW
EXECUTE FUNCTION award_shakedown_badges();
```

### API Routes

```typescript
// app/api/shakedowns/route.ts
// GET /api/shakedowns - List shakedowns with filters
// POST /api/shakedowns - Create new shakedown

// app/api/shakedowns/[id]/route.ts
// GET /api/shakedowns/[id] - Get single shakedown
// PATCH /api/shakedowns/[id] - Update shakedown
// DELETE /api/shakedowns/[id] - Delete shakedown

// app/api/shakedowns/[id]/feedback/route.ts
// GET /api/shakedowns/[id]/feedback - List feedback for shakedown
// POST /api/shakedowns/[id]/feedback - Add feedback

// app/api/shakedowns/[id]/complete/route.ts
// POST /api/shakedowns/[id]/complete - Mark as completed

// app/api/shakedowns/[id]/helpful/route.ts
// POST /api/shakedowns/[id]/helpful - Toggle helpful vote
```

---

## Marketplace - Gear Trading Platform

### Core Concepts

Der **Marketplace** ermöglicht Peer-to-peer Gear-Austausch durch Listing-Management für drei Listing-Typen:

1. **For Sale** (Verkauf): Gear Items mit Preis und Condition
2. **For Trade** (Tausch): Gear Items für Trade-Anfragen
3. **For Borrow** (Leihe): Gear Items temporär verfügbar machen

#### Key Features

- **Listing Types**: Boolean Flags auf Gear Items (is_for_sale, can_be_traded, can_be_borrowed)
- **Filtering**: Type, Search (Name/Brand), Sorting (Date, Price, Name)
- **Cursor-Based Pagination**: Timestamp-basiert für effizientes Infinite Scroll
- **Seller Profiles**: Zugriff auf Seller Profile über Listings
- **Private Messaging**: Integration mit Messaging-System für Kontaktaufnahme
- **No Transactions**: Marketplace ist nur Discovery - Transaktionen extern

### TypeScript-Typen

```typescript
// types/marketplace.ts

export type ListingType = 'for_sale' | 'for_trade' | 'for_borrow';
export type ListingTypeFilter = 'all' | ListingType;
export type MarketplaceSortField = 'date' | 'price' | 'name';
export type MarketplaceSortOrder = 'asc' | 'desc';

export interface MarketplaceListing {
  id: string;                        // Gear Item ID
  name: string;
  brand: string | null;
  primaryImageUrl: string | null;
  condition: string;                 // 'new' | 'like_new' | 'good' | 'fair' | 'worn'
  pricePaid: number | null;          // Original purchase price (EUR Cents)
  currency: string | null;           // 'EUR' | 'USD'
  isForSale: boolean;
  canBeTraded: boolean;
  canBeBorrowed: boolean;
  listedAt: string;                  // Timestamp (used as cursor)
  sellerId: string;
  sellerName: string;
  sellerAvatar: string | null;
}

export interface MarketplaceFilters {
  type: ListingTypeFilter;           // 'all' | 'for_sale' | 'for_trade' | 'for_borrow'
  sortBy: MarketplaceSortField;      // 'date' | 'price' | 'name'
  sortOrder: MarketplaceSortOrder;   // 'asc' | 'desc'
  search?: string;                   // Full-text search on name/brand
}

export interface MarketplaceState {
  listings: MarketplaceListing[];
  hasMore: boolean;
  nextCursor: string | null;
  loadingState: 'idle' | 'loading' | 'loading-more' | 'error';
  error: string | null;
  filters: MarketplaceFilters;
}

export const MARKETPLACE_CONSTANTS = {
  ITEMS_PER_PAGE: 12,
  MAX_SEARCH_LENGTH: 100,
} as const;
```

### Database Schema

#### View: v_marketplace_listings

Der Marketplace verwendet **keine separate Tabelle**, sondern eine **View auf gear_items**:

```sql
CREATE VIEW v_marketplace_listings AS
SELECT
  gi.id,
  gi.name,
  gi.brand,
  gi.primary_image_url,
  gi.condition,
  gi.price_paid,
  gi.currency,
  gi.is_for_sale,
  gi.can_be_traded,
  gi.can_be_borrowed,
  gi.updated_at AS listed_at,        -- Timestamp als Cursor
  gi.user_id AS seller_id,
  p.display_name AS seller_name,
  p.avatar_url AS seller_avatar
FROM gear_items gi
JOIN profiles p ON gi.user_id = p.id
WHERE
  gi.status = 'own'                  -- Nur Items im Besitz
  AND (                              -- Mindestens ein Listing-Flag aktiv
    gi.is_for_sale = true
    OR gi.can_be_traded = true
    OR gi.can_be_borrowed = true
  );

-- Indexes auf gear_items (für View-Performance)
CREATE INDEX idx_gear_items_listing_flags ON gear_items(is_for_sale, can_be_traded, can_be_borrowed)
WHERE status = 'own';

CREATE INDEX idx_gear_items_updated_at ON gear_items(updated_at DESC)
WHERE status = 'own';
```

#### RLS Policies

```sql
-- gear_items table (existing policies apply)
-- Marketplace View erbt Policies von gear_items:
-- - Jeder kann public gear_items sehen (wenn privacy_setting = 'public')
-- - Private Items nur vom Owner sichtbar

-- Additional Policy für Marketplace Listings
CREATE POLICY "marketplace_listings_visible" ON gear_items FOR SELECT
USING (
  status = 'own'
  AND (is_for_sale = true OR can_be_traded = true OR can_be_borrowed = true)
  AND privacy_setting = 'public'  -- Nur öffentliche Items im Marketplace
);
```

### Hooks & Queries

#### useMarketplace Hook

```typescript
// hooks/marketplace/useMarketplace.ts

export interface UseMarketplaceReturn {
  listings: MarketplaceListing[];
  hasMore: boolean;
  loadingState: 'idle' | 'loading' | 'loading-more' | 'error';
  error: string | null;
  filters: ReturnType<typeof useMarketplaceFilters>;
  loadListings: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useMarketplace(): UseMarketplaceReturn {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const filters = useMarketplaceFilters(); // URL-synced filters

  const [state, setState] = useState<MarketplaceState>({
    listings: [],
    hasMore: true,
    nextCursor: null,
    loadingState: 'idle',
    error: null,
    filters: filters.filters,
  });

  const requestIdRef = useRef(0); // Race condition prevention

  const loadListings = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setState((prev) => ({ ...prev, loadingState: 'loading', error: null }));

    try {
      const result = await fetchMarketplaceListings(supabase, {
        type: filters.filters.type,
        sortBy: filters.filters.sortBy,
        sortOrder: filters.filters.sortOrder,
        search: filters.filters.search,
        limit: MARKETPLACE_CONSTANTS.ITEMS_PER_PAGE,
        excludeUserId: user?.id, // Don't show own listings
      });

      if (currentRequestId !== requestIdRef.current) return; // Stale request

      setState((prev) => ({
        ...prev,
        listings: result.listings,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        loadingState: 'idle',
      }));
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;
      setState((prev) => ({
        ...prev,
        loadingState: 'error',
        error: err instanceof Error ? err.message : 'Failed to load listings',
      }));
    }
  }, [supabase, filters.filters, user?.id]);

  const loadMore = useCallback(async () => {
    if (state.loadingState !== 'idle' || !state.hasMore || !state.nextCursor) return;

    setState((prev) => ({ ...prev, loadingState: 'loading-more' }));

    try {
      const result = await fetchMarketplaceListings(supabase, {
        type: filters.filters.type,
        sortBy: filters.filters.sortBy,
        sortOrder: filters.filters.sortOrder,
        search: filters.filters.search,
        cursor: state.nextCursor,
        limit: MARKETPLACE_CONSTANTS.ITEMS_PER_PAGE,
        excludeUserId: user?.id,
      });

      setState((prev) => ({
        ...prev,
        listings: [...prev.listings, ...result.listings],
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        loadingState: 'idle',
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loadingState: 'error',
        error: err instanceof Error ? err.message : 'Failed to load more',
      }));
    }
  }, [supabase, filters.filters, state.nextCursor, state.hasMore, state.loadingState, user?.id]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  return { ...state, filters, loadListings, loadMore, refresh: loadListings };
}
```

#### useMarketplaceFilters Hook (URL-Synced Filters)

```typescript
// hooks/marketplace/useMarketplaceFilters.ts

export function useMarketplaceFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo<MarketplaceFilters>(() => ({
    type: (searchParams.get('type') as ListingTypeFilter) || 'all',
    sortBy: (searchParams.get('sortBy') as MarketplaceSortField) || 'date',
    sortOrder: (searchParams.get('sortOrder') as MarketplaceSortOrder) || 'desc',
    search: searchParams.get('search') || undefined,
  }), [searchParams]);

  const setFilters = useCallback((newFilters: Partial<MarketplaceFilters>) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === undefined || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const clearFilters = useCallback(() => {
    router.push('?', { scroll: false });
  }, [router]);

  return { filters, setFilters, clearFilters };
}
```

#### Marketplace Query Functions

```typescript
// lib/supabase/marketplace-queries.ts

/**
 * Escape ILIKE pattern to prevent SQL injection
 * Removes PostgREST special chars: , ( ) .
 */
function escapeILikePattern(pattern: string): string {
  return pattern
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')    // Escape % wildcards
    .replace(/_/g, '\\_')    // Escape _ wildcards
    .replace(/,/g, '')       // Remove commas (PostgREST .or() delimiter)
    .replace(/\(/g, '')      // Remove parentheses (PostgREST grouping)
    .replace(/\)/g, '')      // Remove parentheses
    .replace(/\./g, ' ');    // Replace dots with space (prevents .eq. injection)
}

export async function fetchMarketplaceListings(
  supabase: SupabaseClient<Database>,
  options: MarketplaceQueryOptions = {}
): Promise<MarketplaceResponse> {
  const {
    type = 'all',
    sortBy = 'date',
    sortOrder = 'desc',
    search,
    cursor,
    limit = MARKETPLACE_CONSTANTS.ITEMS_PER_PAGE,
    excludeUserId,
  } = options;

  // Build query using the marketplace view
  let query = supabase
    .from('v_marketplace_listings')
    .select('*')
    .order(sortFieldToColumn[sortBy] || 'listed_at', {
      ascending: sortOrder === 'asc',
    })
    .limit(limit + 1); // +1 to detect hasMore

  // Apply type filter
  if (type !== 'all') {
    const column = typeToColumn[type]; // 'is_for_sale' | 'can_be_traded' | 'can_be_borrowed'
    query = query.eq(column, true);
  }

  // Exclude current user's items
  if (excludeUserId) {
    query = query.neq('seller_id', excludeUserId);
  }

  // Apply search filter (ILIKE on name + brand)
  if (search && search.trim()) {
    const searchTerm = escapeILikePattern(search.trim());
    query = query.or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`);
  }

  // Apply cursor for pagination
  if (cursor) {
    if (sortOrder === 'desc') {
      query = query.lt('listed_at', cursor);
    } else {
      query = query.gt('listed_at', cursor);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch marketplace listings: ${error.message}`);
  }

  const rawListings = data ?? [];
  const hasMore = rawListings.length > limit;

  if (hasMore) {
    rawListings.pop(); // Remove extra item
  }

  const listings = rawListings.map(transformListing);
  const nextCursor = listings.length > 0 ? listings[listings.length - 1].listedAt : null;

  return { listings, hasMore, nextCursor };
}
```

### Integration: Listing Management

#### Toggle Listing Status (auf Gear Item)

```typescript
// hooks/useGearItem.ts (existing hook - extended)

export function useGearItem() {
  const updateListingStatus = useCallback(async (
    itemId: string,
    listingType: ListingType,
    enabled: boolean
  ) => {
    const supabase = createClient();

    const columnMap = {
      for_sale: 'is_for_sale',
      for_trade: 'can_be_traded',
      for_borrow: 'can_be_borrowed',
    };

    const { error } = await supabase
      .from('gear_items')
      .update({ [columnMap[listingType]]: enabled })
      .eq('id', itemId);

    if (error) throw error;
  }, []);

  return { updateListingStatus, /* ... */ };
}
```

#### Contact Seller (via Messaging)

```typescript
// components/marketplace/ContactSellerButton.tsx

export function ContactSellerButton({ listing }: { listing: MarketplaceListing }) {
  const router = useRouter();
  const { createConversation } = useMessaging();

  const handleContact = async () => {
    // Create conversation with seller
    const conversation = await createConversation([listing.sellerId]);

    // Navigate to conversation with pre-filled message
    router.push(`/messages/${conversation.id}?prefill=${encodeURIComponent(
      `Hi! I'm interested in your ${listing.name}.`
    )}`);
  };

  return (
    <Button onClick={handleContact}>
      <MessageCircle className="w-4 h-4 mr-2" />
      Contact Seller
    </Button>
  );
}
```

---

## Bulletin Board - Community Discussions

### Core Concepts

Das **Bulletin Board** ist ein klassisches Forum-System für allgemeine Community-Diskussionen:

#### Key Features

1. **Posts**: Kurze Community-Posts (max. 500 Zeichen) mit Tags
2. **Replies**: 2-Level Nested Replies (Depth 1-2, keine tiefer)
3. **Tagging**: 6 Post Tags (Question, Shakedown, Trade, Trip Planning, Gear Advice, Other)
4. **Linked Content**: Posts können auf Loadouts, Shakedowns, Marketplace Items verlinken
5. **Moderation**: Report System + User Bans (1d, 7d, permanent)
6. **Rate Limiting**: 10 Posts/day, 50 Replies/day (neue Accounts: 3 Posts/day in ersten 7 Tagen)
7. **Edit Window**: 15 Minuten zum Editieren von Posts/Replies
8. **Search**: Full-Text Search mit PostgreSQL tsvector

### TypeScript-Typen

```typescript
// types/bulletin.ts

export type PostTag = 'question' | 'shakedown' | 'trade' | 'trip_planning' | 'gear_advice' | 'other';
export type LinkedContentType = 'loadout' | 'shakedown' | 'marketplace_item';
export type BulletinReportReason = 'spam' | 'harassment' | 'off_topic' | 'other';
export type BulletinReportStatus = 'pending' | 'resolved' | 'dismissed';
export type ModerationAction = 'delete_content' | 'warn_user' | 'ban_1d' | 'ban_7d' | 'ban_permanent' | 'dismiss';

export interface BulletinPost {
  id: string;
  author_id: string;
  content: string;                   // Max. 500 chars
  tag: PostTag | null;
  linked_content_type: LinkedContentType | null;
  linked_content_id: string | null;
  is_deleted: boolean;               // Soft delete
  is_archived: boolean;              // Auto-archived after 90 days
  reply_count: number;               // Denormalized
  created_at: string;
  updated_at: string;
}

export interface BulletinPostWithAuthor extends BulletinPost {
  author_name: string;
  author_avatar: string | null;
}

export interface BulletinReply {
  id: string;
  post_id: string;
  author_id: string;
  parent_reply_id: string | null;    // For nested replies
  content: string;                   // Max. 500 chars
  depth: 1 | 2;                      // Max. 2 levels
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface BulletinReplyWithAuthor extends BulletinReply {
  author_name: string;
  author_avatar: string | null;
}

export interface ReplyNode extends BulletinReplyWithAuthor {
  children: ReplyNode[];             // Für UI-Tree-Rendering
}

export interface UserBulletinBan {
  id: string;
  user_id: string;
  banned_by: string;
  reason: string;
  expires_at: string | null;         // null = permanent
  created_at: string;
}

export const BULLETIN_CONSTANTS = {
  MAX_POST_LENGTH: 500,
  WARNING_THRESHOLD: 450,            // Show warning at 90%
  POSTS_PER_PAGE: 20,
  MAX_REPLY_DEPTH: 2,                // Shallower than Shakedowns (3)
  EDIT_WINDOW_MINUTES: 15,           // Shorter than Shakedowns (30)
  DAILY_POST_LIMIT: 10,
  DAILY_REPLY_LIMIT: 50,
  NEW_ACCOUNT_POST_LIMIT: 3,         // First 7 days
  NEW_ACCOUNT_DAYS: 7,
  ARCHIVE_AFTER_DAYS: 90,
  NOTIFICATION_REPLY_LIMIT: 3,       // Notify author for first 3 replies
} as const;
```

### Database Schema

```sql
-- bulletin_posts (Core Table)
CREATE TABLE bulletin_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) <= 500),
  tag post_tag, -- ENUM: 'question', 'shakedown', 'trade', etc.
  linked_content_type linked_content_type, -- ENUM: 'loadout', 'shakedown', 'marketplace_item'
  linked_content_id UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  reply_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Full-text search (tsvector für performante Suche)
  content_tsvector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', content)
  ) STORED
);

-- Indexes
CREATE INDEX idx_bulletin_posts_author ON bulletin_posts(author_id);
CREATE INDEX idx_bulletin_posts_tag ON bulletin_posts(tag) WHERE tag IS NOT NULL;
CREATE INDEX idx_bulletin_posts_created_at ON bulletin_posts(created_at DESC);
CREATE INDEX idx_bulletin_posts_tsvector ON bulletin_posts USING GIN(content_tsvector);
CREATE INDEX idx_bulletin_posts_linked_content ON bulletin_posts(linked_content_type, linked_content_id)
WHERE linked_content_type IS NOT NULL;

-- bulletin_replies (2-Level Nesting)
CREATE TABLE bulletin_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES bulletin_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES bulletin_replies(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) <= 500),
  depth INTEGER NOT NULL CHECK (depth IN (1, 2)), -- Max. 2 levels
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bulletin_replies_post ON bulletin_replies(post_id);
CREATE INDEX idx_bulletin_replies_parent ON bulletin_replies(parent_reply_id) WHERE parent_reply_id IS NOT NULL;
CREATE INDEX idx_bulletin_replies_author ON bulletin_replies(author_id);

-- bulletin_reports (Moderation)
CREATE TABLE bulletin_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'reply')),
  target_id UUID NOT NULL,
  reason bulletin_report_reason NOT NULL, -- ENUM
  details TEXT CHECK (length(details) <= 500),
  status bulletin_report_status NOT NULL DEFAULT 'pending', -- ENUM
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  action_taken moderation_action, -- ENUM
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(reporter_id, target_type, target_id) -- One report per user per target
);

-- user_bulletin_bans (Ban Management)
CREATE TABLE user_bulletin_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ, -- NULL = permanent ban
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id) -- One active ban per user
);
```

#### Database Views

```sql
-- v_bulletin_posts_with_author (für Feed)
CREATE VIEW v_bulletin_posts_with_author AS
SELECT
  bp.*,
  p.display_name AS author_name,
  p.avatar_url AS author_avatar
FROM bulletin_posts bp
JOIN profiles p ON bp.author_id = p.id
WHERE bp.is_deleted = false;

-- v_bulletin_replies_with_author (für Reply-Listen)
CREATE VIEW v_bulletin_replies_with_author AS
SELECT
  br.*,
  p.display_name AS author_name,
  p.avatar_url AS author_avatar
FROM bulletin_replies br
JOIN profiles p ON br.author_id = p.id
WHERE br.is_deleted = false;
```

### Hooks & Queries

#### useBulletinBoard Hook (Main Feed)

```typescript
// hooks/bulletin/useBulletinBoard.ts

export interface UseBulletinBoardReturn {
  posts: BulletinPostWithAuthor[];
  hasMore: boolean;
  loadingState: 'idle' | 'loading' | 'loading-more' | 'error';
  error: string | null;
  activeTag: PostTag | null;
  searchQuery: string;
  loadPosts: () => Promise<void>;
  loadMore: () => Promise<void>;
  refreshPosts: () => Promise<void>;
  setActiveTag: (tag: PostTag | null) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  addPostOptimistically: (post: BulletinPostWithAuthor) => void;
  removePost: (postId: string) => void;
  updatePost: (postId: string, updates: Partial<BulletinPostWithAuthor>) => void;
}

export function useBulletinBoard(): UseBulletinBoardReturn {
  const supabase = useMemo(() => createClient(), []);
  const { activeTag, searchQuery, setActiveTag, setSearchQuery, clearFilters } = useBulletinFilters();

  const [state, setState] = useState<Omit<BoardState, 'activeTag' | 'searchQuery'>>({
    posts: [],
    hasMore: true,
    nextCursor: null,
    loadingState: 'idle',
    error: null,
  });

  const loadMoreFetchIdRef = useRef(0); // Race condition prevention

  const loadPosts = useCallback(async () => {
    setState((prev) => ({ ...prev, loadingState: 'loading', error: null }));

    try {
      const result = await fetchBulletinPosts(supabase, {
        tag: activeTag ?? undefined,
        search: searchQuery || undefined,
        limit: BULLETIN_CONSTANTS.POSTS_PER_PAGE,
      });

      setState((prev) => ({
        ...prev,
        posts: result.posts,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        loadingState: 'idle',
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loadingState: 'error',
        error: err instanceof Error ? err.message : 'Failed to load posts',
      }));
    }
  }, [supabase, activeTag, searchQuery]);

  const loadMore = useCallback(async () => {
    if (state.loadingState !== 'idle' || !state.hasMore || !state.nextCursor) return;

    const fetchId = ++loadMoreFetchIdRef.current;
    setState((prev) => ({ ...prev, loadingState: 'loading-more' }));

    try {
      const result = await fetchBulletinPosts(supabase, {
        tag: activeTag ?? undefined,
        search: searchQuery || undefined,
        cursor: state.nextCursor,
        limit: BULLETIN_CONSTANTS.POSTS_PER_PAGE,
      });

      if (fetchId !== loadMoreFetchIdRef.current) return; // Stale request

      setState((prev) => ({
        ...prev,
        posts: [...prev.posts, ...result.posts],
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        loadingState: 'idle',
      }));
    } catch (err) {
      if (fetchId !== loadMoreFetchIdRef.current) return;
      setState((prev) => ({
        ...prev,
        loadingState: 'error',
        error: err instanceof Error ? err.message : 'Failed to load more',
      }));
    }
  }, [supabase, activeTag, searchQuery, state.nextCursor, state.hasMore, state.loadingState]);

  // Optimistic Updates
  const addPostOptimistically = useCallback((post: BulletinPostWithAuthor) => {
    setState((prev) => ({ ...prev, posts: [post, ...prev.posts] }));
  }, []);

  const removePost = useCallback((postId: string) => {
    setState((prev) => ({ ...prev, posts: prev.posts.filter(p => p.id !== postId) }));
  }, []);

  const updatePost = useCallback((postId: string, updates: Partial<BulletinPostWithAuthor>) => {
    setState((prev) => ({
      ...prev,
      posts: prev.posts.map(p => p.id === postId ? { ...p, ...updates } : p),
    }));
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return {
    ...state,
    activeTag,
    searchQuery,
    loadPosts,
    loadMore,
    refreshPosts: loadPosts,
    setActiveTag,
    setSearchQuery,
    clearFilters,
    addPostOptimistically,
    removePost,
    updatePost,
  };
}
```

#### usePosts Hook (CRUD Operations)

```typescript
// hooks/bulletin/usePosts.ts

export interface UsePostsReturn {
  createPost: (input: CreatePostInput) => Promise<BulletinPost>;
  updatePost: (postId: string, input: UpdatePostInput) => Promise<BulletinPost>;
  deletePost: (postId: string) => Promise<void>;
  isProcessing: boolean;
  error: PostError | null;
}

export function usePosts(): UsePostsReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<PostError | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();

  const createPost = useCallback(async (input: CreatePostInput) => {
    setIsProcessing(true);
    setError(null);

    try {
      const post = await createBulletinPost(supabase, input);
      toast({ title: 'Post created', description: 'Your post is now live!' });
      return post;
    } catch (err) {
      // Handle specific error types
      if (typeof err === 'object' && err !== null && 'type' in err) {
        const postError = err as PostError;
        setError(postError);

        if (postError.type === 'rate_limit') {
          toast({
            title: 'Rate limit exceeded',
            description: `You can post again after ${new Date(postError.resetAt).toLocaleTimeString()}`,
            variant: 'destructive',
          });
        } else if (postError.type === 'banned') {
          toast({
            title: 'You are banned',
            description: postError.message,
            variant: 'destructive',
          });
        } else if (postError.type === 'duplicate') {
          toast({
            title: 'Duplicate post',
            description: 'You already posted this content',
            variant: 'destructive',
          });
        }

        throw postError;
      }

      const message = err instanceof Error ? err.message : 'Failed to create post';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [supabase, toast]);

  // ... weitere CRUD operations
}
```

#### useReplies Hook (Reply Management)

```typescript
// hooks/bulletin/useReplies.ts

export interface UseRepliesReturn {
  replies: ReplyNode[]; // Tree structure
  isLoading: boolean;
  error: string | null;
  createReply: (input: CreateReplyInput) => Promise<void>;
  updateReply: (replyId: string, content: string) => Promise<void>;
  deleteReply: (replyId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useReplies(postId: string): UseRepliesReturn {
  const [replies, setReplies] = useState<ReplyNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchReplies = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchBulletinReplies(supabase, postId);

      // Build tree structure (2 levels: root replies + nested replies)
      const tree = buildReplyTree(data);
      setReplies(tree);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch replies');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, postId]);

  const createReply = useCallback(async (input: CreateReplyInput) => {
    const reply = await createBulletinReply(supabase, input);

    // Optimistically add reply to tree
    setReplies(prev => {
      if (!input.parent_reply_id) {
        // Root-level reply
        return [...prev, { ...reply, children: [], author_name: 'You', author_avatar: null }];
      } else {
        // Nested reply - find parent and add
        return addReplyToTree(prev, input.parent_reply_id, reply);
      }
    });
  }, [supabase]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  return { replies, isLoading, error, createReply, updateReply, deleteReply, refresh: fetchReplies };
}

// Helper: Build 2-level reply tree
function buildReplyTree(replies: BulletinReplyWithAuthor[]): ReplyNode[] {
  const map = new Map<string, ReplyNode>();
  const roots: ReplyNode[] = [];

  // First pass: create nodes
  replies.forEach((r) => {
    map.set(r.id, { ...r, children: [] });
  });

  // Second pass: link children to parents
  replies.forEach((r) => {
    const node = map.get(r.id)!;
    if (r.parent_reply_id) {
      const parent = map.get(r.parent_reply_id);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node); // Orphaned reply
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
}
```

### Rate Limiting & Moderation

#### PostgreSQL RPC Functions

```sql
-- Rate Limit Check (10 Posts/day, 50 Replies/day)
CREATE OR REPLACE FUNCTION check_bulletin_rate_limit(
  p_user_id UUID,
  p_action_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  post_count INTEGER;
  reply_count INTEGER;
  account_age_days INTEGER;
  post_limit INTEGER;
BEGIN
  -- Calculate account age
  SELECT EXTRACT(days FROM now() - created_at) INTO account_age_days
  FROM auth.users WHERE id = p_user_id;

  -- New accounts (< 7 days): 3 posts/day
  -- Regular accounts: 10 posts/day
  post_limit := CASE
    WHEN account_age_days < 7 THEN 3
    ELSE 10
  END;

  IF p_action_type = 'post' THEN
    SELECT COUNT(*) INTO post_count
    FROM bulletin_posts
    WHERE author_id = p_user_id
    AND created_at > now() - INTERVAL '24 hours';

    RETURN post_count < post_limit;

  ELSIF p_action_type = 'reply' THEN
    SELECT COUNT(*) INTO reply_count
    FROM bulletin_replies
    WHERE author_id = p_user_id
    AND created_at > now() - INTERVAL '24 hours';

    RETURN reply_count < 50; -- DAILY_REPLY_LIMIT

  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Duplicate Post Check (5-minute window)
CREATE OR REPLACE FUNCTION check_duplicate_bulletin_post(
  p_user_id UUID,
  p_content TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM bulletin_posts
  WHERE author_id = p_user_id
  AND content = p_content
  AND created_at > now() - INTERVAL '5 minutes';

  RETURN duplicate_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ban Check
CREATE OR REPLACE FUNCTION is_user_bulletin_banned(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  ban_record RECORD;
BEGIN
  SELECT * INTO ban_record
  FROM user_bulletin_bans
  WHERE user_id = p_user_id
  AND (expires_at IS NULL OR expires_at > now());

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Edit Window Check (15 minutes)
CREATE OR REPLACE FUNCTION can_edit_bulletin_post(
  p_post_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  post_record RECORD;
BEGIN
  SELECT * INTO post_record
  FROM bulletin_posts
  WHERE id = p_post_id
  AND author_id = p_user_id
  AND created_at > now() - INTERVAL '15 minutes';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Automatic Reply Count Update (Trigger)

```sql
-- Trigger: Update reply_count on bulletin_posts
CREATE OR REPLACE FUNCTION update_bulletin_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bulletin_posts
    SET reply_count = reply_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bulletin_posts
    SET reply_count = reply_count - 1
    WHERE id = OLD.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bulletin_reply_count
AFTER INSERT OR DELETE ON bulletin_replies
FOR EACH ROW
EXECUTE FUNCTION update_bulletin_reply_count();
```

### Full-Text Search

```typescript
// lib/supabase/bulletin-queries.ts

/**
 * Full-text search across bulletin posts using PostgreSQL tsvector
 * Supports websearch syntax: "exact phrase", -exclude, OR
 */
export async function searchBulletinPosts(
  supabase: SupabaseClient<Database>,
  query: string,
  limit = BULLETIN_CONSTANTS.POSTS_PER_PAGE
): Promise<BulletinPostWithAuthor[]> {
  const { data, error } = await supabase
    .from('v_bulletin_posts_with_author')
    .select('*')
    .textSearch('content_tsvector', query, {
      type: 'websearch',  // Allows "quotes", -exclusions, OR
      config: 'english',  // Language-specific stemming
    })
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as BulletinPostWithAuthor[];
}
```

---

## Integration Points

Die drei Community Features sind eng miteinander und mit anderen Gearshack-Features verzahnt:

### 1. Cross-Feature Linking

#### Bulletin Board → Shakedowns
```typescript
// Bulletin Post mit Link zu Shakedown
const post: CreatePostInput = {
  content: "Just completed my first alpine shakedown! Check it out:",
  tag: 'shakedown',
  linked_content_type: 'shakedown',
  linked_content_id: shakedownId,
};
```

#### Bulletin Board → Marketplace
```typescript
// Bulletin Post mit Link zu Marketplace Item
const post: CreatePostInput = {
  content: "Looking to trade my tent for a lighter one:",
  tag: 'trade',
  linked_content_type: 'marketplace_item',
  linked_content_id: gearItemId,
};
```

### 2. Messaging Integration

Alle drei Features nutzen das **Messaging-System** für private Kommunikation:

```typescript
// Marketplace: Contact Seller
const contactSeller = async (listing: MarketplaceListing) => {
  const conversation = await createConversation([listing.sellerId]);
  router.push(`/messages/${conversation.id}?prefill=Interested in ${listing.name}`);
};

// Shakedowns: Private Feedback Request
const requestPrivateFeedback = async (shakedown: Shakedown, expertId: string) => {
  const conversation = await createConversation([expertId]);
  router.push(`/messages/${conversation.id}?shakedown=${shakedown.id}`);
};

// Bulletin: Message Post Author
const messageAuthor = async (post: BulletinPostWithAuthor) => {
  const conversation = await createConversation([post.author_id]);
  router.push(`/messages/${conversation.id}`);
};
```

### 3. Social Graph Integration

#### Friends-First Filtering
```typescript
// Shakedowns: Freunde zuerst anzeigen
const { shakedowns } = useShakedowns('recent', { friendsFirst: true });

// SQL Query (RPC Function)
CREATE OR REPLACE FUNCTION fetch_shakedowns_friends_first(p_user_id UUID)
RETURNS TABLE(...) AS $$
BEGIN
  RETURN QUERY
  SELECT *,
    CASE
      WHEN s.owner_id IN (
        SELECT friend_id FROM friendships WHERE user_id = p_user_id
        UNION
        SELECT user_id FROM friendships WHERE friend_id = p_user_id
      ) THEN 0  -- Friends first
      ELSE 1    -- Non-friends second
    END AS friend_order
  FROM v_shakedowns_with_author s
  WHERE s.privacy = 'public' OR ...
  ORDER BY friend_order, s.created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

#### Privacy Controls
```typescript
// Shakedown Privacy Settings (via Social Graph)
export type ShakedownPrivacy = 'public' | 'friends_only' | 'private';

// RLS Policy: Friends-Only Shakedowns
CREATE POLICY "shakedowns_friends_only" ON shakedowns FOR SELECT
USING (
  privacy = 'friends_only'
  AND (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT friend_id FROM friendships WHERE user_id = owner_id
      UNION
      SELECT user_id FROM friendships WHERE friend_id = owner_id
    )
  )
);
```

### 4. Notification Integration

```typescript
// Shakedown Feedback Notification
CREATE OR REPLACE FUNCTION notify_shakedown_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, message, reference_type, reference_id)
  SELECT
    s.owner_id,
    'shakedown_feedback',
    p.display_name || ' commented on your shakedown',
    'shakedown_feedback',
    NEW.id
  FROM shakedowns s
  JOIN profiles p ON NEW.author_id = p.id
  WHERE s.id = NEW.shakedown_id
  AND s.owner_id != NEW.author_id; -- Don't notify self

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_shakedown_owner
AFTER INSERT ON shakedown_feedback
FOR EACH ROW
EXECUTE FUNCTION notify_shakedown_owner();

// Bulletin Reply Notification (first 3 replies only)
-- Implemented in triggerReplyNotification() function (siehe oben)
```

### 5. User Profile Integration

```typescript
// User Profile: Community Stats
export interface UserCommunityStats {
  shakedownsCreated: number;
  feedbackGiven: number;
  helpfulVotesReceived: number;
  badges: ShakedownBadge[];
  bulletinPosts: number;
  bulletinReplies: number;
  marketplaceListings: number;
}

// Query: Fetch Community Stats
export async function fetchUserCommunityStats(userId: string): Promise<UserCommunityStats> {
  const supabase = createClient();

  const [
    shakedownsCount,
    feedbackCount,
    helpfulVotes,
    badges,
    bulletinPostsCount,
    bulletinRepliesCount,
    marketplaceCount,
  ] = await Promise.all([
    supabase.from('shakedowns').select('*', { count: 'exact', head: true }).eq('owner_id', userId),
    supabase.from('shakedown_feedback').select('*', { count: 'exact', head: true }).eq('author_id', userId),
    supabase.from('shakedown_feedback').select('helpful_count').eq('author_id', userId),
    supabase.from('shakedown_badges').select('badge_type').eq('user_id', userId),
    supabase.from('bulletin_posts').select('*', { count: 'exact', head: true }).eq('author_id', userId),
    supabase.from('bulletin_replies').select('*', { count: 'exact', head: true }).eq('author_id', userId),
    supabase.from('v_marketplace_listings').select('*', { count: 'exact', head: true }).eq('seller_id', userId),
  ]);

  return {
    shakedownsCreated: shakedownsCount.count || 0,
    feedbackGiven: feedbackCount.count || 0,
    helpfulVotesReceived: helpfulVotes.data?.reduce((sum, f) => sum + f.helpful_count, 0) || 0,
    badges: badges.data?.map(b => b.badge_type) || [],
    bulletinPosts: bulletinPostsCount.count || 0,
    bulletinReplies: bulletinRepliesCount.count || 0,
    marketplaceListings: marketplaceCount.count || 0,
  };
}
```

---

## Security & Performance

### 1. SQL Injection Prevention

#### ILIKE Pattern Escaping (Marketplace, Bulletin Search)

```typescript
// lib/supabase/marketplace-queries.ts

/**
 * Escape ILIKE pattern to prevent SQL injection
 * Escapes: % (wildcard), _ (single char wildcard), \ (escape char)
 * Removes: , (PostgREST .or() delimiter), ( ) (grouping), . (prevents .eq. injection)
 */
function escapeILikePattern(pattern: string): string {
  return pattern
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')    // Escape % wildcards
    .replace(/_/g, '\\_')    // Escape _ wildcards
    .replace(/,/g, '')       // Remove commas (PostgREST .or() delimiter)
    .replace(/\(/g, '')      // Remove parentheses
    .replace(/\)/g, '')
    .replace(/\./g, ' ');    // Replace dots with space
}

// Usage
const searchTerm = escapeILikePattern(userInput);
query = query.or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`);
```

### 2. Rate Limiting (PostgreSQL-Based)

Alle Rate Limits sind **serverseitig in PostgreSQL** implementiert (nicht Client-seitig):

```sql
-- Shakedowns: 50 Feedbacks/day
CREATE OR REPLACE FUNCTION check_shakedown_feedback_rate_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  feedback_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO feedback_count
  FROM shakedown_feedback
  WHERE author_id = p_user_id
  AND created_at > now() - INTERVAL '24 hours';

  RETURN feedback_count < 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulletin: 10 Posts/day (3/day für neue Accounts)
CREATE OR REPLACE FUNCTION check_bulletin_rate_limit(
  p_user_id UUID,
  p_action_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  account_age_days INTEGER;
  post_limit INTEGER;
  post_count INTEGER;
BEGIN
  -- Account age
  SELECT EXTRACT(days FROM now() - created_at) INTO account_age_days
  FROM auth.users WHERE id = p_user_id;

  -- Dynamic limit based on account age
  post_limit := CASE WHEN account_age_days < 7 THEN 3 ELSE 10 END;

  IF p_action_type = 'post' THEN
    SELECT COUNT(*) INTO post_count
    FROM bulletin_posts
    WHERE author_id = p_user_id
    AND created_at > now() - INTERVAL '24 hours';

    RETURN post_count < post_limit;
  END IF;
  -- ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Cursor-Based Pagination (Performance)

Alle drei Features nutzen **Cursor-Based Pagination** statt Offset-Based:

```typescript
// ❌ SCHLECHT: Offset-Based (langsam bei hohen Offsets)
const { data } = await supabase
  .from('shakedowns')
  .select('*')
  .range(offset, offset + limit - 1);

// ✅ GUT: Cursor-Based (konstante Performance)
const { data } = await supabase
  .from('shakedowns')
  .select('*')
  .lt('created_at', cursor) // Cursor = Timestamp des letzten Items
  .order('created_at', { ascending: false })
  .limit(limit + 1); // +1 für hasMore-Detection
```

**Vorteile**:
- Konstante Query-Performance (unabhängig von Page-Tiefe)
- Keine "Page Drift" bei neuen Inserts
- Effiziente Index-Nutzung (Timestamp-Spalten sind immer indexiert)

### 4. Race Condition Prevention

Alle Hooks verwenden **Request IDs** zur Race Condition Prevention:

```typescript
// hooks/useShakedowns.ts

const fetchIdRef = useRef(0);

const fetchInitial = useCallback(async () => {
  const fetchId = ++fetchIdRef.current; // Increment before fetch
  setIsLoading(true);

  try {
    const data = await fetchShakedownsFromApi(sort, filters);

    // Ignore stale responses
    if (fetchId !== fetchIdRef.current) return;

    setShakedowns(data.shakedowns);
  } finally {
    if (fetchId === fetchIdRef.current) {
      setIsLoading(false);
    }
  }
}, [sort, filters]);
```

**Szenario ohne Protection**:
1. User ändert Filter → Request A startet
2. User ändert Filter erneut → Request B startet
3. Request B findet (schnelle Query) → State wird gesetzt
4. Request A findet (langsame Query) → State wird mit alten Daten überschrieben ❌

**Mit Request ID**:
Request A wird ignoriert, da `fetchId !== fetchIdRef.current` ✅

### 5. RLS Performance Optimization

#### Indexed RLS Policies

```sql
-- ❌ LANGSAM: RLS Policy ohne Index
CREATE POLICY "shakedowns_friends_only" ON shakedowns FOR SELECT
USING (
  privacy = 'friends_only'
  AND EXISTS (
    SELECT 1 FROM friendships
    WHERE (user_id = auth.uid() AND friend_id = owner_id)
       OR (user_id = owner_id AND friend_id = auth.uid())
  )
);

-- ✅ SCHNELL: Mit Composite Index
CREATE INDEX idx_friendships_lookup
ON friendships(user_id, friend_id);

-- Query Planner kann jetzt effizient suchen
```

#### View-Based Denormalization

```sql
-- Performance: Author Info denormalisiert in View
CREATE VIEW v_shakedowns_with_author AS
SELECT
  s.*,
  p.display_name AS author_name,  -- Denormalisiert
  p.avatar_url AS author_avatar,  -- Denormalisiert
  l.name AS loadout_name,
  l.total_weight_grams
FROM shakedowns s
JOIN profiles p ON s.owner_id = p.id
JOIN loadouts l ON s.loadout_id = l.id
WHERE s.is_hidden = false;

-- Alternative: N+1 Queries (vermeiden!)
const shakedowns = await fetchShakedowns();
for (const shakedown of shakedowns) {
  const author = await fetchProfile(shakedown.owner_id); // ❌ N+1 Problem
}
```

### 6. Full-Text Search Performance

```sql
-- tsvector Column (Pre-Computed für Performance)
ALTER TABLE bulletin_posts
ADD COLUMN content_tsvector TSVECTOR
GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- GIN Index für tsvector (essentiell!)
CREATE INDEX idx_bulletin_posts_tsvector
ON bulletin_posts USING GIN(content_tsvector);

-- Query nutzt automatisch den Index
SELECT * FROM bulletin_posts
WHERE content_tsvector @@ websearch_to_tsquery('english', 'backpacking tips');
```

---

## Best Practices

### 1. Optimistic Updates mit Rollback

```typescript
// ✅ Best Practice: Optimistic Update mit Error Handling

const createShakedown = async (input: CreateShakedownInput) => {
  // 1. Generate temporary ID
  const tempId = `temp-${Date.now()}`;
  const optimisticShakedown: ShakedownWithAuthor = {
    ...input,
    id: tempId,
    status: 'open',
    feedbackCount: 0,
    // ... andere Felder
  };

  // 2. Optimistic Update (sofortiges UI-Feedback)
  prependShakedown(optimisticShakedown);

  try {
    // 3. Server Request
    const realShakedown = await createShakedownMutation(input);

    // 4. Replace temporary with real data
    replaceShakedown(tempId, realShakedown);

    toast({ title: 'Shakedown created!' });
  } catch (err) {
    // 5. Rollback on error
    removeShakedown(tempId);

    toast({
      title: 'Failed to create shakedown',
      description: err instanceof Error ? err.message : 'Unknown error',
      variant: 'destructive',
    });
  }
};
```

### 2. Debouncing bei Search Inputs

```typescript
// hooks/useDebouncedSearch.ts

export function useDebouncedSearch(delay = 300) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, delay);

    return () => clearTimeout(handler);
  }, [searchTerm, delay]);

  return { searchTerm, setSearchTerm, debouncedTerm };
}

// Usage in Component
const { searchTerm, setSearchTerm, debouncedTerm } = useDebouncedSearch(300);
const { shakedowns } = useShakedowns('recent', { search: debouncedTerm });

<Input
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  placeholder="Search shakedowns..."
/>
```

### 3. Infinite Scroll mit Intersection Observer

```typescript
// components/InfiniteScrollTrigger.tsx

export function InfiniteScrollTrigger({
  onIntersect,
  hasMore,
  isLoading,
}: {
  onIntersect: () => void;
  hasMore: boolean;
  isLoading: boolean;
}) {
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!targetRef.current || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onIntersect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(targetRef.current);

    return () => observer.disconnect();
  }, [onIntersect, hasMore, isLoading]);

  if (!hasMore) return null;

  return (
    <div ref={targetRef} className="flex justify-center py-4">
      {isLoading && <Loader2 className="animate-spin" />}
    </div>
  );
}

// Usage
<InfiniteScrollTrigger
  onIntersect={loadMore}
  hasMore={hasMore}
  isLoading={isLoadingMore}
/>
```

### 4. Error Boundary für Community Features

```typescript
// components/CommunityErrorBoundary.tsx

export class CommunityErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to Sentry
    console.error('Community Feature Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <Button onClick={() => this.setState({ hasError: false })}>
              Try Again
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Usage in Layout
<CommunityErrorBoundary>
  <ShakedownsFeed />
</CommunityErrorBoundary>
```

### 5. i18n für Community Features

```typescript
// messages/en.json
{
  "shakedowns": {
    "title": "Community Shakedowns",
    "createButton": "Request Shakedown",
    "experience": {
      "beginner": "Beginner",
      "intermediate": "Intermediate",
      "experienced": "Experienced",
      "expert": "Expert"
    },
    "privacy": {
      "public": "Public",
      "friendsOnly": "Friends Only",
      "private": "Private"
    },
    "status": {
      "open": "Open",
      "completed": "Completed",
      "archived": "Archived"
    }
  },
  "marketplace": {
    "title": "Marketplace",
    "filters": {
      "all": "All Listings",
      "forSale": "For Sale",
      "forTrade": "For Trade",
      "forBorrow": "For Borrow"
    },
    "contactSeller": "Contact Seller"
  },
  "bulletin": {
    "title": "Bulletin Board",
    "createPost": "Create Post",
    "tags": {
      "question": "Question",
      "shakedown": "Shakedown",
      "trade": "Trade",
      "tripPlanning": "Trip Planning",
      "gearAdvice": "Gear Advice",
      "other": "Other"
    },
    "errors": {
      "postEmpty": "Post cannot be empty",
      "postTooLong": "Post is too long (max. 500 characters)",
      "rateLimitExceeded": "Rate limit exceeded. Try again later."
    }
  }
}

// Usage in Components
const t = useTranslations('shakedowns');
return <h1>{t('title')}</h1>;
```

### 6. Testing Strategy

```typescript
// __tests__/unit/hooks/useShakedowns.test.ts

describe('useShakedowns', () => {
  it('should fetch initial shakedowns', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useShakedowns());

    expect(result.current.isLoading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.shakedowns.length).toBeGreaterThan(0);
  });

  it('should handle race conditions correctly', async () => {
    const { result, rerender } = renderHook(
      ({ sort }) => useShakedowns(sort),
      { initialProps: { sort: 'recent' as SortOption } }
    );

    // Trigger multiple rapid filter changes
    rerender({ sort: 'popular' as SortOption });
    rerender({ sort: 'unanswered' as SortOption });
    rerender({ sort: 'recent' as SortOption });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should only have results from last query
    expect(result.current.sort).toBe('recent');
  });
});
```

---

## Fazit

Die Community Features in Gearshack Winterberry bilden eine kohärente, performante und sichere Community-Plattform:

### Architektonische Highlights

1. **Feature-Sliced Light**: Konsequente Trennung von Business Logic (Hooks) und UI (Components)
2. **Cursor-Based Pagination**: Konstante Performance für Infinite Scroll
3. **PostgreSQL-Powered**: RLS, Full-Text Search, Rate Limiting direkt in der DB
4. **Optimistic Updates**: Sofortiges UI-Feedback mit Rollback-Logik
5. **Race Condition Protection**: Request IDs in allen Hooks
6. **i18n-Ready**: Alle Labels internationalisiert

### Performance-Patterns

- **View-Based Denormalization**: Author Info in Views statt N+1 Queries
- **Indexed RLS Policies**: Effiziente Friendship-Lookups
- **tsvector für Search**: PostgreSQL Full-Text Search mit GIN Index
- **Debounced Search**: 300ms Delay für Search Inputs
- **Intersection Observer**: Native Browser API für Infinite Scroll

### Security-Patterns

- **ILIKE Escaping**: SQL Injection Prevention in Search Queries
- **Server-Side Rate Limiting**: Alle Limits in PostgreSQL (nicht Client-seitig)
- **RLS Policies**: Privacy Controls direkt in der Datenbank
- **Ban System**: Temporary + Permanent Bans mit Expiry Logic
- **Edit Windows**: Zeitbasierte Edit-Rechte (15/30 Minuten)

Diese Dokumentation dient als Single Source of Truth für alle drei Community Features und ihre Integrationen.
