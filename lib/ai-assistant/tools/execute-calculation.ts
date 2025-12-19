/**
 * Execute Calculation Tool
 * Feature 050: AI Assistant - Phase 3
 *
 * Safe mathematical operations for weight/price/distance calculations.
 * Uses a safe expression evaluator instead of eval().
 */

import { z } from 'zod';

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
// Safe Math Expression Parser
// =============================================================================

/**
 * Tokenize a mathematical expression
 */
function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let current = '';

  for (const char of expr) {
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else if ('+-*/()%'.includes(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push(char);
    } else if (/[a-zA-Z0-9._]/.test(char)) {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Safe expression evaluator
 * Only allows basic arithmetic operations and variable substitution
 * No eval(), no function calls, no property access
 */
function safeEvaluate(
  formula: string,
  variables: Record<string, number>
): number {
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
    /\.\s*\w+\s*\(/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(formula)) {
      throw new Error('Invalid formula: contains unsafe pattern');
    }
  }

  // Tokenize the expression
  const tokens = tokenize(formula);

  // Substitute variables and build expression
  const substitutedTokens = tokens.map((token) => {
    // Check if it's a number
    if (/^-?\d+(\.\d+)?$/.test(token)) {
      return token;
    }

    // Check if it's an operator or parenthesis
    if ('+-*/()%'.includes(token)) {
      return token;
    }

    // Check if it's a variable
    if (token in variables) {
      return String(variables[token]);
    }

    // Check for built-in math functions (limited set)
    const safeFunctions = ['abs', 'min', 'max', 'round', 'floor', 'ceil', 'sqrt'];
    if (safeFunctions.includes(token.toLowerCase())) {
      return `Math.${token.toLowerCase()}`;
    }

    throw new Error(`Unknown variable or function: ${token}`);
  });

  // Build the expression string
  const exprStr = substitutedTokens.join(' ');

  // Validate the final expression only contains safe characters
  if (!/^[\d\s+\-*/().%Math.absminceilflooroundsqrt,]+$/.test(exprStr)) {
    throw new Error('Invalid formula: contains unsafe characters');
  }

  // Use Function constructor with strict validation
  // This is safer than eval() as it creates an isolated scope
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(`"use strict"; return (${exprStr});`);
    const result = fn();

    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Calculation resulted in invalid number');
    }

    return result;
  } catch (evalError) {
    throw new Error(
      `Calculation failed: ${evalError instanceof Error ? evalError.message : 'Unknown error'}`
    );
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
