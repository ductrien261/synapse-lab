#include <iostream>
#include <vector>
using namespace std;
int n;
long long target;
vector<long long> a, suffix;
vector<int> chosen;
bool found = false;
void search(int i, long long sum) {
    if (sum == target) {
        found = true;
        cout << "Indices:";
        for (int j : chosen) cout << ' ' << j + 1;
        cout << '\n';
        return;
    }
    if (i == n || sum > target || sum + suffix[i] < target) return;
    chosen.push_back(i);
    search(i + 1, sum + a[i]);
    chosen.pop_back();
    search(i + 1, sum);
}
int main() {
    if (!(cin >> n >> target) || n < 0 || n > 20 || target < 0 || target > 1000000000LL) return 1;
    a.resize(n); suffix.assign(n + 1, 0);
    for (auto &v : a) if (!(cin >> v) || v <= 0 || v > 1000000000LL) return 1;
    for (int i = n - 1; i >= 0; --i) suffix[i] = suffix[i + 1] + a[i];
    search(0, 0);
    if (!found) cout << "No solution\n";
}
