# Nihongo Compass

A static adaptive Japanese placement test. The current bank contains 73 original vocabulary and grammar questions. Results are provisional and progress is stored locally in the browser.

Open dist/index.html to run locally. Import this repository in Vercel and use the repository root. The checked-in Vercel configuration serves dist directly. The app has no build dependencies or environment variables.

## Assessment engine

The browser updates an overall estimate and a separate estimate for each skill. It selects unused questions for level information, skill coverage, or a targeted follow-up. Response time and streaks influence selection. A repeated tagged concept after feedback contributes to practice rather than placement. Reports show sparse skills as still checking.

The bank includes 73 items. Six concepts have explicit follow-ups, including a prerequisite probe for permission forms. Untagged items still provide skill-level evidence. Item difficulty is editorial, so results remain provisional until calibrated against independent outcomes.

Run the engine checks with `node test/engine.test.cjs`.
