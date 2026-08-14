const CARD_WIDTHS = [640, 960] as const;

export const CARD_IMAGE_SIZES = '(min-width: 62rem) 24vw, (min-width: 34rem) 50vw, 100vw';

/**
 * Derive the deployable card variants without changing the projects schema.
 * Full-size sources remain the canonical images for case-study details.
 */
export function cardImage(src: string): { src: string; srcset?: string } {
  if (!src.toLowerCase().endsWith('.webp')) return { src };

  const base = src.slice(0, -'.webp'.length);
  return {
    src: `${base}-card-${CARD_WIDTHS[0]}.webp`,
    srcset: CARD_WIDTHS.map((width) => `${base}-card-${width}.webp ${width}w`).join(', '),
  };
}
