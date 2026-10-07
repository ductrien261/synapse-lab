# C++ teaching source

C++ implementation reference: https://github.com/wisn/knights-tour/blob/master/algorithms/backtracking.cpp (Wisnu Adi Nurcahyo, MIT). Synapse Lab uses a compact teaching implementation, with the same move order and zero-based visits as the visualization. The visualization executes the original JavaScript tracer; reviewed line mappings link its states to equivalent C++ statements.

`Code.cpp` is identical to the code lesson stored in the database. The board size is input; the current tracer sample uses 3. The final unsuccessful result maps to the failure output.

`code.js.presentation.json` records reviewed line correspondence and SHA-256 hashes of both sources. If either source changes, review and update this mapping. Missing, stale or incomplete mappings fail explicitly instead of highlighting incorrect lines. Other catalog algorithms without this metadata keep showing their executed source.

## Guided playback

Optional `narration` rules in the presentation metadata match actual log messages and mapped code lines. They supply a conclusion, next action, and a pause flag. Autoplay stops on entering a flagged step; Continue resumes from there. Knight’s Tour pauses after each unsuccessful recursive choice is undone and once at the final result. Messages describe failure of the explored subtree, not merely one invalid candidate. Unannotated steps and other catalog algorithms retain normal playback. Native trace runners can provide the same `SimulationStep.narration` contract, as Hamilton does.

Teaching rules may include `goal`, `reason`, and `calculation`. `capture` maps named placeholders to identifiers or indexed identifiers in the trusted tracer source. The worker captures numeric local values at each delay; `{{name}}` placeholders are filled from that frame, not guessed from displayed coordinates. Capture failures are unavailable values, never invented numbers. The shared explanation card displays purpose, reasoning, operation, result and next action in simulation and tutor views.
