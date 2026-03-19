/**
 * Chat message sanitization — strips system prompt control tags from user input.
 *
 * Prevents prompt injection where users insert XML tags like <crisis_context>,
 * <phase_turn_limit_exceeded>, etc. to manipulate Claude's system prompt structure.
 *
 * Note: Preserves normal < > usage (e.g., "아이가 <화>를 내서"). Only removes
 * known system tags used by the mamastale prompt architecture.
 *
 * @see teacher-sanitize.ts for teacher mode equivalent (sanitizeUserInput)
 * @module sanitize-chat
 */

/** System prompt XML tags used internally — must not appear in user messages */
const SYSTEM_TAG_PATTERN = /<\/?(crisis_context|phase_context|phase_turn_limit_exceeded|child_age_context|parent_context|current_phase_protocol|system_prompt|GENERATE_READY|phase_priority|premium_supplement|post_crisis_mode)[^>]*>/gi;

/** Phase control bracket tags */
const PHASE_TAG_PATTERN = /\[PHASE:\s*\d+\s*\]/gi;

/**
 * Strip system prompt control tags from user message content.
 * Applied before sending messages to the Anthropic API.
 */
export function stripControlTags(text: string): string {
  return text
    .replace(SYSTEM_TAG_PATTERN, "")
    .replace(PHASE_TAG_PATTERN, "");
}
