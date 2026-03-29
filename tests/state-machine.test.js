import { describe, expect, it } from 'vitest';
import { transition } from '../src/state-machine.js';

const spec = { title: 'Test', steps: [{ action: 'noop', scope: 'none' }] };

it('transitions propose -> approve -> apply', () => {
  let state = { current: null, history: [] };
  state = transition(state, 'propose', spec);
  expect(state.current.status).toBe('proposed');
  state = transition(state, 'approve');
  expect(state.current.status).toBe('approved');
  state = transition(state, 'apply');
  expect(state.current.status).toBe('applied');
});
