# Nihongo Compass

This repo is a static assessment and study library deployed from main to Vercel. Run `node test/engine.test.cjs` and `node test/import.test.cjs` from the root after scoring or content changes.

- Keep the quiz one question at a time. Preserve saved sessions and the two reserved transfer items.
- Append scored items only. Persisted numeric IDs are positional. Source IDs and lesson IDs are independent and stable.
- Keep assessment, post-feedback practice and delayed transfer evidence separate. Editorial difficulty labels remain provisional until calibrated with learner data.
- For Mahym imports, use `tools/import-mahym.cjs` with a pinned checkout of `garahan/Japanese-Test-Mahym`. Review `seeds/mahym-review.json` before promoting any item. Do not use Russian-dependent items for English placement.
- Serve learning materials from the study library. Treat imported strings as text and retain upstream notices in `dist/licenses`.
- Use a separate branch for content work when reviewing changes. Verify the test and a linked lesson in a browser before merging.
