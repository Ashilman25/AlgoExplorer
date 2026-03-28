const editDistance = {
  pseudocode: [
    'EditDistance(A, B):',
    '  m <- length(A)',
    '  n <- length(B)',
    '  create table dp[0..m][0..n]',
    '  for i <- 0 to m: dp[i][0] <- i',
    '  for j <- 0 to n: dp[0][j] <- j',
    '  for i <- 1 to m:',
    '    for j <- 1 to n:',
    '      if A[i] == B[j]:',
    '        dp[i][j] <- dp[i-1][j-1]',
    '      else:',
    '        dp[i][j] <- 1 + min(dp[i-1][j],    // delete',
    '                             dp[i][j-1],    // insert',
    '                             dp[i-1][j-1])  // replace',
    '  return dp[m][n]',
  ],

  code: {
    python: `def edit_distance(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],      # delete
                    dp[i][j - 1],      # insert
                    dp[i - 1][j - 1],  # replace
                )

    return dp[m][n]


# Usage
print(edit_distance("kitten", "sitting"))  # 3`,

    javascript: `function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],      // delete
          dp[i][j - 1],      // insert
          dp[i - 1][j - 1]   // replace
        );
      }
    }
  }

  return dp[m][n];
}

// Usage
console.log(editDistance("kitten", "sitting")); // 3`,

    java: `public class EditDistance {
    public static int editDistance(String a, String b) {
        int m = a.length();
        int n = b.length();
        int[][] dp = new int[m + 1][n + 1];

        for (int i = 0; i <= m; i++) dp[i][0] = i;
        for (int j = 0; j <= n; j++) dp[0][j] = j;

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a.charAt(i - 1) == b.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j],      // delete
                        Math.min(
                            dp[i][j - 1],      // insert
                            dp[i - 1][j - 1]   // replace
                        )
                    );
                }
            }
        }

        return dp[m][n];
    }

    public static void main(String[] args) {
        System.out.println(editDistance("kitten", "sitting")); // 3
    }
}`,

    cpp: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

int editDistance(const string& a, const string& b) {
    int m = a.size();
    int n = b.size();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));

    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + min({
                    dp[i - 1][j],      // delete
                    dp[i][j - 1],      // insert
                    dp[i - 1][j - 1]   // replace
                });
            }
        }
    }

    return dp[m][n];
}

int main() {
    cout << editDistance("kitten", "sitting") << endl; // 3
    return 0;
}`,
  },
};

export default editDistance;
