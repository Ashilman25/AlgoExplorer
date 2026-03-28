const bubblesort = {
  pseudocode: [
    'BubbleSort(arr):',
    '  n <- length(arr)',
    '  for i <- 0 to n - 1:',
    '    swapped <- false',
    '    for j <- 0 to n - i - 2:',
    '      if arr[j] > arr[j+1]:',
    '        swap arr[j] and arr[j+1]',
    '        swapped <- true',
    '    if not swapped:',
    '      break',
    '  return arr',
  ],
  code: {
    python: `def bubblesort(arr):
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr


# Usage
data = [8, 3, 1, 7, 0, 10, 2]
bubblesort(data)
print(data)`,

    javascript: `function bubblesort(arr) {
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return arr;
}

// Usage
const data = [8, 3, 1, 7, 0, 10, 2];
bubblesort(data);
console.log(data);`,

    java: `public class BubbleSort {
    public static void bubblesort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }

    public static void main(String[] args) {
        int[] data = {8, 3, 1, 7, 0, 10, 2};
        bubblesort(data);
        System.out.println(java.util.Arrays.toString(data));
    }
}`,

    cpp: `#include <iostream>
#include <vector>
using namespace std;

void bubblesort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n; i++) {
        bool swapped = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;
    }
}

int main() {
    vector<int> data = {8, 3, 1, 7, 0, 10, 2};
    bubblesort(data);
    for (int x : data) cout << x << " ";
    return 0;
}`,
  },
};

export default bubblesort;
