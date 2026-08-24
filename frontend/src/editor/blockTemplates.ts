/**
 * Minimal insert-palette snippets — one canonical variant per type in v1
 * (no variant picker yet, e.g. always def-item--paribhasha, not --niyam).
 * Kept as plain HTML strings, matching how the pipeline's own emit_*
 * functions produce plain HTML — the editor never needs to know the
 * Python DSL, only the resulting markup shape.
 */
export interface BlockTemplate {
  key: string;
  label: string;
  html: string;
}

export const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    key: "text-body",
    label: "Paragraph",
    html: `<p class="text-body">नया अनुच्छेद यहाँ लिखें…</p>`,
  },
  {
    key: "bullet-list",
    label: "Bullet list",
    html: `<ul class="bullet-list"><li>पहला बिंदु</li></ul>`,
  },
  {
    key: "figure",
    label: "Figure",
    html: `<figure class="figure" title="नया चित्र">
  <div class="figure__img" style="background:#e8e0c9;height:120px;display:flex;align-items:center;justify-content:center;color:#6b5a48;font-size:12px">
    चित्र यहाँ जोड़ें
  </div>
  <figcaption class="fig-cap"><span class="fig-cap__text">कैप्शन लिखें…</span></figcaption>
</figure>`,
  },
  {
    key: "tip-box",
    label: "Tip box",
    html: `<aside class="tip-box"><div class="tip-box__frame">
  <span class="tip-box__label">टिप्स!</span>
  <div class="tip-box__body"><p class="text-body">यहाँ सुझाव लिखें…</p></div>
</div></aside>`,
  },
  {
    key: "section-head",
    label: "Section heading",
    html: `<div class="section-head"><div class="section-head__shape"><div class="section-head__body">
  <span class="section-head__title">नया शीर्षक</span>
</div></div></div>`,
  },
  {
    key: "yaad-rakhein",
    label: "“Don't forget” box",
    html: `<aside class="yaad-rakhein"><div class="yaad-rakhein__frame">
  <span class="yaad-rakhein__label">याद रखें</span>
  <div class="yaad-rakhein__body"><p class="text-body">यहाँ लिखें…</p></div>
</div></aside>`,
  },
  {
    key: "formula",
    label: "Formula",
    html: `<div class="formula"><span class="formula__label">सूत्र:</span> q = ne</div>`,
  },
  {
    key: "question-subjective",
    label: "Subjective question",
    html: `<div class="question-subjective">
  <span class="question-subjective__label">प्रश्न 1.</span>
  <div class="question-subjective__body">
    <p class="question-subjective__text">यहाँ प्रश्न लिखें…</p>
  </div>
</div>`,
  },
  {
    key: "question-objective",
    label: "Objective (MCQ) question",
    html: `<div class="question-objective">
  <span class="question-objective__label">वस्तुनिष्ठ प्रश्न 1.</span>
  <div class="question-objective__body">
    <p class="question-objective__question">यहाँ प्रश्न लिखें…</p>
    <div class="question-objective__options">
      <div class="question-objective__option"><span class="question-objective__option-key">A</span><span class="question-objective__option-text">विकल्प क</span></div>
      <div class="question-objective__option"><span class="question-objective__option-key">B</span><span class="question-objective__option-text">विकल्प ख</span></div>
      <div class="question-objective__option"><span class="question-objective__option-key">C</span><span class="question-objective__option-text">विकल्प ग</span></div>
      <div class="question-objective__option"><span class="question-objective__option-key">D</span><span class="question-objective__option-text">विकल्प घ</span></div>
    </div>
  </div>
</div>`,
  },
  {
    key: "list--number",
    label: "Numbered list",
    html: `<ol class="list--number"><li>पहला चरण</li></ol>`,
  },
];
