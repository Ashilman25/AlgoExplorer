const heapsort = {
  pseudocode: [
    'HeapSort(arr):',
    '  n <- length(arr)',
    '  for i <- n/2 - 1 down to 0:',
    '    Heapify(arr, n, i)',
    '  for i <- n - 1 down to 1:',
    '    swap arr[0] and arr[i]',
    '    Heapify(arr, i, 0)',
    '',
    'Heapify(arr, size, root):',
    '  largest <- root',
    '  left <- 2 * root + 1',
    '  right <- 2 * root + 2',
    '  if left < size and arr[left] > arr[largest]:',
    '    largest <- left',
    '  if right < size and arr[right] > arr[largest]:',
    '    largest <- right',
    '  if largest != root:',
    '    swap arr[root] and arr[largest]',
    '    Heapify(arr, size, largest)',
  ],
  code: {
    python: `def heapsort(arr):
    n = len(arr)
    # Build max heap
    for i in range(n // 2 - 1, -1, -1):
        heapify(arr, n, i)
    # Extract elements one by one
    for i in range(n - 1, 0, -1):
        arr[0], arr[i] = arr[i], arr[0]
        heapify(arr, i, 0)


def heapify(arr, size, root):
    largest = root
    left = 2 * root + 1
    right = 2 * root + 2
    if left < size and arr[left] > arr[largest]:
        largest = left
    if right < size and arr[right] > arr[largest]:
        largest = right
    if largest != root:
        arr[root], arr[largest] = arr[largest], arr[root]
        heapify(arr, size, largest)


# Usage
data = [8, 3, 1, 7, 0, 10, 2]
heapsort(data)
print(data)`,

    javascript: `function heapsort(arr) {
  const n = arr.length;
  // Build max heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(arr, n, i);
  }
  // Extract elements one by one
  for (let i = n - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];
    heapify(arr, i, 0);
  }
}

function heapify(arr, size, root) {
  let largest = root;
  const left = 2 * root + 1;
  const right = 2 * root + 2;
  if (left < size && arr[left] > arr[largest]) largest = left;
  if (right < size && arr[right] > arr[largest]) largest = right;
  if (largest !== root) {
    [arr[root], arr[largest]] = [arr[largest], arr[root]];
    heapify(arr, size, largest);
  }
}

// Usage
const data = [8, 3, 1, 7, 0, 10, 2];
heapsort(data);
console.log(data);`,

    java: `public class HeapSort {
    public static void heapsort(int[] arr) {
        int n = arr.length;
        // Build max heap
        for (int i = n / 2 - 1; i >= 0; i--) {
            heapify(arr, n, i);
        }
        // Extract elements one by one
        for (int i = n - 1; i > 0; i--) {
            int temp = arr[0];
            arr[0] = arr[i];
            arr[i] = temp;
            heapify(arr, i, 0);
        }
    }

    private static void heapify(int[] arr, int size, int root) {
        int largest = root;
        int left = 2 * root + 1;
        int right = 2 * root + 2;
        if (left < size && arr[left] > arr[largest]) largest = left;
        if (right < size && arr[right] > arr[largest]) largest = right;
        if (largest != root) {
            int temp = arr[root];
            arr[root] = arr[largest];
            arr[largest] = temp;
            heapify(arr, size, largest);
        }
    }

    public static void main(String[] args) {
        int[] data = {8, 3, 1, 7, 0, 10, 2};
        heapsort(data);
        System.out.println(java.util.Arrays.toString(data));
    }
}`,

    cpp: `#include <iostream>
#include <vector>
using namespace std;

void heapify(vector<int>& arr, int size, int root) {
    int largest = root;
    int left = 2 * root + 1;
    int right = 2 * root + 2;
    if (left < size && arr[left] > arr[largest]) largest = left;
    if (right < size && arr[right] > arr[largest]) largest = right;
    if (largest != root) {
        swap(arr[root], arr[largest]);
        heapify(arr, size, largest);
    }
}

void heapsort(vector<int>& arr) {
    int n = arr.size();
    // Build max heap
    for (int i = n / 2 - 1; i >= 0; i--) {
        heapify(arr, n, i);
    }
    // Extract elements one by one
    for (int i = n - 1; i > 0; i--) {
        swap(arr[0], arr[i]);
        heapify(arr, i, 0);
    }
}

int main() {
    vector<int> data = {8, 3, 1, 7, 0, 10, 2};
    heapsort(data);
    for (int x : data) cout << x << " ";
    return 0;
}`,
  },
};

export default heapsort;
