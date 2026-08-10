/**
 * The site's entire runtime. Small jobs, no framework:
 *
 *   1. reveal elements once as they enter the viewport
 *   2. play a tile's loop on hover (pointer) or when centred (touch)
 *   3. keep the footer clock ticking
 *   4. fetch the footer's live weather reading once, on load
 *   5. drive the capability panel from whichever axis is hovered or focused
 *   6. open a bio gloss on tap, where there is no hover to open it
 *   7. run the ES/EN switch (the language is *resolved* by an inline script in
 *      Base.astro, which has to beat the first paint — this only reacts to
 *      clicks after that)
 *   8. filter the bento grid by axis, re-packing it with a FLIP
 *   9. route `#caso/<slug>` between the grid and one open case
 *  10. route `#recorrido` between the bio and the track record — the same
 *      two-views-one-URL trick as 9, on the other column
 *
 * Nothing here reads layout during scroll, and every animated property is
 * transform/opacity, so the compositor handles the frames on its own. The one
 * place layout *is* read is the FLIP helper, which reads it twice in the same
 * frame, on purpose, in response to a click — never during a scroll.
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

/**
 * FLIP. Measure, mutate, then play the difference back as a transform.
 *
 * `element.animate` rather than a class or a style write: the Web Animations
 * API never touches the `style` attribute, so this respects the same rule the
 * rest of the file follows — state is a `data-*` or a class, never an inline
 * style left behind for someone to find later.
 */
function flip(nodes: HTMLElement[], mutate: () => void, duration = 520): void {
  if (reducedMotion.matches) {
    mutate();
    return;
  }

  const first = new Map(nodes.map((node) => [node, node.getBoundingClientRect()]));
  mutate();

  for (const node of nodes) {
    const a = first.get(node);
    const b = node.getBoundingClientRect();
    // Either rect can be empty — the node was `display: none` on one side of
    // the mutation. Nothing to interpolate from, so let it just appear.
    if (!a || !a.width || !a.height || !b.width || !b.height) continue;

    const dx = a.left - b.left;
    const dy = a.top - b.top;
    const sx = a.width / b.width;
    const sy = a.height / b.height;
    if (!dx && !dy && sx === 1 && sy === 1) continue;

    node.animate(
      // `transform-origin: 0 0` is not optional: the offsets above are measured
      // from the top-left corner, and the default centre origin would fold the
      // scale back into the translate and land the node in the wrong place.
      [
        {
          transformOrigin: '0 0',
          transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        },
        { transformOrigin: '0 0', transform: 'none' },
      ],
      { duration, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', composite: 'replace' },
    );
  }
}

/**
 * Scroll instantly and report how far, so a rect measured before the jump can
 * be corrected for it. Smooth scrolling here would slide the page underneath a
 * morph and pull it off its target — the jump is what keeps the two in the same
 * coordinate space.
 */
function jump(top: number): number {
  const before = window.scrollY;
  window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  return window.scrollY - before;
}

/** Fade a node in place. Returns the animation so a caller can await it. */
function fade(node: HTMLElement, from: number, to: number, duration = 160): Animation | null {
  if (reducedMotion.matches) return null;
  return node.animate([{ opacity: from }, { opacity: to }], {
    duration,
    easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
  });
}

/* -- 1. Scroll reveal ----------------------------------------------------- */

function initReveals(): void {
  const pending = new Set(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (pending.size === 0) return;

  const reveal = (el: HTMLElement) => {
    el.classList.add('is-visible');
    pending.delete(el);
  };

  if (!('IntersectionObserver' in window)) {
    pending.forEach(reveal);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
  );

  pending.forEach((el) => observer.observe(el));

  /**
   * Safety net. An element that crosses the whole viewport without a frame in
   * between — scroll restoration on reload, an anchor jump, a hard fling — never
   * changes intersection state, so the observer is never called for it and it
   * would stay invisible for good. Sweep for anything already scrolled past.
   *
   * This is the only place that reads layout, it is debounced to fire after
   * scrolling settles, and it detaches itself as soon as nothing is left.
   */
  const sweep = () => {
    for (const el of [...pending]) {
      if (el.getBoundingClientRect().bottom < 0) {
        reveal(el);
        observer.unobserve(el);
      }
    }
    if (pending.size === 0) {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    }
  };

  let timer = 0;
  const onScroll = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(sweep, 120);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  sweep();
}

/* -- 2. Tile video -------------------------------------------------------- */

function play(host: HTMLElement, video: HTMLVideoElement): void {
  if (reducedMotion.matches) return;
  host.dataset.playing = 'true';
  // Autoplay can still be refused (low power mode, for one) — the poster
  // underneath stays visible, so there is nothing to recover from.
  void video.play().catch(() => {
    host.dataset.playing = 'false';
  });
}

function stop(host: HTMLElement, video: HTMLVideoElement): void {
  host.dataset.playing = 'false';
  video.pause();
  video.currentTime = 0;
}

function initVideos(): void {
  // The anchor, not the tile: it is the focusable element, so `focus`/`blur`
  // land on it directly rather than needing the bubbling variants.
  const tiles = Array.from(document.querySelectorAll<HTMLElement>('.tile-link')).filter(
    (tile): tile is HTMLElement => tile.querySelector('video') !== null,
  );
  if (tiles.length === 0) return;

  if (canHover.matches) {
    for (const tile of tiles) {
      const video = tile.querySelector('video')!;
      tile.addEventListener('pointerenter', () => play(tile, video));
      tile.addEventListener('pointerleave', () => stop(tile, video));
      tile.addEventListener('focus', () => play(tile, video));
      tile.addEventListener('blur', () => stop(tile, video));
    }
    return;
  }

  // Touch: whichever tile is mostly on screen plays, the others rewind. A tile
  // hidden by the filter or by the case view has no box, so it stops on its own.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const tile = entry.target as HTMLElement;
        const video = tile.querySelector('video');
        if (!video) continue;
        if (entry.isIntersecting) play(tile, video);
        else stop(tile, video);
      }
    },
    { threshold: 0.6 },
  );

  tiles.forEach((tile) => observer.observe(tile));
}

/* -- 3. Local clock ------------------------------------------------------- */

function initClock(): void {
  const node = document.querySelector<HTMLTimeElement>('[data-clock]');
  const timezone = node?.dataset.timezone;
  if (!node || !timezone) return;

  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });

  const tick = () => {
    node.textContent = formatter.format(new Date());
  };

  tick();
  // Land just after each minute boundary instead of drifting on a 60s timer.
  const alignToMinute = () => {
    const delay = 60_000 - (Date.now() % 60_000) + 50;
    window.setTimeout(() => {
      tick();
      alignToMinute();
    }, delay);
  };
  alignToMinute();
}

/* -- 4. Weather ------------------------------------------------------------ */

// WMO weather codes (Open-Meteo) collapsed to one icon each. Not exhaustive by
// design — the footer wants a glance, not a forecast. Only the clear-sky codes
// swap for a night variant; past "partly cloudy" the cloud already reads fine
// in the dark, and a moon-behind-cloud glyph is not worth the added lookup.
const WEATHER_ICONS_DAY: Record<number, string> = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌦️',
  53: '🌦️',
  55: '🌦️',
  56: '🌦️',
  57: '🌦️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  66: '🌧️',
  67: '🌧️',
  71: '🌨️',
  73: '🌨️',
  75: '🌨️',
  77: '🌨️',
  80: '🌦️',
  81: '🌧️',
  82: '🌧️',
  85: '🌨️',
  86: '🌨️',
  95: '⛈️',
  96: '⛈️',
  99: '⛈️',
};

const WEATHER_ICONS_NIGHT: Record<number, string> = {
  ...WEATHER_ICONS_DAY,
  0: '🌕',
  1: '🌙',
};

async function initWeather(): Promise<void> {
  const node = document.querySelector<HTMLElement>('[data-weather]');
  const lat = node?.dataset.weatherLat;
  const lon = node?.dataset.weatherLon;
  const icon = node?.querySelector<HTMLElement>('[data-weather-icon]');
  const temp = node?.querySelector<HTMLElement>('[data-weather-temp]');
  if (!node || !lat || !lon || !icon || !temp) return;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`;

  try {
    const response = await fetch(url);
    if (!response.ok) return;
    const data = await response.json();
    const current = data?.current;
    if (typeof current?.temperature_2m !== 'number') return;

    const icons = current.is_day === 0 ? WEATHER_ICONS_NIGHT : WEATHER_ICONS_DAY;
    icon.textContent = icons[current.weather_code] ?? '🌡️';
    temp.textContent = `${Math.round(current.temperature_2m)}°C`;
    node.style.display = 'flex';
  } catch {
    // Offline, blocked, or the API is down — the widget just stays hidden.
  }
}

/* -- 5. Capability axes --------------------------------------------------- */

function initAxes(): void {
  const root = document.querySelector<HTMLElement>('[data-axes]');
  if (!root) return;

  const buttons = Array.from(root.querySelectorAll<HTMLElement>('[data-axis]'));
  const slots = Array.from(root.querySelectorAll<HTMLElement>('[data-slot]'));
  if (buttons.length === 0 || slots.length === 0) return;

  // The axes and the bento share one key — a capability's `icon` is a
  // project's `axis` — so pointing at a discipline can dim the work that is not
  // it, with no lookup table in between.
  const bento = document.querySelector<HTMLElement>('[data-bento]');

  const show = (key: string) => {
    for (const slot of slots) slot.classList.toggle('is-active', slot.dataset.slot === key);
    for (const button of buttons) button.classList.toggle('is-active', button.dataset.axis === key);
    // Pointer only. On touch the panel rests *on* an axis rather than on the
    // resting note, so a highlight here would leave two thirds of the grid
    // permanently dimmed with nothing hovering it.
    if (bento && canHover.matches) {
      if (key === 'rest') delete bento.dataset.highlight;
      else bento.dataset.highlight = key;
    }
  };

  // A pointer can leave, so it gets the resting copy back on the way out. Touch
  // cannot, so the first axis stays open and taps move between them — the panel
  // is never empty and never reverts under a finger.
  const idle = canHover.matches ? 'rest' : (buttons[0]?.dataset.axis ?? 'rest');
  show(idle);

  for (const button of buttons) {
    const key = button.dataset.axis;
    if (!key) continue;

    button.addEventListener('pointerenter', () => show(key));
    button.addEventListener('focus', () => show(key));
    button.addEventListener('click', () => show(key));
  }

  if (canHover.matches) {
    // Reset from the container, not from each button. The panel sits below the
    // rows, so a per-button `pointerleave` would close it the moment the
    // pointer travelled down toward the tool marks — which are themselves
    // hoverable, and unreachable if the panel keeps snapping back.
    root.addEventListener('pointerleave', () => show(idle));
    root.addEventListener('focusout', (event) => {
      const next = (event as FocusEvent).relatedTarget;
      if (!(next instanceof Node) || !root.contains(next)) show(idle);
    });
  }
}

/* -- 6. Bio glosses -------------------------------------------------------- */

function initGlosses(): void {
  // Pointer devices already have this: `.gloss:hover` and `:focus-visible` do
  // the whole job in CSS. Only touch needs a handler.
  if (canHover.matches) return;

  const glosses = Array.from(document.querySelectorAll<HTMLElement>('[data-gloss]'));
  if (glosses.length === 0) return;

  for (const gloss of glosses) {
    gloss.addEventListener('click', () => {
      const open = gloss.dataset.open === 'true';
      // One at a time — two notes overlapping on a phone is unreadable.
      for (const other of glosses) other.dataset.open = 'false';
      gloss.dataset.open = String(!open);
    });
  }
}

/* -- 7. Language switch ---------------------------------------------------- */

function initLang(): void {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-lang-set]'));
  if (buttons.length === 0) return;

  const root = document.documentElement;

  const apply = (lang: string) => {
    root.dataset.lang = lang;
    root.lang = lang;

    const title = root.getAttribute(`data-title-${lang}`);
    if (title) document.title = title;

    // `alt` is the one string on the page CSS cannot switch: an attribute has
    // no second copy to hide, and a duplicate <img> would still be fetched.
    for (const image of document.querySelectorAll<HTMLImageElement>('img[data-alt-es]')) {
      const alt = lang === 'en' ? image.dataset.altEn : image.dataset.altEs;
      if (alt) image.alt = alt;
    }

    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.langSet === lang));
    }
  };

  // The inline script already picked a language; catch the markup up to it.
  apply(root.dataset.lang ?? 'es');

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const lang = button.dataset.langSet;
      if (!lang) return;
      try {
        localStorage.setItem('lang', lang);
      } catch {
        // Storage blocked — the switch still works, it just won't be
        // remembered on the next visit.
      }
      apply(lang);
    });
  }
}

/* -- 8. Bento filters ------------------------------------------------------ */

function initFilters(): void {
  const root = document.querySelector<HTMLElement>('[data-filters]');
  const bento = document.querySelector<HTMLElement>('[data-bento]');
  const empty = document.querySelector<HTMLElement>('[data-bento-empty]');
  if (!root || !bento) return;

  const buttons = Array.from(root.querySelectorAll<HTMLElement>('[data-filter-set]'));
  const tiles = Array.from(bento.querySelectorAll<HTMLElement>('.tile'));
  if (buttons.length === 0 || tiles.length === 0) return;

  const matches = (tile: HTMLElement, key: string) => key === 'all' || tile.dataset.axis === key;

  const apply = (key: string) => {
    if (bento.dataset.filter === key) return;

    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.filterSet === key));
    }

    const staying = tiles.filter((t) => matches(t, bento.dataset.filter ?? 'all') && matches(t, key));
    const arriving = tiles.filter((t) => !matches(t, bento.dataset.filter ?? 'all') && matches(t, key));

    // Only the survivors are FLIPped, and they never change size when the
    // filter changes — so this is a pure translate and the copy inside them is
    // never squashed. The ones coming and going just fade.
    flip(staying, () => {
      bento.dataset.filter = key;
    });

    for (const tile of arriving) fade(tile, 0, 1, 320);

    if (empty) empty.hidden = staying.length + arriving.length > 0;
  };

  for (const button of buttons) {
    const key = button.dataset.filterSet;
    if (!key) continue;
    button.addEventListener('click', () => apply(key));
  }
}

/* -- 9. Case router -------------------------------------------------------- */

/**
 * `#caso/<slug>` is the whole router. Tiles are real anchors, so a click already
 * changes the hash on its own and `hashchange` is the single entry point —
 * which means the back button, a shared link and a ctrl-click all arrive
 * through the same door. The click handler below does not call
 * `preventDefault`; all it does is remember which tile was under the pointer,
 * so the FLIP knows what rect to grow out of.
 */
function initCases(): void {
  const work = document.querySelector<HTMLElement>('[data-work]');
  const bento = document.querySelector<HTMLElement>('[data-bento]');
  if (!work || !bento) return;

  const cases = Array.from(work.querySelectorAll<HTMLElement>('[data-case]'));
  if (cases.length === 0) return;

  /** The tile a case should grow from, or fall back to on the way out. */
  let origin: HTMLElement | null = null;
  let openSlug: string | null = null;
  let indexScroll = 0;

  const tileFor = (slug: string) =>
    bento.querySelector<HTMLElement>(`.tile[data-slug="${CSS.escape(slug)}"] .tile-link`);

  const heroOf = (node: HTMLElement) => node.querySelector<HTMLElement>('[data-case-hero]');

  /**
   * Half a FLIP: the "first" rect is handed in, because the two elements
   * involved never coexist — the tile is gone by the time the hero has a box,
   * and vice versa. `first` is expected in post-scroll viewport coordinates.
   */
  const morph = (node: HTMLElement, first: DOMRect | null) => {
    if (reducedMotion.matches || !first || !first.width || !first.height) return;
    const last = node.getBoundingClientRect();
    if (!last.width || !last.height) return;

    node.animate(
      [
        {
          transformOrigin: '0 0',
          transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${first.width / last.width}, ${first.height / last.height})`,
        },
        { transformOrigin: '0 0', transform: 'none' },
      ],
      { duration: 560, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    );
  };

  const shift = (rect: DOMRect | null, delta: number) =>
    rect ? new DOMRect(rect.left, rect.top - delta, rect.width, rect.height) : null;

  const openCase = (slug: string) => {
    const node = cases.find((c) => c.dataset.case === slug);
    if (!node || openSlug === slug) return;

    const switching = openSlug !== null;
    if (!switching) indexScroll = window.scrollY;

    const from = origin ?? tileFor(slug);
    const first = from?.getBoundingClientRect() ?? null;
    origin = null;

    for (const other of cases) {
      const wasOpen = !other.hidden;
      other.hidden = other !== node;
      if (wasOpen && other !== node) {
        const video = heroOf(other)?.querySelector('video');
        if (video) stop(heroOf(other)!, video);
      }
    }
    work.dataset.view = 'case';
    openSlug = slug;

    // Only chase the header when it is actually off the top — a reader already
    // near the top of the column does not need the page moved under them.
    const workTop = work.getBoundingClientRect().top;
    const delta = workTop < 0 ? jump(workTop + window.scrollY - 24) : 0;

    const hero = heroOf(node);
    if (hero) morph(hero, shift(first, delta));

    node.querySelector<HTMLElement>('[data-case-back]')?.focus({ preventScroll: true });

    const video = hero?.querySelector('video');
    if (hero && video) play(hero, video);
  };

  const closeCase = () => {
    if (openSlug === null) return;

    const slug = openSlug;
    const node = cases.find((c) => c.dataset.case === slug);
    const hero = node ? heroOf(node) : null;
    const first = hero?.getBoundingClientRect() ?? null;

    const video = hero?.querySelector('video');
    if (hero && video) stop(hero, video);

    for (const other of cases) other.hidden = true;
    work.dataset.view = 'index';
    openSlug = null;

    // A tile that has spent its whole life inside a `display: none` grid — the
    // case was deep-linked, so the index never rendered — has no box for the
    // reveal observer to intersect, and does not reliably get one on the way
    // back. Resolve them by hand rather than trusting that. The stagger is a
    // per-tile `transition-delay`, so they still arrive as a wave.
    for (const pending of bento.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)')) {
      pending.classList.add('is-visible');
    }

    const delta = jump(indexScroll);

    const target = tileFor(slug);
    if (target) {
      morph(target, shift(first, delta));
      target.focus({ preventScroll: true });
    }
  };

  const route = () => {
    const match = /^#caso\/(.+)$/.exec(window.location.hash);
    const slug = match ? decodeURIComponent(match[1]) : null;
    if (slug && cases.some((c) => c.dataset.case === slug)) openCase(slug);
    else closeCase();
  };

  // Remember the tile; do not intercept the navigation. The anchor changes the
  // hash on its own, which is what keeps ctrl-click and middle-click working.
  bento.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest<HTMLElement>('.tile-link');
    if (link) origin = link;
  });

  // Push rather than `history.back()`: guessing whether the entry behind us is
  // our own index is unreliable once prev/next have been used, and wrong there
  // means leaving the site. Pushing always lands on the index, and the
  // browser's own back button still returns to the case.
  document.addEventListener('click', (event) => {
    if (!(event.target as Element | null)?.closest('[data-case-back]')) return;
    history.pushState(null, '', window.location.pathname + window.location.search);
    route();
  });

  window.addEventListener('hashchange', route);

  route();
}

/* -- 10. Track record router ----------------------------------------------- */

/**
 * `#recorrido` opens the left column's second view, the same way `#caso/<slug>`
 * opens the right column's. One hash, one `hashchange`, no second route — so
 * the back button, a shared link and a ctrl-click all arrive through the same
 * door here too. The opener is a real anchor and its click is never
 * intercepted; all this listens to is the hash.
 *
 * The one thing this does that the case router does not is animate the *outgoing*
 * view. A case grows out of the tile it replaces, so the bento can simply
 * vanish; here the two views are two blocks of prose in the same column and
 * nothing morphs between them, so the swap has to carry a direction of its own:
 * the view being left slides out the way we are heading and the incoming one
 * arrives from the opposite edge (`enter-left`, in the stylesheet). Both halves
 * travel the same way, which is what makes it read as one movement rather than
 * as two elements crossing.
 *
 * Note that returning to the bio replays its whole load-in — the `.enter`
 * stagger and the doodles drawing themselves. That is a consequence of hiding
 * the view with `display: none` (which restarts CSS animations on the way back)
 * and it is kept: the marks redrawing is the page annotating itself again, on
 * the same beat it did the first time.
 */
function initTrack(): void {
  const intro = document.querySelector<HTMLElement>('[data-intro]');
  const bio = document.querySelector<HTMLElement>('[data-intro-bio]');
  const track = document.querySelector<HTMLElement>('[data-track]');
  if (!intro || !bio || !track) return;

  const views = intro.querySelector<HTMLElement>('.intro-views');
  const opener = document.querySelector<HTMLElement>('[data-track-open]');
  const back = track.querySelector<HTMLElement>('[data-track-back]');

  let open = false;
  let bioScroll = 0;
  let leaving: Animation | null = null;

  const commit = (next: 'bio' | 'track') => {
    intro.dataset.view = next;

    if (next === 'track') {
      // Above 62rem the record scrolls inside `.intro-views` rather than with
      // the page, and that scrollport keeps its offset while the view is
      // closed. Opening the record is opening it, not resuming it.
      if (views) views.scrollTop = 0;
      // Chase the column only when it is actually off the top — a reader near
      // the top of the page does not need it moved under them.
      const top = intro.getBoundingClientRect().top;
      if (top < 0) jump(top + window.scrollY - 24);
      back?.focus({ preventScroll: true });
      return;
    }

    jump(bioScroll);
    opener?.focus({ preventScroll: true });
  };

  const setView = (next: 'bio' | 'track', immediate = false) => {
    if (open === (next === 'track')) return;
    open = next === 'track';
    if (open) bioScroll = window.scrollY;

    // A toggle faster than the exit lands here with the outgoing view already
    // cancelled and the DOM still on the view we are heading back to. There is
    // nothing on screen to animate out, so just settle.
    leaving?.cancel();
    leaving = null;
    if (immediate || reducedMotion.matches || intro.dataset.view === next) {
      commit(next);
      return;
    }

    const node = open ? bio : track;
    const dx = open ? -26 : 26;
    const exit = node.animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: `translate3d(${dx}px, 0, 0)` },
      ],
      { duration: 190, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
    );

    leaving = exit;
    exit.finished
      .then(() => {
        if (leaving !== exit) return;
        leaving = null;
        commit(next);
      })
      // `cancel()` rejects the promise. That path is handled above, by whoever
      // cancelled it.
      .catch(() => {});
  };

  const route = (immediate = false) =>
    setView(window.location.hash === '#recorrido' ? 'track' : 'bio', immediate);

  // Push rather than `history.back()`, for the same reason "Volver" on a case
  // does: guessing what is behind us stops being reliable the moment anything
  // else has touched the hash, and guessing wrong means leaving the site.
  back?.addEventListener('click', () => {
    history.pushState(null, '', window.location.pathname + window.location.search);
    route();
  });

  window.addEventListener('hashchange', () => route());

  // The first pass is the exception that has to skip the transition. A shared
  // `#recorrido` link has no outgoing view to slide away — the bio has never
  // been on screen — so animating one is both a lie and a hostage: a page that
  // opens in a background tab has its animations parked at frame zero, and the
  // swap would wait on a frame that only arrives when someone looks at it.
  route(true);
}

/* -- boot ----------------------------------------------------------------- */

initReveals();
initVideos();
initClock();
void initWeather();
initAxes();
initGlosses();
initLang();
initFilters();
initCases();
// After `initCases`: both answer to `hashchange`, and on a hash that opens the
// record the case router runs first to close whatever case was open and restore
// its scroll position, so the track's own positioning gets the last word.
initTrack();
