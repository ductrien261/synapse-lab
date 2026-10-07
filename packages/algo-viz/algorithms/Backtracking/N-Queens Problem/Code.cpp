#include <iostream>
#include <vector>
#include <cstdlib>
using namespace std;
int n;
vector<int> col;
bool safe(int row, int c) {
    for (int r = 0; r < row; ++r)
        if (col[r] == c || abs(r-row) == abs(col[r]-c)) return false;
    return true;
}
bool solve(int row) {
    if (row == n) return true;
    for (int c = 0; c < n; ++c) {
        if (!safe(row, c)) continue;
        col[row] = c;
        if (solve(row + 1)) return true;
        col[row] = -1;
    }
    return false;
}
int main() {
    if (!(cin >> n) || n < 1 || n > 12) return 1;
    col.assign(n, -1);
    if (!solve(0)) cout << "No solution\n";
    else {
        for (int c : col) cout << c + 1 << ' ';
        cout << '\n';
    }
}
