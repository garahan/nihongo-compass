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
