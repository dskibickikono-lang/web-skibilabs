import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COMMANDS, DEPLOY, FLOW, REDTEAM } from '../src/lib/console/data.ts';
import { enterTarget, filterCommands, initialState, isDone, isRunning, reduce, scenarioLength, tickDelay, type ConsoleState } from '../src/lib/console/model.ts';
import { renderBody, renderConsole, renderFoot } from '../src/lib/console/templates.ts';

const run = (state: ConsoleState, n: number): ConsoleState => {
  let s = state;
  for (let i = 0; i < n; i++) s = reduce(s, { type: 'tick' });
  return s;
};

test('paleta: jest po jednym poleceniu na każdy filar', () => {
  const scenarios = COMMANDS.filter((c) => c.kind === 'run').map((c) => c.scenario);
  assert.deepEqual(scenarios, ['deploy', 'flow', 'redteam']);
});

test('paleta: filtrowanie ignoruje wielkość liter i polskie znaki', () => {
  assert.equal(filterCommands('WDROZ')[0]?.id, 'deploy');
  assert.equal(filterCommands('przepływ')[0]?.id, 'flow');
  assert.equal(filterCommands('red team')[0]?.id, 'redteam');
  assert.equal(filterCommands('zzzz').length, 0);
});

test('paleta: strzałki zawijają się na końcach listy', () => {
  const up = reduce(initialState, { type: 'move', delta: -1 });
  assert.equal(up.selected, COMMANDS.length - 1);
  assert.equal(reduce(up, { type: 'move', delta: 1 }).selected, 0);
});

test('paleta: zmiana zapytania wraca do pierwszego wyniku, Enter wskazuje cel', () => {
  const moved = reduce(initialState, { type: 'move', delta: 2 });
  const typed = reduce(moved, { type: 'query', value: 'kontakt' });
  assert.equal(typed.selected, 0);
  assert.equal(enterTarget(typed)?.href, '/kontakt/');
  assert.equal(enterTarget(reduce(initialState, { type: 'query', value: 'nic takiego' })), null);
});

for (const id of ['deploy', 'flow', 'redteam'] as const) {
  test(`scenariusz ${id}: przechodzi od pierwszego zdarzenia do końca`, () => {
    let s = reduce(initialState, { type: 'open', id });
    assert.equal(s.view, id);
    assert.ok(isRunning(s));
    assert.ok(tickDelay(s) > 0);
    s = run(s, scenarioLength(id));
    assert.ok(isDone(s));
    assert.equal(run(s, 3).tick, scenarioLength(id), 'dodatkowe tyknięcia niczego nie zmieniają');
    const back = reduce({ ...s, query: 'wdr' }, { type: 'back' });
    assert.deepEqual(back, initialState, 'powrót daje czystą paletę');
  });
}

test('scenariusz: „pokaż wynik” kończy od razu, a wybrany wiersz nie ucieka', () => {
  let s = reduce(initialState, { type: 'open', id: 'redteam' });
  s = reduce(s, { type: 'focus', index: 5 });
  s = reduce(s, { type: 'finish' });
  assert.ok(isDone(s));
  assert.equal(s.focus, 5);
  const auto = reduce(reduce(initialState, { type: 'open', id: 'redteam' }), { type: 'finish' });
  assert.equal(REDTEAM.attempts[auto.focus]?.verdict, 'przeszła', 'po zakończeniu widać pierwszą próbę, która przeszła');
});

test('scenariusz: strzałki w widoku wyniku nie wychodzą poza listę', () => {
  let s = reduce(initialState, { type: 'open', id: 'flow' });
  s = reduce(s, { type: 'move', delta: -1 });
  assert.equal(s.focus, 0);
  for (let i = 0; i < 20; i++) s = reduce(s, { type: 'move', delta: 1 });
  assert.equal(s.focus, FLOW.events.length - 1);
});

test('szablony: stan początkowy zawiera paletę i wszystkie polecenia', () => {
  const html = renderConsole(initialState, 't');
  for (const c of COMMANDS) assert.ok(html.includes(c.title.replace(/ ([aiouwz]) /g, ' $1 ')) || html.includes(c.title), c.title);
  assert.ok(html.includes('role="listbox"'));
  assert.ok(html.includes('aria-activedescendant="cs-opt-t-0"'));
});

test('szablony: każdy scenariusz ma własny widok wyniku', () => {
  const body = (id: 'deploy' | 'flow' | 'redteam'): string => renderBody(reduce(reduce(initialState, { type: 'open', id }), { type: 'finish' }), 't');
  assert.ok(body('deploy').includes('cs-deploy') && body('deploy').includes(DEPLOY.permissions[3][0]));
  assert.ok(body('flow').includes('cs-trace') && body('flow').includes('błąd 503'));
  assert.ok(body('redteam').includes('cs-attempts') && body('redteam').includes('Co poprawić'));
});

test('szablony: wynik red team podaje liczby odpartych i do poprawy', () => {
  const done = reduce(reduce(initialState, { type: 'open', id: 'redteam' }), { type: 'finish' });
  const blocked = REDTEAM.attempts.filter((a) => a.verdict === 'odparta').length;
  assert.ok(renderFoot(done).replace(/\u00a0/g, ' ').includes(`${blocked} z ${REDTEAM.attempts.length}`));
});

test('dane: scenariusz ataku nie zawiera treści ataków, tylko nazwy klas', () => {
  const text = JSON.stringify(REDTEAM).toLowerCase();
  for (const banned of ['ignore previous', 'zignoruj poprzednie', 'system prompt', '<script', 'curl ', 'http://', 'https://']) {
    assert.ok(!text.includes(banned), banned);
  }
});

test('szablony: tekst użytkownika jest zabezpieczany', () => {
  const s = reduce(initialState, { type: 'query', value: '<img src=x onerror=alert(1)>' });
  assert.ok(!renderBody(s, 't').includes('<img'));
});
