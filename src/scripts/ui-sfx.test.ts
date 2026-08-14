import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const uisfx = vi.hoisted(() => ({
  createUISFX: vi.fn(),
  getPlaybackMode: vi.fn((_cue: string): 'one-shot' | 'loop' => 'one-shot'),
}));

vi.mock('uisfx', () => uisfx);

import type { PlayingSFX, UISFXPlayer } from 'uisfx';
import {
  disposeUISFX,
  initUISFX,
  playUISFX,
  playUISFXFromGesture,
  readSoundPreferences,
  setSoundEnabled,
  SOUND_PACK,
  UI_SOUND_CUES,
} from './ui-sfx';

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
}

function playerStub() {
  const playing: PlayingSFX = {
    stop: vi.fn(),
    ended: new Promise(() => {}),
  };
  const player = {
    destroy: vi.fn(async () => {}),
    getPack: vi.fn(() => SOUND_PACK),
    getVolume: vi.fn(() => 0.7),
    isEnabled: vi.fn(() => true),
    play: vi.fn(() => playing),
    preload: vi.fn(async () => {}),
    setEnabled: vi.fn(),
    setPack: vi.fn(),
    setVolume: vi.fn(),
    stopAll: vi.fn(),
    unlock: vi.fn(async () => true),
  } satisfies UISFXPlayer;
  return { player, playing };
}

let saved = storage();
let audio = playerStub();

beforeEach(() => {
  saved = storage();
  audio = playerStub();
  uisfx.createUISFX.mockReturnValue(audio.player);
  uisfx.getPlaybackMode.mockImplementation((cue: string) =>
    cue === 'processing' ? 'loop' : 'one-shot',
  );
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    localStorage: saved,
  });
  vi.stubGlobal('document', { querySelectorAll: () => [] });
});

afterEach(async () => {
  await disposeUISFX();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('UI SFX service', () => {
  it('is SSR-safe and does not construct a player without window', () => {
    vi.stubGlobal('window', undefined);

    expect(initUISFX()).toBeNull();
    expect(uisfx.createUISFX).not.toHaveBeenCalled();
  });

  it('restores saved mute and volume preferences into the singleton player', () => {
    saved = storage({
      'yamil:sound-enabled': 'false',
      'yamil:sound-volume': '0.35',
    });
    vi.stubGlobal('window', { addEventListener: vi.fn(), localStorage: saved });

    expect(readSoundPreferences(saved)).toEqual({ enabled: false, volume: 0.35 });
    initUISFX();
    initUISFX();

    expect(uisfx.createUISFX).toHaveBeenCalledTimes(1);
    expect(uisfx.createUISFX).toHaveBeenCalledWith({
      enabled: false,
      pack: 'studio',
      volume: 0.35,
    });
  });

  it('suppresses background cues until one trusted activation unlocks audio', async () => {
    expect(playUISFX('open')).toBeNull();

    playUISFXFromGesture('select');
    expect(audio.player.unlock).toHaveBeenCalledTimes(1);
    expect(audio.player.play).toHaveBeenCalledTimes(1);

    await Promise.resolve();
    playUISFX('open');
    expect(audio.player.play).toHaveBeenCalledTimes(2);
  });

  it('stops retained loops and all voices before muting, then persists the state', async () => {
    playUISFXFromGesture('select');
    await Promise.resolve();
    playUISFX('processing');

    setSoundEnabled(false);

    expect(audio.playing.stop).toHaveBeenCalledTimes(1);
    expect(audio.player.stopAll).toHaveBeenCalledTimes(1);
    expect(audio.player.setEnabled).toHaveBeenCalledWith(false);
    expect(saved.setItem).toHaveBeenCalledWith('yamil:sound-enabled', 'false');
    expect(audio.player.stopAll.mock.invocationCallOrder[0]).toBeLessThan(
      audio.player.setEnabled.mock.invocationCallOrder[0],
    );
  });

  it('destroys once on final teardown and can create a clean remount', async () => {
    initUISFX();
    initUISFX();
    expect(uisfx.createUISFX).toHaveBeenCalledTimes(1);

    await disposeUISFX();
    expect(audio.player.destroy).toHaveBeenCalledTimes(1);

    const remounted = playerStub();
    uisfx.createUISFX.mockReturnValue(remounted.player);
    initUISFX();
    expect(uisfx.createUISFX).toHaveBeenCalledTimes(2);
  });

  it('keeps the product event map semantic and intentionally small', () => {
    expect(UI_SOUND_CUES).toEqual({
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
    });
  });
});
