import curriculum from './curriculum.json';
import rawQuestions from './questions.v2.json';

export type QuestionType = 'negative' | 'concept-diff' | 'numeric' | 'box-multi' | 'box-blank' | 'positive';

export type Difficulty = '기초' | '중요' | '함정';

export type Question = {
  id: string;
  subject: 1 | 2 | 3;
  subjectName: string;
  curriculumTag: string;
  curriculumPath: {
    major: string;
    sub: string;
    detail: string;
  };
  type: QuestionType;
  prompt: string;
  boxContext?: string;
  choiceGroups?: string[];
  choices: string[];
  answerIndex: number;
  sourceExcerpt: string;
  sourceRef: string;
  explanation: string;
  wrongReasons: string[];
  difficulty: Difficulty;
};

export type Flashcard = {
  id: string;
  questionId: string;
  front: string;
  back: string;
  tags: string[];
  subject: 1 | 2 | 3;
};

type CurriculumDetail = {
  id: string;
  number: number;
  title: string;
};

type CurriculumSubItem = {
  id: string;
  number: number;
  title: string;
  detailItems: CurriculumDetail[];
};

type CurriculumMajorItem = {
  id: string;
  number: number;
  title: string;
  subItems: CurriculumSubItem[];
};

type CurriculumSubject = {
  id: string;
  subject: 1 | 2 | 3;
  name: string;
  questionCount: number;
  majorItems: CurriculumMajorItem[];
};

const questionList = rawQuestions as Question[];
const curriculumSubjects = curriculum.subjects as CurriculumSubject[];

export const typeLabels: Record<QuestionType, string> = {
  negative: '부정형',
  'concept-diff': '개념 구별',
  numeric: '숫자 암기',
  'box-multi': '박스 다중선택',
  'box-blank': '박스 빈칸',
  positive: '기본형',
};

export const questions = questionList;

const answerMarks = ['①', '②', '③', '④'];
const groupMarks = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ'];

const questionFront = (question: Question) => {
  const parts = [`[${typeLabels[question.type]}] ${question.prompt}`];
  if (question.boxContext) {
    parts.push(question.boxContext.replace(/\n/g, '<br>'));
  }
  if (question.choiceGroups) {
    parts.push(question.choiceGroups.map((group, index) => `${groupMarks[index]}. ${group}`).join('<br>'));
  }
  parts.push(question.choices.map((choice, index) => `${answerMarks[index]} ${choice}`).join('<br>'));
  return parts.join('<br><br>');
};

export const flashcards: Flashcard[] = questions.flatMap((question) => [
  {
    id: `${question.id}-concept`,
    questionId: question.id,
    front: `[핵심개념] ${question.curriculumPath.detail}`,
    back: `<strong>출제 포인트</strong>: ${question.sourceExcerpt}<br><br><strong>문제 연결</strong>: ${question.explanation}<br><strong>출처</strong>: ${question.sourceRef}`,
    tags: [`subject_${question.subject}`, question.curriculumTag, question.type, 'concept'],
    subject: question.subject,
  },
  {
    id: `${question.id}-source`,
    questionId: question.id,
    front: questionFront(question),
    back: `<strong>정답</strong>: ${answerMarks[question.answerIndex]} ${question.choices[question.answerIndex]}<br><br>${question.explanation}<br><br><strong>근거</strong>: ${question.sourceExcerpt}<br><strong>출처</strong>: ${question.sourceRef}`,
    tags: [`subject_${question.subject}`, question.curriculumTag, question.type, 'source'],
    subject: question.subject,
  },
  {
    id: `${question.id}-trap`,
    questionId: question.id,
    front: `${question.curriculumPath.detail}에서 조심할 선택지는?`,
    back: question.wrongReasons
      .map((reason, index) => `${index + 1}. ${question.choices[index]} - ${reason}`)
      .join('<br>'),
    tags: [`subject_${question.subject}`, question.curriculumTag, question.type, 'trap'],
    subject: question.subject,
  },
]);

export const chapters = curriculumSubjects
  .filter((subject) => subject.subject === 1 || subject.subject === 2)
  .map((subject) => ({
    chapter: subject.subject,
    title: `${subject.subject}과목 ${subject.name}`,
    count: questions.filter((question) => question.subject === subject.subject).length,
    officialQuestionCount: subject.questionCount,
  }));

export const examInfo = {
  subject: '1·2과목 공공조달관리사 문제은행',
  officialQuestionCount: 50,
  bankQuestionCount: questions.length,
  flashcardCount: flashcards.length,
  examDate: '2026-10-03',
  writtenExam: '객관식 CBT 80문항 120분',
  subjectDistribution: '1과목 30문항, 2과목 20문항, 3과목 30문항',
  passingRule: '필기 과목당 40점 이상, 전 과목 평균 60점 이상',
  criteriaPeriod: '2026.3.1 ~ 2028.12.31',
  sources: [
    'docs/(공개용)공공조달관리사 수험자용 예제문제.pdf',
    'docs/출제기준_필기.pdf',
    'docs/공식책/공공조달의 이해.pdf',
    'docs/공식책/공공조달 계획분석.pdf',
  ],
};

const seededRandom = (seed: number) => {
  let value = seed || Date.now();
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffleWithSeed = <T,>(items: T[], seed: number) => {
  const random = seededRandom(seed);
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

export type SubjectFilter = 'all' | 1 | 2;

export const filterBySubject = (items: Question[], subject: SubjectFilter) =>
  subject === 'all' ? items : items.filter((question) => question.subject === subject);

export const filterCardsBySubject = (items: Flashcard[], subject: SubjectFilter) =>
  subject === 'all' ? items : items.filter((card) => card.subject === subject);

/** 과목 필터가 걸리면 실전 모드는 해당 과목의 공식 문항 수(1과목 30, 2과목 20)를 목표로 한다. */
const examCountFor = (subject: SubjectFilter) => (subject === 1 ? 30 : subject === 2 ? 20 : 50);

export const pickQuestions = (
  mode: 'focus5' | 'quick10' | 'exam30',
  seed = Date.now(),
  subject: SubjectFilter = 'all',
) => {
  const pool = filterBySubject(questions, subject);
  const count = mode === 'focus5' ? 5 : mode === 'quick10' ? 10 : examCountFor(subject);
  return shuffleWithSeed(pool, seed).slice(0, Math.min(count, pool.length));
};
