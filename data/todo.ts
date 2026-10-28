/**
 * TODO placeholders: any data string starting with "TODO" is unfinished content.
 * In development it renders (styled with the global .todo class) so it is easy to spot;
 * in production it is filtered out so nothing unfinished ships.
 */
export function isTodo(value: string | undefined): boolean {
  return Boolean(value?.startsWith('TODO'));
}

/** Drop TODO placeholders in production; keep them visible in development. */
export function visible(values: string[]): string[] {
  return process.env.NODE_ENV === 'production' ? values.filter((v) => !isTodo(v)) : values;
}

export function showValue(value: string | undefined): boolean {
  return Boolean(value) && (process.env.NODE_ENV !== 'production' || !isTodo(value));
}
