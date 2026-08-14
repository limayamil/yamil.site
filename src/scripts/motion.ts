import {
  initSoundControls,
  initUISFX,
  playUISFXFromGesture,
  UI_SOUND_CUES,
} from './ui-sfx';

/**
 * The site's entire runtime. Small jobs, no framework:
 *
 *   1. reveal elements once as they enter the viewport
 *   2. play a tile's loop on hover (pointer) or when centred (touch)
 *  2b. pan case images and crossfade only after the next one is decoded
 *   3. keep the footer clock ticking
 *   4. fetch the footer's live weather reading once, on load
 *   5. drive the capability panel from whichever axis is hovered or focused,
 *      and commit that axis as the bento's filter when it is clicked
 *   6. open a bio gloss as a compact modal on narrow touch screens
 *   7. run the ES/EN switch (the language is *resolved* by an inline script in
 *      Base.astro, which has to beat the first paint — this only reacts to
 *      clicks after that), and replay the one part of the load-in that CSS
 *      cannot replay by itself
 *   8. filter the bento grid by axis, re-packing it with a FLIP
 *   9. route `#caso/<slug>` between the grid and one open case
 *  10. route `#recorrido` between the bio and the track record — the same
 *      two-views-one-URL trick as 9, on the other column
 *  11. count the figures — a case's metrics and the record's stats — up from
 *      zero when the block they are in arrives
 *  12. leave a small NERV easter egg in the console
 *  13. reinforce meaningful, user-triggered state changes with optional UI SFX
 *
 * Nothing here reads layout during scroll, and every animated property is
 * transform/opacity, so the compositor handles the frames on its own. The one
 * place layout *is* read is the FLIP helper, which reads it twice in the same
 * frame, on purpose, in response to a click — never during a scroll.
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
const wideLayout = window.matchMedia('(min-width: 62rem)');

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

/* -- 2b. Case image pan and rotation ------------------------------------- */

/**
 * A case's poster and gallery images form one slow preview in both the bento
 * and the detail hero. Timers only exist while a host is actually visible;
 * background tabs, filtered tiles and closed cases do no work and resume with
 * a full, unhurried hold instead of jumping ahead.
 */
function initCaseMedia(): void {
  const hosts = Array.from(document.querySelectorAll<HTMLElement>('[data-case-media]'));
  if (hosts.length === 0) return;

  // Keep the old eight-second average, but give every host its own hold on
  // every cycle so cards that enter together do not rotate in lockstep.
  const minHold = 6_500;
  const maxHold = 9_500;
  const fadeDuration = 1_400;
  const prepareLead = 2_000;
  const timers = new Map<HTMLElement, { prepare: number; advance: number }>();
  const visible = new Set<HTMLElement>();
  const revisions = new Map<HTMLElement, number>();
  const prepared = new WeakMap<HTMLImageElement, Promise<boolean>>();
  const fades = new Map<
    HTMLElement,
    {
      animation: Animation;
      current: HTMLElement;
      next: HTMLElement;
    }
  >();

  const framesOf = (host: HTMLElement) =>
    Array.from(host.querySelectorAll<HTMLElement>('[data-media-slide]'));

  const prepareFrame = (frame: HTMLElement): Promise<boolean> => {
    const image = frame.querySelector<HTMLImageElement>('img');
    if (!image) return Promise.resolve(false);

    const pending = prepared.get(image);
    if (pending) return pending;

    // Inactive slideshow frames intentionally ship without `src`/`srcset`, so
    // the preload scanner cannot fetch a whole gallery on first paint. Promote
    // the next frame near the end of the hold, then wait for a decoded bitmap
    // before any opacity changes begin.
    if (image.dataset.src) {
      image.src = image.dataset.src;
      delete image.dataset.src;
    }
    if (image.dataset.srcset) {
      image.srcset = image.dataset.srcset;
      delete image.dataset.srcset;
    }
    if (image.dataset.sizes) {
      image.sizes = image.dataset.sizes;
      delete image.dataset.sizes;
    }
    image.loading = 'eager';
    const preparation = image
      .decode()
      .then(() => image.naturalWidth > 0)
      .catch(() => image.complete && image.naturalWidth > 0);
    prepared.set(image, preparation);
    return preparation;
  };

  const settleFade = (host: HTMLElement) => {
    const fade = fades.get(host);
    if (!fade) return;

    fade.current.dataset.active = 'false';
    fade.next.dataset.active = 'true';
    delete fade.next.dataset.entering;
    fade.animation.cancel();
    fades.delete(host);
  };

  const stopRotation = (host: HTMLElement) => {
    const timer = timers.get(host);
    if (timer !== undefined) {
      window.clearTimeout(timer.prepare);
      window.clearTimeout(timer.advance);
    }
    timers.delete(host);
    settleFade(host);
    revisions.set(host, (revisions.get(host) ?? 0) + 1);
    delete host.dataset.mediaRunning;
  };

  const advance = async (host: HTMLElement, revision: number) => {
    const frames = framesOf(host);
    const currentIndex = Math.max(
      0,
      frames.findIndex((frame) => frame.dataset.active === 'true'),
    );
    const current = frames[currentIndex];
    const next = frames[(currentIndex + 1) % frames.length];

    const ready = await prepareFrame(next);
    if (
      !ready ||
      revisions.get(host) !== revision ||
      reducedMotion.matches ||
      document.hidden ||
      !visible.has(host)
    ) {
      return;
    }

    // Keep the outgoing frame fully painted underneath. The incoming frame is
    // promoted above it and explicitly faded, which guarantees a dissolve even
    // when CSS and image decoding land in the same rendering frame.
    next.dataset.active = 'true';
    next.dataset.entering = 'true';
    const animation = next.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: fadeDuration,
      easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
      fill: 'both',
    });
    const fade = { animation, current, next };
    fades.set(host, fade);

    await animation.finished.catch(() => {});
    if (fades.get(host) !== fade) return;

    settleFade(host);
    if (revisions.get(host) === revision) schedule(host);
  };

  const schedule = (host: HTMLElement) => {
    stopRotation(host);
    if (reducedMotion.matches || document.hidden || !visible.has(host)) return;

    host.dataset.mediaRunning = 'true';
    const frames = framesOf(host);
    if (frames.length < 2) return;

    const current = Math.max(
      0,
      frames.findIndex((frame) => frame.dataset.active === 'true'),
    );
    const next = frames[(current + 1) % frames.length];
    const revision = revisions.get(host) ?? 0;

    const hold = minHold + Math.random() * (maxHold - minHold);
    timers.set(host, {
      prepare: window.setTimeout(() => void prepareFrame(next), Math.max(0, hold - prepareLead)),
      advance: window.setTimeout(() => void advance(host, revision), hold),
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const host = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          visible.add(host);
          schedule(host);
        } else {
          visible.delete(host);
          stopRotation(host);
        }
      }
    },
    { threshold: 0.12 },
  );

  hosts.forEach((host) => observer.observe(host));

  document.addEventListener('visibilitychange', () => {
    for (const host of hosts) {
      if (document.hidden) stopRotation(host);
      else if (visible.has(host)) schedule(host);
    }
  });

  reducedMotion.addEventListener('change', () => {
    for (const host of hosts) schedule(host);
  });
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

function initAxes(applyFilter: ((key: string) => void) | null): void {
  const root = document.querySelector<HTMLElement>('[data-axes]');
  if (!root) return;

  const buttons = Array.from(root.querySelectorAll<HTMLElement>('[data-axis]'));
  const slots = Array.from(root.querySelectorAll<HTMLElement>('[data-slot]'));
  if (buttons.length === 0 || slots.length === 0) return;

  // The axes and the bento share one key — a capability's `icon` is a
  // project's `axis` — so pointing at a discipline can dim the work that is not
  // it, with no lookup table in between, and clicking it can filter the grid
  // down to that work with the same key again.
  const bento = document.querySelector<HTMLElement>('[data-bento]');

  /** The committed filter, which is state the bento already holds. */
  const active = () => bento?.dataset.filter ?? 'all';

  const show = (key: string) => {
    for (const slot of slots) slot.classList.toggle('is-active', slot.dataset.slot === key);
    for (const button of buttons) button.classList.toggle('is-active', button.dataset.axis === key);
    // Pointer only. On touch the panel rests *on* an axis rather than on the
    // resting note, so a highlight here would leave two thirds of the grid
    // permanently dimmed with nothing hovering it.
    //
    // A committed filter also turns it off: everything left in the grid is
    // already the filtered axis, so dimming "what does not match" would either
    // do nothing or grey out the whole thing while another chip is hovered.
    if (bento && canHover.matches) {
      if (key === 'rest' || active() !== 'all') delete bento.dataset.highlight;
      else bento.dataset.highlight = key;
    }
  };

  // A pointer can leave, so it gets the resting copy back on the way out —
  // unless a filter is on, in which case what it goes back to is that filter's
  // own copy, so the panel keeps explaining the grid being shown. Touch cannot
  // leave, so the first axis stays open and taps move between them: the panel
  // is never empty and never reverts under a finger.
  const base = canHover.matches ? 'rest' : (buttons[0]?.dataset.axis ?? 'rest');
  const idle = () => (active() === 'all' ? base : active());
  show(idle());

  for (const button of buttons) {
    const key = button.dataset.axis;
    if (!key) continue;

    button.addEventListener('pointerenter', () => show(key));
    button.addEventListener('focus', () => show(key));
    // Click commits. Pressing the axis that is already on clears it, which is
    // the only way back for a pointer that never leaves the chip — and the
    // second `show` is what repaints the highlight for the filter it just
    // changed, in either direction.
    button.addEventListener('click', () => {
      show(key);
      const next = active() === key ? 'all' : key;
      applyFilter?.(next);
      show(key);
      if (applyFilter) {
        playUISFXFromGesture(
          next === 'all' ? UI_SOUND_CUES.filterOff : UI_SOUND_CUES.filterOn,
        );
      }
    });
  }

  if (canHover.matches) {
    // Reset from the container, not from each button. The panel sits below the
    // rows, so a per-button `pointerleave` would close it the moment the
    // pointer travelled down toward the tool marks — which are themselves
    // hoverable, and unreachable if the panel keeps snapping back.
    root.addEventListener('pointerleave', () => show(idle()));
    root.addEventListener('focusout', (event) => {
      const next = (event as FocusEvent).relatedTarget;
      if (!(next instanceof Node) || !root.contains(next)) show(idle());
    });
  }

  // Clearing from the other column has to reach back here: the chip loses its
  // pressed state (that is `apply`'s job) but the panel and the highlight are
  // this function's, and no pointer event will fire to correct them.
  bento?.addEventListener('bentofilter', () => show(idle()));
}

/* -- 6. Bio glosses -------------------------------------------------------- */

function initGlosses(): void {
  const glosses = Array.from(document.querySelectorAll<HTMLElement>('[data-gloss]'));
  if (glosses.length === 0) return;

  const dialog = document.querySelector<HTMLDialogElement>('[data-gloss-dialog]');
  const dialogCopy = dialog?.querySelector<HTMLElement>('[data-gloss-dialog-copy]');
  const dialogClose = dialog?.querySelector<HTMLButtonElement>('[data-gloss-dialog-close]');

  const noteFor = (gloss: HTMLElement): HTMLElement | null =>
    gloss.querySelector<HTMLElement>('.gloss-note') ??
    (gloss.nextElementSibling?.classList.contains('gloss-note')
      ? (gloss.nextElementSibling as HTMLElement)
      : null);

  const closeDialog = () => {
    if (dialog?.open) dialog.close();
  };

  dialogClose?.addEventListener('click', () => {
    closeDialog();
    playUISFXFromGesture(UI_SOUND_CUES.glossClose, { volume: 0.72 });
  });

  // Native dialogs normally handle Escape themselves. Keeping the behaviour
  // explicit makes it reliable in embedded browsers too, while preserving the
  // same close cue as the visible X.
  dialog?.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeDialog();
    playUISFXFromGesture(UI_SOUND_CUES.glossClose, { volume: 0.72 });
  });

  // A tap on the dimmed top-layer backdrop is another natural way out. The
  // dialog's own rectangle must not count, hence the bounds check.
  dialog?.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect();
    const outside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;
    if (outside) closeDialog();
  });

  wideLayout.addEventListener('change', (event) => {
    if (event.matches) closeDialog();
  });

  for (const gloss of glosses) {
    gloss.addEventListener('click', () => {
      if (!wideLayout.matches && dialog && dialogCopy) {
        const note = noteFor(gloss);
        if (!note) return;
        for (const other of glosses) other.dataset.open = 'false';
        dialogCopy.textContent = note.textContent;
        dialog.showModal();
        playUISFXFromGesture(UI_SOUND_CUES.glossOpen, { volume: 0.72 });
        return;
      }

      // Fine pointers already get the CSS hover/focus popover. A wide touch
      // device keeps the previous tap-to-toggle fallback.
      if (canHover.matches) return;
      const open = gloss.dataset.open === 'true';
      // One at a time — two notes overlapping on a phone is unreadable.
      for (const other of glosses) other.dataset.open = 'false';
      gloss.dataset.open = String(!open);
      playUISFXFromGesture(open ? UI_SOUND_CUES.glossClose : UI_SOUND_CUES.glossOpen, {
        volume: 0.72,
      });
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

  /**
   * The "Ahora" box, replayed.
   *
   * Every other block on the page restarts its own load-in on a language
   * switch for free: the two languages are two wrappers and CSS hides one, so
   * the one coming back has been `display: none` and its animations begin
   * again. This box is the exception in both directions — the swap happens at
   * the `[data-i18n]` wrappers *inside* it, so its words restart on their own,
   * while the frame around them and the sweep across it were never hidden and
   * their animations finished seconds ago.
   *
   * Cancel-then-play is that same reset by hand, and it keeps the delays: the
   * box waits out the bio's rewrite exactly as it did on load, so the sequence
   * replays as one rather than the frame snapping in ahead of its copy.
   */
  const replayNow = () => {
    const now = document.querySelector('.now');
    if (!now) return;
    // `subtree` is what reaches the sweep: it is a pseudo-element's animation,
    // and a pseudo-element is not something you can query for and ask.
    for (const animation of now.getAnimations({ subtree: true })) {
      animation.cancel();
      animation.play();
    }
  };

  // The inline script already picked a language; catch the markup up to it.
  // No replay here — nothing has run yet at this point.
  apply(root.dataset.lang ?? 'es');

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const lang = button.dataset.langSet;
      if (!lang || lang === root.dataset.lang) return;
      try {
        localStorage.setItem('lang', lang);
      } catch {
        // Storage blocked — the switch still works, it just won't be
        // remembered on the next visit.
      }
      apply(lang);
      // After `apply`, so the words the swap just revealed are already running
      // and the whole box restarts on one beat.
      replayNow();
      playUISFXFromGesture(UI_SOUND_CUES.language);
    });
  }
}

/* -- 8. Bento filters ------------------------------------------------------ */

/**
 * The filter itself. The *control* is the axis chips in the left column (job 5,
 * which owns the clicks and calls the function returned here) — this side owns
 * the grid, the pressed state and the bar above the tiles that says what is on
 * and offers the way out.
 *
 * The bar is the only thing on the right that names the filter, because the
 * chip that set it is in a column that scrolls away. It also dispatches
 * `bentofilter` on the bento so the axes can resync their panel when the filter
 * is cleared from here, with no pointer event to do it for them.
 */
function initFilters(): ((key: string) => void) | null {
  const bento = document.querySelector<HTMLElement>('[data-bento]');
  const empty = document.querySelector<HTMLElement>('[data-bento-empty]');
  if (!bento) return null;

  const chips = Array.from(document.querySelectorAll<HTMLElement>('[data-axes] [data-axis]'));
  const tiles = Array.from(bento.querySelectorAll<HTMLElement>('.tile'));
  if (chips.length === 0 || tiles.length === 0) return null;

  const bar = document.querySelector<HTMLElement>('[data-filter-bar]');
  const name = bar?.querySelector<HTMLElement>('[data-filter-name]');
  const clear = bar?.querySelector<HTMLElement>('[data-filter-clear]');

  const matches = (tile: HTMLElement, key: string) => key === 'all' || tile.dataset.axis === key;

  const apply = (key: string) => {
    if (bento.dataset.filter === key) return;

    let label = '';
    for (const chip of chips) {
      const on = chip.dataset.axis === key;
      chip.setAttribute('aria-pressed', String(on));
      // The chip's own title, not a second copy of it in this column — a
      // discipline goes by the same name in both languages, so there is nothing
      // to switch and nothing to keep in sync.
      if (on) label = chip.querySelector('.axis-title')?.textContent?.trim() ?? '';
    }

    if (bar) bar.hidden = key === 'all';
    if (name) name.textContent = label;

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

    bento.dispatchEvent(new CustomEvent('bentofilter'));
  };

  clear?.addEventListener('click', () => {
    if (bento.dataset.filter === 'all') return;
    apply('all');
    playUISFXFromGesture(UI_SOUND_CUES.filterOff);
  });

  return apply;
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

  const shell = work.closest<HTMLElement>('.shell');
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
    shell?.setAttribute('data-case-open', '');
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
    shell?.removeAttribute('data-case-open');
    openSlug = null;

    // A tile that has spent its whole life inside a `display: none` grid — the
    // case was deep-linked, so the index never rendered — has no box for the
    // reveal observer to intersect, and does not reliably get one on the way
    // back. Resolve them by hand rather than trusting that. The stagger is a
    // per-tile `transition-delay`, so they still arrive as a wave.
    for (const pending of bento.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)')) {
      pending.classList.add('is-visible');
    }

    // On the stacked layout the profile comes back above the grid. Land at the
    // beginning of the work list instead of restoring the old tile position;
    // on the two-column layout, preserve the reader's previous page position.
    const destination = wideLayout.matches
      ? indexScroll
      : work.getBoundingClientRect().top + window.scrollY;
    const delta = jump(destination);

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
    if (link) {
      origin = link;
      playUISFXFromGesture(UI_SOUND_CUES.caseOpen);
    }
  });

  // Push rather than `history.back()`: guessing whether the entry behind us is
  // our own index is unreliable once prev/next have been used, and wrong there
  // means leaving the site. Pushing always lands on the index, and the
  // browser's own back button still returns to the case.
  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    const step = target?.closest<HTMLAnchorElement>('.case-step');
    if (step) {
      playUISFXFromGesture(
        step.rel === 'prev' ? UI_SOUND_CUES.caseBack : UI_SOUND_CUES.caseNext,
      );
      return;
    }
    if (!target?.closest('[data-case-back]')) return;
    playUISFXFromGesture(UI_SOUND_CUES.caseBack);
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

    // On phones, returning home means returning to the top of the profile.
    // The pinned two-column layout keeps its existing position instead.
    jump(wideLayout.matches ? bioScroll : 0);
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
  opener?.addEventListener('click', () => {
    playUISFXFromGesture(UI_SOUND_CUES.trackOpen);
  });

  back?.addEventListener('click', () => {
    playUISFXFromGesture(UI_SOUND_CUES.trackBack);
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

/* -- 11. Counting figures -------------------------------------------------- */

/**
 * The two figure strips on the page — a case's `.case-metrics` and the record's
 * `.track-stats` — count up from zero when their block arrives.
 *
 * The number ships written into the HTML and is read back from the DOM, never
 * passed in as a second copy: with JS off, or before this runs, the figure is
 * already correct and the only thing missing is the count. Whatever sits around
 * it in the same string ("+", "%", "x", a unit) is left alone — only the numeric
 * run is animated, and it is re-rendered in the *same* shape it was authored in,
 * so `11.432` counts in Spanish grouping rather than reverting to `11432`.
 *
 * Both strips carry `font-variant-numeric: tabular-nums`, which is what keeps a
 * running figure from resizing its own line on every frame.
 */
function initCounters(): void {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-counter]'));
  if (nodes.length === 0) return;

  /** A parsed figure: everything around the number, and how to write it back. */
  interface Figure {
    prefix: string;
    suffix: string;
    value: number;
    format: (n: number) => string;
  }

  const group = (digits: string, separator: string) =>
    digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);

  const parse = (raw: string): Figure | null => {
    const text = raw.trim();
    const match = /\d[\d.,]*\d|\d/.exec(text);
    if (!match) return null;

    const token = match[0];
    const prefix = text.slice(0, match.index);
    const suffix = text.slice(match.index + token.length);

    // Grouped integer — `11.432`, `1,250`. The separator is whatever the author
    // used; the count keeps it.
    const grouped = /^\d{1,3}(([.,])\d{3})+$/.exec(token);
    if (grouped) {
      const separator = grouped[2];
      const value = Number(token.split(separator).join(''));
      return { prefix, suffix, value, format: (n) => group(String(Math.round(n)), separator) };
    }

    // Decimal — `2.5`, `1,5`. Held at the authored precision so the figure does
    // not gain or lose a digit halfway through.
    const decimal = /^(\d+)([.,])(\d+)$/.exec(token);
    if (decimal) {
      const separator = decimal[2];
      const places = decimal[3].length;
      const value = Number(`${decimal[1]}.${decimal[3]}`);
      return {
        prefix,
        suffix,
        value,
        format: (n) => n.toFixed(places).replace('.', separator),
      };
    }

    const value = Number(token.replace(/[.,]/g, ''));
    if (!Number.isFinite(value)) return null;
    return { prefix, suffix, value, format: (n) => String(Math.round(n)) };
  };

  // The same curve every other entrance on the page uses, by hand: this is a
  // text swap per frame, not a compositor property, so there is no animation to
  // hand the easing to.
  const ease = (t: number) => 1 - Math.pow(1 - t, 4);

  const write = (node: HTMLElement, figure: Figure, n: number) => {
    node.textContent = `${figure.prefix}${figure.format(n)}${figure.suffix}`;
  };

  const run = (node: HTMLElement, figure: Figure) => {
    // Long enough to read as a count rather than a flicker, and longer for a
    // figure with more digits to get through. The curve decelerates hard, so a
    // single-digit figure lands early no matter what the clock says — shortening
    // its run is what keeps it from sitting on its final value for half a
    // second while the eye waits for something else to happen.
    const duration = figure.value >= 1000 ? 1400 : figure.value >= 100 ? 1100 : 800;
    const start = performance.now();
    let done = false;

    const settle = () => {
      if (done) return;
      done = true;
      write(node, figure, figure.value);
    };

    const frame = (now: number) => {
      if (done) return;
      const t = Math.min(1, (now - start) / duration);
      if (t >= 1) return settle();
      write(node, figure, figure.value * ease(t));
      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
    // The count is the only thing on the page that replaces its own content, so
    // it is the only one that can strand something readable. A tab that is
    // hidden when the run starts gets no frames at all — `setTimeout` still
    // fires, `requestAnimationFrame` does not — and the figure would sit at zero
    // until someone looked at it. This lands the real number regardless.
    window.setTimeout(settle, duration + 400);
  };

  const figures = new Map<HTMLElement, Figure>();
  const armed = new Set<HTMLElement>();

  for (const node of nodes) {
    const figure = parse(node.textContent ?? '');
    if (figure) {
      figures.set(node, figure);
      armed.add(node);
    }
  }
  if (figures.size === 0) return;

  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const node = entry.target as HTMLElement;
        const figure = figures.get(node);
        if (!figure) continue;

        if (entry.isIntersecting) {
          if (!armed.has(node)) continue;
          armed.delete(node);
          // Zero it now rather than when the count starts: the block is still
          // fading in behind its own `--i` delay, so the reset is never seen,
          // whereas swapping the final figure for a zero mid-fade would be.
          write(node, figure, 0);
          window.setTimeout(() => run(node, figure), delayOf(node));
          continue;
        }

        // A figure inside a view that has been switched off has no box at all.
        // That is the one case worth re-arming for — reopening the record or a
        // case replays its whole load-in, and the count is part of it. Scrolling
        // a figure off screen leaves it counted, like every other reveal.
        const rect = entry.boundingClientRect;
        if (!rect.width && !rect.height) armed.add(node);
      }
    },
    { threshold: 0.6 },
  );

  figures.forEach((_figure, node) => observer.observe(node));
}

/**
 * How long the block holding this figure waits before it arrives. Read off the
 * `.case-enter` / `.track-enter` ancestor's own `animation-delay` rather than
 * restated here, so the stagger stays a stylesheet decision — the count starts
 * as its strip lands, not against it.
 */
function delayOf(node: HTMLElement): number {
  const host = node.closest<HTMLElement>('.case-enter, .track-enter, .enter');
  if (!host) return 120;
  const declared = Number.parseFloat(getComputedStyle(host).animationDelay);
  return Number.isFinite(declared) ? declared * 1000 + 220 : 120;
}

/* -- 12. Console easter egg ----------------------------------------------- */

/** A quiet reward for opening DevTools, styled with the console's native `%c`. */
function initConsoleEasterEgg(): void {
  const style = [
    'background:#7651b5',
    'color:#d9ff43',
    'font:700 14px/1.6 monospace',
    'padding:5px 9px',
    'border-radius:4px',
  ].join(';');

  console.log("%c God's in His heaven. All's right with the world. ", style);
}

/* -- boot ----------------------------------------------------------------- */

initConsoleEasterEgg();
initUISFX();
initSoundControls();
initReveals();
initVideos();
initCaseMedia();
initClock();
void initWeather();
initGlosses();
initLang();
// The chips drive the grid, so the grid's `apply` has to exist before the chips
// are wired to it.
initAxes(initFilters());
initCases();
// After `initCases`: both answer to `hashchange`, and on a hash that opens the
// record the case router runs first to close whatever case was open and restore
// its scroll position, so the track's own positioning gets the last word.
initTrack();
// Last: both routers above can put a figure on screen, and this one only has to
// be listening by the time one of them does.
initCounters();
