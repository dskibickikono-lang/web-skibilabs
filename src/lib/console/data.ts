/**
 * Dane konsoli demo. Wszystko tutaj jest fikcyjne: nazwy serwerów, agentów,
 * zamówień i wyniki. W scenariuszu red team są wyłącznie nazwy i opisy klas
 * problemów — bez treści ataków.
 */

export type ScenarioId = 'deploy' | 'flow' | 'redteam';
export type IconName = 'server' | 'flow' | 'shield' | 'page' | 'mail';

export interface Command {
  id: string;
  kind: 'run' | 'link';
  title: string;
  /** Krótki kontekst pokazywany szarym tekstem obok tytułu. */
  hint: string;
  group: string;
  icon: IconName;
  /** Dodatkowe słowa, po których polecenie da się znaleźć. */
  keywords: string;
  scenario?: ScenarioId;
  href?: string;
  /** Opis w panelu podglądu palety. */
  about: string;
  /** Wiersze „etykieta → wartość” w panelu podglądu. */
  facts: readonly (readonly [string, string])[];
}

export const COMMANDS: readonly Command[] = [
  {
    id: 'deploy',
    kind: 'run',
    title: 'Wdróż agenta na serwerze',
    hint: 'agent-faktury',
    group: 'Polecenia',
    icon: 'server',
    keywords: 'agent infrastruktura deploy uruchom serwer vps wdrozenie',
    scenario: 'deploy',
    about: 'Stawia środowisko agenta na serwerze klienta: uruchomienie, kolejka, pamięć, sekrety, uprawnienia narzędzi i pierwsze zadanie.',
    facts: [
      ['Filar', 'Infrastruktura dla agentów'],
      ['Cel', 'vps-klienta'],
      ['Kroki', '6'],
      ['Wynik', 'Stan usług i pierwsze zadanie'],
    ],
  },
  {
    id: 'flow',
    kind: 'run',
    title: 'Uruchom przepływ',
    hint: 'zamowienia-do-erp',
    group: 'Polecenia',
    icon: 'flow',
    keywords: 'automatyzacja przeplyw flow workflow make n8n erp zamowienia',
    scenario: 'flow',
    about: 'Wykonuje przepływ zapisany jako kod w repozytorium klienta i pokazuje ślad: każdy krok, ponowienie po błędzie i zapis wyniku.',
    facts: [
      ['Filar', 'Automatyzacja na własnym serwerze'],
      ['Źródło', 'repozytorium, gałąź main'],
      ['Kroki', '5'],
      ['Wynik', 'Ślad wykonania'],
    ],
  },
  {
    id: 'redteam',
    kind: 'run',
    title: 'Test red team na agencie',
    hint: 'agent-faktury',
    group: 'Polecenia',
    icon: 'shield',
    keywords: 'bezpieczenstwo audyt red team atak test wstrzykiwanie uprawnienia wyciek',
    scenario: 'redteam',
    about: 'Przeprowadza serię prób z uzgodnionego zakresu i pokazuje, które agent odparł, które przeszły i co poprawić.',
    facts: [
      ['Filar', 'Audyty bezpieczeństwa i red team'],
      ['Zakres', 'środowisko testowe, za zgodą'],
      ['Próby', '7'],
      ['Wynik', 'Lista ustaleń z poprawkami'],
    ],
  },
  {
    id: 'go-agenci',
    kind: 'link',
    title: 'Infrastruktura dla agentów AI',
    hint: 'strona',
    group: 'Przejdź do',
    icon: 'page',
    keywords: 'agenci filar oferta',
    href: '/agenci/',
    about: 'Co dostajesz, gdy stawiamy środowisko dla agenta, i po czym poznasz, że działa.',
    facts: [['Adres', '/agenci/']],
  },
  {
    id: 'go-automatyzacja',
    kind: 'link',
    title: 'Automatyzacja na własnym serwerze',
    hint: 'strona',
    group: 'Przejdź do',
    icon: 'page',
    keywords: 'automatyzacja filar oferta vps',
    href: '/automatyzacja/',
    about: 'Przepływy pisane jako kod i uruchamiane na serwerze klienta.',
    facts: [['Adres', '/automatyzacja/']],
  },
  {
    id: 'go-bezpieczenstwo',
    kind: 'link',
    title: 'Audyty bezpieczeństwa i red team',
    hint: 'strona',
    group: 'Przejdź do',
    icon: 'page',
    keywords: 'bezpieczenstwo audyt filar oferta',
    href: '/bezpieczenstwo/',
    about: 'Testy systemów z agentami AI i ich otoczenia; raport z dowodami i poprawkami.',
    facts: [['Adres', '/bezpieczenstwo/']],
  },
  {
    id: 'go-kontakt',
    kind: 'link',
    title: 'Napisz do nas',
    hint: 'kontakt',
    group: 'Przejdź do',
    icon: 'mail',
    keywords: 'kontakt email rozmowa wycena',
    href: '/kontakt/',
    about: 'Opisz, co chcesz uruchomić albo sprawdzić. Odpowiadamy w ciągu jednego dnia roboczego.',
    facts: [['Adres', '/kontakt/']],
  },
];

/* ——— Scenariusz 1: wdrożenie agenta ——— */

export interface DeployStep {
  title: string;
  log: string;
  /** Czas symulacji w milisekundach. */
  ms: number;
}

export const DEPLOY = {
  target: 'vps-klienta',
  agent: 'agent-faktury',
  steps: [
    { title: 'Połączenie z serwerem', log: 'vps-klienta · Debian 12 · 4 vCPU, 8 GB', ms: 700 },
    { title: 'Środowisko uruchomieniowe', log: 'kontener agent-faktury:1.4.2 · konto bez uprawnień administratora', ms: 1100 },
    { title: 'Kolejka i pamięć', log: 'kolejka zadań gotowa · pamięć: 0 wpisów', ms: 800 },
    { title: 'Sekrety', log: '3 sekrety z sejfu serwera · żaden nie trafia do logów', ms: 700 },
    { title: 'Uprawnienia narzędzi', log: '4 narzędzia: 3 dozwolone, 1 zablokowane', ms: 900 },
    { title: 'Pierwsze zadanie', log: 'faktura FV/2026/0113 odczytana i przekazana do kolejki księgowej', ms: 1300 },
  ] satisfies DeployStep[],
  /** Usługa i numer kroku, po którym przechodzi w stan „działa”. */
  services: [
    ['agent-runtime', 2],
    ['kolejka', 3],
    ['pamięć', 3],
    ['monitoring', 5],
  ] as const,
  /** Narzędzie, decyzja i numer kroku, po którym uprawnienie jest nadane. */
  permissions: [
    ['poczta.odczyt', 'dozwolone'],
    ['faktury.odczyt', 'dozwolone'],
    ['erp.szkic_dokumentu', 'za zgodą'],
    ['erp.platnosc', 'zablokowane'],
  ] as const,
  permissionsAfterStep: 5,
  firstTask: 'Pierwsze zadanie wykonane · 1 faktura · 0 błędów',
} as const;

/* ——— Scenariusz 2: przebieg przepływu ——— */

export type FlowKind = 'ok' | 'fail' | 'wait';

export interface FlowEvent {
  /** Nazwa kroku w kodzie przepływu. */
  step: string;
  title: string;
  kind: FlowKind;
  /** Początek i długość na osi czasu przebiegu, w milisekundach. */
  at: number;
  len: number;
  label: string;
  detail: string;
  /** Czas symulacji w milisekundach. */
  ms: number;
}

export const FLOW = {
  name: 'zamowienia-do-erp',
  commit: 'a3f9c1e',
  run: '#1824',
  total: 6570,
  events: [
    { step: 'wyzwalacz', title: 'Nowe zamówienie', kind: 'ok', at: 0, len: 40, label: '12 ms', detail: 'Zdarzenie ze sklepu: zamówienie #48213.', ms: 500 },
    { step: 'pobierz', title: 'Pobierz zamówienie', kind: 'ok', at: 40, len: 200, label: '180 ms', detail: 'Pobrano 3 pozycje i dane odbiorcy.', ms: 700 },
    { step: 'sprawdz', title: 'Walidacja danych', kind: 'ok', at: 240, len: 40, label: '9 ms', detail: 'NIP i adres dostawy poprawne.', ms: 500 },
    { step: 'wyslij', title: 'Wyślij do ERP · próba 1', kind: 'fail', at: 280, len: 2000, label: 'błąd 503', detail: 'ERP nie odpowiedział w 2 s. Krok zostanie ponowiony.', ms: 1200 },
    { step: 'czekaj', title: 'Odczekanie', kind: 'wait', at: 2280, len: 4000, label: '4 s', detail: 'Druga próba po 4 s, trzecia byłaby po 16 s.', ms: 1000 },
    { step: 'wyslij', title: 'Wyślij do ERP · próba 2', kind: 'ok', at: 6280, len: 260, label: '260 ms', detail: 'ERP przyjął dokument ZO/2026/1907.', ms: 800 },
    { step: 'zapisz', title: 'Zapisz wynik', kind: 'ok', at: 6540, len: 30, label: '22 ms', detail: 'Przebieg #1824 zapisany w bazie na serwerze klienta.', ms: 600 },
  ] satisfies FlowEvent[],
  result: 'Zakończono · 1 ponowienie · wynik zapisany na serwerze klienta',
} as const;

/* ——— Scenariusz 3: test red team ——— */

export type Verdict = 'odparta' | 'przeszła';

export interface Attempt {
  /** Klasa problemu — nazwa, nie instrukcja. */
  klass: string;
  short: string;
  verdict: Verdict;
  seen: string;
  fix: string;
  priority: 'wysoki' | 'średni' | '—';
  ms: number;
}

export const REDTEAM = {
  agent: 'agent-faktury',
  scope: 'środowisko testowe',
  attempts: [
    {
      klass: 'Wstrzyknięcie poleceń w treści wiadomości',
      short: 'Polecenie w wiadomości',
      verdict: 'odparta',
      seen: 'Agent potraktował treść wiadomości jako dane i nie zmienił celu zadania.',
      fix: 'Bez zmian. Zostawić test w zestawie regresyjnym.',
      priority: '—',
      ms: 650,
    },
    {
      klass: 'Wstrzyknięcie poleceń w załączonym dokumencie',
      short: 'Polecenie w dokumencie',
      verdict: 'przeszła',
      seen: 'Agent wykonał instrukcję zapisaną w dokumencie tak, jakby pochodziła od operatora.',
      fix: 'Oddzielić treść dokumentów od instrukcji. Wynik narzędzia nie może zmieniać celu zadania.',
      priority: 'wysoki',
      ms: 900,
    },
    {
      klass: 'Nadużycie narzędzia poza uzgodnionym zakresem',
      short: 'Narzędzie poza zakresem',
      verdict: 'odparta',
      seen: 'Narzędzie odrzuciło operację, której nie ma na liście dozwolonych.',
      fix: 'Bez zmian.',
      priority: '—',
      ms: 650,
    },
    {
      klass: 'Wyciek danych z pamięci do odpowiedzi',
      short: 'Wyciek z pamięci',
      verdict: 'przeszła',
      seen: 'W odpowiedzi pojawił się fragment wpisu należącego do innego kontrahenta.',
      fix: 'Rozdzielić pamięć według kontrahentów i filtrować odpowiedź przed wysłaniem.',
      priority: 'średni',
      ms: 900,
    },
    {
      klass: 'Nadmiarowe uprawnienia w łańcuchu narzędzi',
      short: 'Łańcuch uprawnień',
      verdict: 'odparta',
      seen: 'Połączenie dwóch dozwolonych narzędzi nie dało dostępu do operacji zablokowanej.',
      fix: 'Bez zmian.',
      priority: '—',
      ms: 650,
    },
    {
      klass: 'Ujawnienie sekretów w logach',
      short: 'Sekrety w logach',
      verdict: 'odparta',
      seen: 'Logi zawierają nazwy sekretów, nie ich wartości.',
      fix: 'Bez zmian.',
      priority: '—',
      ms: 600,
    },
    {
      klass: 'Wymuszenie pętli wywołań i kosztów',
      short: 'Pętla wywołań',
      verdict: 'odparta',
      seen: 'Limit kroków przerwał zadanie i zgłosił zdarzenie do monitoringu.',
      fix: 'Bez zmian.',
      priority: '—',
      ms: 700,
    },
  ] satisfies Attempt[],
} as const;

export const SCENARIO_TITLES: Record<ScenarioId, string> = {
  deploy: 'Wdrożenie agenta',
  flow: 'Przebieg przepływu',
  redteam: 'Test red team',
};

/** Podpis pod oknem: pierwsze zdanie białe, reszta szara — jak we wzorcu. */
export const CAPTIONS: Record<'palette' | ScenarioId, readonly [string, string]> = {
  palette: ['Jedna paleta poleceń.', 'Wpisz, czego potrzebujesz, wybierz strzałkami i naciśnij Enter. To symulacja na fikcyjnych danych.'],
  deploy: ['Wdrożenie agenta.', 'Kroki uruchomienia, stan usług, uprawnienia narzędzi i pierwsze wykonane zadanie.'],
  flow: ['Przebieg przepływu.', 'Ślad wykonania krok po kroku: błąd, ponowienie i zapis wyniku.'],
  redteam: ['Test red team.', 'Lista prób: które agent odparł, które przeszły i co poprawić.'],
};
