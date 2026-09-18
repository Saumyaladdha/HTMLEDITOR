---
name: step01_md_reader
description: Parse arts (history/geography) markdown to IR. Use when a question head, figure, or the whole front-matter cover comes out wrong.
---

# Md Reader — ARTS

> Subject profile: `book/subjects/arts.py`. This file covers what arts needs
> that biology does not — the two are the closest pair, both prose-first
> with zero LaTeX. Everything not contradicted here is in
> `pipeline/subjects/biology/step01_md_reader/SKILL.md`, and the CODE the
> step runs is shared — one `pipeline/step01_md_reader/run.py` for every
> subject, so a fix lands once.

## ⚠ Always run with `--subject arts` — never let this step auto-detect

`docs/FORMAT_SPEC.md` §10's `detect()` decision tree has no branch for
`arts` at all: it only scores maths, chemistry, and a physics-vs-biology
split. Run without `--subject`, an arts chapter falls through to the
`physics` default and every profile-gated rule below (backticks as
`sequence` not maths, the `पहचान`/`तथ्य` rubric, `leadin_breaks`) silently
does not apply — the parse still completes and produces IR, it is just the
WRONG IR, with no error anywhere to flag it. This has already shipped
wrong once for this pipeline (three chapters, caught only downstream).
Always:

```bash
python3 pipeline/step01_md_reader/run.py --md content/<NN>_reader_edition.md --subject arts
```

## What this step is for

Turning the markdown into the JSON IR — and for arts, most of what went
wrong here never showed up as an error. Every one of the defects below
produced a clean-looking build with a wrong-looking page; the count
comparisons in `step02` and the screenshots in `step15` are what actually
caught them, exactly as `docs/FORMAT_SPEC.md`'s own guidance predicts for a
first-time subject.

## Arts dialect, measured on both chapters

history (ईंटें, मनके तथा अस्थियाँ) and geography (मानव भूगोल: प्रकृति तथा
विषय-क्षेत्र):

| | biology | arts |
|---|---|---|
| `$...$` / `$$` / `\frac` / `\vec` | 15/0/0/0 | 0/0/0/0 |
| सूत्र panels | 0 | 0 |
| `**पहचान:**` / `**तथ्य:**` rubric | पहचान only | पहचान, तथ्य |
| `→` chains in backticks | 50 | excavation/philosophy timelines: `` `1875 कनिंघम… → 1921 साहनी, हड़प्पा → …` ``, `` `पर्यावरणीय निश्चयवाद → संभववाद → नव-निश्चयवाद` `` |
| `[FIGURE: …]` / `[IMAGE: …]` | — (uses `![]()` + चित्र-निर्देश fence) | bracket, inline |
| matching / A-R / source-based MCQ | no | yes, both chapters |
| `### प्र. N · <full descriptive title>` | never | **every question, both chapters** |

That last row is the one that mattered most — see below.

---

## FAULT 1 (critical, corpus-wide impact): `RE_QHEAD` never matched a heading WITH a title

**Symptom**: every single question in Part 2 rendered as its own giant
`.yearhead` banner — the same huge gold-underlined style a real year
("2026", "2025") gets — instead of a compact question tag. Not a handful:
`step01`'s own IR dump showed EVERY `qgroup` under Part 2 as a sibling of
the year groups, at the same tree depth:

```
qgroup '2026'                                              children=0
qgroup 'प्र. 1 · नव-निश्चयवाद का प्रतिपादक कौन'              children=12
qgroup '2025'                                              children=0
qgroup 'प्र. 1 · प्रकृति की सर्वोच्चता में विश्वास करने वाली…' children=14
qgroup 'प्र. 2 · ‘रुको और जाओ निश्चयवाद’ किसे कहते हैं'       children=5
```

Every `प्र. N` should have been a `question`-kind CHILD of its year's
`qgroup`, not a `qgroup` of its own.

**Root cause**: `RE_QHEAD` (`book/readers/markdown.py`) has two branches —
`**प्र. N**` (bold) and `#{2,4}\s*प्र\.\s*N` (heading). Both branches, after
the number, only accept a SHORT optional tail — a chip, stars, or a
marker-glyph note — then require end-of-line. Physics, biology, chemistry
and maths never write a title after the number in EITHER branch (chemistry
writes `## प्र. 1  `[2026 · 1 अंक]`` — number and chip, nothing else; the
actual question text is a separate body paragraph). Arts writes
`### प्र. 1 · <full title>` for literally every question in both chapters,
so the heading branch's strict end-of-line requirement failed on all of
them.

This regex is not just cosmetic — `_build_part`'s H2 and H3 splits
(`book/readers/markdown.py`, `_split_on(body, lambda l: RE_H3.match(l) and
not RE_QHEAD.match(l))`) use it to decide "is this heading a QUESTION
(stay inside the current group) or a NEW GROUP BOUNDARY (split here)".
Every arts question failed the exclusion test, so every one WAS a split
point.

**Fix**: widened the `#{2,4}` branch only, using a conditional pattern —
`(?(n1)\s*$|(?:\s*[·:–—-]\s*\S.*)?\s*$)` — where `n1` is the bold branch's
own capture group. If `n1` matched (bold branch fired), the tail stays
STRICT, unchanged. If it did not (heading branch fired), the tail now also
accepts `· <anything to end of line>`. This is safe specifically because a
`#{2,4}` line is already a heading by construction — it can never be part
of a sentence, so the "don't match a sentence that merely mentions
`**प्र. 5**`" risk the strict bold-branch tail exists to prevent does not
apply to a `###` line at all.

**What this fix does NOT do**: it makes the heading-with-title MATCH (so
it correctly stays a question, not a new group) — it does not capture or
DISPLAY the title text anywhere. `_parse_questions` still reads the
question's number only; `प्रकृति की सर्वोच्चता में विश्वास करने वाली
संकल्पना` itself is not shown as a label. That matches every other
subject's actual displayed convention (chemistry shows only `प्र. 1` plus
a marks chip; the question TEXT is the body paragraph, which arts still
has and still shows in full) — so nothing the reader is authoritative for
was lost, but if a future arts chapter wants that title surfaced somewhere,
that is new work, not a bug fix.

---

## FAULT 2: an extra `# चैप्टर मैप` heading broke the cover away from its own content

**Symptom**: the whole front-matter analytics area (marks table, "सबसे
ज़्यादा बार यही पूछा गया", "किस क्रम में पढ़ना है") rendered as plain
unstyled text — no card borders, no colours, no icon header — instead of
the polished card grid every other subject's cover gets.

**Root cause**: `parse()` splits the whole file on every `# H1`. The
FIRST H1 matching `अध्याय|Chapter` becomes the `front` role part, and
`render_cover()` reads ONLY that part's own body — see the front/body
split described in `docs/FORMAT_SPEC.md`. Both arts source files inserted
a SECOND, unrelated H1 immediately after the chapter title and subtitle:

```
# अध्याय 1 — मानव भूगोल : प्रकृति तथा विषय-क्षेत्र
### उ.प्र. बोर्ड · कक्षा 12 · भूगोल — पूर्ण अध्ययन-सामग्री

# चैप्टर मैप          <- THIS

## 🎯 वो 8 अंक किन टॉपिक से आते हैं?
```

`# चैप्टर मैप` does not match `अध्याय|Chapter`, so it became an ORDINARY
body part instead of a continuation of front-matter — every analytics
section after it (all the content `render_cover()` needs) was cut away
from the cover entirely and fell through to the generic section renderer,
which has no card styling at all. No other chapter in the corpus (physics,
biology, chemistry, maths) has an equivalent heading — the cover's own
title implicitly IS the chapter map; nothing else names it.

**Fix**: SOURCE FORMATTING — deleted the `# चैप्टर मैप` line (and its
blank line) from both `content/arts_01_history_print_ready.md` and
`content/arts_02_geography_print_ready.md`. No wording lost — the line
carried no information the cover doesn't already convey by being the
cover.

---

## FAULT 3: `**प्र. N** <question text>` on one line (history only, Part 2's bulk bank)

44 occurrences, all in history's प्र. 14–66 range (the bulk answer-key
questions, as opposed to the curated `### प्र. N · Title` set). Every
other subject and geography's own bulk section put the number ALONE on its
line, then a blank line, then the question text — matching the shape
`RE_QHEAD`'s bold branch actually expects (see `content/chapter_1_v4_ready.md`
lines 536–538 for the reference shape: `**प्र. 1**`, blank, question text).
History instead wrote:

```
**प्र. 14** सिन्धु सभ्यता की दो विशेषताएँ लिखिए। ☞ Imp • [2025, 22]
```

`step02_content_validator` caught this immediately and unambiguously: 44
in the markdown regex count, 0 as `question`-kind in the IR (all 44 were
retagged `formula` downstream instead, since a bold lead-in with no
recognised shape is the tagger's fallback).

**Fix**: SOURCE FORMATTING — split into the standard 3-line shape, with
any leading marker-glyph note (`☞ Imp • [2025, 22]`) kept on the number's
own line and the question text on the line after:

```
**प्र. 14** ☞ Imp • [2025, 22]

सिन्धु सभ्यता की दो विशेषताएँ लिखिए।
```

Script matched `^(\*\*(?:प्र\.?|Q\.?|प्रश्न)\s*[0-9]+\*\*)\s+(\S.*)$`,
split off a trailing `[↩☞⚠★☆→][^\n]*` marker separately. Pure whitespace
restructuring, zero wording changed. Geography's own bulk section never
had this problem (0 occurrences).

## FAULT 4: a figure declaration glued to `**उत्तर**` on the same line

History only, one occurrence (चित्र 1.4). The reader's figure check is
`ln.lstrip().startswith("[FIGURE:")` / `"[IMAGE:"` — unconditional, not
subject-gated, the same rule every chapter already relies on. History wrote:

```
**उत्तर** [FIGURE: चित्र 1.4 — उत्तर सहित नामांकित भारत का मानचित्र | …]
```

so `[FIGURE:` was never the first thing on its own line and the figure was
silently dropped — `step02_content_validator`: 7 in the markdown, 6 in the
IR. **Fix**: put `**उत्तर**` and the figure declaration on separate lines,
matching every other answer-figure pairing in the same file.

## Geography's placeholder title

`content/19_print_ready (9).md` opened with a literal unfilled placeholder
— `# अध्याय 1 — <अध्याय NN का शीर्षक — पुस्तक से भरिए>`. The body is
unambiguous UP Board Class 12 Geography Book 1, Chapter 1 — भूगोल के जनक
इरेटोस्थनीज, मानव भूगोल की परिभाषाएँ (रैटजेल, सेम्पल,
विडाल-डी-ला-ब्लाश), प्रकृति, विषय-क्षेत्र, विचारधाराएँ (नियतिवाद,
सम्भववाद, नव-नियतिवाद) — so it was filled with **मानव भूगोल : प्रकृति
तथा विषय-क्षेत्र**, completing a required field rather than changing
authored content. If a future arts chapter carries the same placeholder
and the body is NOT this unambiguous, leave it and flag it loudly instead
of guessing a textbook title from a thin content match.

## Verified state after all four fixes

`step02_content_validator findings=0` on both chapters. `question markdown
44 IR 44` and `figure markdown 7 IR 6→7` on history (post-fix). Visual
confirmation: the cover renders as a proper card grid (icon header, marks
table, "सबसे ज़्यादा बार", steps card) on both chapters; Part 2 renders as
compact year banners with small `प्र. N` question tags, not oversized
group banners.

## Open — not yet resolved

- History's para share sits at 48% (just over the step's own 45% flag
  threshold). Not yet triaged into reader-gap vs source-convention.
