#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import minimist from 'minimist';
import { loadState, saveState, transition } from '../src/state-machine.js';
import { validateSpec } from '../src/validator.js';
import { evaluatePolicy } from '../src/execpolicy.js';
import { loadExecPolicy } from '../src/config.js';

const argv = minimist(process.argv.slice(2));
const [cmd, specPath] = argv._;

function formatErrors(errors) {
  if (!errors) return 'unknown error';
  return errors.map((e) => `${e.instancePath || '/'} ${e.message}`).join('\n');
}

if (!cmd || cmd === 'help') {
  console.log(`Usage:
  excalicode propose <spec.json>
  excalicode approve
  excalicode apply
  excalicode status
`);
  process.exit(0);
}

const state = loadState();

if (cmd === 'propose') {
  if (!specPath) throw new Error('propose requires <spec.json>');
  const spec = JSON.parse(fs.readFileSync(path.resolve(specPath), 'utf8'));
  const result = validateSpec(spec);
  if (!result.ok) {
    console.error('Spec invalid:\n' + formatErrors(result.errors));
    process.exit(1);
  }
  const next = transition(state, 'propose', spec);
  saveState(next);
  console.log(JSON.stringify(next.current, null, 2));
  process.exit(0);
}

if (cmd === 'approve') {
  const next = transition(state, 'approve');
  saveState(next);
  console.log(JSON.stringify(next.current, null, 2));
  process.exit(0);
}

if (cmd === 'apply') {
  const policy = loadExecPolicy(argv.policy);
  if (policy) {
    const global = evaluatePolicy(policy, 'workflow.apply');
    if (global.decision === 'deny') {
      console.error('Policy denied: workflow.apply');
      process.exit(2);
    }
    if (global.decision === 'prompt') {
      console.error('Policy requires approval: workflow.apply');
      process.exit(3);
    }
    const steps = state.current?.spec?.steps || [];
    for (const step of steps) {
      const res = evaluatePolicy(policy, step.scope || 'workflow.step');
      if (res.decision === 'deny') {
        console.error(`Policy denied: ${step.scope}`);
        process.exit(2);
      }
      if (res.decision === 'prompt') {
        console.error(`Policy requires approval: ${step.scope}`);
        process.exit(3);
      }
    }
  }
  const next = transition(state, 'apply');
  saveState(next);
  console.log(JSON.stringify(next.current, null, 2));
  process.exit(0);
}

if (cmd === 'status') {
  console.log(JSON.stringify(state, null, 2));
  process.exit(0);
}

throw new Error(`Unknown command: ${cmd}`);
