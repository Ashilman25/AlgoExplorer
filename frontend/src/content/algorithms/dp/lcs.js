const lcs = {
  pseudocode: [
    'LCS(X, Y):',
    '  m <- length(X)',
    '  n <- length(Y)',
    '  create table dp[0..m][0..n], initialized to 0',
    '  for i <- 1 to m:',
    '    for j <- 1 to n:',
    '      if X[i] == Y[j]:',
    '        dp[i][j] <- dp[i-1][j-1] + 1',
    '      else:',
    '        dp[i][j] <- max(dp[i-1][j], dp[i][j-1])',
    '  return dp[m][n]',
  ],

  code: {
    python: `def lcs(x, y):
    m, n = len(x), len(y)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if x[i - 1] == y[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    return dp[m][n]


# Usage
print(lcs("ABCBDAB", "BDCAB"))  # 4`,

    javascript: `function lcs(x, y) {
  const m = x.length;
  const n = y.length;
  const dp = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (x[i - 1] === y[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}

// Usage
console.log(lcs("ABCBDAB", "BDCAB")); // 4`,

    java: `public class LCS {
    public static int lcs(String x, String y) {
        int m = x.length();
        int n = y.length();
        int[][] dp = new int[m + 1][n + 1];

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (x.charAt(i - 1) == y.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        return dp[m][n];
    }

    public static void main(String[] args) {
        System.out.println(lcs("ABCBDAB", "BDCAB")); // 4
    }
}`,

    cpp: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

int lcs(const string& x, const string& y) {
    int m = x.size();
    int n = y.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (x[i - 1] == y[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    return dp[m][n];
}

int main() {
    cout << lcs("ABCBDAB", "BDCAB") << endl; // 4
    return 0;
}`,
  },
};

export default lcs;
