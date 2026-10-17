import { describe, it, expect } from 'vitest';
import {
  WAVE_DURATION_MS,
  WAVE_MAX,
  WAVE_STRENGTH,
  createWaveQueue,
  pulseStrengthForChange,
} from '../pulseQueue';

const w = (strength = 1) => ({ x: 0, y: 0, strength });

describe('pulseStrengthForChange', () => {
  it('returns null when nothing changed', () => {
    expect(pulseStrengthForChange('a', 'a')).toBeNull();
  });
  it('typing one character is a normal wave', () => {
    expect(pulseStrengthForChange('ab', 'abc')).toBe(WAVE_STRENGTH.normal);
  });
  it('deleting is weaker', () => {
    expect(pulseStrengthForChange('abc', 'ab')).toBe(WAVE_STRENGTH.delete);
    expect(pulseStrengthForChange('abc', '')).toBe(WAVE_STRENGTH.delete);
  });
  it('a multi-character jump is stronger', () => {
    expect(pulseStrengthForChange('', 'pasted text')).toBe(WAVE_STRENGTH.paste);
  });
});

describe('createWaveQueue', () => {
  it('keeps at most 4 waves and replaces the oldest', () => {
    const q = createWaveQueue();
    for (let i = 0; i < 6; i++) q.add({ x: i, y: 0, strength: 1 }, i * 100);
    const active = q.active(500);
    expect(active).toHaveLength(WAVE_MAX);
    expect(active.map((a) => a.x)).toEqual([2, 3, 4, 5]);
  });

  it('merges waves arriving within 70ms, keeping the stronger', () => {
    const q = createWaveQueue();
    q.add(w(0.5), 0);
    q.add(w(1.5), 30);
    q.add(w(1), 60);
    expect(q.size()).toBe(1);
    expect(q.active(60)[0].strength).toBe(1.5);
    q.add(w(1), 70);
    expect(q.size()).toBe(2);
  });

  it('expires waves after the duration', () => {
    const q = createWaveQueue();
    q.add(w(), 0);
    expect(q.active(WAVE_DURATION_MS - 1)).toHaveLength(1);
    expect(q.active(WAVE_DURATION_MS)).toHaveLength(0);
    expect(q.size()).toBe(0);
  });

  it('reports age and progress', () => {
    const q = createWaveQueue();
    q.add(w(), 1000);
    const [a] = q.active(1600);
    expect(a.age).toBeCloseTo(0.6);
    expect(a.progress).toBeCloseTo(0.5);
  });
});
