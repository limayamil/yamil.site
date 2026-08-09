/**
 * The site's entire runtime. Three small jobs, no framework:
 *
 *   1. reveal elements once as they enter the viewport
 *   2. play a card's loop on hover (pointer) or when centred (touch)
 *   3. keep the footer clock ticking
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

/* -- boot ----------------------------------------------------------------- */

initReveals();
initVideos();
initClock();
