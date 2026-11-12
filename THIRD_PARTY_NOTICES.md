# Third-party notices

Synapse Lab includes, or is derived from, material made by others. That
material stays under its own licence; the repository-level [LICENSE](LICENSE)
does not apply to it. (Vietnamese: phần tài liệu và mã của bên thứ ba giữ giấy
phép riêng của họ, liệt kê dưới đây.)

When you add third-party material, add a row here in the same pull request.

## 1. Code

| Component | Where | Licence | Notes |
|---|---|---|---|
| algorithm-visualizer **tracers** | `packages/algo-viz/tracers/` | MIT, Copyright (c) 2019 Jinseo Jason Park | Licence file kept in the directory |
| algorithm-visualizer **server** | `packages/algo-viz/server/` | MIT (declared in upstream `package.json`; upstream has no LICENSE file) | Derived from <https://github.com/algorithm-visualizer/server> (author: Jinseo Park). Modified (simulation engine, code presentation) |
| algorithm-visualizer **algorithms** | `packages/algo-viz/algorithms/` | **No licence declared upstream** | Derived from <https://github.com/algorithm-visualizer/algorithms> (many contributors). Used for non-commercial study only, with attribution. **Must be re-checked with the upstream authors, or replaced with original code, before any commercial use.** Modified and extended (C++/TypeScript reference code, presentation metadata) |
| Knight's Tour C++ reference | `packages/algo-viz/algorithms/Backtracking/Knight's Tour Problem/Code.cpp`, `be/algorithms/data/references/knights-tour/Code.cpp` | MIT, Wisnu Adi Nurcahyo | Compact teaching adaptation of `algorithms/backtracking.cpp` from <https://github.com/wisn/knights-tour>; see `SOURCE.md` next to the code |

Upstream project: <https://github.com/algorithm-visualizer>.

JavaScript and Python dependencies are installed from their package registries;
each keeps its own licence (see `fe/package-lock.json`, `be/uv.lock`,
`ai/uv.lock`, `packages/algo-viz/*/package-lock.json`).

## 2. Educational content

| Material | Author | Licence | Used in |
|---|---|---|---|
| *Contemporary Mathematics*, sections 12.7 and 12.8 (OpenStax, Rice University) <https://openstax.org/books/contemporary-mathematics> | Donna Kirk | **CC BY-NC-SA 4.0** | See "OpenStax adaptations" below |
| *Algorithms*, chapters on Backtracking and Greedy <https://jeffe.cs.illinois.edu/teaching/algorithms/> | Jeff Erickson | CC BY 4.0 | Text extracted page by page into `be/knowledge/data/curated_cs_seed.json` |
| *Open Data Structures (in Python)* <https://opendatastructures.org> | Pat Morin | CC BY 2.5 CA | Text extracted into `be/knowledge/data/curated_cs_seed.json` |

Each entry of `curated_cs_seed.json` records its source URL, licence and page
numbers. Changes made: text extracted, split into passages, and (for lessons)
translated into Vietnamese and adapted. These changes are not endorsed by the
original authors.

### OpenStax adaptations (CC BY-NC-SA 4.0)

The following files contain text or figures from, or adaptations of,
*Contemporary Mathematics* and are therefore **also made available under
CC BY-NC-SA 4.0** (<https://creativecommons.org/licenses/by-nc-sa/4.0/>),
with attribution to Donna Kirk, OpenStax / Rice University:

- `be/algorithms/data/hamilton/learning-outline.json`
- `be/algorithms/data/knights-tour/lesson.json`
- `be/algorithms/data/references/openstax-hamilton/blocks.json`, `blocks-before-outline.json`, `manifest.json`
- `be/algorithms/data/seeds/backtracking.json` (the lesson parts adapted from OpenStax)
- `fe/public/lesson-assets/openstax/` (figure and `ATTRIBUTION.txt`)

**Commercial use:** this content is NonCommercial. It must be removed or
replaced before Synapse Lab, or any part containing it, is used commercially.

## 3. Content loaded at runtime (not stored in this repository)

- Textbooks ingested through the admin document tool (for example OpenStax
  titles) keep the licence recorded with each document and shown on the
  application's Sources page.
- 3D anatomy models are embedded from Sketchfab or imported from AnatomyTOOL.
  Each stays under the licence shown by its author on the model page.

## 4. Fonts

Be Vietnam Pro and Anton (SIL Open Font License 1.1) are loaded from Google
Fonts or downloaded when the Docker image is built. They are not stored in this
repository.

## 5. MIT licence text

The MIT components above are licensed under the following terms, with the
copyright notice of the respective upstream author:

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Copyright notices: Jinseo Jason Park (algorithm-visualizer tracers and server);
Wisnu Adi Nurcahyo (knights-tour). The upstream `algorithms` repository
declares no licence; see the table above.
