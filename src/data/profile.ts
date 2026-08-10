/**
 * Everything in the left-hand panel lives here.
 *
 * Every visible string is a `{ es, en }` pair — both languages are rendered
 * into the page and CSS shows one of them, keyed off `html[data-lang]`. See
 * `Bilingual.astro`.
 *
 * The only field that changes anything structural is `capabilities`, which
 * renders one row and one panel slot each.
 */

/** A string in both of the site's languages. */
export interface Localized {
  es: string;
  en: string;
}

export interface Capability {
  /** Key into `Icon.astro`. */
  icon: 'engineering' | 'motion' | 'ops';
  /** Not translated — the discipline goes by its English name in both. */
  title: string;
  /** The hook, shown as a kicker above the panel copy. */
  tag: Localized;
  /** The actual claim. One or two sentences, no more — the panel is fixed-height. */
  line: Localized;
  /**
   * Keys into `src/lib/tool-icons.ts`, rendered as brand marks rather than
   * names. An unknown key fails the build. Six or seven fit on one row in the
   * narrow column; more wraps and eats the panel's fixed height.
   */
  tools: string[];
}

export interface Link {
  label: string;
  href: string;
  external?: boolean;
}

/** The current job, rendered as its own line under the bio. */
export interface Experience {
  /**
   * The role, as one sentence per language. `{company}` is replaced by the link
   * to `company` — one string per language rather than a before/after pair, so
   * each language keeps its own word order.
   */
  line: Localized;
  company: { name: string; href: string };
  /**
   * Opens the track record. `href` is a hash and not a URL on purpose: the
   * record is the left column's second view, rendered into this same page and
   * routed by `motion.ts`, exactly the way `#caso/<slug>` opens a case on the
   * right. `source` is where that record comes from, linked at the foot of it.
   */
  cta: { label: Localized; href: string; source: string };
}

export interface Profile {
  /** Rendered as a heading, split so the ring can circle the last word — see `Intro.astro`. */
  name: Localized;
  role: Localized;
  /**
   * Bio paragraphs. A term wrapped as `[term](note)` becomes a hoverable
   * gloss — see `src/lib/gloss.ts`. Keep those terms to a single word: the
   * gloss renders as an inline-block button and will not break across lines.
   */
  bio: Localized[];
  experience: Experience;
  capabilities: Capability[];
  /** Shown until a capability is hovered. Ties the three together. */
  restingNote: Localized;
  /**
   * A margin note beside the contact links, set in the annotation hand with a
   * drawn arrow pointing into them. One to three words: it is `width: max-content`
   * next to its own arrow in a ~19rem column, so anything longer collides.
   * Desktop only — see `.note` in `global.css`.
   */
  contactNote: Localized;
  links: Link[];
  location: string;
  /** IANA zone used for the live local clock in the footer. */
  timezone: string;
  /** Coordinates for the footer's live weather reading (Open-Meteo, no key required). */
  weather: { lat: number; lon: number };
}

export const profile: Profile = {
  name: {
    es: 'Yami hace cosas',
    en: 'Yami makes things',
  },

  role: {
    es: 'Diseño y automatizo operaciones entre marketing, producto y web',
    en: 'I design and automate operations across marketing, product and web',
  },

  bio: [
    {
      es: 'La mayoría de los procesos no están rotos: están [indocumentados](Nadie los escribió. Viven en la cabeza de tres personas y se rompen la semana que una se toma vacaciones.), que es peor. Ahí empieza mi trabajo.',
      en: "Most processes aren't broken — they're [undocumented](Nobody wrote them down. They live in three people's heads and break the week one of them takes leave.), which is worse. That's where my work starts.",
    },
    {
      es: 'Traduzco necesidades de negocio en [workflows](Formularios, CRM, integraciones y reporting que se ejecutan solos y dejan rastro.), interfaces y documentación. Si algo se hace tres veces igual, ya no debería hacerlo una persona.',
      en: "I turn business needs into [workflows](Forms, CRM, integrations and reporting that run themselves and leave a trail.), interfaces and documentation. If something gets done the same way three times, a person shouldn't be doing it.",
    },
  ],

  experience: {
    line: {
      es: 'Actualmente trabajo en {company} como Technical Marketing Operations Lead.',
      en: 'Currently at {company} as Technical Marketing Operations Lead.',
    },
    company: { name: 'Kinetic Corp', href: 'https://kinetic-corp.com' },
    cta: {
      label: { es: 'Conocé mi recorrido', en: 'See my track record' },
      href: '#recorrido',
      source: 'https://www.linkedin.com/in/yamillues/',
    },
  },

  capabilities: [
    {
      icon: 'engineering',
      title: 'Design Engineering',
      tag: { es: 'Del Figma al deploy', en: 'From Figma to deploy' },
      line: {
        es: 'No entrego pantallas. Entrego decisiones que ya no hay que volver a tomar.',
        en: "I don't ship screens. I ship decisions nobody has to make twice.",
      },
      tools: ['astro', 'react', 'nextjs', 'typescript', 'wordpress', 'webflow', 'supabase'],
    },
    {
      icon: 'motion',
      title: 'Motion Graphics',
      tag: { es: 'El movimiento explica', en: 'Motion explains' },
      line: {
        es: 'Si la animación no explica algo, es ruido con buen timing.',
        en: "If the animation doesn't explain something, it's noise with good timing.",
      },
      tools: ['aftereffects', 'illustrator', 'photoshop', 'davinci', 'blender'],
    },
    {
      icon: 'ops',
      title: 'Marketing Ops',
      tag: { es: 'Que lo haga una API', en: 'Let an API do it' },
      line: {
        es: 'El trabajo aburrido es un problema de diseño, no de esfuerzo.',
        en: 'Boring work is a design problem, not an effort problem.',
      },
      tools: ['hubspot', 'make', 'n8n', 'ga4', 'gtm', 'looker'],
    },
  ],

  // Sólo se ve con puntero: en touch el panel abre en el primer eje y esta
  // ranura nunca aparece (ver `idle` en motion.ts). Por eso la copia puede
  // hablar de mouse sin mentirle a nadie.
  restingNote: {
    es: 'pasá el mouse por encima para conocer más',
    en: 'hover over one to see more',
  },

  contactNote: {
    es: 'escribime',
    en: 'say hi',
  },

  links: [
    { label: 'Email', href: 'mailto:yamillues@gmail.com' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/yamillues/', external: true },
    // TODO: add Instagram / Read.cv here once the real handles exist. Better an
    // absent link than one that 404s.
  ],

  location: 'Córdoba, Argentina',
  timezone: 'America/Argentina/Cordoba',
  weather: { lat: -31.4201, lon: -64.1888 },
};

export const meta = {
  title: {
    es: `${profile.name.es} — Design Engineering, Motion y Marketing Ops`,
    en: `${profile.name.en} — Design Engineering, Motion and Marketing Ops`,
  },
  description: {
    es: 'Diseño, construyo y automatizo: interfaces, motion y operaciones de marketing que le sacan el trabajo manual del medio a los equipos.',
    en: 'I design, build and automate: interfaces, motion and marketing operations that take manual work off a team’s plate.',
  },
  url: 'https://yamil.site',
} as const;
