# 공공조달관리사 문제 재생성 파이프라인 (1·2과목)

> 원본 계획: `~/.claude/plans/https-github-com-virgiliojr94-book-to-sk-humble-wave.md`
> 작성일: 2026-08-30

## Context — 왜 이 작업을 하는가

현재 앱은 개념 30개를 3개의 고정 템플릿("설명 적절한 것" / "함정" / "쉬운 말")에 끼워 넣어 90문항을 자동 생성한다 (`src/data/studyData.ts:85-128`). 개념만 바뀔 뿐 문항 구조와 오답 문구가 모두 동일해 실제 시험 대비용으로 부적합하다.

두 개의 공식 PDF를 분석한 결과:

**출제기준 (`docs/출제기준_필기.pdf`, 18p) — 필기 총 80문항 (객관식 2시간)**
- 1과목 **공공조달과 법제도 이해** (30문항) — 주요항목 6개
- 2과목 **공공조달계획 수립 및 분석** (20문항) — 주요항목 3개
- 3과목 **공공계약관리** (30문항) — 주요항목 4개
- 문항 하나하나가 **"주요항목 → 세부항목 → 세세항목"의 3단계 트리에 정확히 매핑**되어야 함 (예제문제 PDF의 매핑표로 확인). 현재 앱은 개념 단위로만 tagging.

**공개 예제문제 (`docs/(공개용)공공조달관리사 수험자용 예제문제.pdf`, 4p, 6문항) — 실제 출제 유형**
1. **부정형** — "…거리가 먼 것", "…규정하고 있지 않은 것"
2. **개념 구별형** — 해제/해지/철회/취소 유사 용어 중 정의에 맞는 것
3. **숫자·기간 암기형** — "며칠 이내", "( )에 들어갈 금액"
4. **박스 지문 + 다중선택형** — ㄱ,ㄴ,ㄷ 중 해당하는 것 모두 (①ㄱ,ㄴ ②ㄱ,ㄷ ③ㄴ,ㄷ ④ㄱ,ㄴ,ㄷ)
5. **박스 지문 + 빈칸 채우기형** — 조문/규정 안의 ( ) 채우기

즉 현재 3개 템플릿으로는 실제 시험 유형 대부분을 커버 못 한다.

**해결 방향**: 강의 PDF를 [book-to-skill](https://github.com/virgiliojr94/book-to-skill) (Python CLI, PDF/DOCX → `SKILL.md` + `chapters/` + `glossary.md` 등 chunk 단위 knowledge base로 변환) 로 처리해 세세항목별 근거 chunk를 확보하고, 그 근거를 바탕으로 5가지 유형별 문제를 LLM 초안 + 수동 검수로 재생성한다.

## 사용자 확정 사항
- **재생성 범위**: 1·2과목 (총 50문항 대응). 3과목은 다음 단계.
- **book-to-skill 실행 환경**: **uv** — `brew install uv` 한 줄 설치, Python 버전까지 uv가 관리, `uv tool install`로 격리 CLI 사용. Node 프로젝트에 Python 도구를 붙일 때 가장 깔끔 (pipx 대비 캐시 성능·격리 관리 우수).
- **문제 생성 방식**: LLM으로 초안 자동 생성 → 사람이 오답 함정·법령 인용 정확성 최종 검수.
- **기존 90문항 처리**: `src/data/concepts.json` 및 `studyData.ts`의 템플릿 생성 로직 폐기, 새 스키마로 통째 교체.

## 파이프라인

```
[docs/*.pdf]
  ├─ 출제기준_필기.pdf ──────► curriculum.json (세세항목 트리 + tag ID)
  ├─ (공개용)예제문제.pdf ────► exampleQuestions.json + question_types.md
  └─ 강의/공식책 PDFs ────────► book-to-skill ─► skills/{subject-1,2}/
                                                       │
                                                       ▼
                                   mappings.json  (세세항목 ID ↔ chunk path)
                                                       │
                                                       ▼
                              scripts/generateQuestions.ts (LLM 초안)
                                                       │
                                                       ▼
                              questions.draft.json  ─► 사람 검수
                                                       │
                                                       ▼
                              src/data/questions.v2.json  ─► 앱 UI 렌더
```

## Phase A. 출제기준·예제 데이터화
- **신규** `src/data/curriculum.json` — 3과목 트리. 노드마다 tag ID 부여 (예: `S1.M2.SB4.D1` = 1과목-원칙및방법-비경쟁적방법-수의계약). 문항 tagging의 anchor.
- **신규** `src/data/exampleQuestions.json` — 예제 6문항 완전 필사 + 유형 tag + 세세항목 매핑 (예제 PDF 매핑표 그대로).
- **신규** `docs/question_types.md` — 5가지 유형별 프롬프트 스타일 / 오답 함정 패턴 / 박스 지문 렌더 규칙 정리. LLM 프롬프트와 UI 양쪽의 계약 문서.

## Phase B. book-to-skill 세팅 + 강의 자료 변환
- `brew install uv` (필요 시) → `uv tool install book-to-skill` 또는 저장소 지시대로 설치.
- 변환 대상 (우선순위):
  1. `docs/공식책/공공조달의 이해.pdf` → subject-1 근간
  2. `docs/올인원_공공조달관리사_분할/1과목-1~6장.pdf` → subject-1 보완
  3. `docs/공식책/공공조달 계획분석.pdf` → subject-2 근간
  4. `docs/2과목/*_이론+문제풀이_*.pdf` → subject-2 보완 (강의자료에 실제 예제 다수 포함 — 유형 학습에도 유용)
- **신규 디렉터리** `skills/subject-1/`, `skills/subject-2/` — book-to-skill 산출물 (`SKILL.md`, `chapters/`, `glossary.md`, `patterns.md`, `cheatsheet.md`).
- **신규** `skills/mappings.json` — 세세항목 ID ↔ chunk 경로 매핑 표. 초안은 chunk 제목·glossary 항목명으로 자동 매칭 후 사람이 확인.

## Phase C. 문제 생성 스크립트
- **신규** `scripts/generateQuestions.ts` (Node/TS, Anthropic SDK)
  - 입력: `curriculum.json` + `mappings.json` + `question_types.md` + 해당 chunk 본문
  - 세세항목당 유형 2~3개씩 초안 생성. 프롬프트 캐싱으로 chunk 본문·유형 카탈로그를 캐시.
  - 출력: `src/data/questions.draft.json` (사람 검수용)
- **신규** `scripts/validateQuestionsV2.ts` — 스키마·세세항목 매핑·유형별 필수 필드·`sourceRef` 존재 여부 검증. `npm run validate:data`에 연결.

## Phase D. 앱 스키마 확장
- **수정** `src/data/studyData.ts` — Question 타입 재정의:
  ```ts
  type QuestionType = 'negative' | 'concept-diff' | 'numeric' | 'box-multi' | 'box-blank' | 'positive';
  type Question = {
    id: string;
    subject: 1 | 2 | 3;
    curriculumTag: string;   // 세세항목 ID
    type: QuestionType;
    prompt: string;
    boxContext?: string;     // 박스 지문 (box-* 유형)
    choiceGroups?: string[]; // ㄱ,ㄴ,ㄷ 지문 (box-multi)
    choices: string[];
    answerIndex: number;
    sourceExcerpt: string;   // 근거 인용
    sourceRef: string;       // 예: skills/subject-1/chapters/03-원칙.md#수의계약
    explanation: string;
    wrongReasons: string[];
    difficulty: '기초' | '중요' | '함정';
  };
  ```
- **삭제** `src/data/concepts.json` 폐기, `studyData.ts`의 `makeQuestion`/`makeFlashcard`/`flatMap` 템플릿 로직 삭제.
- **유지** `studyData.ts:238-263` — `seededRandom` / `shuffleWithSeed` / `pickQuestions` 는 모드 로직이므로 그대로 재사용.
- **유지** `studyData.ts:219-236` — `examInfo` 상수 값만 갱신 (`bankQuestionCount` 등).
- **신규** `src/data/questions.v2.json` — 검수 완료된 최종 문제은행.
- **재정의** Flashcard 생성: 개념 단위 8종 템플릿(`studyData.ts:145-202`) 대신 세세항목 단위 정의/함정 카드 자동 생성.

## Phase E. UI 반영
- **수정** `src/main.tsx` (및 관련 컴포넌트) — 다음 렌더 지원:
  - 박스 지문 (`boxContext`) 인용 블록
  - 다중선택 지문 (ㄱ,ㄴ,ㄷ + 조합 선택지)
  - 세세항목 tag 기반 필터·모드 화면
- **수정** 과목 선택 UI: 1과목 단독 → 1·2과목 선택 (2과목 20문항 반영).
- README·`examInfo` 문구 갱신.

## Phase F. 검증
- `npm run validate:data` — 새 스키마·매핑·필드 검증 통과.
- `npm run build` 성공.
- `npm run dev` 후 브라우저에서 **5가지 유형별 각 1문항 이상 렌더 확인**, 특히:
  - 박스 지문 줄바꿈·인용 스타일
  - 다중선택 ㄱ,ㄴ,ㄷ 그룹과 ①~④ 선택지 정렬
- 예제문제 6문항을 앱에 임시 주입해 실제 시험 PDF 레이아웃과 시각 비교.

## 재사용할 기존 자산
- `src/data/studyData.ts:238-263` — 셔플/픽 로직 그대로
- `src/data/studyData.ts:219-236` — `examInfo` 상수 (값만 갱신)
- `scripts/` 및 `npm run validate:data` 워크플로우 (스크립트 본문만 교체)
- `src/styles.css` 카드/버튼 스타일 — 박스 지문·다중선택 추가 스타일만 확장

## 착수 순서
1. **Phase A** (curriculum + 예제 데이터화) — 이후 모든 단계의 근거이므로 최우선.
2. **Phase B** (book-to-skill 세팅·변환) — A와 병행 가능.
3. **Phase D 스키마 → Phase C 스크립트 → Phase E UI → Phase F 검증** 순차.

## 열린 이슈 (실행 중 결정)
- book-to-skill이 강의 PDF의 표·다단 레이아웃을 얼마나 잘 chunk화 하는지는 실제 변환해 봐야 확인 가능 → Phase B 초입에 sample 1건으로 품질 확인 후 진행.
- 2과목 강의 PDF는 파일명에 한글 자모 깨짐(`_1ᄌ`)이 있어 파일명 정규화 필요할 수 있음.
- LLM 문제 생성 비용 — 세세항목 수(수백 개) × 유형 2~3개 초안 비용을 Phase A 완료 시점에 산정, 필요 시 배치 API·캐싱 전략 조정.
