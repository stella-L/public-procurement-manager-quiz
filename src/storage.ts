import type { Question } from './data/studyData';

export type Attempt = {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
  at: string;
};

export type StudyState = {
  attempts: Attempt[];
  wrongQuestionIds: string[];
  starredQuestionIds: string[];
  completedSets: number;
};

const KEY = 'ppm-subject1-study-state';

export const defaultState: StudyState = {
  attempts: [],
  wrongQuestionIds: [],
  starredQuestionIds: [],
  completedSets: 0,
};

export const loadState = (): StudyState => {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
  } catch {
    return defaultState;
  }
};

export const saveState = (state: StudyState) => {
  window.localStorage.setItem(KEY, JSON.stringify(state));
};

export const recordAttempt = (
  state: StudyState,
  question: Question,
  selectedIndex: number,
): StudyState => {
  const correct = selectedIndex === question.answerIndex;
  const wrongQuestionIds = correct
    ? state.wrongQuestionIds.filter((id) => id !== question.id)
    : Array.from(new Set([...state.wrongQuestionIds, question.id]));

  return {
    ...state,
    attempts: [
      ...state.attempts,
      {
        questionId: question.id,
        selectedIndex,
        correct,
        at: new Date().toISOString(),
      },
    ],
    wrongQuestionIds,
  };
};

export const toggleStar = (state: StudyState, questionId: string): StudyState => {
  const has = state.starredQuestionIds.includes(questionId);
  return {
    ...state,
    starredQuestionIds: has
      ? state.starredQuestionIds.filter((id) => id !== questionId)
      : [...state.starredQuestionIds, questionId],
  };
};

export const getStats = (state: StudyState) => {
  const total = state.attempts.length;
  const correct = state.attempts.filter((attempt) => attempt.correct).length;
  return {
    total,
    correct,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    wrong: state.wrongQuestionIds.length,
    starred: state.starredQuestionIds.length,
  };
};
