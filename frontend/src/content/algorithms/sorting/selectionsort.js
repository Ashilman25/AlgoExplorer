const selectionsort = {
  pseudocode: [
    'SelectionSort(arr):',
    '  n <- length(arr)',
    '  for i <- 0 to n - 1:',
    '    minIdx <- i',
    '    for j <- i + 1 to n - 1:',
    '      if arr[j] < arr[minIdx]:',
    '        minIdx <- j',
    '    if minIdx != i:',
    '      swap arr[i] and arr[minIdx]',
    '  return arr',
  ],
  code: {
    python: `def selectionsort(arr):
    n = len(arr)
    for i in range(n):
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        if min_idx != i:
            arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr


# Usage
data = [8, 3, 1, 7, 0, 10, 2]
selectionsort(data)
print(data)`,

    javascript: `function selectionsort(arr) {
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      if (arr[j] < arr[minIdx]) {
        minIdx = j;
      }
    }
    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
    }
  }
  return arr;
}

// Usage
const data = [8, 3, 1, 7, 0, 10, 2];
selectionsort(data);
console.log(data);`,

    java: `public class SelectionSort {
    public static void selectionsort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n; i++) {
            int minIdx = i;
            for (int j = i + 1; j < n; j++) {
                if (arr[j] < arr[minIdx]) {
                    minIdx = j;
                }
            }
            if (minIdx != i) {
                int temp = arr[i];
                arr[i] = arr[minIdx];
                arr[minIdx] = temp;
            }
        }
    }

    public static void main(String[] args) {
        int[] data = {8, 3, 1, 7, 0, 10, 2};
        selectionsort(data);
        System.out.println(java.util.Arrays.toString(data));
    }
}`,

    cpp: `#include <iostream>
#include <vector>
using namespace std;

void selectionsort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n; i++) {
        int minIdx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIdx]) {
                minIdx = j;
            }
        }
        if (minIdx != i) {
            swap(arr[i], arr[minIdx]);
        }
    }
}

int main() {
    vector<int> data = {8, 3, 1, 7, 0, 10, 2};
    selectionsort(data);
    for (int x : data) cout << x << " ";
    return 0;
}`,
  },
};

export default selectionsort;
