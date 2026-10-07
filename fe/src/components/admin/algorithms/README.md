# Algorithm lessons

Lesson content comes from Django AlgorithmContent through the detail API and the
admin-only draft list. The editor, publication badges and preview use stored
content. There are no bundled Backtracking drafts, browser-storage fallbacks,
automatic Hamilton blocks or algorithm-specific lesson defaults. An empty form is
an authoring state; it does not indicate that a draft exists in the database.
The learner page can display DB lessons when the package source service is down.

Real-world applications are rendered from `lesson_fields.applications` (with the
legacy `applications` list as a fallback). The learner renderer does not select
content by algorithm path and does not embed Hamilton-specific scenarios. Add or
change application text through the admin lesson editor so publication and
visibility continue to follow the database record.

AlgorithmCodeWriting is the shared guided code renderer for any catalog lesson.
AlgorithmContent.code_lesson stores language, source and steps with start_line,
end_line, title and note. Step controls reveal source ranges and display the stored
explanation. It does not inject algorithm-specific content or execute C++.
Learners see published content only; admin preview can display stored drafts.

lesson_fields stores the eleven lesson sections. lesson_blocks stores ordered
knowledge, examples and exercises with attribution and optional image paths.
Images are static assets referenced by DB records, not bundled lesson data.
Exercise comparison reveals stored answers after learner input; it does not grade
or persist responses. The editor checklist checks general metadata, knowledge blocks, practice blocks, guided code and references for presence only.

Save Draft, Publish and Return to Draft persist through authenticated Django PUT.
Saving the text fields and blocks preserves an imported code lesson. The draft
list normalizes missing text sections to empty input values so a DB record with
only blocks or code_lesson is still available to the editor and preview.

## Import code lessons

```sh
docker compose exec be python manage.py migrate algorithms
docker compose exec be python manage.py import_code_lesson backtracking/hamiltonean-cycles algorithms/data/hamilton/code-lesson.json --dry-run
docker compose exec be python manage.py import_code_lesson backtracking/hamiltonean-cycles algorithms/data/hamilton/code-lesson.json
```

Use any catalog path and a JSON file with the same schema to import another code
lesson. The command validates ranges, retains other fields and publication status,
and skips existing code lessons unless --replace is supplied. New content starts
as draft. These JSON files are import inputs on the backend, not frontend fallbacks.
Code lesson editing uses JSON import or admin PUT; there is no dedicated form yet.

## Executable visualizations and reference sources

AlgorithmVisualization, SimulationControls, SimulationGallery, GraphRenderer and
SimulationCodePanel are shared by graph algorithms. The API advertises a
visualization capability in algorithm details; the learner view does not match
algorithm names. The server registry currently connects Hamilton and unweighted
BFS, both with sample/custom undirected inputs limited to 2–6 vertices. Hamilton
keeps its existing backtracking runner; BFS runs a queue-based traversal in
Brute Force/Breadth-First Search/Code.ts. Its distances count edges, not weights.

GET /algorithms/:category/:algorithm/visualization returns a graph trace with
source/language, highlighted line, message, context values, metrics, node/edge
states and summary. The endpoint validates inputs before executing a registered
runner; unconnected algorithms return 404. It never executes client-supplied code.
The frontend contract is in lib/simulation.ts; the server counterpart is in
src/simulation/types.ts. Keep those transport contracts aligned when extending
renderers. Algorithm-specific conditions belong in server adapters, not renderers.

The shared playback hook owns speed, navigation and automatic playback. The
code/tutor tabs consume the same frame. Export, gallery, custom graph editing,
loading, retry and empty states retain the current layout. Graph cards still
stretch to the sidebar height. DB guided code lessons remain separate from the
executable trace; C++ note ranges are only matched to C++ frames. AI requests are
still disconnected. Other algorithms show an explicit unavailable state until a
runner is registered; no demo is substituted.

To add another graph algorithm, implement its runner and register its capability,
samples and input limits on algo-server. Reuse the existing frontend components.
For a new visualization family (array/tree/table), extend the trace union and add
one renderer per family, then reuse playback, controls, code and tutor. No UI file
per algorithm is necessary.

Verification: frontend typecheck and targeted ESLint; server typecheck; run the
server regression script with `NODE_PATH=src npx ts-node src/simulation/registry.test.ts`.

The source selection panel reads the algorithm source registry from Django. Ready
CS OpenStax and PDF documents are registered automatically; an admin may
also add an enabled HTTPS source with an explicit allowed domain. Package source
files are not lesson-content sources: they remain available only for source-code
comparison and visualization.

The “Nhập dữ liệu” tab now enables “Quét nguồn” as soon as an approved source is
selected. It scans indexed section titles, compares normalized names against all
catalog algorithms and categories, and shows only source-linked suggestions absent
from the catalog. This discovery endpoint is read-only and does not create lessons.
General chapter headings and known duplicates are filtered before display.

The existing named-lesson scan API creates an AlgorithmScanJob and one reviewable
AlgorithmDraftCandidate per selected catalog algorithm. Candidate fields carry found/weak/missing/conflict
status, confidence and citations. Existing lesson fields are unchecked by default.
Applying selected fields merges only those fields, retains all other admin edits,
records valid document references, and always sets AlgorithmContent back to draft.
No scan or apply action publishes learner content. The algorithm import models and
services are separate from anatomy; only the generic knowledge store and AI gateway
are shared.

The single-link review shows a source-gap assistant whenever a candidate contains
weak, missing or conflicting fields. Its automatic discovery action builds a
focused web query from those gaps, rejects duplicate, unreadable and unrelated pages,
and ranks relevant academic or established technical sources first. Suggestions are
unchecked until the admin reviews and selects them before a new scan with the candidate's
existing source IDs plus the new sources. Manual HTTPS preview remains available
as a fallback. The current candidate stays visible and cannot be applied while
that replacement scan is running.

## OpenStax source blocks

The backend extractor now handles OpenStax injected exercise-question nodes,
retains original prompts and worked-example solutions, groups prose by source
heading, and links every downloaded image through lesson_blocks. Multiple images
use supplementary blocks because the schema has one image per block. Four
true/false source questions use choice metadata; unsupported answer formats remain
essay for review. Answers not present on the section page remain blank.

```sh
docker compose exec be python algorithms/tools/import_openstax_hamilton.py
docker compose exec be python manage.py import_lesson_blocks backtracking/hamiltonean-cycles algorithms/data/references/openstax-hamilton/blocks.json --dry-run
docker compose exec be python manage.py import_lesson_blocks backtracking/hamiltonean-cycles algorithms/data/references/openstax-hamilton/blocks.json
```

Copy referenced files from algorithms/data/references/openstax-hamilton/assets to
fe/public/lesson-assets/openstax before importing. The generic import_lesson_blocks
command merges new source IDs without overwriting existing edits, code_lesson,
text fields or publication status. Newly created lessons default to draft.
This workflow imports original English into the lesson DB for display and review;
it does not call AI or place the material into the RAG document store.

## Learning outline instead of source fragments

Hamilton now uses six original Vietnamese learning sections based on the project
implementation: problem definition, input/output, backtracking process, a worked
four-vertex example, correctness/complexity, and applications/pitfalls. These are
DB content, not frontend defaults or translations of OpenStax passages. The
learner renderer displays ordered, initially collapsed theory rows below the
simulation. Each row has a numbered heading, disclosure arrow and theory label;
opening it reveals the DB content without repeating the heading. Native details
controls support keyboard use. Preview and learner pages share this layout.
Practice blocks remain unchanged. The previous source blocks are archived in
algorithms/data/references/openstax-hamilton/blocks-before-outline.json.

To replace the theory of any lesson while retaining its practice material:

```sh
docker compose exec be python manage.py import_lesson_blocks CATEGORY/ALGORITHM path/to/theory.json --replace-theory --backup path/to/unique-backup.json
```

The input must contain theory blocks only. Replacement requires a new backup file
and preserves text fields, code_lesson, practice blocks and publication status.
Do not rerun the raw source import into a curated lesson: it would append source
fragments again. Keep extraction output as reference material for authoring.

The interactive sidebar retains its two original tabs: AI Tutor Trợ Giảng and
Code & Mã Giả. Code follows the active simulation line and shows DB pseudocode;
without a trace it displays the stored code_lesson source. The tutor tab retains
its banner and question input layout, with actual current-step context. Algorithm
AI requests are not connected yet, so the question input and send control are
disabled with an explicit status message. The existing anatomy tutor endpoint is
not used for algorithm questions. Preview and learner views share this sidebar.

AlgorithmTutorPanel restores the AI-tab markup and styles from main's original
AlgorithmSimulationView: status banner, step headline, explanation, highlighted
state, expandable suggested questions and bottom question form. Actual trace and
DB code-lesson/knowledge content supply these sections; no canned AI replies are
restored. Sending remains disabled until algorithm tutoring is connected. This
restoration changes the AI panel only; code playback and lesson layout remain.

## Authoring layout

The shared authoring form has five sections: general information, lesson,
practice, code/pseudocode and references. General information contains only title,
summary and objectives. Knowledge and practice use the same collapsed block editor,
with numbering and movement scoped to the selected group. Code shows the stored
source and step notes read-only; pseudocode remains editable. References and the
original package source are kept together for comparison.

Legacy lesson fields remain in the save payload. For lessons without theory
blocks, a collapsed legacy form makes those fields accessible. Opening tabs does
not rewrite stored content. Preview continues to use the shared learner renderer.

Practice headings use “Bài 1”, “Bài 2”, etc. in both authoring and learner views,
following the current practice order. Original source titles remain stored and
editable as metadata; they are not repeated in practice navigation or headings.

## Knight's Tour draft

The Knight's Tour lesson bundle is stored in backend data/knights-tour/lesson.json.
The source preparation tool downloads the original algorithm-visualizer README
and JavaScript plus OpenStax sections 12.7/12.8 for provenance. Knowledge includes
the original English README and explicitly attributed original English teaching
notes based on the search code. Practice combines original source prompts/figures
with clearly attributed original worked items. Source-only prompts keep missing
answers blank. Supplementary image blocks share the source exercise text because
the current block schema supports one image. The C++ guide is an adaptation, not
a claim that OpenStax provides implementation code. Original English is retained
for a future translation tool. No material is sent to AI/RAG.

`python manage.py import_algorithm_lesson backtracking/knights-tour-problem algorithms/data/knights-tour/lesson.json --dry-run` validates the complete bundle.
Omit --dry-run to create a draft. Existing lesson records are never overwritten.
The board visualization is supplied automatically from the catalog JavaScript
tracer source. Importing the C++ learning guide itself does not execute C++.

## Automatic instrumented-source visualization

Algorithm detail now falls back to automatic discovery of catalog JavaScript
files that import algorithm-visualizer and use Array1DTracer/Array2DTracer (with
optional ChartTracer, LogTracer and layouts). No per-algorithm registry entry is
needed for this family. Knight's Tour, Bubble Sort and Selection Sort are tested
examples. Graph/Scatter sources are not auto-advertised by this interpreter;
Hamilton and BFS continue through their existing graph adapters.

The trusted catalog source executes in a separate Node child with the existing
SDK mounted read-only at /tracers. It emits Commander commands; the generic replay
interpreter creates immutable array/matrix/chart frames at each delay and retains
actual source line numbers. Unsupported commands fail explicitly. Never accept
source text or file paths from requests here. VM is a convenience execution
context, not an untrusted-code security boundary. DB C++ code lessons remain
read-only learning material and are never evaluated by this route.

Limits: 128 MB child heap, 4-second execution timeout, 6.5-second job deadline,
50,000 commands, 2,500 frames, two concurrent workers and 12 cached source hashes.
Identical concurrent requests share work. Time/size/unsupported failures produce
an error state with Retry, not fabricated success. Randomized catalog inputs are
retained in the cached frames and re-run after source changes/cache eviction.

Add catalog code using the supported SDK constructors and calls; fetching the
catalog refreshes folders and detail refreshes files. The UI chooses renderer and
available source files from API capabilities. Pure C++ or JavaScript without
tracer events still needs instrumentation or an adapter: a source file alone does
not tell the renderer which variables to draw. The original Knight example uses
N=3 and correctly ends with no solution; that is not a broken simulation.

Run `NODE_PATH=src npx ts-node src/simulation/tracer-replay.test.ts` to check source
discovery, real execution, sorting results, state restoration, code mappings and
cache behavior. ArrayRenderer and GraphRenderer share gallery, playback, sidebar
and SVG export; SVG dimensions follow the active renderer's viewBox.
