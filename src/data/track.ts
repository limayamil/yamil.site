/**
 * The track record — the second view of the left-hand column.
 *
 * Same posture as `profile.ts`: every visible string is a `{ es, en }` pair,
 * rendered through `Bilingual.astro`. Two exceptions, both deliberate:
 *
 *   - `role` and `company` are plain strings. A job title goes by its English
 *     name in both languages, the same call `Capability.title` already makes.
 *   - `start` / `end` are `YYYY-MM`, formatted per language at build time in
 *     `Track.astro`. Storing "jul. 2024" / "Jul 2024" twice per entry would be
 *     28 hand-maintained strings that a month table renders for free.
 *
 * `axis` is the load-bearing field. It is the *same key* as a capability's
 * `icon` in `profile.ts` and a project's `axis` in `projects.json`, which is the
 * only reason the legend can highlight a discipline across fifteen years with no
 * lookup table in between. A value outside the union fails the build.
 */

import type { Capability, Localized } from './profile';

export interface TrackEntry {
  /** Job title. Not translated, same as `Capability.title`. */
  role: string;
  company: string;
  /** `YYYY-MM`. */
  start: string;
  /** `YYYY-MM`, or `null` while it is still the current job. */
  end: string | null;
  /** Shared key with `Capability['icon']` — see the note above. */
  axis: Capability['icon'];
  /** Contract rather than staff. Renders as a small tag, nothing more. */
  freelance?: boolean;
  /**
   * One line, and one only. The entry is a row in a ~19rem column; two
   * sentences here turn the timeline into a document.
   */
  note: Localized;
}

export interface Track {
  title: Localized;
  lead: Localized;
  /** The margin note over the legend, in the annotation hand. */
  legendNote: Localized;
  /**
   * The year the run starts, stated rather than derived from `min(start)`.
   * The 2006 internship is three months, four years before anything else, and
   * letting it set the counter would advertise twenty years of a career that
   * actually begins in 2010. It stays in the list; it just does not set the
   * headline.
   */
  since: number;
  entries: TrackEntry[];
}

export const track: Track = {
  title: {
    es: 'De la isla de edición a la terminal.',
    en: 'From the edit bay to the terminal.',
  },

  lead: {
    es: 'Empecé cortando video y terminé automatizando el trabajo que lo rodea. Cada puesto de acá abajo sumó una capa: primero el movimiento, después el código, después el sistema que sostiene a los dos.',
    en: 'I started cutting video and ended up automating the work around it. Every job below added a layer: motion first, then code, then the system that holds both up.',
  },

  legendNote: {
    es: 'elegí una disciplina',
    en: 'pick a discipline',
  },

  since: 2010,

  // Written newest-first for readability; `Track.astro` sorts by `start`
  // anyway, so the order here is a courtesy rather than a contract.
  entries: [
    {
      role: 'Technical Marketing Operations Lead',
      company: 'Kinetic Corp',
      start: '2024-07',
      end: null,
      axis: 'ops',
      note: {
        es: 'Operaciones entre marketing, producto y web: automatizaciones, integraciones y el reporting que las vuelve medibles.',
        en: 'Operations across marketing, product and web: automations, integrations and the reporting that makes them measurable.',
      },
    },
    {
      role: 'Lead Full Stack WordPress Developer',
      company: 'Kinetic Corp',
      start: '2023-11',
      end: '2024-07',
      axis: 'engineering',
      note: {
        es: 'Del código al equipo: definiciones técnicas, revisión y estándares para el resto del desarrollo.',
        en: 'From the code to the team: technical calls, review and standards for the rest of development.',
      },
    },
    {
      role: 'Ssr. Full Stack WordPress Developer',
      company: 'Kinetic Corp',
      start: '2022-12',
      end: '2023-11',
      axis: 'engineering',
      note: {
        es: 'Full stack sobre WordPress: temas a medida, integraciones y performance.',
        en: 'Full stack on WordPress: custom themes, integrations and performance.',
      },
    },
    {
      role: 'Freelance Webflow Developer',
      company: 'Coderhouse',
      start: '2022-12',
      end: '2023-02',
      axis: 'engineering',
      freelance: true,
      note: {
        es: 'Producción de sitios en Webflow.',
        en: 'Building sites in Webflow.',
      },
    },
    {
      role: 'Sr. Motion Graphics Designer',
      company: 'Coderhouse',
      start: '2022-03',
      end: '2022-12',
      axis: 'motion',
      note: {
        es: 'Piezas de motion para campañas de marca y de performance.',
        en: 'Motion pieces for brand and performance campaigns.',
      },
    },
    {
      role: 'Freelance Front-end Developer & Motion Graphics Designer',
      company: 'Comprando en Grupo',
      start: '2021-11',
      end: '2026-02',
      axis: 'engineering',
      freelance: true,
      note: {
        es: 'Cuatro años sosteniendo el front-end y las piezas en movimiento del mismo producto.',
        en: "Four years holding up the same product's front-end and its moving parts.",
      },
    },
    {
      role: 'Sr. Digital Designer',
      company: 'Coderhouse',
      start: '2021-11',
      end: '2022-03',
      axis: 'motion',
      note: {
        es: 'Diseño digital para campañas: piezas, formatos y el sistema que las ordena.',
        en: 'Digital design for campaigns: pieces, formats and the system that orders them.',
      },
    },
    {
      role: 'Front-end Developer',
      company: 'Comprando en Grupo',
      start: '2021-06',
      end: '2021-10',
      axis: 'engineering',
      note: {
        es: 'El salto de diseñar la interfaz a construirla.',
        en: 'The jump from designing the interface to building it.',
      },
    },
    {
      role: 'Freelance Front-end Developer',
      company: 'Alejandro Carrizo Comunicación Estratégica',
      start: '2019-09',
      end: '2022-12',
      axis: 'engineering',
      freelance: true,
      note: {
        es: 'Sitios a medida en HTML y JS, landings y plantillas en HubSpot, maquetación de mailings.',
        en: 'Custom sites in HTML and JS, landing pages and HubSpot templates, email builds.',
      },
    },
    {
      role: 'Multimedia Designer',
      company: 'Comprando en Grupo',
      start: '2019-03',
      end: '2021-06',
      axis: 'motion',
      note: {
        es: 'Video, motion y diseño para todo lo que el producto necesitaba mostrar.',
        en: 'Video, motion and design for everything the product needed to show.',
      },
    },
    {
      role: 'Multimedia Designer',
      company: 'Ploy Inbound Marketing',
      start: '2015-04',
      end: '2019-03',
      axis: 'motion',
      note: {
        es: 'Edición y motion, diseño gráfico, maquetación y programación web. Cuatro años haciendo de todo.',
        en: 'Editing and motion, graphic design, web layout and code. Four years doing a bit of everything.',
      },
    },
    {
      role: 'Motion Graphics Designer, Video Editor',
      company: 'ECONOMIX',
      start: '2013-05',
      end: '2013-07',
      axis: 'motion',
      note: {
        es: 'Edición y motion diarios de un micro que salía al aire a medianoche por Canal Doce.',
        en: 'Daily editing and motion for a TV short that aired at midnight on Canal Doce.',
      },
    },
    {
      role: 'Motion Graphics Designer, Video Editor',
      company: 'UNIMAGE',
      start: '2010-02',
      end: '2013-02',
      axis: 'motion',
      note: {
        es: 'Edición, motion y post para agencias, con clientes como Cencosud, Libertad, Holcim y OSDE.',
        en: 'Editing, motion and post for agencies — clients including Cencosud, Libertad, Holcim and OSDE.',
      },
    },
    {
      role: 'IT Technical Support Intern',
      company: 'PCMAX',
      start: '2006-12',
      end: '2007-02',
      axis: 'engineering',
      note: {
        es: 'Armado de PCs y soporte. El primer trabajo, y la primera vez que algo roto se arreglaba con las manos.',
        en: 'Building PCs and support. The first job — and the first time something broken got fixed by hand.',
      },
    },
  ],
};
