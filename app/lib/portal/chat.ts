/**
 * Chat layout helpers shared by the portal and admin threads. Client-safe:
 * the server already formatted every label, this only decides what to show.
 */

const GROUP_GAP_MS = 5 * 60 * 1000;

type ThreadMessage = { createdAt: string; dayKey: string; dayLabel: string };

/**
 * Marks where a day separator goes and which messages start a new group
 * (another sender, a new day, or more than five minutes since the last one).
 * Grouped follow-ups hide their name and avatar, like chat apps do.
 */
export function layoutThread<T extends ThreadMessage>(messages: T[], senderKey: (message: T) => string) {
  return messages.map((message, index) => {
    const previous = messages[index - 1];
    const newDay = !previous || previous.dayKey !== message.dayKey;
    const startsGroup =
      newDay ||
      senderKey(previous) !== senderKey(message) ||
      Date.parse(message.createdAt) - Date.parse(previous.createdAt) > GROUP_GAP_MS;
    const next = messages[index + 1];
    const endsGroup =
      !next ||
      next.dayKey !== message.dayKey ||
      senderKey(next) !== senderKey(message) ||
      Date.parse(next.createdAt) - Date.parse(message.createdAt) > GROUP_GAP_MS;
    return { message, dayLabel: newDay ? message.dayLabel : null, startsGroup, endsGroup };
  });
}

/** Up to two initials for an avatar ("Michael Zakka" → "MZ", "سارة" → "س"). */
export function initials(name: string): string {
  const words = name.trim().split(/[\s@._-]+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => Array.from(word)[0]?.toLocaleUpperCase() ?? '')
    .join('');
}
