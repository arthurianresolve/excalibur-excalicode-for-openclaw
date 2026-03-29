import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schema = JSON.parse(fs.readFileSync(new URL('../schemas/workflow-spec.json', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

export function validateSpec(spec) {
  const ok = validate(spec);
  return { ok, errors: ok ? null : validate.errors };
}
