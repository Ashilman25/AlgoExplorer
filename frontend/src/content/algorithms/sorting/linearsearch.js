const linearsearch = {
  pseudocode: [
    'LinearSearch(arr, target):',
    '  n <- length(arr)',
    '  for i <- 0 to n - 1:',
    '    if arr[i] == target:',
    '      return i',
    '  return -1',
  ],
  code: {
    python: `def linear_search(arr, target):
    for i in range(len(arr)):
        if arr[i] == target:
            return i
    return -1


# Usage
data = [8, 3, 1, 7, 0, 10, 2]
target = 7
result = linear_search(data, target)
if result != -1:
    print(f"Found {target} at index {result}")
else:
    print(f"{target} not found")`,

    javascript: `function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) {
      return i;
    }
  }
  return -1;
}

// Usage
const data = [8, 3, 1, 7, 0, 10, 2];
const target = 7;
const result = linearSearch(data, target);
if (result !== -1) {
  console.log(\`Found \${target} at index \${result}\`);
} else {
  console.log(\`\${target} not found\`);
}`,

    java: `public class LinearSearch {
    public static int linearSearch(int[] arr, int target) {
        for (int i = 0; i < arr.length; i++) {
            if (arr[i] == target) {
                return i;
            }
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] data = {8, 3, 1, 7, 0, 10, 2};
        int target = 7;
        int result = linearSearch(data, target);
        if (result != -1) {
            System.out.println("Found " + target + " at index " + result);
        } else {
            System.out.println(target + " not found");
        }
    }
}`,

    cpp: `#include <iostream>
#include <vector>
using namespace std;

int linearSearch(const vector<int>& arr, int target) {
    for (int i = 0; i < (int)arr.size(); i++) {
        if (arr[i] == target) {
            return i;
        }
    }
    return -1;
}

int main() {
    vector<int> data = {8, 3, 1, 7, 0, 10, 2};
    int target = 7;
    int result = linearSearch(data, target);
    if (result != -1) {
        cout << "Found " << target << " at index " << result << endl;
    } else {
        cout << target << " not found" << endl;
    }
    return 0;
}`,
  },
};

export default linearsearch;
