"""Prepare English Knight's Tour sources and structured lesson; no DB writes."""
import json
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'knights-tour'
OUT.mkdir(parents=True, exist_ok=True)
SOURCES = ROOT / 'data' / 'references' / 'knights-tour'
SOURCES.mkdir(parents=True, exist_ok=True)
REPO = 'https://github.com/algorithm-visualizer/algorithms/tree/master/Backtracking/Knight%27s%20Tour%20Problem'
RAW = 'https://raw.githubusercontent.com/algorithm-visualizer/algorithms/master/Backtracking/Knight%27s%20Tour%20Problem/'
for filename in ['README.md', 'code.js']:
    response = requests.get(RAW + filename, timeout=30)
    response.raise_for_status()
    (SOURCES / filename).write_text(response.text, encoding='utf-8')
for slug in ['12-7-hamilton-cycles', '12-8-hamilton-paths']:
    response = requests.get('https://openstax.org/books/contemporary-mathematics/pages/' + slug, timeout=45)
    response.raise_for_status()
    (SOURCES / (slug + '.html')).write_text(response.text, encoding='utf-8')

ATTR = 'Synapse Lab — original English teaching notes based on the algorithm-visualizer backtracking implementation (MIT). These notes are not copied textbook prose.'
def block(id, kind, title, text, **values):
    result = dict(id=id, kind=kind, title=title, text=text, image='', alt='', caption='', source=REPO, attribution=ATTR, answerType='essay', options='', answer='', hint='', solution='')
    result.update(values)
    return result
readme = (SOURCES / 'README.md').read_text()
intro = readme.split('\n![Knight')[0].replace('# Knight\'s Tour Problem\n\n', '').replace('**', '').replace('`', '').strip()
lessons = [
block('knight-learning-1', 'theory', "What is the Knight's Tour problem?", '''The goal
Given an N × N board and a starting square, find a sequence of legal knight moves that visits every square exactly once. A route through V = N² squares contains V − 1 moves: the starting square is already the first visit. The problem asks for a complete route, not a shortest route to one destination.

Legal movement
A knight changes one coordinate by two squares and the other by one. From (r,c), a destination (r′,c′) is a knight neighbor when (|r′−r|, |c′−c|) is either (2,1) or (1,2), and the destination lies inside the board. Intermediate squares are irrelevant because a knight jumps. Near an edge, fewer than eight destinations are available.

Open and closed tours
A closed tour has a final square that is a knight neighbor of the start, allowing one extra move to close the route. An open tour has no such closing move. The supplied solver accepts a complete route without testing whether it can close; it does not specifically require an open tour. Revisiting the start to close a tour is an extra closing move, not a second visit in the stored V-square route.

Why this is a search problem
A legal next move can still leave the remaining squares impossible to cover. Local legality does not guarantee a complete solution. We therefore need to explore alternatives and reconsider choices. Backtracking is the search method used here; Knight's Tour is the problem being solved. Before continuing, recall arrays, recursion, and the distinction between a graph vertex and an edge.'''),
block('knight-learning-2', 'theory', 'Input, output and search state', '''Input and expected result
The mathematical input is the board size and a valid starting square. This implementation fixes the start at (0,0). A successful output assigns each square a distinct visit number from 0 to N² − 1, with consecutive numbers connected by a legal knight move. Failure means that exhaustive search found no complete route for this board and start. Reaching a time limit alone would not prove that no route exists.

Representing the current route
Coordinates are zero-based (row, column). board[r][c] = −1 means the square is absent from the current route; a nonnegative value records its position in that route. “Visited” is branch-specific: a square can be visited in one attempted route and then become available after that route is abandoned. The board is both a membership check and a record of the route, so a separate route list is unnecessary here.

Meaning of a recursive call
SEARCH(row, col, visitedCount) asks: can the current partial route be extended to cover the entire board? The current square has visit number visitedCount − 1. Exactly visitedCount squares are marked, and the next square will receive visitedCount. The JavaScript calls this counter moveNum; it counts visited squares, not completed moves.

Initialization and stopping
Fill the board with −1, mark board[0][0] = 0, and call SEARCH(0,0,1). When visitedCount = N², all squares are covered. For N = 1, this succeeds immediately with zero moves. For larger boards, availability of a solution is not assumed. The repository visualization uses N = 3; the C++ example accepts sizes 1 through 5 as a demonstration restriction, not as a mathematical rule about tours.'''),
block('knight-learning-3', 'theory', 'How backtracking works', '''The search tree
Imagine each node as a partial route. Each child adds one legal, unvisited destination. The root contains only the starting square; a successful leaf contains all N² squares. A dead end is an incomplete route with no legal extension. Different routes ending on the same square can have different available moves because their visited squares differ.

Why use backtracking?
Choosing a legal destination gives only a tentative solution. Backtracking performs depth-first search: extend one route as far as possible, then return to the latest decision when that route cannot succeed. It does not permanently commit to the first legal move, and it does not need to store every route at once.

Choose, explore, undo
Generate destinations using (2,1), (1,2), (−1,2), (−2,1), (−2,−1), (−1,−2), (1,−2), (2,−1). Reject out-of-bounds coordinates before accessing the board, then reject already marked squares. For a valid candidate, mark it with visitedCount and recursively search with visitedCount + 1. A true result propagates immediately, preserving the completed route. A false result requires resetting that candidate to −1 before trying the next one.

What failure means
A recursive false result says that this particular prefix has no successful continuation after all its candidates have been explored. It does not yet say that every route from the original start fails. Only false from the initial call establishes that conclusion. The caller owns the candidate mark it added and removes it when its child fails; deeper calls have already removed their own unsuccessful choices.

Termination and pruning
Every descent adds a previously unvisited square, so recursion cannot continue beyond N² visited squares. Each call has only eight candidate offsets. Bounds and visit checks prune invalid extensions. Their purpose is to enforce the problem constraints; they do not predict every future dead end.'''),
block('knight-learning-4', 'theory', 'Follow a small example', '''A concrete search on a 3 × 3 board
Start at (0,0), marked 0, with visitedCount = 1. Using the supplied offset order, the first valid destination is (2,1), marked 1. From there, (0,2) is the first valid unvisited destination, marked 2. The route now contains three squares but only two moves.

Following the first branch
Continue in the same order. The route becomes:
(0,0) → (2,1) → (0,2) → (1,0) → (2,2) → (0,1) → (2,0) → (1,2).
These eight squares have visit numbers 0 through 7. The center (1,1) is still −1, so visitedCount = 8 is not the success condition of 9.

Encountering a dead end
From (1,2), the only in-bounds knight neighbors are (0,0) and (2,0), both already visited. Every other offset goes outside the board. This call returns false. Its caller, at (2,0), resets board[1][2] from 7 to −1. The earlier seven marks remain while that caller checks its remaining candidates.

Unwinding and trying alternatives
If (2,0) has no successful continuation, its caller removes its mark too. Failure can propagate through several levels. Eventually the initial call can try its other legal first move, (1,2), with only the start still marked. Undoing a choice means restoring the search state; it is not an extra move in the candidate tour.

Why every branch fails here
The center (1,1) has no knight neighbor: changing either coordinate by two leaves a 3 × 3 board. It is isolated in the knight graph and cannot be reached from the corner. Thus even visiting every outer square cannot complete a tour. This example explains both a local dead end and a board-wide reason for failure; the implementation itself discovers failure by exploring branches.'''),
block('knight-learning-5', 'theory', 'Why it is correct and what it costs', '''The invariant
At entry to SEARCH(row,col,k), exactly k squares are marked 0 through k − 1, with no duplicates; consecutive marks form legal knight moves; and (row,col) carries k − 1. An invariant is a property maintained throughout the search, not merely a check at the end.

Why a reported solution is valid
Initialization establishes the invariant with the single start square. A candidate is accepted only if it is in bounds, unvisited, and a knight move from the current square. Giving it mark k therefore preserves the invariant for the child call. At k = V = N², there are V distinct marked squares on a board of V squares, so every square is covered exactly once by a legal route. A closed-tour requirement would need an additional endpoint check.

Why failure is conclusive after exhaustive search
Suppose a completion exists for a partial route. Its next square must be one of the legal unvisited candidates examined by the loop. Recursively applying the same argument shows that the solver will reach that completion unless it has already found another solution. Restoring unsuccessful choices keeps later candidates available. Therefore returning false after all candidates fail excludes every completion of that prefix. Finite depth and finite branching guarantee termination for a finite board, although runtime can be impractical.

Time complexity
Let V = N². A call checks at most eight offsets, and a route contains at most V squares. Ignoring pruning gives at most 1 + 8 + 8² + … + 8^(V−1) search nodes, a geometric sum bounded by O(8^V) = O(8^(N²)). This is a loose worst-case upper bound for this backtracking solver, not an exact count or a lower bound for the problem. Actual runtime depends on board size, starting square, move order, dead ends, and how soon a complete tour is found.

Space complexity
The board stores V entries. At most V recursive calls are active together, each with a constant amount of local state, giving O(V) stack space and O(V) total solver space. Sequential branches reuse this memory; the entire search tree is not stored. Visualization logs and retained animation frames are separate overhead and may use more memory.'''),
block('knight-learning-6', 'theory', 'Connections and common mistakes', '''Graph interpretation
Build a graph with one vertex per square and an undirected edge for each legal knight move. A complete tour is a Hamiltonian path: it visits each vertex exactly once. If the endpoints are adjacent, the path can be closed into a Hamiltonian cycle. An Euler trail instead concerns using every edge exactly once, which is a different requirement. The knight graph has V = N² vertices and degree at most eight.

Useful structural reasoning
A knight move changes the parity of row + column, so it alternates checkerboard colors. A closed tour must therefore have an even number of squares. For a route that need not close, the two color counts can differ by at most one; if they differ by one, both endpoints must lie on the more numerous color. These are necessary conditions, not guarantees of a tour. Likewise, disconnected squares prevent a spanning route; the isolated center explains the 3 × 3 failure.

Move ordering and Warnsdorff's rule
Warnsdorff's rule prefers a candidate with fewer unvisited onward neighbors, aiming to visit constrained squares before they become inaccessible. Used only to reorder candidates while retaining full backtracking, it preserves exhaustive search. Used as a single greedy choice with no reconsideration, it does not guarantee success. The supplied solver uses the fixed offset order instead. Reordering candidates can change the first solution and runtime without changing the definition of a valid tour.

Common misunderstandings
A legal move is not proof that its branch will succeed. A failed branch is not proof that the whole board has no tour. A square abandoned by one branch must become available to another. The visited counter begins at 1 even though the start is numbered 0. Finally, covering every square does not by itself require returning to the start.

What this problem teaches
Knight's Tour connects recursive search, graph modeling, invariants, and reversible state changes. The same choose–explore–undo idea appears in constraint problems such as placing queens and filling puzzles. The key is to define the partial solution, valid next choices, completion condition, and exact state to restore.'''),
]
practice = [
block('knight-example-1','example','Legal moves from a corner','List all legal first moves from (0,0) on a 5 × 5 board.', solution='Only (2,1) and (1,2) are inside the board. The other six offsets produce a negative coordinate.'),
block('knight-example-2','example','A branch that must fail','Explain why the repository example with N = 3 cannot find a complete tour.', solution='The center square (1,1) has degree zero in the knight graph of a 3 × 3 board. A route starting at (0,0) cannot reach it, so it cannot cover all nine squares.'),
block('knight-exercise-1','exercise','Valid knight move','Which move is legal from (2,2) on a 5 × 5 board?', answerType='choice', options='(3,3)\n(4,3)\n(2,4)', answer='(4,3)', hint='The absolute coordinate changes must be 2 and 1.', solution='From (2,2) to (4,3), the row changes by 2 and the column by 1. The destination is inside the board.'),
block('knight-exercise-2','exercise','Base case','What should knightTour return when moveNum equals N × N?', answerType='short', answer='true', solution='moveNum counts squares already visited. All N² squares have been marked, so the route is complete.'),
block('knight-exercise-3','exercise','Restore the state','After a recursive branch returns false, why must board[nextRow][nextCol] be reset to -1?', answer='The candidate square must become available to later branches.', solution='Keeping the old mark would incorrectly treat a square from an abandoned route as visited, so later branches would be skipped.'),
block('knight-exercise-4','exercise','Tour versus closed tour','Which extra condition would a solver need at the base case to require a closed tour?', answer='The last square must be a legal knight move away from the starting square.', solution='Besides visiting every square, check absolute coordinate differences (1,2) or (2,1) between the last square and the start.'),
block('knight-exercise-5','exercise','Search complexity','With V squares and at most eight branches per search level, give a loose worst-case time bound and the auxiliary-space order.', answer='O(8^V) time and O(V) space.', solution='The recursion has depth at most V and at most eight candidate branches per level. The board and recursion stack each grow linearly in V.'),
]
# Retain relevant original English textbook exercises with their downloaded figures.
source_blocks = json.loads((ROOT / 'data' / 'references' / 'openstax-hamilton' / 'blocks.json').read_text())
for original in source_blocks:
    if original['kind'] != 'theory' and "A knight’s tour is a sequence" in original['text']:
        item = dict(original)
        item['id'] = 'knight-' + item['id']
        # A second figure remains attached to the same source exercise for the single-image schema.
        item['title'] = 'Knight tour and Hamiltonian paths' if '12-8' in item['id'] else 'Closed knight tour and Hamiltonian cycles'
        practice.append(item)
fields = dict(title="Knight's Tour Problem", summary='Find a sequence of legal knight moves that visits every board square exactly once, using backtracking.', objectives='Understand legal knight moves, recursive search, validity checks and state restoration. Prerequisites: two-dimensional arrays, loops, recursion and basic graph vocabulary.', problem=lessons[0]['text'], inputOutput=lessons[1]['text'], example=lessons[3]['text'], theory=lessons[2]['text'], pseudocode='SEARCH(row, col, visitedCount):\n  if visitedCount == N*N: return true\n  for each of the eight knight offsets:\n    compute nextRow, nextCol\n    if inside board and unvisited:\n      board[nextRow][nextCol] = visitedCount\n      if SEARCH(nextRow, nextCol, visitedCount + 1): return true\n      board[nextRow][nextCol] = -1\n  return false\n\nMark board[0][0] = 0 and call SEARCH(0, 0, 1).', complexity=lessons[4]['text'], applications=lessons[5]['text'], references=REPO+'\nOriginal JavaScript implementation and README (MIT repository).\nOpenStax: Donna Kirk, Contemporary Mathematics, sections 12.7 and 12.8; CC BY-NC-SA 4.0. Original English exercise prompts and existing downloaded figures retained; solutions are not fabricated.\nhttps://openstax.org/books/contemporary-mathematics/pages/12-7-hamilton-cycles\nhttps://openstax.org/books/contemporary-mathematics/pages/12-8-hamilton-paths\nSynapse Lab: original English teaching notes and worked practice items; C++ adaptation of the repository search. Not a translation of OpenStax.')
payload = dict(lesson_fields=fields, lesson_blocks=lessons+practice, summary=fields['summary'], theory=fields['theory'], applications=['Recursion and backtracking practice', 'Hamiltonian-path modeling on a knight graph'], time_worst='O(8^(N²)) loose upper bound', space='O(N²)', status='draft')
fields["references"] += '\n\nC++ implementation reference: https://github.com/wisn/knights-tour/blob/master/algorithms/backtracking.cpp (Wisnu Adi Nurcahyo, MIT). Synapse Lab uses a compact teaching implementation, with the same move order and zero-based visits as the visualization. The visualization executes the original JavaScript tracer; reviewed line mappings link its states to equivalent C++ statements.'

code_file = OUT / 'code-lesson.json'
if code_file.exists():
    payload['code_lesson'] = json.loads(code_file.read_text(encoding='utf-8'))
(OUT / 'lesson.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(f'Prepared {len(lessons)} knowledge sections and {len(practice)} practice blocks. No DB writes.')
