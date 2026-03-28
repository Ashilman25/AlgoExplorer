const insertionsort = {
  pseudocode: [
    'InsertionSort(arr):',
    '  n <- length(arr)',
    '  for i <- 1 to n - 1:',
    '    key <- arr[i]',
    '    j <- i - 1',
    '    while j >= 0 and arr[j] > key:',
    '      arr[j+1] <- arr[j]',
    '      j <- j - 1',
    '    arr[j+1] <- key',
    '  return arr',
  ],
  code: {
    python: `def insertionsort(arr):
    n = len(arr)
    for i in range(1, n):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr


# Usage
data = [8, 3, 1, 7, 0, 10, 2]
insertionsort(data)
print(data)`,

    javascript: `function insertionsort(arr) {
  const n = arr.length;
  for (let i = 1; i < n; i++) {
    const key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
  return arr;
}

// Usage
const data = [8, 3, 1, 7, 0, 10, 2];
insertionsort(data);
console.log(data);`,

    java: `public class InsertionSort {
    public static void insertionsort(int[] arr) {
        int n = arr.length;
        for (int i = 1; i < n; i++) {
            int key = arr[i];
            int j = i - 1;
            while (j >= 0 && arr[j] > key) {
                arr[j + 1] = arr[j];
                j--;
            }
            arr[j + 1] = key;
        }
    }

    public static void main(String[] args) {
        int[] data = {8, 3, 1, 7, 0, 10, 2};
        insertionsort(data);
        System.out.println(java.util.Arrays.toString(data));
    }
}`,

    cpp: `#include <iostream>
#include <vector>
using namespace std;

void insertionsort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 1; i < n; i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}

int main() {
    vector<int> data = {8, 3, 1, 7, 0, 10, 2};
    insertionsort(data);
    for (int x : data) cout << x << " ";
    return 0;
}`,
  },
};

export default insertionsort;
