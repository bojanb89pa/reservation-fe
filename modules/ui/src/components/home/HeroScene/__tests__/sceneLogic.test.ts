import { describe, it, expect, vi } from 'vitest';
import {
  SEARCH_SCROLL_PROGRESS,
  createRng,
  createSearchWindowController,
  getPhase,
  scrollTargetForProgress,
  shouldShowScene,
} from '../sceneLogic';
import { generateSceneData } from '../sceneData';

const ok = {
  matchesDesktop: true,
  prefersReducedMotion: false,
  webglAvailable: true,
  hardwareConcurrency: 8,
};

describe('shouldShowScene', () => {
  it('shows the scene when every condition is met', () => {
    expect(shouldShowScene(ok)).toBe(true);
  });

  it.each([
    ['not desktop', { matchesDesktop: false }],
    ['reduced motion', { prefersReducedMotion: true }],
    ['no WebGL', { webglAvailable: false }],
    ['weak CPU', { hardwareConcurrency: 2 }],
  ])('hides the scene: %s', (_, patch) => {
    expect(shouldShowScene({ ...ok, ...patch })).toBe(false);
  });

  it('allows an unknown hardwareConcurrency', () => {
    expect(shouldShowScene({ ...ok, hardwareConcurrency: undefined })).toBe(true);
    expect(shouldShowScene({ ...ok, hardwareConcurrency: 4 })).toBe(true);
  });
});

describe('getPhase', () => {
  it('maps progress to phases', () => {
    expect(getPhase(0)).toBe('discover');
    expect(getPhase(0.3)).toBe('connect');
    expect(getPhase(0.55)).toBe('search');
    expect(getPhase(SEARCH_SCROLL_PROGRESS)).toBe('search');
    expect(getPhase(0.8)).toBe('transition');
    expect(getPhase(1)).toBe('transition');
  });
});

describe('scrollTargetForProgress', () => {
  it('maps progress onto the sticky scroll range', () => {
    // section 2250px tall in a 1000px viewport → 1250px of scroll range
    expect(scrollTargetForProgress(0.6, 400, 2250, 1000)).toBe(400 + 750);
    expect(scrollTargetForProgress(2, 0, 2250, 1000)).toBe(1250);
  });
});

describe('createSearchWindowController', () => {
  function setup(canBlur = true) {
    const focus = vi.fn();
    const blur = vi.fn();
    const controller = createSearchWindowController({ focus, blur, canBlur: () => canBlur });
    return { focus, blur, controller };
  }

  it('focuses once on entering SEARCH and blurs on leaving', () => {
    const { focus, blur, controller } = setup();
    controller.update(0.1);
    controller.update(0.56);
    controller.update(0.7);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(blur).not.toHaveBeenCalled();
    controller.update(0.85);
    expect(blur).toHaveBeenCalledTimes(1);
  });

  it('blurs when scrolling back up past the window', () => {
    const { blur, controller } = setup();
    controller.update(0.6);
    controller.update(0.4);
    expect(blur).toHaveBeenCalledTimes(1);
  });

  it('does not blur when the field has text or the list is open', () => {
    const { blur, controller } = setup(false);
    controller.update(0.6);
    controller.update(0.9);
    expect(blur).not.toHaveBeenCalled();
  });
});

describe('scene data', () => {
  it('is deterministic and within the point budget', () => {
    const a = generateSceneData();
    const b = generateSceneData();
    expect(a.count).toBeGreaterThanOrEqual(600);
    expect(a.count).toBeLessThanOrEqual(1000);
    expect(Array.from(a.pos0.slice(0, 30))).toEqual(Array.from(b.pos0.slice(0, 30)));
    expect(a.segments.length).toBe(b.segments.length);
  });

  it('createRng repeats for the same seed', () => {
    const r1 = createRng(1);
    const r2 = createRng(1);
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });
});
