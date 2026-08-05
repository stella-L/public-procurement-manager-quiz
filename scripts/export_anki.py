import csv
import hashlib
import json
import pathlib
import re
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
CONCEPTS = ROOT / "src" / "data" / "concepts.json"
OUT_DIR = ROOT / "public" / "anki"
TSV = OUT_DIR / "ppm_subject1.tsv"
APKG = OUT_DIR / "ppm_subject1.apkg"


def clean_html(value):
    return re.sub(r"\s+", " ", value).strip()


def tags_for(concept, extra):
    tags = concept["tags"] + [extra, f"chapter_{concept['chapter']}"]
    return " ".join(dict.fromkeys(tag.replace(" ", "_") for tag in tags))


def make_cards(concepts):
    cards = []
    for concept in concepts:
        cards.extend(
            [
                (
                    f"{concept['title']}이란?",
                    f"{concept['definition']}<br><br><b>쉬운 말</b>: {concept['easy']}<br><b>출처</b>: {concept['source']}",
                    tags_for(concept, "definition"),
                ),
                (
                    f"{concept['title']}에서 조심할 오답 함정은?",
                    f"{concept['trap']}<br><br><b>복습 힌트</b>: {concept['easy']}",
                    tags_for(concept, "trap"),
                ),
                (
                    f"{concept['title']}를 10초 안에 쉬운 말로 설명하면?",
                    f"{concept['easy']}<br><br><b>시험 포인트</b>: {concept['definition']}",
                    tags_for(concept, "adhd_short"),
                ),
                (
                    f"{concept['source']}의 핵심 키워드는?",
                    f"<b>{concept['title']}</b><br>{concept['section']}<br>{', '.join(concept['tags'])}",
                    tags_for(concept, "source_map"),
                ),
                (
                    f"시험장에서 \"{concept['title']}\"가 나오면 먼저 떠올릴 기준은?",
                    f"<b>판단 기준</b>: {concept['easy']}<br><br><b>왜 중요한가</b>: {concept['definition']}",
                    tags_for(concept, "exam_trigger"),
                ),
                (
                    f"다음 표현이 왜 위험할까?<br>\"{concept['trap']}\"",
                    f"<b>위험한 이유</b>: 이 표현은 {concept['title']}의 범위를 좁히거나 원칙과 예외를 섞을 수 있습니다.<br><br><b>정리</b>: {concept['definition']}",
                    tags_for(concept, "wrong_phrase"),
                ),
                (
                    f"{concept['title']}를 다른 개념과 헷갈리지 않으려면 어떤 단어에 표시할까?",
                    f"<b>표시할 단어</b>: {concept['title']}<br><b>연결 범위</b>: {concept['section']}<br><b>암기 문장</b>: {concept['easy']}",
                    tags_for(concept, "keyword_anchor"),
                ),
                (
                    f"{concept['title']} 관련 문제에서 제거해야 할 선택지 패턴은?",
                    f"<b>제거 패턴</b>: \"항상\", \"오직\", \"가격만\", \"절차 생략\", \"조달청만\"처럼 범위를 과도하게 단정하는 표현입니다.<br><br><b>정답 방향</b>: {concept['easy']}",
                    tags_for(concept, "choice_elimination"),
                ),
            ]
        )
    return cards


def stable_id(text):
    return int(hashlib.sha1(text.encode("utf-8")).hexdigest()[:8], 16)


def write_tsv(cards):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with TSV.open("w", encoding="utf-8", newline="") as file:
        writer = csv.writer(file, delimiter="\t")
        writer.writerow(["Front", "Back", "Tags"])
        for front, back, tags in cards:
            writer.writerow([front, clean_html(back), tags])


def write_apkg(cards):
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
}
b { color: #244f35; }
""",
    )
    deck = genanki.Deck(1723945121, "공공조달관리사::1과목 공공조달과 법제도 이해")
    for front, back, tags in cards:
        deck.add_note(
            genanki.Note(
                model=model,
                fields=[front, back],
                tags=tags.split(),
                guid=str(stable_id(front + back)),
            )
        )
    genanki.Package(deck).write_to_file(APKG)
    return True


def main():
    concepts = json.loads(CONCEPTS.read_text(encoding="utf-8"))
    cards = make_cards(concepts)
    write_tsv(cards)
    wrote_apkg = write_apkg(cards)
    print(f"Wrote {len(cards)} cards to {TSV}")
    if wrote_apkg:
        print(f"Wrote APKG to {APKG}")


if __name__ == "__main__":
    main()
