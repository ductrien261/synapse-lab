# Algorithm lesson data

Each algorithm folder contains the authored JSON used by lesson import commands.
Downloaded material and source code used for reference live in `references/`.

```text
data/
├── hamilton/
│   ├── code-lesson.json
│   └── learning-outline.json
├── knights-tour/
│   ├── code-lesson.json
│   └── lesson.json
└── references/
    ├── knights-tour/       # Source README, code and downloaded textbook pages
    └── openstax-hamilton/  # Textbook pages, extracted blocks, images and provenance
```

- `knights-tour/lesson.json`: Vietnamese lesson bundle for draft imports; the published version lives in `seeds/backtracking.json`.
- `*/code-lesson.json`: code and its step-by-step explanations.
- `hamilton/learning-outline.json`: authored Hamilton theory blocks.
- `references/openstax-hamilton/blocks.json`: extracted textbook blocks for explicit import; includes the figures referenced by Knight's Tour practice.
- `references/openstax-hamilton/blocks-before-outline.json`: historical block snapshot, retained for comparison.
- `references/openstax-hamilton/manifest.json`: downloaded image mapping and attribution.
- The textbook HTML snapshots in the two reference folders are retained from their respective preparation runs.

## Preparation

Run from the repository root:

```sh
python3 be/algorithms/tools/import_openstax_hamilton.py
```

The OpenStax script downloads reference material and writes local JSON files.
`prepare_knights_tour.py` is a historical English draft generator; running it
would replace the reviewed Vietnamese `knights-tour/lesson.json`. The OpenStax
script uses Django's environment and uploads images to S3 when
`LESSON_ASSETS_ON_S3=True`; otherwise it writes images locally. See
[S3 setup and existing-image upload](../docs/STORAGE.md).
They do not update the database. Preparing OpenStax blocks again replaces its extracted
`blocks.json`; review the result before importing it.

## Import paths

Run from `be/` or in the backend container:

```sh
python manage.py import_code_lesson backtracking/hamiltonean-cycles algorithms/data/hamilton/code-lesson.json --dry-run
python manage.py import_lesson_blocks backtracking/hamiltonean-cycles algorithms/data/hamilton/learning-outline.json --dry-run
python manage.py import_algorithm_lesson backtracking/knights-tour-problem algorithms/data/knights-tour/lesson.json --dry-run
```

For textbook block imports, use
`algorithms/data/references/openstax-hamilton/blocks.json`. Public lesson images
use `fe/public/lesson-assets/openstax/` in local mode. In S3 mode the API returns
signed `image_url` values while preserving stable image paths in lessons and seeds.
