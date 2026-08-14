import {
  createUISFX,
  getPlaybackMode,
  type CueName,
  type PlayingSFX,
  type PlayOptions,
  type UISFXPlayer,
} from 'uisfx';

export const SOUND_PACK = 'studio' as const;
export const SOUND_DEFAULT_VOLUME = 0.7;

export const UI_SOUND_CUES = {
  caseBack: 'back',
  caseNext: 'forward',
  caseOpen: 'open',
  filterOff: 'deselect',
  filterOn: 'select',
  glossClose: 'close',
  glossOpen: 'open',
  language: 'select',
  soundOn: 'toggle-on',
  trackBack: 'back',
  trackOpen: 'open',
} as const satisfies Record<string, CueName>;

const ENABLED_KEY = 'yamil:sound-enabled';
const VOLUME_KEY = 'yamil:sound-volume';

interface SoundPreferences {
  enabled: boolean;
  volume: number;
}

interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

let player: UISFXPlayer | null = null;
let preferences: SoundPreferences | null = null;
let unlocked = false;
let lifecycleBound = false;
const activeLoops = new Set<PlayingSFX>();

export function readSoundPreferences(storage: PreferenceStorage | null): SoundPreferences {
  const fallback = { enabled: true, volume: SOUND_DEFAULT_VOLUME };
  if (!storage) return fallback;

  try {
    const savedEnabled = storage.getItem(ENABLED_KEY);
    const rawVolume = storage.getItem(VOLUME_KEY);
    const savedVolume = rawVolume === null ? Number.NaN : Number(rawVolume);
    return {
      enabled: savedEnabled === null ? fallback.enabled : savedEnabled === 'true',
      volume:
        Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1
          ? savedVolume
          : fallback.volume,
    };
  } catch {
    return fallback;
  }
}

function browserStorage(): PreferenceStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function savePreference(key: string, value: string): void {
  try {
    browserStorage()?.setItem(key, value);
  } catch {
    // Storage can be blocked while Web Audio remains available. Sound keeps
    // working for this visit; only the preference becomes session-local.
  }
}

function syncControls(): void {
  if (typeof document === 'undefined' || !preferences) return;

  for (const control of document.querySelectorAll<HTMLElement>('[data-sound-controls]')) {
    control.dataset.enabled = String(preferences.enabled);
  }

  for (const toggle of document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]')) {
    toggle.setAttribute('aria-pressed', String(preferences.enabled));
  }

}

function bindLifecycle(): void {
  if (lifecycleBound || typeof window === 'undefined') return;
  lifecycleBound = true;
  window.addEventListener('pagehide', (event) => {
    // A bfcache page is suspended, not torn down. Destroying its player would
    // leave the restored DOM wired to a dead service.
    if (!event.persisted) void disposeUISFX();
  });
}

export function initUISFX(): UISFXPlayer | null {
  if (typeof window === 'undefined') return null;
  if (!preferences) preferences = readSoundPreferences(browserStorage());

  if (!player) {
    player = createUISFX({
      pack: SOUND_PACK,
      volume: preferences.volume,
      enabled: preferences.enabled,
    });
  }

  bindLifecycle();
  syncControls();
  return player;
}

function trackLoop(cue: CueName, playing: PlayingSFX | null): PlayingSFX | null {
  if (!playing || getPlaybackMode(cue) !== 'loop') return playing;
  activeLoops.add(playing);
  void playing.ended.finally(() => activeLoops.delete(playing));
  return playing;
}

function playReady(cue: CueName, options?: PlayOptions): PlayingSFX | null {
  const ui = initUISFX();
  if (!ui || !preferences?.enabled) return null;
  return trackLoop(cue, ui.play(cue, options));
}

/** Play only after Web Audio has already been unlocked by a real interaction. */
export function playUISFX(cue: CueName, options?: PlayOptions): PlayingSFX | null {
  if (!unlocked) return null;
  return playReady(cue, options);
}

/**
 * Trusted pointer and keyboard activations both surface as one native `click`.
 * Call this directly in that handler: `play()` stays synchronous and a null
 * handle is an expected first-interaction/browser-policy outcome, never queued.
 */
export function playUISFXFromGesture(
  cue: CueName,
  options?: PlayOptions,
): PlayingSFX | null {
  const ui = initUISFX();
  if (!ui || !preferences?.enabled) return null;

  void ui.unlock().then((ready) => {
    unlocked = ready;
  });
  const playing = trackLoop(cue, ui.play(cue, options));
  if (playing) unlocked = true;
  return playing;
}

function stopLoops(): void {
  for (const loop of activeLoops) loop.stop();
  activeLoops.clear();
}

export function setSoundEnabled(enabled: boolean): void {
  const ui = initUISFX();
  if (!ui || !preferences || preferences.enabled === enabled) return;

  if (!enabled) {
    stopLoops();
    ui.stopAll();
  }

  preferences.enabled = enabled;
  ui.setEnabled(enabled);
  savePreference(ENABLED_KEY, String(enabled));
  syncControls();
}

export function initSoundControls(): void {
  initUISFX();
  if (typeof document === 'undefined') return;

  for (const toggle of document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]')) {
    toggle.addEventListener('click', () => {
      const enable = !(preferences?.enabled ?? true);
      setSoundEnabled(enable);
      if (enable) playUISFXFromGesture(UI_SOUND_CUES.soundOn);
    });
  }

}

export async function disposeUISFX(): Promise<void> {
  const current = player;
  if (!current) return;

  stopLoops();
  current.stopAll();
  player = null;
  preferences = null;
  unlocked = false;
  await current.destroy();
}
