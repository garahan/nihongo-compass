# Nihongo Compass

A static adaptive Japanese placement test. The current bank contains 73 original vocabulary and grammar questions. Results are provisional and progress is stored locally in the browser.

Open dist/index.html to run locally. Import this repository in Vercel and use the repository root. The checked-in Vercel configuration serves dist directly. The app has no build dependencies or environment variables.

## Assessment engine

The browser updates an overall estimate and a separate estimate for each skill. It selects unused questions for level information, skill coverage, or a targeted follow-up. Response time and streaks influence selection. A repeated tagged concept after feedback contributes to practice rather than placement. Reports show sparse skills as still checking.

The bank includes 73 items. Six concepts have explicit follow-ups, including a prerequisite probe for permission forms. Untagged items still provide skill-level evidence. Item difficulty is editorial, so results remain provisional until calibrated against independent outcomes.

Run the engine checks with `node test/engine.test.cjs`.

### Scoring model

A Bayesian model uses six ordered placement bands and six skill abilities linked to overall ability. A logistic response curve accounts for four-choice guessing and occasional misses. Skill likelihoods are integrated separately, so estimating the joint model takes only small grids. Chosen answers carry full weight, skips carry partial weight, and follow-ups after teaching a tagged concept stay outside placement.

Question selection uses expected entropy reduction for overall ability and for the question's skill, together with skill coverage and concept probes. The report's estimated range is the shortest contiguous interval containing at least 80% of model probability. These are model-based estimates with hand-set parameters, pending item calibration and independent validation.

## Expanding coverage

The current bank measures language knowledge. The [JLPT level descriptions](https://www.jlpt.jp/e/about/levelsummary.html) and [test item types](https://www.jlpt.jp/e/guideline/testsections.html) inform the taxonomy. Foundations, the N1 ceiling, and productive skills are reported separately from JLPT-aligned receptive placement. The taxonomy defines product categories and does not certify official JLPT equivalence.

- `dist/blueprint.js` defines stable domain, skill and band IDs and distinguishes unavailable coverage, sparse evidence and sampled skills. A skill is marked sampled after two chosen placement answers. This is a coverage flag, not a mastery or confidence threshold.
- `schemas/catalog.schema.json` defines the format for supplying future questions, media, concept prerequisites, calibration and study resources. Start from the empty `schemas/catalog.template.json`. The active quiz still reads the original bank. New formats need renderers and scoring before they can contribute to placement.
- Keep stable IDs across edits and increment revision when content or scoring changes. Validate foreign keys and concept prerequisites before importing, and reject cycles. Use family IDs to group near-duplicate items. Separate responses after feedback, questions sharing a stimulus, and independent placement evidence.
- Add content in depth around boundaries. Include independent examples across skills and formats at each adjacent level, especially foundations versus N5 and N1 versus the advanced extension. Calibrate pilot items and verify uncertainty against held-out learners before using them in placement. Require independent evidence per domain before combining language knowledge, reading and listening into a broader estimate. Report speaking and writing separately with scored rubrics.
- To match resources, start with a confirmed concept gap, prefer prerequisites when repeated probes point to them, then fall back to skill and level. Filter by locale and available content. Keep learning resources separate from scored items so they can be replaced or expanded independently. This release supplies the contract and keeps the existing recommendations.

## Diagnosis and delayed transfer check

The first flow distinguishes に for the location of existence from で for the location of an action. Only the distractor that swaps the two particles counts toward this diagnosis. A recommendation requires two matching errors, including at least one independent placement response. A matching mistake can prompt a question from the other side of the contrast.

Two existing question IDs are reserved for a browser-local follow-up, leaving 71 items available to the adaptive test. The check unlocks 24 hours after the learner marks the review complete. It uses a different context for each side of the distinction and reveals the result after both answers. Placement and practice data remain separate from the follow-up. A legacy session that already used a reserved item does not qualify for a fresh check.

The follow-up summary uses a Beta(1,1) update and reports only performance on the two items. Its small sample does not establish mastery or improvement. New concepts can reuse the pattern once they have tagged distractors, independent diagnostic items, and reserved transfer items.

## Resuming a session

The versioned browser session stores recorded answers, the active question, the option order, and whether feedback is showing. Older answer histories are read and migrated on the next write. Resumed question timing is excluded from the pace signal. Before writing, the store checks whether another tab has changed the saved session and reloads on a conflict. If storage is unavailable, progress stays in memory and the quiz shows a notice.
