const coinChange = {
  pseudocode: [
    'CoinChange(coins, target):',
    '  create array dp[0..target]',
    '  dp[0] <- 0',
    '  for i <- 1 to target: dp[i] <- infinity',
    '  for each coin in coins:',
    '    for amount <- coin to target:',
    '      dp[amount] <- min(dp[amount], dp[amount - coin] + 1)',
    '  if dp[target] == infinity: return -1',
    '  return dp[target]',
  ],

  code: {
    python: `def coin_change(coins, target):
    dp = [float("inf")] * (target + 1)
    dp[0] = 0

    for coin in coins:
        for amount in range(coin, target + 1):
            dp[amount] = min(dp[amount], dp[amount - coin] + 1)

    return dp[target] if dp[target] != float("inf") else -1


# Usage
coins = [1, 5, 10, 25]
print(coin_change(coins, 30))  # 2 (25 + 5)`,

    javascript: `function coinChange(coins, target) {
  const dp = new Array(target + 1).fill(Infinity);
  dp[0] = 0;

  for (const coin of coins) {
    for (let amount = coin; amount <= target; amount++) {
      dp[amount] = Math.min(dp[amount], dp[amount - coin] + 1);
    }
  }

  return dp[target] === Infinity ? -1 : dp[target];
}

// Usage
const coins = [1, 5, 10, 25];
console.log(coinChange(coins, 30)); // 2 (25 + 5)`,

    java: `import java.util.Arrays;

public class CoinChange {
    public static int coinChange(int[] coins, int target) {
        int[] dp = new int[target + 1];
        Arrays.fill(dp, Integer.MAX_VALUE);
        dp[0] = 0;

        for (int coin : coins) {
            for (int amount = coin; amount <= target; amount++) {
                if (dp[amount - coin] != Integer.MAX_VALUE) {
                    dp[amount] = Math.min(dp[amount],
                                          dp[amount - coin] + 1);
                }
            }
        }

        return dp[target] == Integer.MAX_VALUE ? -1 : dp[target];
    }

    public static void main(String[] args) {
        int[] coins = {1, 5, 10, 25};
        System.out.println(coinChange(coins, 30)); // 2
    }
}`,

    cpp: `#include <iostream>
#include <vector>
#include <algorithm>
#include <climits>
using namespace std;

int coinChange(const vector<int>& coins, int target) {
    vector<int> dp(target + 1, INT_MAX);
    dp[0] = 0;

    for (int coin : coins) {
        for (int amount = coin; amount <= target; amount++) {
            if (dp[amount - coin] != INT_MAX) {
                dp[amount] = min(dp[amount],
                                 dp[amount - coin] + 1);
            }
        }
    }

    return dp[target] == INT_MAX ? -1 : dp[target];
}

int main() {
    vector<int> coins = {1, 5, 10, 25};
    cout << coinChange(coins, 30) << endl; // 2
    return 0;
}`,
  },
};

export default coinChange;
