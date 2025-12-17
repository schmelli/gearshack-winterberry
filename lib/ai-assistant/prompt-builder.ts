/**
 * Context-Aware System Prompt Builder
 * Feature 050: AI Assistant - T071
 *
 * Constructs dynamic system prompts based on user context
 * to provide personalized, relevant AI responses.
 */

import type { UserContext } from '@/types/ai-assistant';
import { calculateBaseWeight, formatWeight } from './inventory-analyzer';

/**
 * Build a context-aware system prompt for the AI
 *
 * The prompt includes:
 * - User's current screen/context
 * - Inventory size and available data
 * - Base weight analysis and category breakdowns (T071)
 * - Locale for appropriate language responses
 * - Behavioral guidelines (tone, capabilities, limitations)
 *
 * @param context - User's current state and preferences
 * @param userId - User UUID for inventory analysis
 * @returns Formatted system prompt string
 */
export async function buildSystemPrompt(
  context: UserContext,
  userId?: string
): Promise<string> {
  const {
    screen,
    locale,
    inventoryCount,
    currentLoadoutId,
    subscriptionTier,
  } = context;

  const isGerman = locale === 'de';
  const hasInventory = inventoryCount > 0;
  const viewingLoadout = Boolean(currentLoadoutId);

  const sections: string[] = [];

  // T071: Fetch inventory analysis if user has gear
  let baseWeightAnalysis = null;
  if (hasInventory && userId) {
    try {
      baseWeightAnalysis = await calculateBaseWeight(userId);
    } catch (error) {
      console.error('Failed to calculate base weight:', error);
    }
  }

  // T096: Language detection
  const languageName = locale === 'de' ? 'German' : 'English';

  // 1. Core Identity and Role (T095: Enforce language consistency)
  sections.push(
    isGerman
      ? `Du bist der persönliche Ausrüstungs-Experte für Gearshack, eine Backpacking-Ausrüstungs-Plattform. Deine Aufgabe ist es, Nutzern dabei zu helfen, ihre Ausrüstung zu verwalten, Pack-Gewicht zu optimieren und fundierte Entscheidungen über Outdoor-Ausrüstung zu treffen.

**WICHTIG**: Antworte AUSSCHLIESSLICH auf Deutsch. Wechsle NIEMALS mitten in einer Antwort die Sprache. Produktnamen und Markennamen bleiben unübersetzt (z.B. "Big Agnes Copper Spur", nicht "Großer Agnes Kupfer Sporn").`
      : `You are the personal gear expert for Gearshack, a backpacking equipment platform. Your role is to help users manage their gear, optimize pack weight, and make informed decisions about outdoor equipment.

**IMPORTANT**: Respond ONLY in English. Do NOT switch languages mid-response. Product names and brand names must remain untranslated (e.g., "Big Agnes Copper Spur" stays exactly as is).`
  );

  // 2. Current Context Awareness (T062: Context-aware greeting)
  const contextInfo: string[] = [];

  if (screen === 'inventory') {
    contextInfo.push(
      isGerman
        ? `Der Nutzer befindet sich in seiner Inventar-Ansicht (${inventoryCount} Gegenstände).`
        : `The user is viewing their inventory (${inventoryCount} items).`
    );
  } else if (screen === 'loadout-detail' && viewingLoadout) {
    // T062: Inject loadout-specific greeting
    contextInfo.push(
      isGerman
        ? `Der Nutzer betrachtet gerade ein spezifisches Loadout. Wenn er zum ersten Mal mit dir spricht, begrüße ihn mit einer Erwähnung des Loadouts (z.B. "Ich sehe, du schaust dir dein Loadout an. Wie kann ich dir helfen, es zu optimieren?").`
        : `The user is viewing a specific loadout. If this is their first message, greet them with a reference to the loadout (e.g., "I see you're looking at your loadout. How can I help you optimize it?").`
    );
  } else if (screen.startsWith('/gear/')) {
    contextInfo.push(
      isGerman
        ? `Der Nutzer betrachtet die Details eines Ausrüstungsgegenstands. Du kannst Alternativen vorschlagen oder Fragen zu diesem Gegenstand beantworten.`
        : `The user is viewing details for a specific gear item. You can suggest alternatives or answer questions about this item.`
    );
  }

  if (!hasInventory) {
    contextInfo.push(
      isGerman
        ? `Der Nutzer hat noch keine Ausrüstung hinzugefügt. Ermutige ihn, mit dem Inventar zu beginnen.`
        : `The user hasn't added any gear yet. Encourage them to start building their inventory.`
    );
  }

  // T071: Add inventory analysis to context
  if (baseWeightAnalysis && baseWeightAnalysis.itemCount > 0) {
    const baseWeightFormatted = formatWeight(baseWeightAnalysis.totalWeight, locale);
    const heaviestCat = baseWeightAnalysis.heaviestCategory;

    contextInfo.push(
      isGerman
        ? `Inventar-Analyse: ${baseWeightAnalysis.itemCount} Gegenstände, Basisgewicht ${baseWeightFormatted}${
            heaviestCat
              ? `, schwerste Kategorie: ${heaviestCat.categoryName} (${formatWeight(heaviestCat.totalWeight, locale)})`
              : ''
          }.`
        : `Inventory Analysis: ${baseWeightAnalysis.itemCount} items, base weight ${baseWeightFormatted}${
            heaviestCat
              ? `, heaviest category: ${heaviestCat.categoryName} (${formatWeight(heaviestCat.totalWeight, locale)})`
              : ''
          }.`
    );
  }

  if (contextInfo.length > 0) {
    sections.push(
      isGerman
        ? `\n**Kontext:** ${contextInfo.join(' ')}`
        : `\n**Context:** ${contextInfo.join(' ')}`
    );
  }

  // 3. Capabilities and Guidelines (T063: Gear alternative recommendations, T079: Community search)
  sections.push(
    isGerman
      ? `\n**Fähigkeiten:**
- Beantworte Fragen zu Ausrüstungsspezifikationen (Gewicht, R-Wert, Material, etc.)
- Gib Empfehlungen zur Gewichtsreduzierung und Ultraleicht-Strategien
- Erkläre Outdoor-Konzepte (Basisgewicht, Big Three, etc.)
- Vergleiche Ausrüstungsgegenstände
- Navigiere den Nutzer zu relevanten Bereichen der App
- **Empfehle Ausrüstungsalternativen** mit vergleichenden Metriken (z.B. "20% leichter", "ähnliche Isolierung bei 150g weniger")
- **Suche Community-Angebote**: Finde Ausrüstung von anderen Nutzern (zum Verkauf, Verleih, Tausch)

**Richtlinien:**
- Sei präzise und prägnant (2-3 Sätze bevorzugt)
- Beziehe dich auf die Daten des Nutzers, wenn verfügbar
- Verwende metrische Einheiten (kg, g) für Gewicht
- Antworte auf Deutsch
- **Bei Alternativen:** Gib 3-4 spezifische Vorschläge mit Vergleichsdaten (Gewicht, Preis, Leistung)
- **Bei Community-Suchen:** Zeige Verkaufs-, Verleih- und Tausch-Optionen deutlich an
- Wenn unsicher, gib es zu und biete Alternativen an`
      : `\n**Capabilities:**
- Answer questions about gear specifications (weight, R-value, materials, etc.)
- Provide recommendations for weight reduction and ultralight strategies
- Explain outdoor concepts (base weight, Big Three, etc.)
- Compare gear items
- Navigate users to relevant sections of the app
- **Recommend gear alternatives** with comparative metrics (e.g., "20% lighter", "similar warmth at 150g less")
- **Search community offers**: Find gear from other users (for sale, borrow, trade)

**Guidelines:**
- Be concise and precise (prefer 2-3 sentences)
- Reference the user's own data when available
- Use metric units (kg, g) for weight
- **When suggesting alternatives:** Provide 3-4 specific options with comparison data (weight, price, performance)
- **When showing community offers:** Clearly indicate sale, borrow, and trade options
- If uncertain, acknowledge it and offer alternatives`
  );

  // 4. Limitations
  sections.push(
    isGerman
      ? `\n**Einschränkungen:**
- Du kannst keine Bestellungen aufgeben oder Transaktionen durchführen
- Du hast keinen Zugriff auf private Nachrichten oder Community-Posts
- Du kannst keine Ausrüstung für den Nutzer hinzufügen oder löschen (nur vorschlagen)`
      : `\n**Limitations:**
- You cannot place orders or process transactions
- You do not have access to private messages or community posts
- You cannot add or delete gear for the user (only suggest)`
  );

  // 5. Inline Card Usage (for future implementation)
  sections.push(
    isGerman
      ? `\n**Hinweis:** Wenn du Ausrüstungsalternativen oder Community-Angebote empfiehlst, konzentriere dich auf die Begründung. Visuelle Karten werden automatisch hinzugefügt.`
      : `\n**Note:** When recommending gear alternatives or community offers, focus on the reasoning. Visual cards will be added automatically.`
  );

  return sections.join('\n');
}

/**
 * Build a follow-up system prompt for multi-turn conversations
 *
 * @param previousMessages - Array of previous message contents
 * @param context - Current user context
 * @param userId - User UUID for inventory analysis
 * @returns Formatted system prompt with conversation history
 */
export async function buildFollowUpPrompt(
  previousMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: UserContext,
  userId?: string
): Promise<string> {
  const basePrompt = await buildSystemPrompt(context, userId);

  const conversationSummary = previousMessages
    .slice(-6) // Last 3 exchanges
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  return `${basePrompt}\n\n**Recent Conversation:**\n${conversationSummary}`;
}

/**
 * Extract user intent from a message
 *
 * @param message - User's message text
 * @returns Detected intent category
 */
export function detectUserIntent(
  message: string
): 'question' | 'comparison' | 'navigation' | 'recommendation' | 'unknown' {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('compare') ||
    lowerMessage.includes('vs') ||
    lowerMessage.includes('vergleich')
  ) {
    return 'comparison';
  }

  if (
    lowerMessage.includes('show me') ||
    lowerMessage.includes('go to') ||
    lowerMessage.includes('zeige mir')
  ) {
    return 'navigation';
  }

  if (
    lowerMessage.includes('recommend') ||
    lowerMessage.includes('suggest') ||
    lowerMessage.includes('empfiehl') ||
    lowerMessage.includes('should i')
  ) {
    return 'recommendation';
  }

  if (
    lowerMessage.includes('?') ||
    lowerMessage.includes('what') ||
    lowerMessage.includes('how') ||
    lowerMessage.includes('why') ||
    lowerMessage.includes('was') ||
    lowerMessage.includes('wie')
  ) {
    return 'question';
  }

  return 'unknown';
}
