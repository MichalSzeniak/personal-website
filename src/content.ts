/**
 * All copy on the site lives here, so editing text never requires touching components.
 * Adding a language = adding a key to `Locale` and an object to `content`; TypeScript
 * reports every missing string. Anything grammar- or notation-specific is a function,
 * so each language formats it its own way.
 */
import type { Job } from './lib/career';

/** BCP 47 language tag, also used for <html lang>. */
export type Locale = 'pl';

/** The language of the site's single route, llms.txt and the OG image. */
export const defaultLocale: Locale = 'pl';

/** Anchor ids of page sections; header navigation can only point at these. */
export type SectionId = 'o-mnie' | 'doswiadczenie' | 'technologie' | 'projekty' | 'kontakt';

export interface ExternalLink {
  label: string;
  href: string;
}

/** Language-independent facts. */
export const site = {
  url: 'https://michalszeniak.emes.dev',
  author: 'Michał Szeniak',
  links: {
    linkedin: 'https://www.linkedin.com/in/michal-szeniak',
    github: 'https://github.com/michalszeniak',
  },
  /**
   * Jobs, newest first; dates as YYYY-MM, no `end` = current job. Years of experience and
   * years in the current role are derived from these at build time.
   */
  jobs: [
    { id: 'model-group', company: 'Model Group', start: '2024-09' },
    { id: 'ultimate-systems', company: 'Ultimate Systems', start: '2021-06', end: '2024-07' },
  ],
  /**
   * Projects shown as cards, in this order. `draft: true` entries are templates: they render
   * only in `npm run dev`, and the section disappears from the production build while it has
   * no finished project.
   * [DO UZUPEŁNIENIA] 2–3 projects from GitHub: name, link, stack; the one-sentence
   * description goes into `projects.items` below.
   */
  projects: [
    { id: 'projekt-1', name: '[DO UZUPEŁNIENIA]', href: 'https://github.com/michalszeniak', stack: ['[DO UZUPEŁNIENIA]'], draft: true },
    { id: 'projekt-2', name: '[DO UZUPEŁNIENIA]', href: 'https://github.com/michalszeniak', stack: ['[DO UZUPEŁNIENIA]'], draft: true },
  ],
  /**
   * E-mail alias on the domain (Cloudflare Email Routing forwarding to a private inbox). It never
   * appears in the HTML: the address is assembled in the browser by a script. While it is null,
   * the Kontakt section is shown only by the dev server and the page ships no JavaScript at all.
   */
  email: { user: 'kontakt', domain: 'emes.dev' } as { user: string; domain: string } | null,
} as const satisfies { jobs: readonly Job[]; projects: readonly Project[] } & Record<string, unknown>;

export interface Project {
  id: string;
  name: string;
  href: string;
  stack: readonly string[];
  draft?: boolean;
}

export type JobId = (typeof site.jobs)[number]['id'];
export type ProjectId = (typeof site.projects)[number]['id'];

export interface SiteContent {
  lang: Locale;
  /** Open Graph locale, e.g. pl_PL. */
  ogLocale: `${string}_${string}`;
  meta: {
    title: string;
    description: (years: number) => string;
    /** Third line of the Open Graph image (scripts/brand.mjs). */
    ogTagline: string;
    ogImageAlt: string;
  };
  skipLink: string;
  /** Accessible name of the header wordmark link; starts with the visible word "emes". */
  homeLink: string;
  /** Accessible name of the header navigation; its links are the sections on the page. */
  navLabel: string;
  /** Section titles, also used as navigation labels. */
  sections: Record<SectionId, string>;
  dates: {
    /** Short period, e.g. "06.2021 – 06.2024" or "09.2024 – obecnie". */
    interval: (start: Date, end?: Date) => string;
    /** The same period in words, for screen readers. */
    period: (start: Date, end?: Date) => string;
  };
  hero: {
    name: string;
    role: string;
    lead: (years: number) => string;
    /** The first link is the primary button. */
    links: ExternalLink[];
    /** Label of the mailto button after the links, shown once site.email is set. */
    emailLink: string;
    /** Text alternative of the number line for screen readers. */
    careerSummary: (start: Date) => string;
  };
  about: {
    /** First person, 3–4 sentences; the numbers come from the job dates (see buildFacts). */
    text: (facts: { roleYears: number; previousYears?: number }) => string;
  };
  experience: {
    /** Impersonal style, at most 4 points per job. */
    jobs: Record<JobId, { role: string; points: string[] }>;
  };
  technologies: {
    /** Grouped, no skill levels. The first group is the core stack and is set larger. */
    groups: { name: string; items: string[] }[];
  };
  projects: {
    /** One sentence per project. */
    items: Record<ProjectId, { description: string }>;
    stackLabel: string;
    /** Accessible name of a card's link; must contain `linkText`, e.g. "X: kod na GitHubie". */
    linkLabel: (name: string) => string;
    linkText: string;
  };
  contact: {
    lead: string;
    /** Shown when JavaScript is off, since the address is assembled by a script. */
    noScript: string;
  };
  footer: {
    copyright: (year: number) => string;
    note: string;
  };
  notFound: {
    title: string;
    text: string;
    homeLink: string;
  };
  llms: {
    linksHeading: string;
  };
}

const plMonthYear = new Intl.DateTimeFormat('pl', { month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const plMonthsGenitive = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];
const plMonthGenitive = (date: Date) => `${plMonthsGenitive[date.getUTCMonth()]} ${date.getUTCFullYear()}`;

/** "1 rok", "3 lata", "5 lat", "22 lata" (accusative, as in "przez 3 lata"). */
const plYears = (n: number) => {
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
  return `${n} ${n === 1 ? 'rok' : few ? 'lata' : 'lat'}`;
};

/**
 * Polish typesetting: a one-letter word (a, i, o, u, w, z) or a number must not end a line,
 * so it is bound to the next word with a no-break space.
 */
const bindShortWords = (text: string) => text.replace(/(?<=^|\s)([aiouwzAIOUWZ]|\d+) /g, '$1 ');

const pl: SiteContent = {
  lang: 'pl',
  ogLocale: 'pl_PL',
  meta: {
    title: 'Michał Szeniak, Frontend Developer',
    description: (years) =>
      `Frontend developer z ${years}-letnim doświadczeniem. Buduję rozbudowane aplikacje biznesowe w React i TypeScript.`,
    ogTagline: 'React + TypeScript, rozbudowane aplikacje biznesowe',
    ogImageAlt:
      'Michał Szeniak, Frontend Developer. React + TypeScript, rozbudowane aplikacje biznesowe. Logo emes na papierze w kratkę.',
  },
  skipLink: 'Przejdź do treści',
  homeLink: 'emes, Michał Szeniak, strona główna',
  navLabel: 'Sekcje strony',
  sections: {
    'o-mnie': 'O mnie',
    doswiadczenie: 'Doświadczenie',
    technologie: 'Technologie',
    projekty: 'Projekty',
    kontakt: 'Kontakt',
  },
  dates: {
    interval: (start, end) => `${plMonthYear.format(start)} – ${end ? plMonthYear.format(end) : 'obecnie'}`,
    period: (start, end) => `od ${plMonthGenitive(start)} do ${end ? plMonthGenitive(end) : 'dziś'}`,
  },
  hero: {
    name: 'Michał Szeniak',
    role: 'Frontend Developer',
    lead: (years) => bindShortWords(`Od ${years} lat buduję w React i TypeScript rozbudowane aplikacje biznesowe.`),
    links: [
      { label: 'LinkedIn', href: site.links.linkedin },
      { label: 'GitHub', href: site.links.github },
    ],
    emailLink: 'E-mail',
    careerSummary: (start) => `Pracuję zawodowo od ${plMonthGenitive(start)} roku.`,
  },
  about: {
    text: ({ roleYears, previousYears }) =>
      bindShortWords(
        [
          // "od N lat" is genitive plural for every N > 1.
          `W międzynarodowej firmie produkcyjnej ${roleYears === 0 ? 'od niedawna' : roleYears === 1 ? 'od roku' : `od ${roleYears} lat`} prowadzę frontend systemu CRM i odpowiadam za architekturę tej warstwy.`,
          previousYears &&
            `Wcześniej przez ${plYears(previousYears)} tworzyłem aplikacje dla klientów z różnych branż i bezpośrednio z nimi ustalałem wymagania.`,
          'Dobrze odnajduję się w rozbudowanych bazach kodu i złożonej logice biznesowej.',
          'Zamiast rozwiązań pod jeden ekran projektuję mechanizmy wielokrotnego użytku i dbam o spójność interfejsu.',
        ]
          .filter(Boolean)
          .join(' '),
      ),
  },
  experience: {
    jobs: {
      'model-group': {
        role: 'Frontend Developer',
        points: [
          'Rozwój i utrzymanie wewnętrznego systemu CRM, który obsługuje sprzedaż, produkcję, finanse i HR.',
          'Odpowiedzialność za frontend w całym cyklu: od planowania i analizy potrzeb po wdrożenie i utrzymanie.',
          'Projektowanie interfejsów dla złożonych procesów biznesowych i przenoszenie funkcji ze starszych systemów.',
          'Komponenty i mechanizmy wielokrotnego użytku w React i TypeScript z GraphQL; dbałość o spójność UI.',
        ].map(bindShortWords),
      },
      'ultimate-systems': {
        role: 'Frontend Developer',
        points: [
          'Aplikacje webowe dla klientów z różnych branż (medycyna, e-learning, architektura), w tym systemy CRM i do zarządzania zadaniami.',
          'Interfejsy w React i Next.js z integracją API, interaktywnymi wykresami i kalendarzami; komponenty dokumentowane w Storybooku.',
          'Bezpośrednia współpraca z klientami przy ustalaniu wymagań; dbałość o dostępność zgodnie z WCAG.',
        ].map(bindShortWords),
      },
    },
  },
  technologies: {
    groups: [
      { name: 'Główne', items: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'] },
      { name: 'Dane i stan', items: ['Apollo GraphQL', 'TanStack Query', 'Redux Toolkit', 'React Hook Form', 'REST API'] },
      {
        name: 'UI i narzędzia',
        items: ['shadcn/ui', 'Ant Design', 'Storybook', 'Vitest', 'Figma', 'Git/GitHub', 'Claude Code'],
      },
    ],
  },
  projects: {
    items: {
      'projekt-1': { description: '[DO UZUPEŁNIENIA] Jedno zdanie o projekcie.' },
      'projekt-2': { description: '[DO UZUPEŁNIENIA] Jedno zdanie o projekcie.' },
    },
    stackLabel: 'Stack',
    linkLabel: (name) => `${name}: kod na GitHubie`,
    linkText: 'Kod na GitHubie',
  },
  contact: {
    lead: 'Najprościej napisać e-mail.',
    noScript: 'Adres e-mail pokazuje się po włączeniu JavaScriptu.',
  },
  footer: {
    copyright: (year) => `© ${year} Michał Szeniak`,
    note: 'Bez cookies, analityki i zewnętrznych skryptów.',
  },
  notFound: {
    title: 'Nie ma takiej strony',
    text: 'Ten adres nie prowadzi do żadnej strony. Cała wizytówka jest na stronie głównej.',
    homeLink: 'Przejdź na stronę główną',
  },
  llms: {
    linksHeading: 'Linki',
  },
};

export const content = { pl } satisfies Record<Locale, SiteContent>;
