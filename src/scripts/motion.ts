/**
 * The site's entire runtime. Small jobs, no framework:
 *
 *   1. reveal elements once as they enter the viewport
 *   2. play a card's loop on hover (pointer) or when centred (touch)
 *   3. keep the footer clock ticking
 *   4. fetch the footer's live weather reading once, on load
 *   5. drive the capability panel from whichever axis is hovered or focused
 *   6. open a bio gloss on tap, where there is no hover to open it
 *   7. run the ES/EN switch (the language is *resolved* by an inline script in
 *      Base.astro, which has to beat the first paint — this only reacts to
 *      clicks after that)
 *
 * Nothing here reads layout during scroll, and every animated property is
 * transform/opacity, so the compositor handles the frames on its own.
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

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

/* -- 2. Card video -------------------------------------------------------- */

function play(card: HTMLElement, video: HTMLVideoElement): void {
  if (reducedMotion.matches) return;
  card.dataset.playing = 'true';
  // Autoplay can still be refused (low power mode, for one) — the poster
  // underneath stays visible, so there is nothing to recover from.
  void video.play().catch(() => {
    card.dataset.playing = 'false';
  });
}

function stop(card: HTMLElement, video: HTMLVideoElement): void {
  card.dataset.playing = 'false';
  video.pause();
  video.currentTime = 0;
}

function initVideos(): void {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.card')).filter(
    (card): card is HTMLElement => card.querySelector('video') !== null,
  );
  if (cards.length === 0) return;

  if (canHover.matches) {
    for (const card of cards) {
      const video = card.querySelector('video')!;
      card.addEventListener('pointerenter', () => play(card, video));
      card.addEventListener('pointerleave', () => stop(card, video));
      card.addEventListener('focus', () => play(card, video));
      card.addEventListener('blur', () => stop(card, video));
    }
    return;
  }

  // Touch: whichever card is mostly on screen plays, the others rewind.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const card = entry.target as HTMLElement;
        const video = card.querySelector('video');
        if (!video) continue;
        if (entry.isIntersecting) play(card, video);
        else stop(card, video);
      }
    },
    { threshold: 0.6 },
  );

  cards.forEach((card) => observer.observe(card));
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
// design — the footer wants a glance, not a forecast.
const WEATHER_ICONS: Record<number, string> = {
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

async function initWeather(): Promise<void> {
  const node = document.querySelector<HTMLElement>('[data-weather]');
  const lat = node?.dataset.weatherLat;
  const lon = node?.dataset.weatherLon;
  const icon = node?.querySelector<HTMLElement>('[data-weather-icon]');
  const temp = node?.querySelector<HTMLElement>('[data-weather-temp]');
  if (!node || !lat || !lon || !icon || !temp) return;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;

  try {
    const response = await fetch(url);
    if (!response.ok) return;
    const data = await response.json();
    const current = data?.current;
    if (typeof current?.temperature_2m !== 'number') return;

    icon.textContent = WEATHER_ICONS[current.weather_code] ?? '🌡️';
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

  const show = (key: string) => {
    for (const slot of slots) slot.classList.toggle('is-active', slot.dataset.slot === key);
    for (const button of buttons) button.classList.toggle('is-active', button.dataset.axis === key);
  };

  // A pointer can leave, so it gets the resting copy back on the way out. Touch
  // cannot, so the first axis stays open and taps move between them — the panel
  // is never empty and never reverts under a finger.
  const idle = canHover.matches ? 'rest' : '0';
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

/* -- boot ----------------------------------------------------------------- */

initReveals();
initVideos();
initClock();
void initWeather();
initAxes();
initGlosses();
initLang();
