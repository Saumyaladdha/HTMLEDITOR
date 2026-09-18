---
name: step06_latex_validator
description: Validate arts LaTeX. Use when this step reports a finding — it should never have work to do.
---

# Latex Validator — ARTS

> Subject profile: `book/subjects/arts.py` sets `"latex": False`. Everything
> not contradicted here is in
> `pipeline/subjects/biology/step06_latex_validator/SKILL.md` (biology sets
> the same flag), and the CODE is shared.

## Expected state: always clean

Measured on both chapters: zero `\frac`, zero `\vec`, zero `$$`, zero
inline `$…$`. `findings=0` on both the history and geography builds, first
try. If this step ever reports a finding on an arts chapter, treat it as a
sign the chapter is NOT pure prose — check whether a map/timeline table has
smuggled in a coordinate expression or similar, rather than assuming the
validator itself needs an arts-specific rule.
