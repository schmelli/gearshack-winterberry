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

# Patterns that indicate hardcoded strings in JSX:
# 1. >"Word - String after > that starts with uppercase (likely visible text)
# 2. title="Word - Hardcoded title attributes
# 3. description="Word - Hardcoded descriptions
# 4. label="Word - Hardcoded labels
# 5. placeholder="Word - Hardcoded placeholders (these might be ok sometimes)

# Check for hardcoded strings (excluding common patterns that are OK)
ISSUES=$(grep -n -E '(>\s*[A-Z][a-z]+[^<]*<|title="[A-Z]|description="[A-Z]|label="[A-Z])' "$FILE_PATH" 2>/dev/null | \
  grep -v -E '(className=|href=|src=|alt=|aria-|data-|key=|id=|name=|type=|value=|Icon|Button|Card|Dialog|Sheet)' | \
  grep -v -E '(\{t\(|useTranslations|getTranslations)' | \
  head -10)

if [ -n "$ISSUES" ]; then
  echo ""
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
fi

# Always exit 0 - this is a warning, not a blocker
exit 0
