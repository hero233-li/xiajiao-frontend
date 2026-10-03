// Extract form schemas from the checked-in API contract; no independent business rules.
import fs from 'node:fs';
import { URL } from 'node:url';
import YAML from 'yaml';
const source = YAML.parse(
  fs.readFileSync(new URL('../../backend/docs/openapi.yaml', import.meta.url), 'utf8'),
);
const names = [
  'CatalogDraft',
  'KnowledgeDraft',
  'QuestionBankDraft',
  'AssessmentPolicyWrite',
  'CourseAdminWrite',
  'CycleWrite',
  'PaperWrite',
  'LegacyReviewDecision',
  'LegacyPracticeCreditDecision',
  'InvalidatePass',
  'LocalRubricDocument',
];
const definitions = {};
function visit(name) {
  if (definitions[name]) return;
  const value = source.components.schemas[name];
  if (!value) throw new Error(`Missing API schema ${name}`);
  definitions[name] = value;
  function refs(node) {
    if (!node || typeof node !== 'object') return;
    if (node.$ref) visit(node.$ref.split('/').at(-1));
    Object.values(node).forEach(refs);
  }
  refs(value);
}
names.forEach(visit);
const file = new URL('../src/features/admin/contracts.json', import.meta.url);
const formatted = JSON.stringify(definitions, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8'))) !== JSON.stringify(definitions))
    throw new Error('Admin form schemas are stale; run node scripts/admin-contracts.mjs');
} else fs.writeFileSync(file, formatted);
