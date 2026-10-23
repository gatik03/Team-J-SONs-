export type IdPrefix = 'LA' | 'AUD' | 'DOC' | 'CUST';

// shortcut: random 5-digit suffix, collisions possible after ~thousands of ids; switch to a DB sequence if that ever matters.
export function newId(prefix: IdPrefix): string {
  return `${prefix}-${new Date().getUTCFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
}
