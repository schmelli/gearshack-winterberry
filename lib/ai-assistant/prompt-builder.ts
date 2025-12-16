/**
 * Context-Aware System Prompt Builder
 * Feature 050: AI Assistant
 *
 * Constructs dynamic system prompts based on user context
 * to provide personalized, relevant AI responses.
 */

import type { UserContext } from '@/types/ai-assistant';

/**
 * Build a context-aware system prompt for the AI
 *
 * The prompt includes:
 * - User's current screen/context
 * - Inventory size and available data
 * - Locale for appropriate language responses
 * - Behavioral guidelines (tone, capabilities, limitations)
 *
 * @param context - User's current state and preferences
 * @returns Formatted system prompt string
 */
export function buildSystemPrompt(context: UserContext): string {
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

  // 1. Core Identity and Role
  sections.push(
    isGerman
      ? `Du bist der persönliche Ausrüstungs-Experte für Gearshack, eine Backpacking-Ausrüstungs-Plattform. Deine Aufgabe ist es, Nutzern dabei zu helfen, ihre Ausrüstung zu verwalten, Pack-Gewicht zu optimieren und fundierte Entscheidungen über Outdoor-Ausrüstung zu treffen.`
      : `You are the personal gear expert for Gearshack, a backpacking equipment platform. Your role is to help users manage their gear, optimize pack weight, and make informed decisions about outdoor equipment.`
  );

  // 2. Current Context Awareness
  const contextInfo: string[] = [];

  if (screen === 'inventory') {
    contextInfo.push(
      isGerman
        ? `Der Nutzer befindet sich in seiner Inventar-Ansicht (${inventoryCount} Gegenstände).`
        : `The user is viewing their inventory (${inventoryCount} items).`
    );
  } else if (screen === 'loadout-detail' && viewingLoadout) {
    contextInfo.push(
      isGerman
        ? `Der Nutzer betrachtet gerade ein Loadout (Ausrüstungs-Set).`
        : `The user is viewing a specific loadout.`
    );
  } else if (screen.startsWith('/gear/')) {
    contextInfo.push(
      isGerman
        ? `Der Nutzer betrachtet die Details eines Ausrüstungsgegenstands.`
        : `The user is viewing details for a specific gear item.`
    );
  }

  if (!hasInventory) {
    contextInfo.push(
      isGerman
        ? `Der Nutzer hat noch keine Ausrüstung hinzugefügt.`
        : `The user hasn't added any gear yet.`
    );
  }

  if (contextInfo.length > 0) {
    sections.push(
      isGerman
        ? `\n**Kontext:** ${contextInfo.join(' ')}`
        : `\n**Context:** ${contextInfo.join(' ')}`
    );
  }

  // 3. Capabilities and Guidelines
  sections.push(
    isGerman
      ? `\n**Fähigkeiten:**
- Beantworte Fragen zu Ausrüstungsspezifikationen (Gewicht, R-Wert, Material, etc.)
- Gib Empfehlungen zur Gewichtsreduzierung und Ultraleicht-Strategien
- Erkläre Outdoor-Konzepte (Basisgewicht, Big Three, etc.)
- Vergleiche Ausrüstungsgegenstände
- Navigiere den Nutzer zu relevanten Bereichen der App

**Richtlinien:**
- Sei präzise und prägnant (2-3 Sätze bevorzugt)
- Beziehe dich auf die Daten des Nutzers, wenn verfügbar
- Verwende metrische Einheiten (kg, g) für Gewicht
- Antworte auf Deutsch
- Wenn unsicher, gib es zu und biete Alternativen an`
      : `\n**Capabilities:**
- Answer questions about gear specifications (weight, R-value, materials, etc.)
- Provide recommendations for weight reduction and ultralight strategies
- Explain outdoor concepts (base weight, Big Three, etc.)
- Compare gear items
- Navigate users to relevant sections of the app

**Guidelines:**
- Be concise and precise (prefer 2-3 sentences)
- Reference the user's own data when available
- Use metric units (kg, g) for weight
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
 * @returns Formatted system prompt with conversation history
 */
export function buildFollowUpPrompt(
  previousMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: UserContext
): string {
  const basePrompt = buildSystemPrompt(context);

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
