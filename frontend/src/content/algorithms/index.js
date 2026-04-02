import bfs from './graph/bfs'
import dijkstra from './graph/dijkstra'
import astar from './graph/astar'
import dfs from './graph/dfs'
import bellmanFord from './graph/bellman-ford'
import kruskals from './graph/kruskals'
import prims from './graph/prims'
import topologicalSort from './graph/topological-sort'
import bfsGrid from './graph/bfs-grid'
import dfsGrid from './graph/dfs-grid'
import dijkstraGrid from './graph/dijkstra-grid'
import astarGrid from './graph/astar-grid'

import quicksort from './sorting/quicksort'
import mergesort from './sorting/mergesort'
import bubblesort from './sorting/bubblesort'
import insertionsort from './sorting/insertionsort'
import heapsort from './sorting/heapsort'
import selectionsort from './sorting/selectionsort'
import binarysearch from './sorting/binarysearch'
import linearsearch from './sorting/linearsearch'

import fibonacci from './dp/fibonacci'
import lcs from './dp/lcs'
import editDistance from './dp/edit-distance'
import knapsack from './dp/knapsack'
import coinChange from './dp/coin-change'

export const algorithmContent = {
  'graph/bfs': bfs,
  'graph/dijkstra': dijkstra,
  'graph/astar': astar,
  'graph/dfs': dfs,
  'graph/bellman_ford': bellmanFord,
  'graph/kruskals': kruskals,
  'graph/prims': prims,
  'graph/topological_sort': topologicalSort,
  'graph/bfs_grid': bfsGrid,
  'graph/dfs_grid': dfsGrid,
  'graph/dijkstra_grid': dijkstraGrid,
  'graph/astar_grid': astarGrid,

  'sorting/quicksort': quicksort,
  'sorting/mergesort': mergesort,
  'sorting/bubble_sort': bubblesort,
  'sorting/insertion_sort': insertionsort,
  'sorting/heap_sort': heapsort,
  'sorting/selection_sort': selectionsort,
  'sorting/binary_search': binarysearch,
  'sorting/linear_search': linearsearch,

  'dp/fibonacci': fibonacci,
  'dp/lcs': lcs,
  'dp/edit_distance': editDistance,
  'dp/knapsack_01': knapsack,
  'dp/coin_change': coinChange,
}
