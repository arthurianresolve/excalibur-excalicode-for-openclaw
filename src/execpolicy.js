import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { minimatch } from 'minimatch';

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Exec Policy',
  type: 'object',
  properties: {
    policies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          description: { type: 'string' },
          scopes: { type: 'array', items: { type: 'string' } },
          decision: { type: 'string', enum: ['allow', 'prompt', 'deny'] },
          conditions: {
            type: 'object',
            properties: {
              agentId: { type: 'string' },
              toolName: { type: 'string' },
              pathPrefix: { type: 'string' },
              domainAllowlist: { type: 'array', items: { type: 'string' } }
            },
            additionalProperties: false
          }
        },
        required: ['id', 'scopes', 'decision']
      }
    }
  },
  required: ['policies']
};

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

export function loadPolicy(filePath) {
  const raw = fs.readFileSync(path.resolve(filePath), 'utf8');
  const policy = JSON.parse(raw);
  if (!validate(policy)) {
    throw new Error(`Exec policy schema invalid: ${ajv.errorsText(validate.errors)}`);
  }
  return policy;
}

function matchesScope(scope, scopes) {
  return scopes.some((pattern) => minimatch(scope, pattern));
}

function matchesConditions(conditions = {}, context = {}) {
  const { agentId, toolName, pathPrefix, domainAllowlist } = conditions;
  if (agentId && agentId !== context.agentId) return false;
  if (toolName && toolName !== context.toolName) return false;
  if (pathPrefix && context.path && !context.path.startsWith(pathPrefix)) return false;
  if (domainAllowlist && Array.isArray(domainAllowlist)) {
    if (!context.domain || !domainAllowlist.includes(context.domain)) return false;
  }
  return true;
}

export function evaluatePolicy(policy, scope, context = {}) {
  const matches = policy.policies.filter((p) => matchesScope(scope, p.scopes)
    && matchesConditions(p.conditions, context));
  if (matches.length === 0) {
    return { decision: 'prompt', scope, reason: 'no_matching_policy' };
  }
  const decision = matches.find((p) => p.decision === 'deny')?.decision
    || matches.find((p) => p.decision === 'prompt')?.decision
    || 'allow';
  return { decision, scope, matched: matches.map((p) => p.id) };
}
