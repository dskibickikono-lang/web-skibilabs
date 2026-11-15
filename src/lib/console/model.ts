/**
 * Model konsoli demo: czysty stan i przejścia, bez DOM i bez zegarów.
 * Ten sam kod liczy stan początkowy w buildzie i obsługuje zdarzenia w przeglądarce.
 */
import { COMMANDS, DEPLOY, FLOW, REDTEAM, type Command, type ScenarioId } from './data.ts';

export type ViewId = 'palette' | ScenarioId;

export interface ConsoleState {
  view: ViewId;
  /** Tekst w polu palety. */
  query: string;
  /** Zaznaczone polecenie w przefiltrowanej liście. */
  selected: number;
  /** Liczba zakończonych zdarzeń scenariusza. */
  tick: number;
  /** Wiersz wyniku, którego szczegóły są pokazane. */
  focus: number;
  /** Użytkownik sam wybrał wiersz — nie przestawiamy go przy kolejnych zdarzeniach. */
  pinned: boolean;
}

export type Action =
  | { type: 'query'; value: string }
  | { type: 'move'; delta: number }
  | { type: 'select'; index: number }
  | { type: 'open'; id: ScenarioId }
  | { type: 'back' }
  | { type: 'tick' }
  | { type: 'finish' }
  | { type: 'focus'; index: number };

export const initialState: ConsoleState = {
  view: 'palette',
  query: '',
  selected: 0,
  tick: 0,
  focus: 0,
  pinned: false,
};

const fold = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function filterCommands(query: string): Command[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...COMMANDS];
  return COMMANDS.filter((c) => {
    const hay = fold(`${c.title} ${c.hint} ${c.keywords}`);
    return words.every((w) => hay.includes(w));
  });
}

export function scenarioLength(id: ScenarioId): number {
  if (id === 'deploy') return DEPLOY.steps.length;
  if (id === 'flow') return FLOW.events.length;
  return REDTEAM.attempts.length;
}

/** Czas trwania bieżącego zdarzenia scenariusza w milisekundach. */
export function tickDelay(state: ConsoleState): number {
  if (state.view === 'palette') return 0;
  const list = state.view === 'deploy' ? DEPLOY.steps : state.view === 'flow' ? FLOW.events : REDTEAM.attempts;
  return list[Math.min(state.tick, list.length - 1)]?.ms ?? 600;
}

export function isRunning(state: ConsoleState): boolean {
  return state.view !== 'palette' && state.tick < scenarioLength(state.view);
}

export function isDone(state: ConsoleState): boolean {
  return state.view !== 'palette' && state.tick >= scenarioLength(state.view);
}

/** Wiersz, na którym warto zatrzymać wzrok po zakończeniu scenariusza. */
function restingFocus(id: ScenarioId): number {
  if (id === 'deploy') return DEPLOY.steps.length - 1;
  if (id === 'flow') return FLOW.events.findIndex((e) => e.kind === 'fail');
  return REDTEAM.attempts.findIndex((a) => a.verdict === 'przeszła');
}

const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));

/** Co zrobi Enter w palecie: uruchomi scenariusz albo otworzy stronę. */
export function enterTarget(state: ConsoleState): Command | null {
  if (state.view !== 'palette') return null;
  return filterCommands(state.query)[state.selected] ?? null;
}

export function reduce(state: ConsoleState, action: Action): ConsoleState {
  switch (action.type) {
    case 'query':
      return state.view === 'palette' ? { ...state, query: action.value, selected: 0 } : state;
    case 'select':
      if (state.view !== 'palette') return state;
      return { ...state, selected: clamp(action.index, 0, Math.max(0, filterCommands(state.query).length - 1)) };
    case 'move': {
      if (state.view === 'palette') {
        const n = filterCommands(state.query).length;
        if (n === 0) return state;
        return { ...state, selected: (state.selected + action.delta + n) % n };
      }
      const max = scenarioLength(state.view) - 1;
      return { ...state, focus: clamp(state.focus + action.delta, 0, max), pinned: true };
    }
    case 'focus':
      if (state.view === 'palette') return state;
      return { ...state, focus: clamp(action.index, 0, scenarioLength(state.view) - 1), pinned: true };
    case 'open':
      return { ...state, view: action.id, tick: 0, focus: 0, pinned: false };
    case 'back':
      return state.view === 'palette' ? { ...state, query: '', selected: 0 } : { ...state, view: 'palette', tick: 0, focus: 0, pinned: false };
    case 'tick': {
      if (state.view === 'palette') return state;
      const len = scenarioLength(state.view);
      if (state.tick >= len) return state;
      const tick = state.tick + 1;
      if (state.pinned) return { ...state, tick };
      return { ...state, tick, focus: tick >= len ? restingFocus(state.view) : tick };
    }
    case 'finish': {
      if (state.view === 'palette') return state;
      const len = scenarioLength(state.view);
      return { ...state, tick: len, focus: state.pinned ? state.focus : restingFocus(state.view) };
    }
  }
}
