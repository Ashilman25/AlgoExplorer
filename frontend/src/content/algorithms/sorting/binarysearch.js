const binarysearch = {
  pseudocode: [
    'BinarySearch(arr, target):',
    '  low <- 0',
    '  high <- length(arr) - 1',
    '  while low <= high:',
    '    mid <- (low + high) / 2',
    '    if arr[mid] == target:',
    '      return mid',
    '    else if arr[mid] < target:',
    '      low <- mid + 1',
    '    else:',
    '      high <- mid - 1',
    '  return -1',
  ],
  code: {
    python: `def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1


# Usage
data = [0, 1, 2, 3, 7, 8, 10]
target = 7
result = binary_search(data, target)
if result != -1:
    print(f"Found {target} at index {result}")
else:
    print(f"{target} not found")`,

    javascript: `function binarySearch(arr, target) {
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return -1;
}

// Usage
const data = [0, 1, 2, 3, 7, 8, 10];
const target = 7;
const result = binarySearch(data, target);
if (result !== -1) {
  console.log(\`Found \${target} at index \${result}\`);
} else {
  console.log(\`\${target} not found\`);
}`,

    java: `public class BinarySearch {
    public static int binarySearch(int[] arr, int target) {
        int low = 0;
        int high = arr.length - 1;
        while (low <= high) {
            int mid = (low + high) / 2;
            if (arr[mid] == target) {
                return mid;
            } else if (arr[mid] < target) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] data = {0, 1, 2, 3, 7, 8, 10};
        int target = 7;
        int result = binarySearch(data, target);
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

int binarySearch(const vector<int>& arr, int target) {
    int low = 0;
    int high = arr.size() - 1;
    while (low <= high) {
        int mid = (low + high) / 2;
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}

int main() {
    vector<int> data = {0, 1, 2, 3, 7, 8, 10};
    int target = 7;
    int result = binarySearch(data, target);
    if (result != -1) {
        cout << "Found " << target << " at index " << result << endl;
    } else {
        cout << target << " not found" << endl;
    }
    return 0;
}`,
  },
};

export default binarysearch;
