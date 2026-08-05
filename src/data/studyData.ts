import concepts from './concepts.json';

export type Concept = {
  id: string;
  chapter: number;
  section: string;
  title: string;
  definition: string;
  easy: string;
  trap: string;
  source: string;
  tags: string[];
};

export type Question = {
  id: string;
  conceptId: string;
  chapter: number;
  section: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  conclusion: string;
  explanation: string;
  wrongReasons: string[];
  terms: { term: string; meaning: string }[];
  source: string;
  difficulty: '기초' | '중요' | '함정';
  tags: string[];
  adhdHint: string;
};

export type Flashcard = {
  id: string;
  conceptId: string;
  front: string;
  back: string;
  tags: string[];
  chapter: number;
};

const conceptList = concepts as Concept[];

const normalizeChoices = (items: string[]) => items.map((item) => item.replace(/\s+/g, ' ').trim());

const rotate = <T,>(items: T[], shift: number) => [...items.slice(shift), ...items.slice(0, shift)];

const makeQuestion = (
  concept: Concept,
  variant: 0 | 1 | 2,
  rawChoices: string[],
  rawAnswer: string,
  prompt: string,
  difficulty: Question['difficulty'],
): Question => {
  const ordered = rotate(normalizeChoices(rawChoices), (concept.chapter + variant) % rawChoices.length);
  const answerIndex = ordered.indexOf(rawAnswer);

  return {
    id: `${concept.id}-q${variant + 1}`,
    conceptId: concept.id,
    chapter: concept.chapter,
    section: concept.section,
    prompt,
    choices: ordered,
    answerIndex,
    conclusion: `${concept.title}: ${concept.easy}`,
    explanation: `${concept.definition} 시험에서는 ${concept.trap}`,
    wrongReasons: ordered.map((choice) =>
      choice === rawAnswer
        ? '정답 선택지입니다.'
        : `"${choice}"는 ${concept.title}의 핵심인 "${concept.easy}"와 맞지 않습니다.`,
    ),
    terms: [
      { term: concept.title, meaning: concept.easy },
      { term: concept.section, meaning: `${concept.source}에서 다루는 1과목 범위입니다.` },
    ],
    source: concept.source,
    difficulty,
    tags: concept.tags,
    adhdHint: `먼저 "${concept.title}"를 한 문장으로 떠올린 뒤 선택지를 지워보세요.`,
  };
};

export const questions: Question[] = conceptList.flatMap((concept) => {
  const answer = concept.definition;
  return [
    makeQuestion(
      concept,
      0,
      [
        answer,
        `${concept.title}은 기관 내부 편의를 위해 법령 절차를 생략하는 방식이다.`,
        `${concept.title}은 민간 구매와 동일하게 가격만 기준으로 결정하는 절차다.`,
        `${concept.title}은 조달청 단독 업무만을 의미하며 수요기관과 공급자는 포함하지 않는다.`,
      ],
      answer,
      `${concept.title}에 대한 설명으로 가장 적절한 것은?`,
      '기초',
    ),
    makeQuestion(
      concept,
      1,
      [
        concept.trap,
        `${concept.title}은 ${concept.source} 범위에서 다른 개념과 함께 비교해 보아야 한다.`,
        `${concept.title}은 공정성, 투명성, 법령 준수와 연결해 이해해야 한다.`,
        `${concept.title}은 실제 계약 절차나 정책 목적과 완전히 분리해서 외우면 된다.`,
      ],
      concept.trap,
      `${concept.title}에서 수험생이 가장 주의해야 할 함정은?`,
      '함정',
    ),
    makeQuestion(
      concept,
      2,
      [
        concept.easy,
        '담당자가 빠르게 처리하기 위해 근거 없이 절차를 줄이는 것이다.',
        '공공기관이 예산 집행 결과를 공개하지 않아도 되는 예외다.',
        '계약상대자에게 유리한 조건을 사후에 임의로 정하는 방식이다.',
      ],
      concept.easy,
      `다음 중 "${concept.title}"를 쉬운 말로 바르게 바꾼 것은?`,
      '중요',
    ),
  ];
});

const makeFlashcard = (
  concept: Concept,
  number: number,
  front: string,
  back: string,
  extraTag: string,
): Flashcard => ({
  id: `${concept.id}-f${number}`,
  conceptId: concept.id,
  front,
  back,
  tags: [...concept.tags, extraTag],
  chapter: concept.chapter,
});

export const flashcards: Flashcard[] = conceptList.flatMap((concept) => [
  makeFlashcard(
    concept,
    1,
    `${concept.title}이란?`,
    `${concept.definition}<br><br><strong>쉬운 말</strong>: ${concept.easy}<br><strong>출처</strong>: ${concept.source}`,
    'definition',
  ),
  makeFlashcard(
    concept,
    2,
    `${concept.title}에서 조심할 오답 함정은?`,
    `${concept.trap}<br><br><strong>복습 힌트</strong>: ${concept.easy}`,
    'trap',
  ),
  makeFlashcard(
    concept,
    3,
    `${concept.title}를 10초 안에 쉬운 말로 설명하면?`,
    `${concept.easy}<br><br><strong>시험 포인트</strong>: ${concept.definition}`,
    'adhd_short',
  ),
  makeFlashcard(
    concept,
    4,
    `${concept.source}의 핵심 키워드는?`,
    `<strong>${concept.title}</strong><br>${concept.section}<br>${concept.tags.join(', ')}`,
    'source_map',
  ),
  makeFlashcard(
    concept,
    5,
    `시험장에서 "${concept.title}"가 나오면 먼저 떠올릴 기준은?`,
    `<strong>판단 기준</strong>: ${concept.easy}<br><br><strong>왜 중요한가</strong>: ${concept.definition}`,
    'exam_trigger',
  ),
  makeFlashcard(
    concept,
    6,
    `다음 표현이 왜 위험할까?<br>"${concept.trap}"`,
    `<strong>위험한 이유</strong>: 이 표현은 ${concept.title}의 범위를 좁히거나 원칙과 예외를 섞을 수 있습니다.<br><br><strong>정리</strong>: ${concept.definition}`,
    'wrong_phrase',
  ),
  makeFlashcard(
    concept,
    7,
    `${concept.title}를 다른 개념과 헷갈리지 않으려면 어떤 단어에 표시할까?`,
    `<strong>표시할 단어</strong>: ${concept.title}<br><strong>연결 범위</strong>: ${concept.section}<br><strong>암기 문장</strong>: ${concept.easy}`,
    'keyword_anchor',
  ),
  makeFlashcard(
    concept,
    8,
    `${concept.title} 관련 문제에서 제거해야 할 선택지 패턴은?`,
    `<strong>제거 패턴</strong>: "항상", "오직", "가격만", "절차 생략", "조달청만"처럼 범위를 과도하게 단정하는 표현입니다.<br><br><strong>정답 방향</strong>: ${concept.easy}`,
    'choice_elimination',
  ),
]);

export const chapters = Array.from(new Set(conceptList.map((concept) => concept.chapter))).map((chapter) => ({
  chapter,
  title:
    {
      1: '공공조달 개요',
      2: '공공조달 원칙 및 방법',
      3: '전자조달시스템의 이해',
      4: '전략적 공공조달',
      5: '전략적 조달의 활용',
      6: '공공조달 법률 이해',
      7: '공공조달 분쟁관리',
    }[chapter] ?? `${chapter}장`,
  count: questions.filter((question) => question.chapter === chapter).length,
}));

export const examInfo = {
  subject: '1과목 공공조달과 법제도 이해',
  officialQuestionCount: 30,
  bankQuestionCount: questions.length,
  flashcardCount: flashcards.length,
  examDate: '2026-10-03',
  writtenExam: '객관식 CBT 80문항 120분',
  subjectDistribution: '1과목 30문항, 2과목 20문항, 3과목 30문항',
  passingRule: '필기 과목당 40점 이상, 전 과목 평균 60점 이상',
  criteriaPeriod: '2026.3.1 ~ 2028.12.31',
  sources: [
    'Q-net 공공조달관리사 종목 상세정보',
    'Q-net 2026년 신설 종목 공공조달관리사 필기시험 예제문제 안내',
    '조달청 공공조달역량개발원 국가기술자격 시험공고 안내',
    'docs/공식책/공공조달의 이해.pdf',
    'docs/올인원_공공조달관리사_분할/1과목-*.pdf',
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

export const pickQuestions = (mode: 'focus5' | 'quick10' | 'exam30', seed = Date.now()) => {
  const count = mode === 'focus5' ? 5 : mode === 'quick10' ? 10 : 30;
  const entropy = Math.floor(Math.random() * 1_000_000);
  const shuffled = shuffleWithSeed(questions, seed + entropy);
  return shuffled.slice(0, count);
};
