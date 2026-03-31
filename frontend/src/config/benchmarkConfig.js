export const BENCHMARK_MODULE_TYPES = ['sorting', 'graph']

export const BENCHMARK_CATEGORIES = {
  graph: [
    { key: 'traversal', label: 'Traversal' },
    { key: 'shortest_path', label: 'Shortest Path' },
    { key: 'mst', label: 'Minimum Spanning Tree' },
    { key: 'ordering', label: 'Ordering' },
  ],
}

export const BENCHMARK_ALGORITHMS = {
  sorting: [
    { key: 'quicksort', label: 'Quick Sort' },
    { key: 'mergesort', label: 'Merge Sort' },
  ],
  graph: {
    traversal: [
      { key: 'bfs', label: 'BFS' },
      { key: 'dfs', label: 'DFS' },
    ],
    shortest_path: [
      { key: 'dijkstra', label: 'Dijkstra' },
      { key: 'astar', label: 'A*' },
      { key: 'bellman_ford', label: 'Bellman-Ford' },
    ],
    mst: [
      { key: 'prims', label: "Prim's" },
      { key: 'kruskals', label: "Kruskal's" },
    ],
    ordering: [
      { key: 'topological_sort', label: 'Topological Sort' },
    ],
  },
}

export const BENCHMARK_INPUT_FAMILIES = {
  sorting: [
    { key: 'random', label: 'Random' },
    { key: 'sorted', label: 'Already Sorted' },
    { key: 'reversed', label: 'Reversed' },
    { key: 'nearly_sorted', label: 'Nearly Sorted' },
  ],
  graph: {
    traversal: [
      { key: 'sparse_random', label: 'Sparse Random' },
      { key: 'dense_random', label: 'Dense Random' },
      { key: 'grid', label: 'Grid' },
      { key: 'tree', label: 'Tree' },
      { key: 'complete', label: 'Complete' },
    ],
    shortest_path: [
      { key: 'sparse_random', label: 'Sparse Random' },
      { key: 'dense_random', label: 'Dense Random' },
      { key: 'grid', label: 'Grid' },
      { key: 'tree', label: 'Tree' },
    ],
    mst: [
      { key: 'sparse_random', label: 'Sparse Random' },
      { key: 'dense_random', label: 'Dense Random' },
      { key: 'complete', label: 'Complete' },
      { key: 'grid', label: 'Grid' },
    ],
    ordering: [
      { key: 'sparse_dag', label: 'Sparse DAG' },
      { key: 'dense_dag', label: 'Dense DAG' },
      { key: 'chain', label: 'Chain' },
      { key: 'layered_dag', label: 'Layered DAG' },
    ],
  },
}

export const BENCHMARK_METRICS = {
  sorting: [
    { key: 'runtime_ms', label: 'Runtime (ms)', unit: 'ms' },
    { key: 'comparisons', label: 'Comparisons', unit: 'count' },
    { key: 'swaps', label: 'Swaps', unit: 'count' },
    { key: 'writes', label: 'Writes', unit: 'count' },
  ],
  graph: {
    traversal: [
      { key: 'runtime_ms', label: 'Runtime (ms)', unit: 'ms' },
      { key: 'nodes_visited', label: 'Nodes Visited', unit: 'count' },
      { key: 'edges_explored', label: 'Edges Explored', unit: 'count' },
      { key: 'max_structure_size', label: 'Max Frontier/Stack', unit: 'count' },
    ],
    shortest_path: [
      { key: 'runtime_ms', label: 'Runtime (ms)', unit: 'ms' },
      { key: 'nodes_visited', label: 'Nodes Visited', unit: 'count' },
      { key: 'edges_explored', label: 'Edges Explored', unit: 'count' },
      { key: 'relaxations', label: 'Relaxations', unit: 'count' },
    ],
    mst: [
      { key: 'runtime_ms', label: 'Runtime (ms)', unit: 'ms' },
      { key: 'edges_considered', label: 'Edges Considered', unit: 'count' },
      { key: 'edges_added', label: 'Edges Added', unit: 'count' },
      { key: 'mst_total_weight', label: 'MST Total Weight', unit: 'weight' },
    ],
    ordering: [
      { key: 'runtime_ms', label: 'Runtime (ms)', unit: 'ms' },
      { key: 'nodes_ordered', label: 'Nodes Ordered', unit: 'count' },
      { key: 'edges_processed', label: 'Edges Processed', unit: 'count' },
    ],
  },
}

export const BENCHMARK_LIMITS = {
  SIZE_MIN: 9,
  SIZE_MAX: 10_000,
  SIZES_MAX_COUNT: 12,
  TRIALS_MIN: 1,
  TRIALS_MAX: 20,
  TRIALS_DEFAULT: 5,
  ALGORITHMS_MIN: 1,
  ALGORITHMS_MAX: 5,
}

export const BENCHMARK_SIZE_LIMITS = {
  sorting: { min: 10, max: 10_000 },
  graph: {
    tree: { min: 10, max: 10_000 },
    sparse_random: { min: 10, max: 5_000 },
    sparse_dag: { min: 10, max: 5_000 },
    layered_dag: { min: 10, max: 5_000 },
    chain: { min: 10, max: 10_000 },
    grid: { min: 9, max: 2_500 },
    dense_random: { min: 10, max: 1_000 },
    dense_dag: { min: 10, max: 1_000 },
    complete: { min: 10, max: 500 },
  },
}

export const BENCHMARK_SIZE_PRESETS = {
  sorting: [
    { label: 'Small (10\u2013100)', sizes: [10, 25, 50, 75, 100] },
    { label: 'Medium (100\u20131k)', sizes: [100, 250, 500, 750, 1000] },
    { label: 'Large (1k\u201310k)', sizes: [1000, 2500, 5000, 7500, 10000] },
    { label: 'Full Range', sizes: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000] },
  ],
  graph: {
    tree: [
      { label: 'Small (10\u2013100)', sizes: [10, 25, 50, 75, 100] },
      { label: 'Medium (100\u20131k)', sizes: [100, 250, 500, 750, 1000] },
      { label: 'Large (1k\u201310k)', sizes: [1000, 2500, 5000, 7500, 10000] },
    ],
    sparse_random: [
      { label: 'Small (10\u2013100)', sizes: [10, 25, 50, 75, 100] },
      { label: 'Medium (100\u20131k)', sizes: [100, 250, 500, 750, 1000] },
      { label: 'Large (500\u20135k)', sizes: [500, 1000, 2000, 3500, 5000] },
    ],
    sparse_dag: [
      { label: 'Small (10\u2013100)', sizes: [10, 25, 50, 75, 100] },
      { label: 'Medium (100\u20131k)', sizes: [100, 250, 500, 750, 1000] },
      { label: 'Large (500\u20135k)', sizes: [500, 1000, 2000, 3500, 5000] },
    ],
    layered_dag: [
      { label: 'Small (10\u2013100)', sizes: [10, 25, 50, 75, 100] },
      { label: 'Medium (100\u20131k)', sizes: [100, 250, 500, 750, 1000] },
      { label: 'Large (500\u20135k)', sizes: [500, 1000, 2000, 3500, 5000] },
    ],
    chain: [
      { label: 'Small (10\u2013100)', sizes: [10, 25, 50, 75, 100] },
      { label: 'Medium (100\u20131k)', sizes: [100, 250, 500, 750, 1000] },
      { label: 'Large (1k\u201310k)', sizes: [1000, 2500, 5000, 7500, 10000] },
    ],
    grid: [
      { label: 'Small (9\u2013100)', sizes: [9, 16, 25, 49, 100] },
      { label: 'Medium (100\u2013625)', sizes: [100, 225, 400, 625] },
      { label: 'Large (625\u20132500)', sizes: [625, 900, 1600, 2500] },
    ],
    dense_random: [
      { label: 'Small (10\u201350)', sizes: [10, 20, 30, 40, 50] },
      { label: 'Medium (50\u2013500)', sizes: [50, 100, 200, 350, 500] },
      { label: 'Large (250\u20131k)', sizes: [250, 500, 750, 1000] },
    ],
    dense_dag: [
      { label: 'Small (10\u201350)', sizes: [10, 20, 30, 40, 50] },
      { label: 'Medium (50\u2013500)', sizes: [50, 100, 200, 350, 500] },
      { label: 'Large (250\u20131k)', sizes: [250, 500, 750, 1000] },
    ],
    complete: [
      { label: 'Small (10\u201350)', sizes: [10, 20, 30, 40, 50] },
      { label: 'Medium (50\u2013200)', sizes: [50, 100, 150, 200] },
      { label: 'Large (150\u2013500)', sizes: [150, 250, 350, 500] },
    ],
  },
}
