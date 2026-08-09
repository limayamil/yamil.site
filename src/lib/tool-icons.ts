/**
 * Brand marks for the tool rows in `Axes.astro`.
 *
 * `simple-icons` is a devDependency on purpose: Astro runs this file at build
 * time, so only the resulting `<path d>` reaches the browser. The package
 * itself is never bundled and costs the visitor nothing.
 *
 * Every mark here is filled, not stroked — that is the whole point. The three
 * discipline glyphs in `Icon.astro` are hairline strokes, so keeping tools
 * solid makes the two read as different kinds of thing rather than competing
 * at the same weight.
 */

import {
  siAstro,
  siBlender,
  siDavinciresolve,
  siGoogleanalytics,
  siGoogletagmanager,
  siHubspot,
  siLooker,
  siMake,
  siN8n,
  siNextdotjs,
  siReact,
  siSupabase,
  siTypescript,
  siWebflow,
  siWordpress,
} from 'simple-icons';

export interface ToolIcon {
  /** Shown as the native tooltip. */
  title: string;
  viewBox: string;
  path: string;
}

interface SimpleIcon {
  title: string;
  path: string;
}

/** simple-icons draws on a 24-unit grid. */
const si = (icon: SimpleIcon): ToolIcon => ({
  title: icon.title,
  viewBox: '0 0 24 24',
  path: icon.path,
});

/**
 * Adobe asked to be removed from simple-icons, so the Creative Cloud apps are
 * not in the package at any version — these three come from CoreUI Brands
 * (MIT), which is also a filled set, and are inlined rather than adding a
 * second dependency for three paths. They are drawn on a 32-unit grid, which
 * is why `viewBox` is per-icon rather than a constant.
 */
const cib = (title: string, path: string): ToolIcon => ({
  title,
  viewBox: '0 0 32 32',
  path,
});

export const toolIcons: Record<string, ToolIcon> = {
  astro: si(siAstro),
  react: si(siReact),
  nextjs: si(siNextdotjs),
  typescript: si(siTypescript),
  wordpress: si(siWordpress),
  webflow: si(siWebflow),
  supabase: si(siSupabase),

  aftereffects: cib(
    'After Effects',
    'M0 .401v31.198h32V.401zm1.333 1.333h29.333v28.531H1.333zm7.714 16.334L7.99 22.047c-.021.109-.068.151-.198.151H5.834c-.13 0-.151-.047-.13-.198L9.49 8.755c.063-.24.109-.432.13-1.094c0-.089.042-.135.109-.135h2.797c.089 0 .13.026.151.135l4.245 14.359c.021.109 0 .172-.109.172h-2.198c-.109 0-.177-.036-.198-.125l-1.099-4.005H9.047zm3.739-2.167c-.375-1.474-1.281-4.708-1.609-6.266h-.021c-.286 1.557-1.005 4.198-1.557 6.266zm7.146 1.365c.026 1.807.88 3.016 2.906 3.016c.792 0 1.469-.104 2.172-.417c.089-.042.156-.016.156.094v1.672c0 .13-.042.198-.135.266c-.703.349-1.578.505-2.677.505c-3.521 0-4.839-2.594-4.839-5.5c0-3.146 1.625-5.719 4.49-5.719c2.901 0 3.911 2.443 3.911 4.422c0 .641-.047 1.167-.109 1.411c-.026.109-.068.146-.177.167c-.266.047-1.057.089-2.224.089h-3.474zm2.709-1.834c.682 0 .922 0 .99-.021c0-.089.021-.167.021-.229c0-.729-.354-2.063-1.74-2.063c-1.276 0-1.828 1.125-1.958 2.313z',
  ),
  illustrator: cib(
    'Illustrator',
    'M0 .401v31.198h32V.401zm1.333 1.333h29.333v28.531H1.333zm9.766 16.334l-1.057 3.995c-.021.115-.063.135-.193.135H7.891c-.135 0-.156-.042-.135-.193l3.786-13.26c.068-.24.109-.453.13-1.115c0-.089.047-.13.115-.13h2.792c.089 0 .135.021.156.13l4.245 14.396c.026.109 0 .172-.109.172h-2.198c-.115 0-.177-.026-.198-.115l-1.104-4.016h-4.276zm3.719-2.167c-.375-1.474-1.255-4.703-1.583-6.266h-.026c-.281 1.557-.99 4.198-1.536 6.266zm6-7.411c0-.859.594-1.365 1.365-1.365c.813 0 1.365.552 1.365 1.365c0 .88-.573 1.365-1.391 1.365c-.797 0-1.344-.484-1.344-1.365zm.151 3.031c0-.104.042-.146.151-.146h2.094c.12 0 .161.042.161.156v10.526c0 .109-.021.151-.156.151h-2.063c-.135 0-.177-.063-.177-.172V11.52z',
  ),
  photoshop: cib(
    'Photoshop',
    'M0 .401v31.198h32V.401zm1.333 1.333h29.333v28.531H1.333zm6.401 5.974c0-.089.188-.156.297-.156a76 76 0 0 1 3.438-.068c3.698 0 5.135 2.026 5.135 4.62c0 3.391-2.458 4.844-5.469 4.844c-.51 0-.682-.026-1.036-.026v5.125c0 .109-.042.156-.151.156H7.885c-.109 0-.151-.042-.151-.151zm2.365 7.084c.307.021.552.021 1.083.021c1.557 0 3.026-.552 3.026-2.661c0-1.693-1.052-2.552-2.833-2.552c-.526 0-1.031.021-1.276.042zm11.479-1.589c-1.057 0-1.411.531-1.411.969c0 .484.24.813 1.651 1.542c2.089 1.016 2.75 1.979 2.75 3.411c0 2.13-1.63 3.276-3.828 3.276c-1.167 0-2.161-.245-2.734-.573c-.083-.042-.104-.109-.104-.219v-1.958c0-.13.063-.177.151-.109a4.9 4.9 0 0 0 2.682.792c1.057 0 1.495-.438 1.495-1.036c0-.484-.307-.901-1.646-1.604c-1.896-.906-2.688-1.828-2.688-3.37c0-1.719 1.344-3.146 3.672-3.146c1.146 0 1.953.177 2.396.37c.109.068.13.177.13.266v1.828c0 .109-.068.177-.198.13c-.594-.349-1.469-.573-2.323-.573z',
  ),
  davinci: si(siDavinciresolve),
  blender: si(siBlender),

  hubspot: si(siHubspot),
  make: si(siMake),
  n8n: si(siN8n),
  ga4: si(siGoogleanalytics),
  gtm: si(siGoogletagmanager),
  looker: si(siLooker),
};
