#include <iostream>
#include <vector>
using namespace std;

int n;
vector<vector<int>> board;
const int dr[8] = {2, 1, -1, -2, -2, -1, 1, 2};
const int dc[8] = {1, 2, 2, 1, -1, -2, -2, -1};

bool knightTour(int row, int col, int visitedCount) {
    if (visitedCount == n * n) return true;
    for (int i = 0; i < 8; ++i) {
        int nextRow = row + dr[i];
        int nextCol = col + dc[i];
        if (nextRow < 0 || nextRow >= n || nextCol < 0 || nextCol >= n) continue;
        if (board[nextRow][nextCol] != -1) continue;
        board[nextRow][nextCol] = visitedCount;
        if (knightTour(nextRow, nextCol, visitedCount + 1)) return true;
        board[nextRow][nextCol] = -1;
    }
    return false;
}

int main() {
    if (!(cin >> n) || n < 1 || n > 5) {
        cout << "Use a board size from 1 to 5.\n";
        return 1;
    }
    board.assign(n, vector<int>(n, -1));
    board[0][0] = 0;
    if (!knightTour(0, 0, 1)) {
        cout << "Solution does not exist\n";
        return 0;
    }
    for (const auto& row : board) {
        for (int value : row) cout << value << ' ';
        cout << '\n';
    }
    return 0;
}
