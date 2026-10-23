// True when every number in `text` (commas stripped) is one of the allowed values: the LLM may only repeat code-computed numbers.
export function onlyKnownNumbers(text: string, allowed: (number | null)[]): boolean {
  const known = allowed.filter((n): n is number => n != null);
  return (text.match(/\d[\d,]*(\.\d+)?/g) ?? []).every((m) => known.includes(Number(m.replace(/,/g, ''))));
}
