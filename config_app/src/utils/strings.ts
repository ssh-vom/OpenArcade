/**
 * Formats a button identifier into a human-readable name.
 * Examples:
 *   - "button_1" -> "Button 1"
 *   - "start_button" -> "Start Button"
 *   - "" -> "Unknown Button"
 */
export function formatButtonName(buttonName: string | null | undefined): string {
  if (!buttonName || typeof buttonName !== 'string') return 'Unknown Button';

  // Handle button_N pattern
  const match = buttonName.match(/^button_(\d+)$/i);
  if (match) return `Button ${match[1]}`;

  // General formatting: underscores to spaces, capitalize each word
  return buttonName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Converts a string to title case.
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Converts snake_case or camelCase to kebab-case.
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}
