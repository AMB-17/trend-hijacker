import { describe, expect, it } from 'vitest';
import {
  calculateOpportunityScore,
  calculateStage,
  normalizeDiscussionVolume,
  normalizeVelocityGrowth,
} from './opportunity-score';

describe('opportunity scoring', () => {
  it('returns weighted score in 0-100 range', () => {
    const score = calculateOpportunityScore({
      velocityGrowth: 1,
      problemIntensity: 1,
      discussionVolume: 1,
      noveltyScore: 1,
    });

    expect(score).toBe(100);
  });

  it('normalizes volume and velocity boundaries', () => {
    expect(normalizeDiscussionVolume(0)).toBe(0);
    expect(normalizeDiscussionVolume(5000)).toBe(1);
    expect(normalizeVelocityGrowth(0)).toBe(0);
    expect(normalizeVelocityGrowth(10)).toBe(1);
  });

  it('maps score and growth to expected stage', () => {
    expect(calculateStage(80, 2.1)).toBe('exploding');
    expect(calculateStage(65, 1.0)).toBe('emerging');
    expect(calculateStage(45, 1.6)).toBe('early_signal');
    expect(calculateStage(30, 0.8)).toBe('mature');
  });
});
