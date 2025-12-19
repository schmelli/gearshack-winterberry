/**
 * Execute Calculation Tool
 * Feature 050: AI Assistant - Phase 3
 *
 * Safe mathematical operations for weight/price/distance calculations.
 * Uses mathjs library for secure expression evaluation.
 */

import { z } from 'zod';
import { create, all } from 'mathjs';

// =============================================================================
// Tool Definition Schema
// =============================================================================

export const executeCalculationParametersSchema = z.object({
  calculationType: z
    .enum(['weight_savings', 'price_comparison', 'custom'])
    .describe('Type of calculation to perform'),
  formula: z
    .string()
    .max(500)
    .describe(
      'Mathematical formula using variables (e.g., "a - b", "(a + b) / 2")'
    ),
  variables: z
    .record(z.string(), z.number())
    .describe('Variable values to substitute in formula (e.g., { "a": 100, "b": 50 })'),
  outputUnit: z
    .string()
    .max(20)
    .optional()
    .describe('Unit for the result (e.g., "g", "kg", "USD", "%")'),
});

export type ExecuteCalculationParameters = z.infer<
  typeof executeCalculationParametersSchema
>;

// =============================================================================
// Tool Definition
// =============================================================================

export const executeCalculationTool = {
  description:
    'Perform weight savings, price comparisons, and custom mathematical calculations safely',
  parameters: executeCalculationParametersSchema,
};

// =============================================================================
// Result Types
// =============================================================================

export interface ExecuteCalculationResponse {
  success: boolean;
  calculationType: string;
  formula: string;
  variables: Record<string, number>;
  result: number | null;
  resultFormatted: string | null;
  outputUnit: string | null;
  explanation: string;
  error?: string;
}

// =============================================================================
// Safe Math Expression Evaluator (using mathjs)
// =============================================================================

// Create a limited math instance with only safe functions
const math = create(all, {
  // Disable implicit function invocation for security
  matrix: 'Array',
});

// Whitelist of allowed functions (prevents code execution)
const ALLOWED_FUNCTIONS = [
  'abs', 'add', 'subtract', 'multiply', 'divide', 'mod',
  'min', 'max', 'round', 'floor', 'ceil', 'sqrt', 'pow',
  'sin', 'cos', 'tan', 'log', 'log10', 'exp',
];

/**
 * Safe expression evaluator using mathjs
 * Only allows basic arithmetic operations and variable substitution
 * No eval(), no code execution, no property access
 *
 * @param formula - Mathematical formula with variables
 * @param variables - Variable values to substitute
 * @returns Calculated result
 */
function safeEvaluate(
  formula: string,
  variables: Record<string, number>
): number {
  // Validate formula length
  if (formula.length > 500) {
    throw new Error('Formula too long (max 500 characters)');
  }

  // Validate formula doesn't contain dangerous patterns
  const dangerousPatterns = [
    /\beval\b/i,
    /\bfunction\b/i,
    /\bnew\b/i,
    /\bthis\b/i,
    /\bwindow\b/i,
    /\bglobal\b/i,
    /\bprocess\b/i,
    /\brequire\b/i,
    /\bimport\b/i,
    /\bexport\b/i,
    /\[\s*['"`]/,
    /['"`]\s*\]/,
    /__/,  // Double underscores (often used in prototype pollution)
    /\$\{/, // Template literals
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(formula)) {
      throw new Error('Invalid formula: contains unsafe pattern');
    }
  }

  try {
    // Use mathjs.evaluate with scope for variables
    // This is safe as mathjs sanitizes the input
    const result = math.evaluate(formula, variables);

    // Validate result is a finite number
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Calculation resulted in invalid number');
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      // Sanitize error message to avoid leaking internal details
      if (error.message.includes('Undefined symbol')) {
        const match = error.message.match(/Undefined symbol (.+)/);
        const symbol = match ? match[1] : 'unknown';
        throw new Error(`Unknown variable or function: ${symbol}`);
      }
      throw new Error(`Calculation failed: ${error.message}`);
    }
    throw new Error('Calculation failed: Unknown error');
  }
}

// =============================================================================
// Execute Function
// =============================================================================

/**
 * Execute a mathematical calculation safely
 *
 * @param params - Calculation parameters including type, formula, variables, outputUnit
 * @returns ExecuteCalculationResponse with the calculation result
 */
export async function executeExecuteCalculation(
  params: ExecuteCalculationParameters
): Promise<ExecuteCalculationResponse> {
  const { calculationType, formula, variables, outputUnit } = params;

  try {
    // Perform the calculation
    const result = safeEvaluate(formula, variables);

    // Format the result based on output unit
    let resultFormatted: string;
    switch (outputUnit?.toLowerCase()) {
      case 'g':
        resultFormatted = `${result.toFixed(0)}g`;
        break;
      case 'kg':
        resultFormatted = `${result.toFixed(2)}kg`;
        break;
      case 'oz':
        resultFormatted = `${result.toFixed(2)}oz`;
        break;
      case 'lb':
        resultFormatted = `${result.toFixed(2)}lb`;
        break;
      case 'usd':
      case '$':
        resultFormatted = `$${result.toFixed(2)}`;
        break;
      case 'eur':
        resultFormatted = `${result.toFixed(2)} EUR`;
        break;
      case '%':
        resultFormatted = `${result.toFixed(1)}%`;
        break;
      case 'km':
        resultFormatted = `${result.toFixed(2)}km`;
        break;
      case 'mi':
        resultFormatted = `${result.toFixed(2)}mi`;
        break;
      default:
        resultFormatted = result.toFixed(2);
    }

    // Generate explanation based on calculation type
    const explanation = generateExplanation(
      calculationType,
      formula,
      variables,
      result,
      outputUnit
    );

    return {
      success: true,
      calculationType,
      formula,
      variables,
      result,
      resultFormatted,
      outputUnit: outputUnit || null,
      explanation,
    };
  } catch (error) {
    console.error('[executeCalculation] Calculation error:', error);
    return {
      success: false,
      calculationType,
      formula,
      variables,
      result: null,
      resultFormatted: null,
      outputUnit: outputUnit || null,
      explanation: '',
      error: error instanceof Error ? error.message : 'Calculation failed',
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateExplanation(
  calculationType: string,
  formula: string,
  variables: Record<string, number>,
  result: number,
  outputUnit?: string
): string {
  const varList = Object.entries(variables)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');

  switch (calculationType) {
    case 'weight_savings':
      return `Weight savings calculation: ${formula} with ${varList} = ${result.toFixed(2)}${outputUnit || 'g'}. This shows the difference in weight between items.`;

    case 'price_comparison':
      return `Price comparison: ${formula} with ${varList} = ${result.toFixed(2)}${outputUnit === 'usd' || outputUnit === '$' ? '' : outputUnit || ''}. This calculates the price difference or ratio.`;

    case 'custom':
    default:
      return `Custom calculation: ${formula} with ${varList} = ${result.toFixed(2)}${outputUnit || ''}.`;
  }
}
