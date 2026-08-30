import csv
import hashlib
import json
import pathlib
import re
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
QUESTIONS = ROOT / "src" / "data" / "questions.v2.json"
OUT_DIR = ROOT / "public" / "anki"

# (파일 접두사, 덱 이름, 과목 필터 — None이면 전체, genanki 덱 ID)
DECKS = [
    ("ppm_subject1_2", "공공조달관리사::1·2과목 문제은행", None, 1723945122),
    ("ppm_subject1", "공공조달관리사::1과목 공공조달과 법제도 이해", 1, 1723945123),
    ("ppm_subject2", "공공조달관리사::2과목 공공조달계획 수립 및 분석", 2, 1723945124),
]

TYPE_LABELS = {
    "negative": "부정형",
    "concept-diff": "개념 구별",
    "numeric": "숫자 암기",
    "box-multi": "박스 다중선택",
    "box-blank": "박스 빈칸",
    "positive": "기본형",
}

ANSWER_MARKS = ["①", "②", "③", "④"]


def clean_html(value):
    return re.sub(r"\s+", " ", value).strip()


def tags_for(question, extra):
    tags = [
        f"subject_{question['subject']}",
        question["curriculumTag"],
        question["type"],
        extra,
    ]
    return " ".join(dict.fromkeys(tag.replace(" ", "_") for tag in tags))


def question_body(question):
    """문제 지문 전체(박스 지문·ㄱㄴㄷ 보기 포함)를 HTML로 조립한다."""
    parts = [f"[{TYPE_LABELS[question['type']]}] {question['prompt']}"]
    if question.get("boxContext"):
        box = question["boxContext"].replace("\n", "<br>")
        parts.append(f"<div style='border-left:3px solid #6f8f73;padding-left:10px'>{box}</div>")
    if question.get("choiceGroups"):
        groups = "<br>".join(
            f"{mark}. {text}"
            for mark, text in zip(["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ"], question["choiceGroups"])
        )
        parts.append(groups)
    choices = "<br>".join(
        f"{ANSWER_MARKS[index]} {choice}" for index, choice in enumerate(question["choices"])
    )
    parts.append(choices)
    return "<br><br>".join(parts)


def make_cards(questions):
    """앱의 studyData.ts flashcards와 동일하게 문항당 핵심개념 + 문제풀이 + 함정 카드 3장을 만든다."""
    cards = []
    for question in questions:
        answer = question["choices"][question["answerIndex"]]
        cards.append(
            (
                f"[핵심개념] {question['curriculumPath']['detail']}",
                (
                    f"<b>출제 포인트</b>: {question['sourceExcerpt']}"
                    f"<br><br><b>문제 연결</b>: {question['explanation']}"
                    f"<br><b>출처</b>: {question['sourceRef']}"
                ),
                tags_for(question, "concept"),
            )
        )
        cards.append(
            (
                question_body(question),
                (
                    f"<b>정답</b>: {ANSWER_MARKS[question['answerIndex']]} {answer}"
                    f"<br><br>{question['explanation']}"
                    f"<br><br><b>근거</b>: {question['sourceExcerpt']}"
                    f"<br><b>출처</b>: {question['sourceRef']}"
                ),
                tags_for(question, "source"),
            )
        )
        reasons = "<br>".join(
            f"{ANSWER_MARKS[index]} {choice} — {reason}"
            for index, (choice, reason) in enumerate(
                zip(question["choices"], question["wrongReasons"])
            )
        )
        cards.append(
            (
                f"{question['curriculumPath']['detail']}에서 조심할 선택지는?"
                f"<br><br>{question['prompt']}",
                f"{reasons}<br><br><b>난이도</b>: {question['difficulty']}",
                tags_for(question, "trap"),
            )
        )
    return cards


def stable_id(text):
    return int(hashlib.sha1(text.encode("utf-8")).hexdigest()[:8], 16)


def write_tsv(cards, path):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.writer(file, delimiter="\t")
        writer.writerow(["Front", "Back", "Tags"])
        for front, back, tags in cards:
            writer.writerow([clean_html(front), clean_html(back), tags])


def write_apkg(cards, path, deck_name, deck_id):
    try:
        import genanki
    except ImportError:
        print("genanki is not installed; TSV was generated, APKG skipped.", file=sys.stderr)
        return False

    model = genanki.Model(
        1723945120,
        "Public Procurement Manager Basic",
        fields=[
            {"name": "Front"},
            {"name": "Back"},
        ],
        templates=[
            {
                "name": "Card 1",
                "qfmt": "{{Front}}",
                "afmt": "{{FrontSide}}<hr id=\"answer\">{{Back}}",
            }
        ],
        css="""
.card {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 18px;
  line-height: 1.55;
  color: #17201a;
  background: #f6f7f2;
  text-align: left;
}
b { color: #244f35; }
""",
    )
    deck = genanki.Deck(deck_id, deck_name)
    for front, back, tags in cards:
        deck.add_note(
            genanki.Note(
                model=model,
                fields=[front, back],
                tags=tags.split(),
                guid=str(stable_id(front + back)),
            )
        )
    genanki.Package(deck).write_to_file(path)
    return True


def main():
    questions = json.loads(QUESTIONS.read_text(encoding="utf-8"))
    for prefix, deck_name, subject, deck_id in DECKS:
        subset = questions if subject is None else [q for q in questions if q["subject"] == subject]
        if not subset:
            print(f"skip {prefix}: no questions", file=sys.stderr)
            continue
        cards = make_cards(subset)
        tsv = OUT_DIR / f"{prefix}.tsv"
        apkg = OUT_DIR / f"{prefix}.apkg"
        write_tsv(cards, tsv)
        wrote_apkg = write_apkg(cards, apkg, deck_name, deck_id)
        suffix = " + APKG" if wrote_apkg else " (APKG skipped)"
        print(f"{prefix}: {len(cards)} cards from {len(subset)} questions -> {tsv.name}{suffix}")


if __name__ == "__main__":
    main()
