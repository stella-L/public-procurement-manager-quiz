import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlarmClock,
  BookOpenCheck,
  CircleHelp,
  Check,
  ChevronDown,
  Download,
  FileDown,
  Home,
  Layers,
  ListChecks,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import { chapters, examInfo, filterBySubject, filterCardsBySubject, flashcards, pickQuestions, questions, typeLabels, type Flashcard, type Question, type SubjectFilter } from './data/studyData';
import { getStats, loadState, recordAttempt, saveState, toggleStar, type StudyState } from './storage';
import './styles.css';

type View = 'home' | 'quiz' | 'summary' | 'wrong' | 'cards' | 'sources';
type QuizMode = 'focus5' | 'quick10' | 'exam30' | 'wrong';
type CardMode = 'all' | 'wrong';

const answerMarks = ['①', '②', '③', '④'];
const subjectOptions: { value: SubjectFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 1, label: '1과목' },
  { value: 2, label: '2과목' },
];
const subjectLabels: Record<string, string> = { all: '1·2과목', 1: '1과목', 2: '2과목' };
const groupMarks = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ'];

const randomInt = (max: number) => {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
};

const shuffle = <T,>(items: T[]) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

const randomizeChoices = (question: Question): Question => {
  const options = question.choices.map((choice, index) => ({
    choice,
    reason: question.wrongReasons[index],
    isAnswer: index === question.answerIndex,
  }));
  const shuffled = shuffle(options);
  return {
    ...question,
    choices: shuffled.map((option) => option.choice),
    wrongReasons: shuffled.map((option) => option.reason),
    answerIndex: shuffled.findIndex((option) => option.isAnswer),
  };
};

const App = () => {
  const [state, setState] = useState<StudyState>(() => loadState());
  const [view, setView] = useState<View>('home');
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [quizMode, setQuizMode] = useState<QuizMode>('focus5');
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>('all');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showDeep, setShowDeep] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [cardMode, setCardMode] = useState<CardMode>('all');
  const [cardDeck, setCardDeck] = useState<Flashcard[]>([]);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [sessionResults, setSessionResults] = useState<boolean[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const stats = getStats(state);

  const wrongQuestions = useMemo(
    () => filterBySubject(
      questions.filter((question) => state.wrongQuestionIds.includes(question.id)),
      subjectFilter,
    ),
    [state.wrongQuestionIds, subjectFilter],
  );

  const subjectQuestions = useMemo(() => filterBySubject(questions, subjectFilter), [subjectFilter]);
  const subjectCards = useMemo(() => filterCardsBySubject(flashcards, subjectFilter), [subjectFilter]);
  const starredQuestions = useMemo(
    () => filterBySubject(
      questions.filter((question) => state.starredQuestionIds.includes(question.id)),
      subjectFilter,
    ),
    [state.starredQuestionIds, subjectFilter],
  );

  const updateState = (next: StudyState) => {
    setState(next);
    saveState(next);
  };

  const startQuiz = (mode: QuizMode, subject: SubjectFilter = subjectFilter) => {
    const nextQuiz = mode === 'wrong'
      ? shuffle(filterBySubject(questions.filter((question) => state.wrongQuestionIds.includes(question.id)), subject)).slice(0, 30)
      : pickQuestions(mode, Date.now(), subject);
    if (!nextQuiz.length) return;
    setQuiz(nextQuiz.map(randomizeChoices));
    setQuizMode(mode);
    setIndex(0);
    setSelected(null);
    setShowDeep(false);
    setSessionResults([]);
    setElapsed(0);
    setView('quiz');
  };

  const submitAnswer = (choiceIndex: number) => {
    if (selected !== null) return;
    const correct = choiceIndex === quiz[index].answerIndex;
    setSelected(choiceIndex);
    setSessionResults((currentResults) => {
      const next = [...currentResults];
      next[index] = correct;
      return next;
    });
    updateState(recordAttempt(state, quiz[index], choiceIndex));
  };

  const nextQuestion = () => {
    if (index + 1 >= quiz.length) {
      updateState({ ...loadState(), completedSets: loadState().completedSets + 1 });
      setView('summary');
      setSelected(null);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setShowDeep(false);
  };

  const changeSubject = (subject: SubjectFilter) => {
    setSubjectFilter(subject);
    if (view === 'quiz') startQuiz(quizMode, subject);
    if (view === 'cards') openCards(cardMode, subject);
  };

  const subjectLabel = subjectLabels[String(subjectFilter)];
  const ankiFilePrefix = subjectFilter === 1 ? 'ppm_subject1' : subjectFilter === 2 ? 'ppm_subject2' : 'ppm_subject1_2';
  const examTargetCount = subjectFilter === 1 ? 30 : subjectFilter === 2 ? 20 : 50;
  const current = quiz[index];
  const sessionCorrect = sessionResults.filter(Boolean).length;
  const sessionAccuracy = sessionResults.length ? Math.round((sessionCorrect / sessionResults.length) * 100) : 0;
  const visibleCards = cardDeck;
  const currentCard = visibleCards[cardIndex % Math.max(visibleCards.length, 1)];

  useEffect(() => {
    if (view !== 'quiz' || quizMode !== 'exam30') return undefined;
    const timer = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [view, quizMode]);

  const getReviewQuestionIds = (subject: SubjectFilter) => {
    const reviewQuestions = filterBySubject(
      questions.filter((question) => (
        state.wrongQuestionIds.includes(question.id)
        || state.starredQuestionIds.includes(question.id)
      )),
      subject,
    );
    return new Set(reviewQuestions.map((question) => question.id));
  };

  const getCardsFor = (mode: CardMode, subject: SubjectFilter) => {
    const pool = filterCardsBySubject(flashcards, subject);
    return mode === 'wrong'
      ? pool.filter((card) => getReviewQuestionIds(subject).has(card.questionId))
      : pool;
  };

  const openCards = (mode: CardMode = 'all', subject: SubjectFilter = subjectFilter) => {
    const baseCards = getCardsFor(mode, subject);
    setCardMode(mode);
    setCardIndex(0);
    setCardDeck(shuffle(baseCards));
    setCardRevealed(false);
    setView('cards');
  };

  const nextCard = () => {
    if (!visibleCards.length) return;
    setCardIndex((currentIndex) => (currentIndex + 1) % visibleCards.length);
    setCardRevealed(false);
  };

  const previousCard = () => {
    if (!visibleCards.length) return;
    setCardIndex((currentIndex) => Math.max(0, currentIndex - 1));
    setCardRevealed(false);
  };

  const downloadWrongAnki = () => {
    const targets = subjectQuestions.filter(
      (question) => state.wrongQuestionIds.includes(question.id) || state.starredQuestionIds.includes(question.id),
    );
    const rows = [
      ['Front', 'Back', 'Tags'],
      ...targets.map((question) => [
        question.prompt,
        `${question.explanation}<br><br>근거: ${question.sourceExcerpt}<br><br>출처: ${question.sourceRef}`,
        [`subject_${question.subject}`, question.curriculumTag, question.type, 'wrong_review'].join(' '),
      ]),
    ];
    const tsv = rows.map((row) => row.map((cell) => String(cell).replace(/\t/g, ' ').replace(/\n/g, '<br>')).join('\t')).join('\n');
    const url = URL.createObjectURL(new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${ankiFilePrefix}_wrong_review.tsv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const rest = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${rest}`;
  };

  return (
    <main>
      <header className="appHeader">
        <div>
          <p className="eyebrow">2026 공공조달관리사 CBT</p>
          <h1>1·2과목 집중 퀴즈</h1>
        </div>
        <button className="iconButton" title="처음으로" onClick={() => setView('home')}>
          <BookOpenCheck size={20} />
        </button>
      </header>

      {view === 'home' && (
        <section className="home">
          <div className="examStrip">
            <div>
              <strong>{examInfo.subject}</strong>
              <span>{examInfo.subjectDistribution}</span>
            </div>
            <div>
              <strong>{examInfo.officialQuestionCount}문항</strong>
              <span>실전 과목 모드</span>
            </div>
            <div>
              <strong>{examInfo.passingRule}</strong>
              <span>Q-net 기준</span>
            </div>
          </div>

          <section className="statsGrid" aria-label="학습 현황">
            <Metric label="오늘 풀이" value={`${stats.total}문항`} />
            <Metric label="정답률" value={`${stats.accuracy}%`} />
            <Metric label="오답노트" value={`${stats.wrong}개`} />
            <Metric label="완료 세트" value={`${state.completedSets}회`} />
          </section>

          <SubjectPicker value={subjectFilter} onChange={changeSubject} countOf={(subject) => `${filterBySubject(questions, subject).length}문항`} />

          <section className="actions">
            <ActionButton icon={<Sparkles />} title="5문항 집중 세트" text={`${subjectLabel} · 짧게 시작`} onClick={() => startQuiz('focus5')} disabled={!subjectQuestions.length} />
            <ActionButton icon={<ListChecks />} title="10문항 빠른퀴즈" text={`${subjectLabel} · 흐름 유지용`} onClick={() => startQuiz('quick10')} disabled={!subjectQuestions.length} />
            <ActionButton icon={<AlarmClock />} title={`${subjectLabel} 실전 ${examTargetCount}문항`} text="CBT 과목 문항 수 맞춤" onClick={() => startQuiz('exam30')} disabled={!subjectQuestions.length} />
            <ActionButton icon={<RotateCcw />} title="오답만 다시풀기" text={`${subjectLabel} ${wrongQuestions.length}문항 대기`} onClick={() => startQuiz('wrong')} disabled={!wrongQuestions.length} />
            <ActionButton icon={<Layers />} title="Anki 플래시카드" text={`${subjectLabel} ${subjectCards.length}장`} onClick={() => openCards('all')} disabled={!subjectCards.length} />
            <ActionButton icon={<Download />} title="자료와 내보내기" text="Anki TSV/APKG" onClick={() => setView('sources')} />
          </section>

          <section className="chapterList">
            <h2>1·2과목 범위</h2>
            {chapters.map((chapter) => (
              <div className="chapterRow" key={chapter.chapter}>
                <span>{chapter.chapter}과목</span>
                <strong>{chapter.title}</strong>
                <em>{chapter.count}/{chapter.officialQuestionCount}문항</em>
              </div>
            ))}
          </section>
        </section>
      )}

      {view === 'quiz' && current && (
        <section className="quizScreen">
          <div className="quizTop">
            <span>{subjectLabel} · {quizMode === 'exam30' ? `실전 ${quiz.length}문항` : quizMode === 'wrong' ? '오답 복습' : '집중 세트'}</span>
            <strong>{quizMode === 'exam30' ? `${formatTime(elapsed)} · ` : ''}{index + 1} / {quiz.length}</strong>
          </div>
          <div className="progressTrack" aria-label="문제 진행률">
            <span style={{ width: `${((index + 1) / quiz.length) * 100}%` }} />
          </div>
          <SubjectPicker
            value={subjectFilter}
            onChange={changeSubject}
            countOf={(subject) => `${filterBySubject(questions, subject).length}문항`}
            note="범위를 바꾸면 현재 세트를 새로 뽑습니다"
            compact
          />
          <div className="focusHint">
            <CircleHelp size={18} />
            <span>문제와 보기 순서는 매번 섞입니다. 먼저 틀린 이유가 보이는 선택지부터 지우세요.</span>
          </div>
          <article className="questionPanel">
            <p className="source">
              <span className="typeTag">{typeLabels[current.type]}</span>
              {current.curriculumPath.major} &gt; {current.curriculumPath.detail}
            </p>
            <h2>{current.prompt}</h2>
            {current.boxContext && <pre className="boxContext">{current.boxContext}</pre>}
            {current.choiceGroups && (
              <div className="choiceGroups">
                {current.choiceGroups.map((group, groupIndex) => (
                  <p key={group}><strong>{groupMarks[groupIndex]}.</strong> {group}</p>
                ))}
              </div>
            )}
            <div className="choices">
              {current.choices.map((choice, choiceIndex) => {
                const isAnswer = choiceIndex === current.answerIndex;
                const isSelected = selected === choiceIndex;
                const status = selected === null ? '' : isAnswer ? 'correct' : isSelected ? 'wrong' : 'muted';
                return (
                  <button className={`choice ${status}`} key={choice} onClick={() => submitAnswer(choiceIndex)}>
                    <span>{answerMarks[choiceIndex]}</span>
                    <strong>{choice}</strong>
                    {selected !== null && isAnswer && <Check size={18} />}
                    {selected !== null && isSelected && !isAnswer && <X size={18} />}
                  </button>
                );
              })}
            </div>
          </article>

          {selected !== null && (
            <article className="explain">
              <div className={selected === current.answerIndex ? 'result good' : 'result bad'}>
                {selected === current.answerIndex ? '정답' : '오답'}
              </div>
              <h3>정답 {answerMarks[current.answerIndex]} {current.choices[current.answerIndex]}</h3>
              <p>{current.explanation}</p>
              <button className="foldButton" onClick={() => setShowDeep(!showDeep)}>
                자세한 해설 <ChevronDown size={18} />
              </button>
              {showDeep && (
                <div className="deep">
                  <ul>
                    {current.wrongReasons.map((reason, reasonIndex) => (
                      <li key={reason}>{answerMarks[reasonIndex]}. {reason}</li>
                    ))}
                  </ul>
                  <div className="terms">
                    <span><strong>근거</strong>{current.sourceExcerpt}</span>
                    <span><strong>출처</strong>{current.sourceRef}</span>
                    <span><strong>난이도</strong>{current.difficulty}</span>
                  </div>
                </div>
              )}
              <div className="quizActions">
                <button className="ghostButton" onClick={() => updateState(toggleStar(state, current.id))}>
                  <Star size={18} /> {state.starredQuestionIds.includes(current.id) ? '헷갈림 해제' : '헷갈림 저장'}
                </button>
                <button className="primaryButton" onClick={nextQuestion}>
                  {index + 1 >= quiz.length ? '세트 끝내기' : '다음 문제'}
                </button>
              </div>
            </article>
          )}
        </section>
      )}

      {view === 'summary' && (
        <section className="summaryView">
          <article className="summaryHero">
            <Trophy size={28} />
            <p className="eyebrow">{quizMode === 'exam30' ? '1과목 실전 모드 완료' : '집중 세트 완료'}</p>
            <h2>{sessionCorrect} / {sessionResults.length} 정답</h2>
            <strong>{sessionAccuracy}%</strong>
          </article>
          <div className="summaryGrid">
            <button onClick={() => startQuiz(quizMode)} className="summaryAction">
              <RotateCcw size={20} />
              <strong>같은 모드 한 번 더</strong>
              <span>흐름이 남아 있을 때 반복</span>
            </button>
            <button onClick={() => startQuiz('wrong')} className="summaryAction" disabled={!wrongQuestions.length}>
              <X size={20} />
              <strong>방금 틀린 개념 복습</strong>
              <span>{wrongQuestions.length}문항 대기</span>
            </button>
            <button onClick={() => openCards('all')} className="summaryAction">
              <Layers size={20} />
              <strong>카드로 가볍게 전환</strong>
              <span>문제 풀이 피로 줄이기</span>
            </button>
            <button onClick={() => setView('home')} className="summaryAction">
              <Home size={20} />
              <strong>오늘은 여기까지</strong>
              <span>기록은 자동 저장됨</span>
            </button>
          </div>
        </section>
      )}

      {view === 'wrong' && (
        <section className="listView">
          <h2>오답노트</h2>
          <SubjectPicker
            value={subjectFilter}
            onChange={changeSubject}
            countOf={(subject) => `${filterBySubject(
              questions.filter((question) => (
                state.wrongQuestionIds.includes(question.id)
                || state.starredQuestionIds.includes(question.id)
              )),
              subject,
            ).length}문항`}
            compact
          />
          {!wrongQuestions.length && !starredQuestions.length && (
            <EmptyState
              title="아직 쌓인 오답이 없습니다"
              text={`${subjectLabel}에서 5문항 집중 세트를 풀면 틀린 문제와 헷갈림 표시가 자동으로 모입니다.`}
              action="집중 세트 시작"
              onClick={() => startQuiz('focus5')}
            />
          )}
          {!!wrongQuestions.length && (
            <>
              <p className="sectionLead">틀린 문제는 맞히면 자동으로 오답노트에서 빠집니다. Anki용 오답 TSV도 바로 만들 수 있습니다.</p>
              <div className="inlineActions">
                <button className="ghostButton" onClick={downloadWrongAnki}>
                  <Download size={18} /> 오답 Anki TSV
                </button>
                <button className="ghostButton" onClick={() => openCards('wrong')}>
                  <Layers size={18} /> 오답 카드 보기
                </button>
              </div>
              {wrongQuestions.map((question) => (
                <QuestionListItem question={question} key={question.id} onClick={() => {
                  setQuiz([randomizeChoices(question)]);
                  setQuizMode('wrong');
                  setIndex(0);
                  setSelected(null);
                  setSessionResults([]);
                  setView('quiz');
                }} />
              ))}
            </>
          )}
          {!!starredQuestions.length && (
            <>
              <h3 className="subhead">헷갈림 저장</h3>
              {starredQuestions.map((question) => (
                <QuestionListItem question={question} key={question.id} onClick={() => {
                  setQuiz([randomizeChoices(question)]);
                  setQuizMode('wrong');
                  setIndex(0);
                  setSelected(null);
                  setSessionResults([]);
                  setView('quiz');
                }} />
              ))}
            </>
          )}
        </section>
      )}

      {view === 'cards' && (
        <section className="cardView">
          <div className="quizTop">
            <span>{cardMode === 'wrong' ? '오답 Anki 카드' : 'Anki 미리보기'}</span>
            <strong>{visibleCards.length ? cardIndex + 1 : 0} / {visibleCards.length}</strong>
          </div>
          <SubjectPicker
            value={subjectFilter}
            onChange={changeSubject}
            countOf={(subject) => `${getCardsFor(cardMode, subject).length}장`}
            compact
          />
          <div className="segmentControl">
            <button className={cardMode === 'all' ? 'active' : ''} onClick={() => openCards('all')}>전체 카드</button>
            <button className={cardMode === 'wrong' ? 'active' : ''} onClick={() => openCards('wrong')}>오답 카드</button>
          </div>
          {!visibleCards.length ? (
            <EmptyState
              title="오답 카드가 아직 없습니다"
              text="틀린 문제나 헷갈림 저장한 문제를 기준으로 오답 Anki 카드가 만들어집니다."
              action="5문항 풀기"
              onClick={() => startQuiz('focus5')}
            />
          ) : (
            <>
              <article className="flashcard">
                <button className={`cardFace ${cardRevealed ? 'revealed' : ''}`} onClick={() => setCardRevealed(!cardRevealed)}>
                  <span>{cardRevealed ? '뒷면' : '앞면'}</span>
                  {!cardRevealed ? (
                    <>
                      <h2 dangerouslySetInnerHTML={{ __html: currentCard.front }} />
                      <em>탭해서 뒷면 보기</em>
                    </>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: currentCard.back }} />
                  )}
                </button>
              </article>
              <div className="progressTrack cardProgress" aria-label="카드 진행률">
                <span style={{ width: `${((cardIndex + 1) / visibleCards.length) * 100}%` }} />
              </div>
              <div className="quizActions">
                <button className="ghostButton" onClick={previousCard}>이전</button>
                <button className="primaryButton" onClick={nextCard}>다음 카드</button>
              </div>
              {cardMode === 'wrong' && (
                <button className="downloadLink" onClick={downloadWrongAnki}>
                  <Download size={18} /> 현재 오답 Anki TSV 다운로드
                </button>
              )}
            </>
          )}
        </section>
      )}

      {view === 'sources' && (
        <section className="sourceView">
          <h2>자료와 내보내기</h2>
          <SubjectPicker
            value={subjectFilter}
            onChange={changeSubject}
            countOf={(subject) => `${filterCardsBySubject(flashcards, subject).length}장`}
            compact
          />
          <div className="exportIntro">
            <FileDown size={22} />
            <div>
              <strong>Anki에서는 APKG를 먼저 가져오세요.</strong>
              <span>TSV는 Anki 버전이나 기기에서 APKG 가져오기가 안 될 때 쓰는 예비 파일입니다.</span>
            </div>
          </div>
          <a className="downloadLink" href={`anki/${ankiFilePrefix}.tsv`} download>
            <Download size={18} /> {subjectLabel} Anki TSV 다운로드
          </a>
          <a className="downloadLink" href={`anki/${ankiFilePrefix}.apkg`} download>
            <Download size={18} /> {subjectLabel} Anki APKG 다운로드
          </a>
          <button className="downloadLink" onClick={downloadWrongAnki} disabled={!wrongQuestions.length && !starredQuestions.length}>
            <Download size={18} /> 내 오답 Anki TSV 다운로드
          </button>
          <div className="note">
            <strong>자료 기준</strong>
            {examInfo.sources.map((source) => <span key={source}>{source}</span>)}
          </div>
          <div className="note">
            <strong>시험 정보</strong>
            <span>{examInfo.writtenExam}</span>
            <span>시험일: {examInfo.examDate}</span>
            <span>출제기준 적용기간: {examInfo.criteriaPeriod}</span>
          </div>
        </section>
      )}

      <nav className="bottomNav">
        <button onClick={() => setView('home')} className={view === 'home' ? 'active' : ''}>홈</button>
        <button onClick={() => startQuiz('focus5')} className={view === 'quiz' ? 'active' : ''}>퀴즈</button>
        <button onClick={() => setView('wrong')} className={view === 'wrong' ? 'active' : ''}>오답</button>
        <button onClick={() => openCards('all')} className={view === 'cards' ? 'active' : ''}>카드</button>
        <button onClick={() => setView('sources')} className={view === 'sources' ? 'active' : ''}>자료</button>
      </nav>
    </main>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="metric">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const ActionButton = ({
  icon,
  title,
  text,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button className="actionButton" onClick={onClick} disabled={disabled}>
    <span className="actionIcon">{icon}</span>
    <strong>{title}</strong>
    <em>{text}</em>
  </button>
);

const SubjectPicker = ({
  value,
  onChange,
  countOf,
  note,
  compact,
}: {
  value: SubjectFilter;
  onChange: (subject: SubjectFilter) => void;
  countOf: (subject: SubjectFilter) => string;
  note?: string;
  compact?: boolean;
}) => (
  <section className={compact ? 'subjectPicker compact' : 'subjectPicker'} aria-label="출제 범위 선택">
    <span className="subjectPickerLabel">출제 범위{note ? ` · ${note}` : ''}</span>
    <div className="subjectTabs" role="group">
      {subjectOptions.map((option) => (
        <button
          key={String(option.value)}
          className={value === option.value ? 'subjectTab active' : 'subjectTab'}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          <strong>{option.label}</strong>
          <em>{countOf(option.value)}</em>
        </button>
      ))}
    </div>
  </section>
);

const QuestionListItem = ({ question, onClick }: { question: Question; onClick: () => void }) => (
  <button className="listItem" onClick={onClick}>
    <strong>{question.prompt}</strong>
    <span>{typeLabels[question.type]} · {question.curriculumPath.detail}</span>
  </button>
);

const EmptyState = ({
  title,
  text,
  action,
  onClick,
}: {
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) => (
  <article className="emptyState">
    <Sparkles size={24} />
    <h3>{title}</h3>
    <p>{text}</p>
    <button className="primaryButton" onClick={onClick}>{action}</button>
  </article>
);

createRoot(document.getElementById('root')!).render(<App />);
