import { describe, expect, it } from 'vitest';
import { evaluatePolicy } from '../src/execpolicy.js';

const policy = {
  policies: [
    { id: 'allow-workflow', scopes: ['workflow.*'], decision: 'allow' },
    { id: 'deny-system', scopes: ['system.control'], decision: 'deny' }
  ]
};

describe('evaluatePolicy', () => {
  it('matches glob scopes', () => {
    const result = evaluatePolicy(policy, 'workflow.apply');
    expect(result.decision).toBe('allow');
  });

  it('denies explicit scope', () => {
    const result = evaluatePolicy(policy, 'system.control');
    expect(result.decision).toBe('deny');
  });
});
