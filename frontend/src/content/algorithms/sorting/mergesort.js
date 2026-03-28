const mergesort = {
  pseudocode: [
    'MergeSort(arr, left, right):',
    '  if left >= right: return',
    '  mid <- (left + right) / 2',
    '  MergeSort(arr, left, mid)',
    '  MergeSort(arr, mid + 1, right)',
    '  Merge(arr, left, mid, right)',
    '',
    'Merge(arr, left, mid, right):',
    '  L <- arr[left..mid]',
    '  R <- arr[mid+1..right]',
    '  i <- 0, j <- 0, k <- left',
    '  while i < |L| and j < |R|:',
    '    if L[i] <= R[j]:',
    '      arr[k] <- L[i]; i <- i + 1',
    '    else:',
    '      arr[k] <- R[j]; j <- j + 1',
    '    k <- k + 1',
    '  copy remaining L[i..] to arr[k..]',
    '  copy remaining R[j..] to arr[k..]',
  ],
  code: {
    python: `def mergesort(arr, left, right):
    if left >= right:
        return
    mid = (left + right) // 2
    mergesort(arr, left, mid)
    mergesort(arr, mid + 1, right)
    merge(arr, left, mid, right)


def merge(arr, left, mid, right):
    L = arr[left:mid + 1]
    R = arr[mid + 1:right + 1]
    i = j = 0
    k = left
    while i < len(L) and j < len(R):
        if L[i] <= R[j]:
            arr[k] = L[i]
            i += 1
        else:
            arr[k] = R[j]
            j += 1
        k += 1
    while i < len(L):
        arr[k] = L[i]
        i += 1
        k += 1
    while j < len(R):
        arr[k] = R[j]
        j += 1
        k += 1


# Usage
data = [8, 3, 1, 7, 0, 10, 2]
mergesort(data, 0, len(data) - 1)
print(data)`,

    javascript: `function mergesort(arr, left, right) {
  if (left >= right) return;
  const mid = Math.floor((left + right) / 2);
  mergesort(arr, left, mid);
  mergesort(arr, mid + 1, right);
  merge(arr, left, mid, right);
}

function merge(arr, left, mid, right) {
  const L = arr.slice(left, mid + 1);
  const R = arr.slice(mid + 1, right + 1);
  let i = 0, j = 0, k = left;
  while (i < L.length && j < R.length) {
    if (L[i] <= R[j]) {
      arr[k] = L[i];
      i++;
    } else {
      arr[k] = R[j];
      j++;
    }
    k++;
  }
  while (i < L.length) { arr[k] = L[i]; i++; k++; }
  while (j < R.length) { arr[k] = R[j]; j++; k++; }
}

// Usage
const data = [8, 3, 1, 7, 0, 10, 2];
mergesort(data, 0, data.length - 1);
console.log(data);`,

    java: `public class MergeSort {
    public static void mergesort(int[] arr, int left, int right) {
        if (left >= right) return;
        int mid = (left + right) / 2;
        mergesort(arr, left, mid);
        mergesort(arr, mid + 1, right);
        merge(arr, left, mid, right);
    }

    private static void merge(int[] arr, int left, int mid, int right) {
        int[] L = java.util.Arrays.copyOfRange(arr, left, mid + 1);
        int[] R = java.util.Arrays.copyOfRange(arr, mid + 1, right + 1);
        int i = 0, j = 0, k = left;
        while (i < L.length && j < R.length) {
            if (L[i] <= R[j]) {
                arr[k] = L[i];
                i++;
            } else {
                arr[k] = R[j];
                j++;
            }
            k++;
        }
        while (i < L.length) { arr[k] = L[i]; i++; k++; }
        while (j < R.length) { arr[k] = R[j]; j++; k++; }
    }

    public static void main(String[] args) {
        int[] data = {8, 3, 1, 7, 0, 10, 2};
        mergesort(data, 0, data.length - 1);
        System.out.println(java.util.Arrays.toString(data));
    }
}`,

    cpp: `#include <iostream>
#include <vector>
using namespace std;

void merge(vector<int>& arr, int left, int mid, int right) {
    vector<int> L(arr.begin() + left, arr.begin() + mid + 1);
    vector<int> R(arr.begin() + mid + 1, arr.begin() + right + 1);
    int i = 0, j = 0, k = left;
    while (i < (int)L.size() && j < (int)R.size()) {
        if (L[i] <= R[j]) {
            arr[k] = L[i];
            i++;
        } else {
            arr[k] = R[j];
            j++;
        }
        k++;
    }
    while (i < (int)L.size()) { arr[k] = L[i]; i++; k++; }
    while (j < (int)R.size()) { arr[k] = R[j]; j++; k++; }
}

void mergesort(vector<int>& arr, int left, int right) {
    if (left >= right) return;
    int mid = (left + right) / 2;
    mergesort(arr, left, mid);
    mergesort(arr, mid + 1, right);
    merge(arr, left, mid, right);
}

int main() {
    vector<int> data = {8, 3, 1, 7, 0, 10, 2};
    mergesort(data, 0, data.size() - 1);
    for (int x : data) cout << x << " ";
    return 0;
}`,
  },
};

export default mergesort;
