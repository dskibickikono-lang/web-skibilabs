/**
 * Szablony HTML konsoli demo. Czyste funkcje stanu → napis; bez DOM.
 * Build renderuje nimi stan początkowy, przeglądarka — każdy kolejny.
 */
import { typo } from '../typography.ts';
import { DEPLOY, FLOW, REDTEAM, SCENARIO_TITLES, type Command, type IconName, type ScenarioId } from './data.ts';
import { enterTarget, filterCommands, isDone, scenarioLength, type ConsoleState } from './model.ts';

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);
/** Tekst dla człowieka: zabezpieczony i z twardymi spacjami. */
const t = (s: string): string => esc(typo(s));

const svg = (body: string, size = 16): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS: Record<IconName | 'back' | 'enter' | 'check' | 'cross' | 'up' | 'down' | 'search', string> = {
  server: svg('<rect x="2" y="2.5" width="12" height="4.5" rx="1.5"/><rect x="2" y="9" width="12" height="4.5" rx="1.5"/><path d="M4.75 4.75h.01M4.75 11.25h.01"/>'),
  flow: svg('<circle cx="3.5" cy="4" r="1.75"/><circle cx="12.5" cy="12" r="1.75"/><path d="M5.25 4H9a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H7a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h3.75"/>'),
  shield: svg('<path d="M8 1.75 2.75 3.5v4.25c0 3 2.1 5.4 5.25 6.5 3.15-1.1 5.25-3.5 5.25-6.5V3.5L8 1.75Z"/><path d="m5.75 8 1.6 1.6 2.9-3.1"/>'),
  page: svg('<path d="M4 1.75h5.25L12.5 5v8.25a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10.5a1 1 0 0 1 1-1Z"/><path d="M9 1.75V5.5h3.5"/>'),
  mail: svg('<rect x="1.75" y="3" width="12.5" height="10" rx="1.5"/><path d="m2.5 4.5 5.5 4 5.5-4"/>'),
  back: svg('<path d="M9.5 3.5 5 8l4.5 4.5"/>'),
  enter: svg('<path d="M12.5 3.5v4a2 2 0 0 1-2 2h-7"/><path d="M6 6.75 3.25 9.5 6 12.25"/>', 12),
  check: svg('<path d="m3.5 8.25 3 3 6-6.5"/>', 12),
  cross: svg('<path d="m4 4 8 8M12 4l-8 8"/>', 12),
  up: svg('<path d="M8 12.5v-9M4.25 7 8 3.25 11.75 7"/>', 12),
  down: svg('<path d="M8 3.5v9M4.25 9 8 12.75 11.75 9"/>', 12),
  search: svg('<circle cx="7" cy="7" r="4.25"/><path d="m10.25 10.25 3 3"/>'),
};

const kbd = (inner: string, label?: string): string =>
  `<kbd class="kbd"${label ? ` aria-label="${esc(label)}"` : ''}>${inner}</kbd>`;

/* ——— Paleta ——— */

function paletteItem(c: Command, index: number, selected: boolean, uid: string): string {
  return (
    `<div class="cs-item${selected ? ' is-sel' : ''}" role="option" id="cs-opt-${uid}-${index}" aria-selected="${selected}" data-act="item" data-index="${index}">` +
    `<span class="cs-ico cs-ico-${c.kind}">${ICONS[c.icon]}</span>` +
    `<span class="cs-item-t">${t(c.title)}</span>` +
    `<span class="cs-item-h">${t(c.hint)}</span>` +
    `</div>`
  );
}

function palettePreview(c: Command | undefined): string {
  if (!c) return `<div class="cs-preview"></div>`;
  const facts = c.facts.map(([k, v]) => `<div class="cs-fact"><dt>${t(k)}</dt><dd>${t(v)}</dd></div>`).join('');
  return (
    `<div class="cs-preview">` +
    `<div class="cs-preview-top"><span class="cs-tile">${ICONS[c.icon]}</span>` +
    `<p class="cs-preview-t">${t(c.title)}</p>` +
    `<p class="cs-preview-a">${t(c.about)}</p></div>` +
    `<p class="cs-label">Informacje</p><dl class="cs-facts">${facts}</dl>` +
    `</div>`
  );
}

function paletteBody(state: ConsoleState, uid: string): string {
  const list = filterCommands(state.query);
  let rows = '';
  let group = '';
  list.forEach((c, i) => {
    if (c.group !== group) {
      group = c.group;
      rows += `<div class="cs-group" role="presentation">${t(group)}</div>`;
    }
    rows += paletteItem(c, i, i === state.selected, uid);
  });
  if (list.length === 0) {
    rows = `<div class="cs-empty" role="presentation">${t(`Nie ma polecenia dla „${state.query}”. Spróbuj: agent, przepływ, test.`)}</div>`;
  }
  return (
    `<div class="cs-palette">` +
    `<div class="cs-list" role="listbox" id="cs-list-${uid}" aria-label="Polecenia">${rows}</div>` +
    palettePreview(list[state.selected]) +
    `</div>`
  );
}

/* ——— Wdrożenie agenta ——— */

type RowState = 'done' | 'run' | 'wait';
const rowState = (index: number, tick: number): RowState => (index < tick ? 'done' : index === tick ? 'run' : 'wait');
const stateIcon = (s: RowState, failed = false): string =>
  s === 'done'
    ? `<span class="cs-state ${failed ? 'is-fail' : 'is-ok'}">${failed ? ICONS.cross : ICONS.check}</span>`
    : s === 'run'
      ? `<span class="cs-state is-run"><span class="cs-spin"></span></span>`
      : `<span class="cs-state is-wait"></span>`;

function deployBody(state: ConsoleState): string {
  const steps = DEPLOY.steps
    .map((s, i) => {
      const st = rowState(i, state.tick);
      return (
        `<li><button type="button" class="cs-step is-${st}${i === state.focus ? ' is-focus' : ''}" data-act="focus" data-index="${i}"${i === state.focus ? ' aria-current="step"' : ''}>` +
        stateIcon(st) +
        `<span class="cs-step-t">${t(s.title)}</span>` +
        `<span class="cs-step-log mono">${st === 'wait' ? '&nbsp;' : t(s.log)}</span>` +
        `</button></li>`
      );
    })
    .join('');
  const services = DEPLOY.services
    .map(([name, after]) => {
      const up = state.tick >= after;
      return `<li class="cs-row"><span class="cs-dot${up ? ' is-ok' : ''}"></span><span class="mono">${esc(name)}</span><span class="cs-row-v">${up ? 'działa' : 'czeka'}</span></li>`;
    })
    .join('');
  const granted = state.tick >= DEPLOY.permissionsAfterStep;
  const perms = DEPLOY.permissions
    .map(([tool, decision]) => {
      const cls = decision === 'zablokowane' ? 'is-fail' : decision === 'dozwolone' ? 'is-ok' : 'is-warn';
      return `<li class="cs-row"><span class="mono">${esc(tool)}</span><span class="cs-chip ${granted ? cls : ''}">${granted ? t(decision) : '—'}</span></li>`;
    })
    .join('');
  return (
    `<div class="cs-deploy">` +
    `<ol class="cs-steps" aria-label="Kroki wdrożenia">${steps}</ol>` +
    `<div class="cs-side">` +
    `<div class="cs-panel"><p class="cs-label">Usługi</p><ul>${services}</ul></div>` +
    `<div class="cs-panel"><p class="cs-label">Uprawnienia narzędzi</p><ul>${perms}</ul></div>` +
    `</div></div>`
  );
}

/* ——— Przebieg przepływu ——— */

function flowBody(state: ConsoleState): string {
  const rows = FLOW.events
    .map((e, i) => {
      const st = rowState(i, state.tick);
      const left = ((e.at / FLOW.total) * 100).toFixed(2);
      const width = Math.max((e.len / FLOW.total) * 100, 1.4).toFixed(2);
      return (
        `<li><button type="button" class="cs-ev is-${st} is-${e.kind}${i === state.focus ? ' is-focus' : ''}" data-act="focus" data-index="${i}"${i === state.focus ? ' aria-current="step"' : ''}>` +
        `<span class="cs-ev-n mono">${esc(e.step)}</span>` +
        `<span class="cs-ev-track"><span class="cs-ev-bar" style="left:${left}%;width:${width}%;--ms:${e.ms}ms"></span></span>` +
        `<span class="cs-ev-l mono">${st === 'wait' ? '' : t(e.label)}</span>` +
        `</button></li>`
      );
    })
    .join('');
  const focused = FLOW.events[state.focus];
  const visible = focused && state.focus <= state.tick;
  return (
    `<div class="cs-flow">` +
    `<p class="cs-flow-head mono"><span>${esc(FLOW.name)}</span><span>commit ${esc(FLOW.commit)}</span><span>przebieg ${esc(FLOW.run)}</span></p>` +
    `<ol class="cs-trace" aria-label="Ślad wykonania">${rows}</ol>` +
    `<div class="cs-detail"><p class="cs-label">${visible ? t(focused.title) : 'Krok'}</p>` +
    `<p class="cs-detail-v">${visible ? t(focused.detail) : 'Ten krok jeszcze się nie wykonał.'}</p></div>` +
    `</div>`
  );
}

/* ——— Test red team ——— */

function redteamBody(state: ConsoleState): string {
  const done = REDTEAM.attempts.slice(0, state.tick);
  const blocked = done.filter((a) => a.verdict === 'odparta').length;
  const passed = done.length - blocked;
  const meter = REDTEAM.attempts
    .map((a, i) => `<span class="${i < state.tick ? (a.verdict === 'odparta' ? 'is-ok' : 'is-fail') : ''}"></span>`)
    .join('');
  const rows = REDTEAM.attempts
    .map((a, i) => {
      const st = rowState(i, state.tick);
      const failed = a.verdict === 'przeszła';
      const chip =
        st === 'done'
          ? `<span class="cs-chip ${failed ? 'is-fail' : 'is-ok'}">${failed ? 'przeszła' : 'odparta'}</span>`
          : `<span class="cs-chip">${st === 'run' ? 'w toku' : '—'}</span>`;
      return (
        `<li><button type="button" class="cs-att is-${st}${i === state.focus ? ' is-focus' : ''}" data-act="focus" data-index="${i}"${i === state.focus ? ' aria-current="true"' : ''}>` +
        `<span class="cs-att-i mono">${String(i + 1).padStart(2, '0')}</span>` +
        `<span class="cs-att-t">${t(a.short)}</span>${chip}` +
        `</button></li>`
      );
    })
    .join('');
  const a = REDTEAM.attempts[state.focus];
  const known = a !== undefined && state.focus < state.tick;
  const finding = a
    ? `<p class="cs-label">Klasa problemu</p><p class="cs-finding-t">${t(a.klass)}</p>` +
      (known
        ? `<p class="cs-label">Co zaobserwowano</p><p class="cs-finding-v">${t(a.seen)}</p>` +
          `<p class="cs-label">Co poprawić</p><p class="cs-finding-v">${t(a.fix)}</p>` +
          `<p class="cs-finding-p"><span class="cs-label">Priorytet</span><span class="cs-chip ${a.verdict === 'przeszła' ? 'is-fail' : ''}">${t(a.priority)}</span></p>`
        : `<p class="cs-finding-v">Ta próba jeszcze się nie odbyła.</p>`)
    : '';
  return (
    `<div class="cs-red">` +
    `<div class="cs-red-sum"><span>Odparte <b>${blocked}</b></span><span>Przeszły <b>${passed}</b></span>` +
    `<span class="cs-meter" aria-hidden="true">${meter}</span></div>` +
    `<div class="cs-red-main"><ol class="cs-attempts" aria-label="Próby">${rows}</ol>` +
    `<div class="cs-finding">${finding}</div></div>` +
    `</div>`
  );
}

/* ——— Części okna ——— */

export function renderBody(state: ConsoleState, uid: string): string {
  switch (state.view) {
    case 'palette':
      return paletteBody(state, uid);
    case 'deploy':
      return deployBody(state);
    case 'flow':
      return flowBody(state);
    case 'redteam':
      return redteamBody(state);
  }
}

export function renderCrumb(state: ConsoleState): string {
  if (state.view === 'palette') return '';
  const sub = state.view === 'deploy' ? `${DEPLOY.agent} → ${DEPLOY.target}` : state.view === 'flow' ? FLOW.name : `${REDTEAM.agent} · ${REDTEAM.scope}`;
  return `<span class="cs-crumb-t">${t(SCENARIO_TITLES[state.view])}</span><span class="cs-crumb-s mono">${t(sub)}</span>`;
}

function status(state: ConsoleState): string {
  if (state.view === 'palette') return `<span class="cs-brand"><span class="cs-brand-mark"></span>Konsola Skibi Labs</span>`;
  const len = scenarioLength(state.view);
  if (!isDone(state)) {
    const what = state.view === 'deploy' ? 'Krok' : state.view === 'flow' ? 'Zdarzenie' : 'Próba';
    return `<span class="cs-status"><span class="cs-spin"></span>${what} ${state.tick + 1} z ${len}</span>`;
  }
  if (state.view === 'deploy') return `<span class="cs-status is-ok">${ICONS.check}${t(DEPLOY.firstTask)}</span>`;
  if (state.view === 'flow') return `<span class="cs-status is-ok">${ICONS.check}${t(FLOW.result)}</span>`;
  const blocked = REDTEAM.attempts.filter((a) => a.verdict === 'odparta').length;
  return `<span class="cs-status is-warn">${t(`${blocked} z ${len} prób odpartych · ${len - blocked} do poprawy`)}</span>`;
}

export function renderFoot(state: ConsoleState): string {
  let actions: string;
  if (state.view === 'palette') {
    const target = enterTarget(state);
    const label = target?.kind === 'link' ? 'Otwórz' : 'Uruchom';
    actions =
      `<button type="button" class="cs-action" data-act="enter"${target ? '' : ' disabled'}>${label}${kbd(ICONS.enter, 'Enter')}</button>` +
      `<span class="cs-action cs-action-keys" aria-hidden="true">Wybierz${kbd(ICONS.up)}${kbd(ICONS.down)}</span>`;
  } else {
    actions =
      `<button type="button" class="cs-action" data-act="enter">${isDone(state) ? 'Uruchom ponownie' : 'Pokaż wynik'}${kbd(ICONS.enter, 'Enter')}</button>` +
      `<button type="button" class="cs-action" data-act="back">Paleta${kbd('esc', 'Escape')}</button>`;
  }
  return `<div class="cs-foot-l" role="status">${status(state)}</div><div class="cs-foot-r">${actions}</div>`;
}

/** Całe okno konsoli. `uid` odróżnia identyfikatory, gdy na stronie jest więcej niż jedno okno. */
export function renderConsole(state: ConsoleState, uid: string): string {
  const active = state.view === 'palette' ? `cs-opt-${uid}-${state.selected}` : '';
  return (
    `<div class="cs-head">` +
    `<button type="button" class="cs-back" data-act="back" aria-label="Wróć do palety">${ICONS.back}</button>` +
    `<span class="cs-search" aria-hidden="true">${ICONS.search}</span>` +
    `<label class="sr-only" for="cs-input-${uid}">Szukaj polecenia</label>` +
    `<input class="cs-input" id="cs-input-${uid}" type="text" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="cs-list-${uid}" aria-activedescendant="${active}" ` +
    `autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" placeholder="Wpisz polecenie…" value="${esc(state.query)}">` +
    `<div class="cs-crumb" data-slot="crumb">${renderCrumb(state)}</div>` +
    `<span class="cs-tag mono">symulacja</span>` +
    `</div>` +
    `<div class="cs-body" data-slot="body" tabindex="-1">${renderBody(state, uid)}</div>` +
    `<div class="cs-foot" data-slot="foot">${renderFoot(state)}</div>`
  );
}

export function scenarioOf(id: string | undefined): ScenarioId | null {
  return id === 'deploy' || id === 'flow' || id === 'redteam' ? id : null;
}
