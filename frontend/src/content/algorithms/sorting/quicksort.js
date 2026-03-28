const quicksort = {
  pseudocode: [
    'QuickSort(arr, low, high):',
    '  if low >= high: return',
    '  pivotIndex <- Partition(arr, low, high)',
    '  QuickSort(arr, low, pivotIndex - 1)',
    '  QuickSort(arr, pivotIndex + 1, high)',
    '',
    'Partition(arr, low, high):',
    '  pivot <- arr[high]',
    '  i <- low - 1',
    '  for j <- low to high - 1:',
    '    if arr[j] <= pivot:',
    '      i <- i + 1',
    '      swap arr[i] and arr[j]',
    '  swap arr[i+1] and arr[high]',
    '  return i + 1',
  ],
  code: {
    python: `def quicksort(arr, low, high):
    if low >= high:
        return
    pivot_index = partition(arr, low, high)
    quicksort(arr, low, pivot_index - 1)
    quicksort(arr, pivot_index + 1, high)


def partition(arr, low, high):
    pivot = arr[high]
    i = low - 1
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1


# Usage
data = [8, 3, 1, 7, 0, 10, 2]
quicksort(data, 0, len(data) - 1)
print(data)`,

    javascript: `function quicksort(arr, low, high) {
  if (low >= high) return;
  const pivotIndex = partition(arr, low, high);
  quicksort(arr, low, pivotIndex - 1);
  quicksort(arr, pivotIndex + 1, high);
}

function partition(arr, low, high) {
  const pivot = arr[high];
  let i = low - 1;
  for (let j = low; j < high; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  return i + 1;
}

// Usage
const data = [8, 3, 1, 7, 0, 10, 2];
quicksort(data, 0, data.length - 1);
console.log(data);`,

    java: `public class QuickSort {
    public static void quicksort(int[] arr, int low, int high) {
        if (low >= high) return;
        int pivotIndex = partition(arr, low, high);
        quicksort(arr, low, pivotIndex - 1);
        quicksort(arr, pivotIndex + 1, high);
    }

    private static int partition(int[] arr, int low, int high) {
        int pivot = arr[high];
        int i = low - 1;
        for (int j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;
                int temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
        }
        int temp = arr[i + 1];
        arr[i + 1] = arr[high];
        arr[high] = temp;
        return i + 1;
    }

    public static void main(String[] args) {
        int[] data = {8, 3, 1, 7, 0, 10, 2};
        quicksort(data, 0, data.length - 1);
        System.out.println(java.util.Arrays.toString(data));
    }
}`,

    cpp: `#include <iostream>
#include <vector>
using namespace std;

int partition(vector<int>& arr, int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] <= pivot) {
            i++;
            swap(arr[i], arr[j]);
        }
    }
    swap(arr[i + 1], arr[high]);
    return i + 1;
}

void quicksort(vector<int>& arr, int low, int high) {
    if (low >= high) return;
    int pivotIndex = partition(arr, low, high);
    quicksort(arr, low, pivotIndex - 1);
    quicksort(arr, pivotIndex + 1, high);
}

int main() {
    vector<int> data = {8, 3, 1, 7, 0, 10, 2};
    quicksort(data, 0, data.size() - 1);
    for (int x : data) cout << x << " ";
    return 0;
}`,
  },
};

export default quicksort;
