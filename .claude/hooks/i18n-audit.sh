#!/bin/bash
#
# i18n Audit Hook
# Checks for hardcoded strings in TSX files after edits
#
# This hook runs after Claude edits a .tsx file and warns about
# potential hardcoded strings that should be internationalized.
#

FILE_PATH="$1"

# Only check TSX files
if [[ ! "$FILE_PATH" =~ \.tsx$ ]]; then
  exit 0
fi

# Skip test files and type definition files
if [[ "$FILE_PATH" =~ (__tests__|\.test\.|\.spec\.|\.d\.ts) ]]; then
  exit 0
fi

# Skip UI component library files (they don't need i18n)
if [[ "$FILE_PATH" =~ components/ui/ ]]; then
  exit 0
fi

# Skip non-component files (hooks, utils, lib, types, contexts, providers)
if [[ "$FILE_PATH" =~ (hooks/|lib/|utils/|types/|contexts/|providers/) ]]; then
  exit 0
fi

# Skip layout and page files that might not need translations directly
# (they often delegate to child components)
if [[ "$FILE_PATH" =~ (layout\.tsx|loading\.tsx|error\.tsx|not-found\.tsx) ]]; then
  exit 0
fi

HAS_WARNINGS=0

# =============================================================================
# CHECK 1: Component files should import useTranslations
# =============================================================================
# Check if file exports a component (has 'export function' or 'export default')
HAS_COMPONENT=$(grep -E '(export\s+(default\s+)?function|export\s+const\s+\w+\s*=|export\s+default)' "$FILE_PATH" 2>/dev/null)

if [ -n "$HAS_COMPONENT" ]; then
  # Check if useTranslations is imported
  HAS_USE_TRANSLATIONS=$(grep -E "import.*useTranslations.*from\s+['\"]next-intl['\"]" "$FILE_PATH" 2>/dev/null)

  if [ -z "$HAS_USE_TRANSLATIONS" ]; then
    # Check if the component has any JSX that might contain user-visible text
    HAS_JSX_TEXT=$(grep -E '(<[A-Z][a-zA-Z]*[^/>]*>|return\s*\(|<>)' "$FILE_PATH" 2>/dev/null)

    if [ -n "$HAS_JSX_TEXT" ]; then
      echo ""
      echo "=========================================="
      echo "i18n AUDIT: Missing useTranslations import!"
      echo "=========================================="
      echo "File: $FILE_PATH"
      echo ""
      echo "This component file does not import useTranslations from 'next-intl'."
      echo "All user-visible text should be internationalized."
      echo ""
      echo "Add: import { useTranslations } from 'next-intl';"
      echo "Use: const t = useTranslations('Namespace');"
      echo "=========================================="
      HAS_WARNINGS=1
    fi
  fi
fi

# =============================================================================
# CHECK 2: Hardcoded strings in JSX
# =============================================================================
# Patterns that indicate hardcoded strings in JSX:
# 1. >"Word - String after > that starts with uppercase (likely visible text)
# 2. title="Word - Hardcoded title attributes
# 3. description="Word - Hardcoded descriptions
# 4. label="Word - Hardcoded labels
# 5. placeholder="Word - Hardcoded placeholders

# Check for hardcoded strings (excluding common patterns that are OK)
ISSUES=$(grep -n -E '(>\s*[A-Z][a-z]+[^<]*<|title="[A-Z]|description="[A-Z]|label="[A-Z]|placeholder="[A-Z])' "$FILE_PATH" 2>/dev/null | \
  grep -v -E '(className=|href=|src=|alt=|aria-|data-|key=|id=|name=|type=|value=|Icon|Button|Card|Dialog|Sheet|Skeleton|Avatar)' | \
  grep -v -E '(\{t\(|useTranslations|getTranslations|\{.*\})' | \
  head -10)

if [ -n "$ISSUES" ]; then
  if [ "$HAS_WARNINGS" -eq 0 ]; then
    echo ""
  fi
  echo "=========================================="
  echo "i18n AUDIT: Potential hardcoded strings found!"
  echo "=========================================="
  echo "File: $FILE_PATH"
  echo ""
  echo "The following lines may contain hardcoded text that should be internationalized:"
  echo ""
  echo "$ISSUES"
  echo ""
  echo "Consider using useTranslations() hook and t('key') for user-visible text."
  echo "=========================================="
  echo ""
  HAS_WARNINGS=1
fi

# Always exit 0 - this is a warning, not a blocker
exit 0
