// C++ adaptation of Code.java: same ham/nextVal search and candidate order.
// Input: n, followed by an n-by-n adjacency matrix of 0/1 values.
#include <iostream>
#include <vector>
using namespace std;
int n, found = 0;
vector<vector<int>> adjacencyMatrix;
vector<int> x;

bool nextVal(int k) {
    while (true) {
        x[k] = (x[k] + 1) % (n + 1); // @try
        if (x[k] == n) { x[k] = -1; return false; } // @return
        if (adjacencyMatrix[x[k - 1]][x[k]] != 1) continue; // @edge
        int i = 0;
        for (; i < k; ++i) if (x[i] == x[k]) break; // @duplicate
        if (i != k) continue;
        if (k == n - 1 && adjacencyMatrix[x[k]][x[0]] != 1) continue; // @close
        return true; // @choose
    }
}
void ham(int k) {
    while (nextVal(k)) { // @backtrack
        if (k == n - 1) {
            found = 1; // @cycle
            for (int v : x) cout << v << ' ';
            cout << x[0] << '\n';
        } else {
            ham(k + 1); // @recurse
        }
    }
}
int main() {
    if (!(cin >> n) || n < 3 || n > 6) return 1;
    adjacencyMatrix.assign(n, vector<int>(n));
    for (auto &row : adjacencyMatrix)
        for (int &value : row)
            if (!(cin >> value) || (value != 0 && value != 1)) return 1;
    x.assign(n, -1); x[0] = 0;
    ham(1); // @start
    if (!found) cout << "No Hamiltonian cycle\n"; // @done
}
