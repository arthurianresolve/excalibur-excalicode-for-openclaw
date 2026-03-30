# Code Fix Snippets - excalibur-excalicode-for-openclaw

## Issue 1: State File Race Condition (src/state-machine.js)

### Problem
Lines 17-19 write state directly without atomic operations. Concurrent writes or process interrupts can corrupt the JSON file.

### Current Code (src/state-machine.js:17-19)
```javascript
export function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}
```

### Fixed Code - Atomic Write Pattern
```javascript
export function saveState(state) {
  const tmpPath = STATE_PATH + '.tmp';
  try {
    // Write to temp file first
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
    // Atomic rename: temp -> final (POSIX atomic)
    fs.renameSync(tmpPath, STATE_PATH);
  } catch (err) {
    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch (cleanupErr) {
      console.error('Failed to clean up temp file:', cleanupErr.message);
    }
    throw new Error(`Failed to save state: ${err.message}`);
  }
}
```

### Why This Works
- Writes to `.tmp` file first (isolated from corruption risk)
- `fs.renameSync()` is atomic on all OS platforms
- If process crashes during write, `.tmp` is orphaned (can be cleaned up later)
- Final state file is always valid or doesn't exist

### Bonus: Add Cleanup for Orphaned Temp Files
```javascript
export function loadState() {
  // Clean up any orphaned temp files on load
  const tmpPath = STATE_PATH + '.tmp';
  if (fs.existsSync(tmpPath)) {
    try {
      fs.unlinkSync(tmpPath);
      console.warn('Cleaned up orphaned temp state file');
    } catch (err) {
      console.warn('Could not remove orphaned temp file:', err.message);
    }
  }
  
  if (!fs.existsSync(STATE_PATH)) return { ...DEFAULT_STATE };
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}
```

---

## Issue 2: Unvalidated JSON Parsing (bin/excalicode.js)

### Problem
Lines 32 and 52 parse JSON without try-catch. Malformed input crashes the tool.

### Current Code (bin/excalicode.js:30-42)
```javascript
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
```

### Fixed Code
```javascript
if (cmd === 'propose') {
  if (!specPath) throw new Error('propose requires <spec.json>');
  
  let spec;
  try {
    const raw = fs.readFileSync(path.resolve(specPath), 'utf8');
    spec = JSON.parse(raw);
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error(`✗ Spec file is not valid JSON: ${specPath}`);
      console.error(`  Error: ${err.message}`);
      console.error('  Tip: Validate your JSON using an online JSON validator or `jq .`');
    } else if (err.code === 'ENOENT') {
      console.error(`✗ Spec file not found: ${specPath}`);
    } else {
      console.error(`✗ Failed to read spec file: ${err.message}`);
    }
    process.exit(1);
  }
  
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
```

### Add Safe JSON Loading Utility
```javascript
// Helper function to load and parse JSON safely
function loadJsonFile(filePath, fileType = 'file') {
  try {
    const raw = fs.readFileSync(path.resolve(filePath), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    const errorMsg = (() => {
      if (err instanceof SyntaxError) {
        return `${fileType} is not valid JSON: ${err.message}`;
      } else if (err.code === 'ENOENT') {
        return `${fileType} not found: ${filePath}`;
      } else if (err.code === 'EACCES') {
        return `${fileType} is not readable (permission denied): ${filePath}`;
      }
      return `Failed to read ${fileType}: ${err.message}`;
    })();
    throw new Error(errorMsg);
  }
}

// Usage
try {
  const spec = loadJsonFile(path.resolve(specPath), 'Spec');
  // ... rest of logic
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
```

---

## Issue 3: Fix Missing loadExecPolicy Import (bin/excalicode.js & src/config.js)

### Problem
Line 8 imports `loadExecPolicy` from config.js, but function may not exist or be exported.

### Check src/config.js
Verify that `src/config.js` **exports** the function:

```javascript
export function loadExecPolicy(explicitPath) {
  // ... implementation
}
```

### If Not Present, Add to src/config.js
```javascript
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Determine default config path safely (same as other repo)
function getDefaultConfigPath() {
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  return path.join(home, '.excalicode', 'config.json');
}

const DEFAULT_CONFIG_PATH = getDefaultConfigPath();

export function loadExecPolicy(explicitPath) {
  const policyPath = explicitPath || process.env.EXCALICODE_POLICY_PATH;
  if (policyPath) {
    try {
      return loadJson(policyPath);
    } catch (err) {
      console.warn(`Warning: Could not load policy from ${policyPath}: ${err.message}`);
      return null;
    }
  }
  
  if (!fs.existsSync(DEFAULT_CONFIG_PATH)) {
    return null; // No config file; policies optional
  }
  
  try {
    const config = loadJson(DEFAULT_CONFIG_PATH);
    return config?.execpolicy || null;
  } catch (err) {
    console.warn(`Warning: Could not load default config: ${err.message}`);
    return null;
  }
}

function loadJson(filePath) {
  try {
    const raw = fs.readFileSync(path.resolve(filePath), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`JSON parsing error in ${filePath}: ${err.message}`);
    } else if (err.code === 'ENOENT') {
      throw new Error(`Config file not found: ${filePath}`);
    }
    throw err;
  }
}
```

### Verify Import in bin/excalicode.js (Line 8)
```javascript
import { loadExecPolicy } from '../src/config.js';
```

---

## Issue 4: State File Location - Use OS Config Directories (src/state-machine.js)

### Problem
State file is stored in current working directory (`process.cwd()`), causing conflicts and loss across sessions.

### Current Code (src/state-machine.js:9-10)
```javascript
const STATE_PATH = process.env.EXCALICODE_STATE_PATH
  || path.join(process.cwd(), '.excalicode-state.json');
```

### Fixed Code - Use XDG Standards
```javascript
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function getStateFilePath() {
  // Explicit override from env var
  if (process.env.EXCALICODE_STATE_PATH) {
    return process.env.EXCALICODE_STATE_PATH;
  }
  
  // XDG Base Directory spec (Linux/Unix)
  if (process.env.XDG_STATE_HOME) {
    return path.join(process.env.XDG_STATE_HOME, 'excalicode', 'state.json');
  }
  
  // macOS
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'excalicode', 'state.json');
  }
  
  // Windows
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'excalicode', 'state.json');
  }
  
  // Fallback (Linux default)
  return path.join(os.homedir(), '.local', 'state', 'excalicode', 'state.json');
}

const STATE_PATH = getStateFilePath();

// Ensure directory exists before writing
function ensureStateDir() {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    } catch (err) {
      console.error(`Failed to create state directory: ${err.message}`);
      throw err;
    }
  }
}

export function loadState() {
  // Clean up orphaned temp files
  const tmpPath = STATE_PATH + '.tmp';
  if (fs.existsSync(tmpPath)) {
    try {
      fs.unlinkSync(tmpPath);
    } catch (err) {
      console.warn('Could not remove orphaned temp file:', err.message);
    }
  }
  
  if (!fs.existsSync(STATE_PATH)) return { ...DEFAULT_STATE };
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch (err) {
    console.error(`Failed to load state: ${err.message}`);
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state) {
  try {
    ensureStateDir();
    const tmpPath = STATE_PATH + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmpPath, STATE_PATH);
  } catch (err) {
    const tmpPath = STATE_PATH + '.tmp';
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
    throw new Error(`Failed to save state: ${err.message}`);
  }
}
```

### Apply Similar Pattern to config.js
```javascript
function getConfigPath() {
  if (process.env.EXCALICODE_CONFIG_PATH) {
    return process.env.EXCALICODE_CONFIG_PATH;
  }
  
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'excalicode', 'config.json');
  }
  
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Preferences', 'excalicode', 'config.json');
  }
  
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'excalicode', 'config.json');
  }
  
  return path.join(os.homedir(), '.config', 'excalicode', 'config.json');
}
```

---

## Issue 5: Add Context to Policy Evaluation (bin/excalicode.js:54-74)

### Problem
Policy evaluation is called without context object, so conditions are never matched meaningfully.

### Current Code (bin/excalicode.js:51-75)
```javascript
if (cmd === 'apply') {
  const policy = loadExecPolicy(argv.policy);
  if (policy) {
    const global = evaluatePolicy(policy, 'workflow.apply');
    if (global.decision === 'deny') {
      console.error('Policy denied: workflow.apply');
      process.exit(2);
    }
    // ... more logic
  }
```

### Fixed Code - Pass Context
```javascript
if (cmd === 'apply') {
  const policy = loadExecPolicy(argv.policy);
  if (policy) {
    // Build context from environment and CLI args
    const context = {
      agentId: process.env.AGENT_ID || argv.agent,
      toolName: process.env.TOOL_NAME || argv.tool || 'excalicode',
      path: process.cwd(),
      domain: process.env.DOMAIN,
    };
    
    const global = evaluatePolicy(policy, 'workflow.apply', context);
    if (global.decision === 'deny') {
      console.error('✗ Policy denied: workflow.apply');
      if (global.matched?.length) {
        console.error(`  Matched policy rules: ${global.matched.join(', ')}`);
      }
      process.exit(2);
    }
    if (global.decision === 'prompt') {
      console.error('⚠ Policy requires manual approval: workflow.apply');
      process.exit(3);
    }
    
    // Evaluate each step
    const steps = state.current?.spec?.steps || [];
    for (const step of steps) {
      const stepContext = {
        ...context,
        path: step.path || context.path,
      };
      const res = evaluatePolicy(policy, step.scope || 'workflow.step', stepContext);
      if (res.decision === 'deny') {
        console.error(`✗ Policy denied: ${step.scope}`);
        if (res.matched?.length) {
          console.error(`  Matched policy rules: ${res.matched.join(', ')}`);
        }
        process.exit(2);
      }
      if (res.decision === 'prompt') {
        console.error(`⚠ Policy requires approval: ${step.scope}`);
        process.exit(3);
      }
    }
  }
  
  const next = transition(state, 'apply');
  saveState(next);
  console.log(JSON.stringify(next.current, null, 2));
  process.exit(0);
}
```

---

## Summary of Changes

| Issue | File | Impact |
|-------|------|--------|
| Race condition | src/state-machine.js | Atomic writes prevent corruption |
| JSON parse errors | bin/excalicode.js | Graceful error handling + user guidance |
| Missing function | src/config.js | Ensure export exists |
| State file location | src/state-machine.js | OS-aware config paths + directory creation |
| Policy context | bin/excalicode.js | Meaningful policy evaluation |

---

## Testing the Fixes

### Test 1: Atomic Writes
```bash
# Run two apply commands in rapid succession
node bin/excalicode.js propose examples/spec.example.json &
nnode bin/excalicode.js apply &
wait
cat .excalicode-state.json | jq . # Should be valid JSON
```

### Test 2: JSON Parse Errors
```bash
echo "{invalid json}" > bad.json
node bin/excalicode.js propose bad.json
# Should show: "✗ Spec file is not valid JSON" (not a crash)
```

### Test 3: Config Path
```bash
# Check where config is stored
echo $XDG_CONFIG_HOME
ls -la ~/.local/state/excalicode/ # or equivalent per OS
```