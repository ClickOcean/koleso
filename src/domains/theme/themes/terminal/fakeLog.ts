const HEX_CHARS = '0123456789ABCDEF';
const SUBSYSTEMS = ['sys', 'crt', 'rng', 'wheel', 'mem', 'phos', 'bus', 'io', 'net', 'vid', 'irq', 'dma'];
const VERBS = ['init', 'poll', 'sync', 'ack', 'load', 'seed', 'flush', 'trace', 'scan', 'lock', 'spin', 'halt'];
const STATES = ['OK', 'OK', 'OK', 'READY', 'BUSY', 'WAIT', 'DONE', 'ERR 1F', 'RETRY'];

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export const randomHexChar = (): string => HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];

const randomHex = (length: number): string => Array.from({ length }, () => randomHexChar()).join('');

const twoDigits = (max: number): string => String(Math.floor(Math.random() * max)).padStart(2, '0');

const LINE_TEMPLATES: (() => string)[] = [
  () => `[${randomHex(4)}] ${pick(SUBSYSTEMS)}.${pick(VERBS)} .. ${pick(STATES)}`,
  () => `> ${pick(SUBSYSTEMS)} ${randomHex(2)} ${randomHex(2)} ${randomHex(2)} ${randomHex(2)}`,
  () => `0x${randomHex(4)}  ${randomHex(2)} ${randomHex(2)} ${randomHex(2)} ${randomHex(2)} ${randomHex(2)}`,
  () => `${pick(SUBSYSTEMS)}.${pick(VERBS)}=${randomHex(2)}h`,
  () => `irq ${Math.floor(Math.random() * 16)} -> ${pick(STATES)}`,
  () => `sector ${twoDigits(40)} ${pick(VERBS)} ${pick(STATES)}`,
  () => `t+${(Math.random() * 999).toFixed(3)}s ${pick(SUBSYSTEMS)} ${pick(STATES)}`,
  () => `mem ${randomHex(4)}:${randomHex(4)} ${pick(STATES)}`,
  () => `${pick(VERBS)} ${twoDigits(99)}% [${'#'.repeat(Math.floor(Math.random() * 12)).padEnd(12, '.')}]`,
  () => '',
];

/** One line of plausible-looking system log, used by the background columns. */
export const randomLogLine = (): string => pick(LINE_TEMPLATES)();

const SEGMENT_TEMPLATES: (() => string)[] = [
  () => `${randomHex(2)} ${randomHex(2)} ${randomHex(2)}`,
  () => `${pick(SUBSYSTEMS).toUpperCase()}.${pick(VERBS).toUpperCase()}`,
  () => `0x${randomHex(4)}`,
  () => pick(STATES),
  () => `>${randomHex(2)}`,
  () => `${twoDigits(99)}%`,
];

/** Short token for the log stream running around the wheel rim. */
export const randomLogSegment = (): string => pick(SEGMENT_TEMPLATES)();
