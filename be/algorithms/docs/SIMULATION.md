# Stored simulations

`AlgorithmContent.simulation` stores a versioned bundle with algorithm path,
input configuration, and one full trace per predefined sample. Each trace contains
code, state snapshots, line correspondence, narration, and reading checkpoints.
The normal algorithm detail API returns the bundle with the same draft/publication
permissions as the lesson. The admin list omits this large field; the editor loads
it only for the selected lesson.

Generate a new bundle from an available runner, validate it, and save it:

```sh
docker compose exec -T be python manage.py sync_algorithm_simulation backtracking/knights-tour-problem --dry-run
docker compose exec -T be python manage.py sync_algorithm_simulation backtracking/knights-tour-problem
```

Existing bundles are kept unless `--replace` is specified. Updates preserve other
lesson content and publication status. Regenerate with `--replace` after changing
source code or teaching text. Generation must succeed for all samples before the
database is updated; size, step count, source lines and renderable states are checked.
An edit made while generation is running aborts the import, so newer lesson edits
are not overwritten. Bundle paths must match the destination lesson.

Bundles and generated traces are limited to 12 MB and 2,500 steps per trace;
source files are limited to 100 KB. The automatic runner allows two workers,
caps captured commands at 50,000, and keeps an LRU cache bounded by both 12 entries
and 24 MB. Oversized traces fail during replay rather than growing without a bound.

Frontend playback uses stored samples directly and does not request new traces
from algo-server for them. The graph's custom-input option still generates a new
trace at runtime. Algorithms without a stored bundle keep using their existing
runner. New algorithms reuse the same database field, importer and frontend;
their executable implementation still needs to emit a supported trace format.
Stored traces are data, and never execute source code from the database.

## Shared generation pipeline

Both the visualization API (including custom input) and this database import
command use `simulation/service.ts`. It resolves the available runner, validates
input, executes it, checks the resulting trace and isolates cached snapshots from
callers. The HTTP controller contains no algorithm-specific dispatch logic.

Supported catalog JavaScript tracers for arrays, matrices and charts reuse the
automatic runner. Hamilton now uses the shared `path-search.ts` engine with a
data entry in `path-definitions.json`: start vertex, open/closed route, target
length, minimum length, source markers, samples and teaching templates. There is
no Hamilton-specific server module. The engine also supports open paths and
partial paths; changing a lesson's constraints does not duplicate its engine.
BFS currently retains a native adapter that emits the shared trace contract;
adapters do not implement playback,
database import, request handling or input validation. Adding an algorithm does
not require duplicating those layers or creating a new frontend screen. A source
that does not emit supported tracer events still requires a computational adapter;
this pipeline does not infer algorithm semantics from arbitrary C++ code.
