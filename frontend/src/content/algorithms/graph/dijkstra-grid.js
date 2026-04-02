const dijkstraGrid = {
  pseudocode: [
    'function Dijkstra_Grid(grid, source, target):',
    '    dist = map: all cells set to infinity',
    '    parent = empty map',
    '    dist[source] = 0; push (0, source) into min-heap',
    '    while heap is not empty:',
    '        (d, cell) = pop min from heap',
    '        if cell already visited: skip; mark visited',
    '        if cell == target: return shortest path',
    '        for each (neighbor, cost) of cell:',
    '            newDist = dist[cell] + cost',
    '            if newDist < dist[neighbor]:',
    '                dist[neighbor] = newDist; parent[neighbor] = cell; push',
    '    return no path found',
  ],

  code: {
    python: `import heapq
import math

DIRS_4 = [(-1, 0), (1, 0), (0, -1), (0, 1)]

def dijkstra_grid(grid, source, target):
    rows, cols = len(grid), len(grid[0])
    dist = {source: 0}
    parent = {}
    visited = set()
    heap = [(0, source)]

    while heap:
        d, cell = heapq.heappop(heap)
        if cell in visited:
            continue
        visited.add(cell)

        if cell == target:
            return reconstruct_path(parent, source, target), dist[target]

        row, col = cell
        for dr, dc in DIRS_4:
            nr, nc = row + dr, col + dc
            if (0 <= nr < rows and 0 <= nc < cols
                    and grid[nr][nc] == 0
                    and (nr, nc) not in visited):
                cost = 1.0
                new_dist = d + cost
                if new_dist < dist.get((nr, nc), math.inf):
                    dist[(nr, nc)] = new_dist
                    parent[(nr, nc)] = cell
                    heapq.heappush(heap, (new_dist, (nr, nc)))

    return None, math.inf  # no path found

def reconstruct_path(parent, source, target):
    path = [target]
    while path[-1] != source:
        path.append(parent[path[-1]])
    return path[::-1]`,
  },
};

export default dijkstraGrid;
