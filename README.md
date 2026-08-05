# 공공조달관리사 1과목 CBT 퀴즈

2026년 공공조달관리사 필기 CBT 대비용 모바일 웹앱입니다. 출퇴근길에 짧게 풀 수 있도록 1과목 `공공조달과 법제도 이해`를 먼저 구현했습니다.

## 배포

- GitHub Pages: https://stella-l.github.io/public-procurement-manager-quiz/
- Repository: https://github.com/stella-L/public-procurement-manager-quiz

## 구현 기능

- 1과목 문제은행 90문항
- 5문항 집중 세트, 10문항 빠른퀴즈, 30문항 실전 모드
- 진입할 때마다 문제 순서와 4지선다 보기 순서 랜덤화
- 문제별 정답 해설, 오답별 틀린 이유, 핵심 용어 풀이
- ADHD 친화형 학습 흐름: 한 문제씩 보기, 짧은 세트, 단계형 해설, 진행률 표시
- 오답노트와 헷갈림 저장
- 오답/헷갈림 문제만 모아 보는 Anki 카드 모드
- 전체 Anki 덱 240장 다운로드
- 앱 카드 화면은 앞면만 먼저 보여주고, 탭하면 뒷면 표시
- 카드 화면 진입 시마다 카드 순서 랜덤화
- 내 오답 Anki TSV 다운로드
- 학습 기록은 브라우저 `localStorage`에 저장

## Anki 파일

- 전체 덱 APKG: `public/anki/ppm_subject1.apkg`
- 전체 덱 TSV: `public/anki/ppm_subject1.tsv`
- 오답 TSV는 앱의 `오답` 또는 `자료` 화면에서 현재 학습 기록 기준으로 생성됩니다.

## 개발 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm run validate:data
npm run build
```

## 자료 기준

- Q-net 공공조달관리사 종목 상세정보
- Q-net 2026년 신설 종목 공공조달관리사 필기시험 예제문제 안내
- 조달청 공공조달역량개발원 국가기술자격 시험공고 안내
- `docs/공식책/공공조달의 이해.pdf`
- `docs/올인원_공공조달관리사_분할/1과목-*.pdf`

PDF 원본은 저장소에 포함하지 않도록 `docs/`를 git 추적에서 제외했습니다.
