const fibonacci = {
  pseudocode: [
    'Fibonacci(n):',
    '  if n <= 2: return 1',
    '  create array dp[1..n]',
    '  dp[1] <- 1',
    '  dp[2] <- 1',
    '  for i <- 3 to n:',
    '    dp[i] <- dp[i-1] + dp[i-2]',
    '  return dp[n]',
  ],

  code: {
    python: `def fibonacci(n):
    if n <= 2:
        return 1

    dp = [0] * (n + 1)
    dp[1] = 1
    dp[2] = 1

    for i in range(3, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]

    return dp[n]


# Usage
print(fibonacci(10))  # 55`,

    javascript: `function fibonacci(n) {
  if (n <= 2) return 1;

  const dp = new Array(n + 1).fill(0);
  dp[1] = 1;
  dp[2] = 1;

  for (let i = 3; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }

  return dp[n];
}

// Usage
console.log(fibonacci(10)); // 55`,

    java: `public class Fibonacci {
    public static int fibonacci(int n) {
        if (n <= 2) return 1;

        int[] dp = new int[n + 1];
        dp[1] = 1;
        dp[2] = 1;

        for (int i = 3; i <= n; i++) {
            dp[i] = dp[i - 1] + dp[i - 2];
        }

        return dp[n];
    }

    public static void main(String[] args) {
        System.out.println(fibonacci(10)); // 55
    }
}`,

    cpp: `#include <iostream>
#include <vector>
using namespace std;

int fibonacci(int n) {
    if (n <= 2) return 1;

    vector<int> dp(n + 1, 0);
    dp[1] = 1;
    dp[2] = 1;

    for (int i = 3; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }

    return dp[n];
}

int main() {
    cout << fibonacci(10) << endl; // 55
    return 0;
}`,
  },
};

export default fibonacci;
