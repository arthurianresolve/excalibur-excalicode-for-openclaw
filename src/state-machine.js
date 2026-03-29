import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_STATE = {
  current: null,
  history: []
};

const STATE_PATH = process.env.EXCALICODE_STATE_PATH
  || path.join(process.cwd(), '.excalicode-state.json');

export function loadState() {
  if (!fs.existsSync(STATE_PATH)) return { ...DEFAULT_STATE };
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

export function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export function transition(state, event, payload) {
  const now = new Date().toISOString();
  const next = {
    ...state,
    history: [...state.history, { event, payload, at: now }]
  };

  if (event === 'propose') {
    next.current = { status: 'proposed', spec: payload, at: now };
  }
  if (event === 'approve' && next.current) {
    next.current.status = 'approved';
  }
  if (event === 'apply' && next.current) {
    next.current.status = 'applied';
  }

  return next;
}
