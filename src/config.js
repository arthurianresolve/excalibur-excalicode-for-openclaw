import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_CONFIG_PATH = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');

export function loadExecPolicy(explicitPath) {
  const policyPath = explicitPath || process.env.EXCALICODE_POLICY_PATH;
  if (policyPath) {
    return loadJson(policyPath);
  }
  if (!fs.existsSync(DEFAULT_CONFIG_PATH)) return null;
  const config = loadJson(DEFAULT_CONFIG_PATH);
  return config?.execpolicy || null;
}

function loadJson(filePath) {
  const raw = fs.readFileSync(path.resolve(filePath), 'utf8');
  return JSON.parse(raw);
}
