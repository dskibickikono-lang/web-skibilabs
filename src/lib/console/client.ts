/**
 * Warstwa DOM konsoli demo. Ładowana dopiero, gdy okno zbliża się do ekranu
 * (zob. components/Console.astro). Cała logika jest w model.ts, cały HTML w templates.ts.
 */
import { CAPTIONS, type ScenarioId } from './data.ts';
import { enterTarget, initialState, isDone, isRunning, reduce, tickDelay, type Action, type ConsoleState } from './model.ts';
import { renderBody, renderCrumb, renderFoot, scenarioOf } from './templates.ts';
import { typo } from '../typography.ts';

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export interface ConsoleHandle {
  focus(): void;
  dispatch(action: Action): void;
  readonly state: ConsoleState;
}

function mount(root: HTMLElement): ConsoleHandle {
  const uid = root.dataset['uid'] ?? 'c';
  const stage = root.closest<HTMLElement>('[data-console-stage]');
  const input = root.querySelector<HTMLInputElement>('.cs-input');
  const body = root.querySelector<HTMLElement>('[data-slot="body"]');
  const foot = root.querySelector<HTMLElement>('[data-slot="foot"]');
  const crumb = root.querySelector<HTMLElement>('[data-slot="crumb"]');
  if (!input || !body || !foot || !crumb) throw new Error('Konsola: niepełny znacznik okna');
  const dock = stage ? [...stage.querySelectorAll<HTMLButtonElement>('[data-dock]')] : [];
  const captionLead = stage?.querySelector<HTMLElement>('[data-caption-lead]') ?? null;
  const captionRest = stage?.querySelector<HTMLElement>('[data-caption-rest]') ?? null;

  let state: ConsoleState = initialState;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let visible = true;
  /** Ostatnie działanie przyszło z klawiatury — wtedy wolno przenosić fokus. */
  let byKeyboard = false;
  let userTookOver = false;
  let autoplayRun = 0;

  const schedule = (): void => {
    clearTimeout(timer);
    if (!visible || !isRunning(state)) return;
    timer = setTimeout(() => dispatch({ type: 'tick' }), tickDelay(state));
  };

  const paint = (prev: ConsoleState): void => {
    if (prev.view !== state.view) {
      root.dataset['view'] = state.view;
      crumb.innerHTML = renderCrumb(state);
      for (const b of dock) {
        const on = b.dataset['dock'] === state.view;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      }
      const caption = CAPTIONS[state.view];
      if (captionLead) captionLead.textContent = typo(caption[0]);
      if (captionRest) captionRest.textContent = typo(caption[1]);
    }
    if (input.value !== state.query) input.value = state.query;
    body.innerHTML = renderBody(state, uid);
    foot.innerHTML = renderFoot(state);
    input.setAttribute('aria-activedescendant', state.view === 'palette' ? `cs-opt-${uid}-${state.selected}` : '');
    if (state.view === 'palette') {
      const list = body.querySelector<HTMLElement>('.cs-list');
      const sel = body.querySelector<HTMLElement>('.cs-item.is-sel');
      if (list && sel) {
        // Przewijamy samą listę, nigdy stronę.
        const top = sel.offsetTop - list.offsetTop;
        if (top < list.scrollTop + 28) list.scrollTop = Math.max(0, top - 28);
        else if (top + sel.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + sel.offsetHeight - list.clientHeight + 8;
      }
    }
  };

  const dispatch = (action: Action): void => {
    const prev = state;
    state = reduce(state, action);
    if (action.type === 'open' && reducedMotion()) state = reduce(state, { type: 'finish' });
    if (state === prev) return;
    paint(prev);
    schedule();
    if (prev.view !== state.view && byKeyboard) {
      if (state.view === 'palette') input.focus({ preventScroll: true });
      else body.focus({ preventScroll: true });
    }
  };

  const enter = (): void => {
    if (state.view === 'palette') {
      const target = enterTarget(state);
      if (!target) return;
      if (target.kind === 'link' && target.href) window.location.href = target.href;
      else if (target.scenario) dispatch({ type: 'open', id: target.scenario });
      return;
    }
    if (isDone(state)) dispatch({ type: 'open', id: state.view });
    else dispatch({ type: 'finish' });
  };

  /**
   * Pisanie w polu poza ekranem przerywa płynne przewijanie (przeglądarka sama
   * dosuwa pole do krawędzi), więc przy pracy z klawiatury dosuwamy całe okno.
   */
  const ensureVisible = (): void => {
    const r = root.getBoundingClientRect();
    if (r.top < 96 || r.bottom > window.innerHeight) root.scrollIntoView({ block: 'center', behavior: 'auto' });
  };

  const takeOver = (): void => {
    userTookOver = true;
    autoplayRun += 1;
  };

  root.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    takeOver();
    byKeyboard = true;
    if (e.key.length === 1 || e.key === 'Enter' || e.key.startsWith('Arrow')) ensureVisible();
    const inPalette = state.view === 'palette';
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        dispatch({ type: 'move', delta: e.key === 'ArrowDown' ? 1 : -1 });
        break;
      case 'Enter':
        // Enter na przycisku w oknie zostawiamy przyciskowi.
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        enter();
        break;
      case 'Escape':
        if (inPalette && state.query === '') input.blur();
        else {
          e.preventDefault();
          dispatch({ type: 'back' });
        }
        break;
      case 'Backspace':
        if (!inPalette) {
          e.preventDefault();
          dispatch({ type: 'back' });
        }
        break;
      default:
    }
  });

  input.addEventListener('input', () => {
    takeOver();
    ensureVisible();
    dispatch({ type: 'query', value: input.value });
  });

  const actOn = (target: EventTarget | null): void => {
    if (!(target instanceof Element)) return;
    const el = target.closest<HTMLElement>('[data-act]');
    if (!el || !root.contains(el)) return;
    const index = Number(el.dataset['index'] ?? '0');
    switch (el.dataset['act']) {
      case 'item':
        dispatch({ type: 'select', index });
        enter();
        break;
      case 'focus':
        dispatch({ type: 'focus', index });
        break;
      case 'enter':
        enter();
        break;
      case 'back':
        dispatch({ type: 'back' });
        break;
      default:
    }
  };

  root.addEventListener('pointerdown', () => {
    takeOver();
    byKeyboard = false;
  });
  root.addEventListener('click', (e) => {
    // Kliknięcie wywołane klawiszem (Enter/Spacja na przycisku) ma detail === 0.
    byKeyboard = e.detail === 0;
    actOn(e.target);
  });
  root.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || state.view !== 'palette' || !(e.target instanceof Element)) return;
    const item = e.target.closest<HTMLElement>('.cs-item');
    if (!item) return;
    const index = Number(item.dataset['index'] ?? '0');
    if (index !== state.selected) dispatch({ type: 'select', index });
  });

  for (const b of dock) {
    b.addEventListener('click', (e) => {
      takeOver();
      byKeyboard = e.detail === 0;
      const id = scenarioOf(b.dataset['dock']);
      const keep = byKeyboard;
      byKeyboard = false; // fokus zostaje na przycisku pod oknem
      if (id) dispatch({ type: 'open', id });
      else dispatch({ type: 'back' });
      byKeyboard = keep;
    });
  }

  /* Autoodtwarzanie: pokazuje trzy scenariusze, dopóki nikt nie dotknie okna. */
  const autoplay = async (): Promise<void> => {
    if (userTookOver || reducedMotion() || root.dataset['autoplay'] !== 'true') return;
    const run = ++autoplayRun;
    const alive = (): boolean => run === autoplayRun && !userTookOver;
    const waitDone = async (): Promise<void> => {
      while (alive() && !isDone(state)) await sleep(200);
    };
    await sleep(1400);
    if (!alive()) return;
    for (const ch of 'wdr') {
      dispatch({ type: 'query', value: state.query + ch });
      await sleep(170);
      if (!alive()) return;
    }
    await sleep(650);
    const order: ScenarioId[] = ['deploy', 'flow', 'redteam'];
    while (alive()) {
      for (const id of order) {
        if (!alive()) return;
        dispatch({ type: 'open', id });
        await waitDone();
        await sleep(3800);
      }
      if (!alive()) return;
      dispatch({ type: 'back' });
      await sleep(2600);
    }
  };

  // Zegar scenariusza stoi tylko wtedy, gdy okna w ogóle nie widać. Autoodtwarzanie
  // rusza dopiero, gdy widać go co najmniej w jednej trzeciej.
  let showing = false;
  new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      visible = entry.isIntersecting;
      const enough = entry.isIntersecting && entry.intersectionRatio >= 0.34;
      if (visible) schedule();
      else clearTimeout(timer);
      if (enough && !showing) void autoplay();
      if (!enough && showing) autoplayRun += 1;
      showing = enough;
    },
    { threshold: [0, 0.35] },
  ).observe(root);
  visible = false;

  root.dataset['ready'] = 'true';

  return {
    focus() {
      takeOver();
      byKeyboard = true;
      if (state.view !== 'palette') dispatch({ type: 'back' });
      root.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
      input.focus({ preventScroll: true });
    },
    dispatch,
    get state() {
      return state;
    },
  };
}

const handles = new Map<HTMLElement, ConsoleHandle>();

export function mountAll(): ConsoleHandle | undefined {
  for (const root of document.querySelectorAll<HTMLElement>('[data-console]')) {
    if (!handles.has(root)) handles.set(root, mount(root));
  }
  return handles.values().next().value;
}
