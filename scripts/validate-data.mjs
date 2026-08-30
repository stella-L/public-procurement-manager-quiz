import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'src/data/curriculum.json'), 'utf8'));
const exampleQuestions = JSON.parse(fs.readFileSync(path.join(root, 'src/data/exampleQuestions.json'), 'utf8'));
const questions = JSON.parse(fs.readFileSync(path.join(root, 'src/data/questions.v2.json'), 'utf8'));

const errors = [];
const allowedQuestionTypes = new Set(['negative', 'concept-diff', 'numeric', 'box-multi', 'box-blank', 'positive']);
const allowedDifficulty = new Set(['기초', '중요', '함정']);
const curriculumTags = new Set();
const nodeIds = new Set();

for (const subject of curriculum.subjects ?? []) {
  if (!/^S[1-3]$/.test(subject.id) || subject.id !== `S${subject.subject}`) {
    errors.push(`invalid subject id: ${subject.id}`);
  }

  for (const major of subject.majorItems ?? []) {
    if (nodeIds.has(major.id)) errors.push(`duplicate curriculum node id: ${major.id}`);
    nodeIds.add(major.id);

    for (const sub of major.subItems ?? []) {
      if (nodeIds.has(sub.id)) errors.push(`duplicate curriculum node id: ${sub.id}`);
      nodeIds.add(sub.id);

      for (const detail of sub.detailItems ?? []) {
        const expectedPrefix = `${sub.id}.D`;
        if (!detail.id.startsWith(expectedPrefix)) {
          errors.push(`${detail.id} does not match parent ${sub.id}`);
        }
        if (curriculumTags.has(detail.id)) errors.push(`duplicate curriculum detail tag: ${detail.id}`);
        curriculumTags.add(detail.id);
      }
    }
  }
}

const expectedSubjectCounts = new Map([
  [1, { majors: 6, questions: 30 }],
  [2, { majors: 3, questions: 20 }],
  [3, { majors: 4, questions: 30 }],
]);

for (const [subjectNumber, expected] of expectedSubjectCounts) {
  const subject = curriculum.subjects.find((item) => item.subject === subjectNumber);
  if (!subject) {
    errors.push(`missing subject ${subjectNumber} in curriculum`);
    continue;
  }
  if (subject.questionCount !== expected.questions) {
    errors.push(`subject ${subjectNumber} expected ${expected.questions} official questions, got ${subject.questionCount}`);
  }
  if (subject.majorItems.length !== expected.majors) {
    errors.push(`subject ${subjectNumber} expected ${expected.majors} major items, got ${subject.majorItems.length}`);
  }
}

const validateCommonQuestion = (question, collectionName, finalBank = false) => {
  const required = ['id', 'subject', 'type', 'prompt', 'choices', 'curriculumTag'];
  for (const field of required) {
    if (question[field] === undefined || question[field] === null || question[field] === '') {
      errors.push(`${collectionName}:${question.id ?? 'unknown'} is missing ${field}`);
    }
  }

  if (!allowedQuestionTypes.has(question.type)) {
    errors.push(`${collectionName}:${question.id} has invalid type: ${question.type}`);
  }
  if (!curriculumTags.has(question.curriculumTag)) {
    errors.push(`${collectionName}:${question.id} has unknown curriculumTag: ${question.curriculumTag}`);
  }
  if (!Array.isArray(question.choices) || question.choices.length !== 4) {
    errors.push(`${collectionName}:${question.id} must have exactly 4 choices`);
  }
  if (question.type === 'box-multi' && (!Array.isArray(question.choiceGroups) || question.choiceGroups.length < 2)) {
    errors.push(`${collectionName}:${question.id} box-multi question needs choiceGroups`);
  }
  if (question.type === 'box-blank' && !question.boxContext) {
    errors.push(`${collectionName}:${question.id} box-blank question needs boxContext`);
  }

  if (!finalBank) return;

  const finalRequired = ['sourceExcerpt', 'sourceRef', 'explanation', 'wrongReasons', 'difficulty', 'curriculumPath'];
  for (const field of finalRequired) {
    if (question[field] === undefined || question[field] === null || question[field] === '') {
      errors.push(`${collectionName}:${question.id} is missing ${field}`);
    }
  }
  if (!Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex > 3) {
    errors.push(`${collectionName}:${question.id} answerIndex must be 0..3`);
  }
  if (!Array.isArray(question.wrongReasons) || question.wrongReasons.length !== question.choices.length) {
    errors.push(`${collectionName}:${question.id} wrongReasons must match choices length`);
  }
  if (!allowedDifficulty.has(question.difficulty)) {
    errors.push(`${collectionName}:${question.id} has invalid difficulty: ${question.difficulty}`);
  }
  if (question.subject !== 1 && question.subject !== 2) {
    errors.push(`${collectionName}:${question.id} final 1·2 subject bank cannot include subject ${question.subject}`);
  }
};

for (const question of exampleQuestions) {
  validateCommonQuestion(question, 'exampleQuestions');
}

const questionIds = new Set();
for (const question of questions) {
  if (questionIds.has(question.id)) errors.push(`questions.v2 duplicate id: ${question.id}`);
  questionIds.add(question.id);
  validateCommonQuestion(question, 'questions.v2', true);
}

const finalTypes = new Set(questions.map((question) => question.type));
for (const type of allowedQuestionTypes) {
  if (!finalTypes.has(type)) {
    errors.push(`questions.v2 is missing type: ${type}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(
  `Data OK: ${curriculumTags.size} curriculum tags, ${exampleQuestions.length} examples, ` +
  `${questions.length} final questions, ${finalTypes.size} final question types`,
);
