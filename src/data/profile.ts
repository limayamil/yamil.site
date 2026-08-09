/**
 * Everything in the left-hand panel lives here.
 *
 * All values are PLACEHOLDERS — swap them and the layout follows. The only
 * field that changes anything structural is `capabilities`, which renders one
 * row each.
 */

export const profile = {
  // TODO: inferred from the account email — confirm the spelling.
  name: 'Yamil Lues',
  role: 'Design Engineer & Motion Designer',

  bio: [
    'I design and build interfaces end to end — from the first frame of motion to the shipped component. Currently leading marketing operations and design engineering for product teams.',
    'Previously across brand systems, campaign automation and title design for studios and startups.',
  ],

  available: {
    is: true,
    label: 'Available for select work',
  },

  capabilities: [
    { title: 'Design Engineering', detail: 'React, Astro, design systems, prototypes' },
    { title: 'Motion Graphics', detail: 'Brand systems, titles, product film' },
    { title: 'Marketing Operations', detail: 'Lifecycle, automation, analytics' },
  ],

  links: [
    { label: 'Email', href: 'mailto:hello@yamil.site' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/placeholder', external: true },
    { label: 'Instagram', href: 'https://instagram.com/placeholder', external: true },
    { label: 'Read.cv', href: 'https://read.cv/placeholder', external: true },
  ],

  location: 'Buenos Aires, Argentina',
  // IANA zone used for the live local clock in the footer.
  timezone: 'America/Argentina/Buenos_Aires',
} as const;

export const meta = {
  title: `${profile.name} — ${profile.role}`,
  description:
    'Portfolio of selected work in design engineering, motion graphics and marketing operations.',
  url: 'https://yamil.site',
} as const;
