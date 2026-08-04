import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const concepts = JSON.parse(fs.readFileSync(path.join(root, 'src/data/concepts.json'), 'utf8'));

const required = ['id', 'chapter', 'section', 'title', 'definition', 'easy', 'trap', 'source', 'tags'];
const errors = [];
const ids = new Set();

for (const concept of concepts) {
  for (const field of required) {
    if (!concept[field] || (Array.isArray(concept[field]) && concept[field].length === 0)) {
      errors.push(`${concept.id ?? 'unknown'} is missing ${field}`);
    }
  }

  if (ids.has(concept.id)) {
    errors.push(`duplicate id: ${concept.id}`);
  }
  ids.add(concept.id);

  if (!Number.isInteger(concept.chapter) || concept.chapter < 1 || concept.chapter > 7) {
    errors.push(`${concept.id} has invalid chapter`);
  }
}

const questionCount = concepts.length * 3;
const cardCount = concepts.length * 4;

if (questionCount < 90) {
  errors.push(`expected at least 90 questions, got ${questionCount}`);
}

if (cardCount < 120) {
  errors.push(`expected at least 120 flashcards, got ${cardCount}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Data OK: ${concepts.length} concepts, ${questionCount} questions, ${cardCount} flashcards`);
