import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'C:/Trabajo/Para mi/yamil.site/procesar/SVG';

// key: file name (without .svg) -> { company display name matching track.ts, title }
const files = {
  kinetic: { company: 'Kinetic Corp', title: 'Kinetic Corp' },
  coderhouse: { company: 'Coderhouse', title: 'Coderhouse' },
  ceg: { company: 'Comprando en Grupo', title: 'Comprando en Grupo' },
  alejandrocarrizo: {
    company: 'Alejandro Carrizo Comunicación Estratégica',
    title: 'Alejandro Carrizo Comunicación Estratégica',
  },
  ploy: { company: 'Ploy Inbound Marketing', title: 'Ploy Inbound Marketing' },
  economix: { company: 'ECONOMIX', title: 'ECONOMIX' },
  unimage: { company: 'UNIMAGE', title: 'UNIMAGE' },
  pcmax: { company: 'PCMAX', title: 'PCMAX' },
};

let out = `/**
 * Company wordmarks for the track record.
 *
 * Provided as ready-cut SVGs (see /procesar/SVG, not shipped) — traced logos,
 * not a font or an icon set. Every file ships with a single \`.cls-1{fill:#fff}\`
 * rule; that rule is dropped on the way in and the root <svg fill="currentColor">
 * takes over, exactly the reason inherited \`fill\` exists, so the mark can sit
 * in \`--color-primary-ink\` or any other ink the column asks for.
 *
 * Keyed by the exact \`company\` string used in track.ts — same contract as
 * ToolIcon's \`toolIcons\`: an unknown key throws at build rather than shipping
 * a blank slot.
 */

export interface CompanyLogo {
  viewBox: string;
  /** Inner SVG markup — trusted, build-time only, never user input. */
  markup: string;
}

export const companyLogos: Record<string, CompanyLogo> = {
`;

for (const [file, { company }] of Object.entries(files)) {
  const raw = readFileSync(join(dir, `${file}.svg`), 'utf8');
  const viewBoxMatch = raw.match(/viewBox="([^"]+)"/);
  if (!viewBoxMatch) throw new Error(`no viewBox in ${file}`);
  const viewBox = viewBoxMatch[1];

  // Strip everything up to and including </defs> (the fill:#fff style block —
  // the wrapping <svg fill="currentColor"> replaces it via inheritance), and
  // drop the closing </svg>.
  const afterDefs = raw.split('</defs>')[1];
  if (!afterDefs) throw new Error(`no </defs> in ${file}`);
  const markup = afterDefs.replace(/<\/svg>\s*$/, '').trim();

  out += `  '${company.replace(/'/g, "\\'")}': {\n`;
  out += `    viewBox: '${viewBox}',\n`;
  out += `    markup: ${JSON.stringify(markup)},\n`;
  out += `  },\n`;
}

out += `};\n\nexport type CompanyName = keyof typeof companyLogos;\n`;

writeFileSync('C:/Trabajo/Para mi/yamil.site/src/lib/company-logos.ts', out, 'utf8');
console.log('done');
