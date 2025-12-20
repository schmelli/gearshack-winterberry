/**
 * Context-Aware System Prompt Builder
 * Feature 050: AI Assistant - T071
 *
 * Constructs dynamic system prompts based on user context
 * to provide personalized, relevant AI responses.
 */

import type { UserContext } from '@/types/ai-assistant';
import { calculateBaseWeight, formatWeight, getUserGearList, searchCatalogForQuery } from './inventory-analyzer';

/**
 * Build a context-aware system prompt for the AI
 *
 * The prompt includes:
 * - User's current screen/context
 * - Inventory size and available data
 * - Base weight analysis and category breakdowns (T071)
 * - Catalog search results for products mentioned in query
 * - Locale for appropriate language responses
 * - Behavioral guidelines (tone, capabilities, limitations)
 *
 * @param context - User's current state and preferences
 * @param userId - User UUID for inventory analysis
 * @param userMessage - User's message (for catalog search)
 * @returns Formatted system prompt string
 */
export async function buildSystemPrompt(
  context: UserContext,
  userId?: string,
  userMessage?: string
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
  let gearList = '';
  if (hasInventory && userId) {
    try {
      baseWeightAnalysis = await calculateBaseWeight(userId);
      gearList = await getUserGearList(userId);
    } catch (error) {
      console.error('Failed to calculate base weight:', error);
    }
  }

  // Search catalog for products mentioned in user's message
  let catalogResults = '';
  if (userMessage) {
    try {
      catalogResults = await searchCatalogForQuery(userMessage);
    } catch (error) {
      console.error('Failed to search catalog:', error);
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

  // Add user's actual gear list to prevent hallucination
  if (gearList) {
    sections.push(
      isGerman
        ? `\n**Inventar des Nutzers (Ausrüstung):**\n${gearList}\n\n**WICHTIG:** Dies ist die vollständige Liste der Ausrüstung des Nutzers. Erfinde NIEMALS Gegenstände, die nicht in dieser Liste stehen. Wenn du nach einem Gegenstand gefragt wirst, beziehe dich NUR auf diese Liste.`
        : `\n**User's Inventory (Gear Items):**\n${gearList}\n\n**IMPORTANT:** This is the user's complete gear list. NEVER make up items that are not in this list. When asked about specific gear, refer ONLY to this list.`
    );
  }

  // Add catalog search results (GearGraph knowledge base)
  if (catalogResults) {
    sections.push(
      isGerman
        ? `\n**GearGraph Katalog (Produkte aus der Datenbank):**\n${catalogResults}\n\n**HINWEIS:** Diese Produkte stammen aus dem GearGraph-Katalog und sind NICHT im Inventar des Nutzers. Verwende diese Informationen, um Fragen zu spezifischen Produkten zu beantworten oder Empfehlungen zu geben. Mache klar, dass diese Gegenstände aus dem Katalog stammen, nicht aus dem Inventar des Nutzers.`
        : `\n**GearGraph Catalog (Products from database):**\n${catalogResults}\n\n**NOTE:** These products are from the GearGraph catalog and are NOT in the user's inventory. Use this information to answer questions about specific products or make recommendations. Make it clear that these items are from the catalog, not the user's inventory.`
    );
  }

  // 3. Available Tools (Lean & Flexible)
  sections.push(
    isGerman
      ? `\n**Verfügbare Tools (6 insgesamt):**

**Daten-Zugriff:**
- \`queryUserData\`: Flexible Datenbankabfragen auf Nutzerdaten (gear_items, loadouts, categories, profiles)
  * Verwende \`search\` Parameter für Textsuche (z.B. nach Produktname, Marke)
  * Verwende \`filters\` nur für exakte Werte (status, brand)
  * WICHTIG: Für Kategoriesuchen verwende \`search: {column: "name", value: "stove"}\` NICHT \`filters: {category_id: "cooking"}\`
  * Beispiel: {table: "gear_items", search: {column: "name", value: "tent"}}
- \`searchCatalog\`: Durchsuche GearGraph-Katalog mit Filtern (Gewicht, Preis, Kategorie, Marken)
- \`searchWeb\`: Echtzeit-Websuche für Trailbedingungen, Bewertungen, Neuigkeiten

**Aktionen:**
- \`addToWishlist\`: Füge Gegenstände zur Wunschliste hinzu
- \`sendMessage\`: Sende Nachrichten an Community-Mitglieder
- \`navigate\`: Navigiere zu App-Bereichen`
      : `\n**Available Tools (6 total):**

**Data Access:**
- \`queryUserData\`: Flexible database queries on user data (gear_items, loadouts, categories, profiles)
  * Use \`search\` parameter for text searches (e.g., product name, brand)
  * Use \`filters\` only for exact values (status, brand)
  * IMPORTANT: For category searches use \`search: {column: "name", value: "stove"}\` NOT \`filters: {category_id: "cooking"}\`
  * Example: {table: "gear_items", search: {column: "name", value: "tent"}}
- \`searchCatalog\`: Search GearGraph catalog with filters (weight, price, category, brands)
- \`searchWeb\`: Real-time web search for trail conditions, reviews, news

**Actions:**
- \`addToWishlist\`: Add items to wishlist
- \`sendMessage\`: Send messages to community members
- \`navigate\`: Navigate to app sections`
  );

  // 4. Capabilities and Guidelines
  sections.push(
    isGerman
      ? `\n**Fähigkeiten:**
- Beantworte Fragen zu Ausrüstungsspezifikationen (Gewicht, R-Wert, Material, etc.)
- Gib Empfehlungen zur Gewichtsreduzierung und Ultraleicht-Strategien
- Erkläre Outdoor-Konzepte (Basisgewicht, Big Three, etc.)
- Suche im Nutzerinventar mit \`queryUserData\` (verwende \`search\` für Textsuchen)
- Finde Produkte im GearGraph-Katalog mit \`searchCatalog\`
- Suche aktuelle Informationen im Web mit \`searchWeb\`
- Navigiere den Nutzer zu relevanten Bereichen der App

**Richtlinien:**
- Sei präzise und prägnant (2-3 Sätze bevorzugt)
- Beziehe dich auf die Daten des Nutzers, wenn verfügbar
- Verwende metrische Einheiten (kg, g) für Gewicht
- Antworte auf Deutsch
- **Für Inventarsuchen:** Verwende \`queryUserData\` mit \`search\` Parameter (z.B. search: {column: "name", value: "stove"})
- **Für Katalogsuchen:** Verwende \`searchCatalog\` mit entsprechenden Filtern
- Wenn unsicher, gib es zu und biete Alternativen an`
      : `\n**Capabilities:**
- Answer questions about gear specifications (weight, R-value, materials, etc.)
- Provide recommendations for weight reduction and ultralight strategies
- Explain outdoor concepts (base weight, Big Three, etc.)
- Search user inventory with \`queryUserData\` (use \`search\` for text queries)
- Find products in GearGraph catalog with \`searchCatalog\`
- Search the web for current information with \`searchWeb\`
- Navigate users to relevant sections of the app

**Guidelines:**
- Be concise and precise (prefer 2-3 sentences)
- Reference the user's own data when available
- Use metric units (kg, g) for weight
- **For inventory searches:** Use \`queryUserData\` with \`search\` parameter (e.g., search: {column: "name", value: "stove"})
- **For catalog searches:** Use \`searchCatalog\` with appropriate filters
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

  // 5. Tool Usage Best Practices
  sections.push(
    isGerman
      ? `\n**Tool-Nutzung Best Practices:**

**WICHTIG - Kategoriebasierte Suche:**
Wenn ein Nutzer nach einem Produkttyp fragt (z.B. "Habe ich ein Zelt?", "Besitze ich einen Schlafsack?"):
1. ZUERST: Suche in \`categories\` Tabelle nach dem Produkttyp (z.B. "tent", "sleeping bag", "packraft")
2. Finde die category_id oder product_type_id
3. DANN: Suche in \`gear_items\` mit \`filters: {product_type_id: "<uuid>"}\`
4. NIEMALS nur nach Name suchen - ein "Nano RTC" Packraft hat "packraft" nicht im Namen!

**Andere Suchen:**
- Verwende \`queryUserData\` mit \`search\` für Marken/Modelle (z.B. "Osprey", "MSR Reactor")
- Verwende \`queryUserData\` mit \`filters\` für exakte Werte (z.B. status: "own", brand: "Osprey")
- Verwende \`searchCatalog\` um neue Produkte zu entdecken
- Kombiniere Tools für komplexe Abfragen`
      : `\n**Tool Usage Best Practices:**

**CRITICAL - Category-Based Search:**
When user asks about a product type (e.g., "Do I own a tent?", "Do I have a sleeping bag?"):
1. FIRST: Search \`categories\` table for the product type (e.g., "tent", "sleeping bag", "packraft")
2. Get the category_id or product_type_id
3. THEN: Search \`gear_items\` with \`filters: {product_type_id: "<uuid>"}\`
4. NEVER just search by name - a "Nano RTC" packraft doesn't have "packraft" in its name!

**Other Searches:**
- Use \`queryUserData\` with \`search\` for brands/models (e.g., "Osprey", "MSR Reactor")
- Use \`queryUserData\` with \`filters\` for exact values (e.g., status: "own", brand: "Osprey")
- Use \`searchCatalog\` to discover new products or retrieve catalog information
- Combine tools for complex queries (e.g., search user inventory first, then suggest catalog alternatives)`
  );

  return sections.join('\n');
}

/**
 * Build a follow-up system prompt for multi-turn conversations
 *
 * @param previousMessages - Array of previous message contents
 * @param context - Current user context
 * @param userId - User UUID for inventory analysis
 * @param userMessage - User's current message (for catalog search)
 * @returns Formatted system prompt with conversation history
 */
export async function buildFollowUpPrompt(
  previousMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: UserContext,
  userId?: string,
  userMessage?: string
): Promise<string> {
  const basePrompt = await buildSystemPrompt(context, userId, userMessage);

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
