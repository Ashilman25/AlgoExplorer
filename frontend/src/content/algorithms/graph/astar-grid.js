const astarGrid = {
  pseudocode: [
    'function AStar_Grid(grid, source, target, h):',
    '    gScore = map: all cells set to infinity',
    '    gScore[source] = 0; fScore[source] = h(source)',
    '    push (fScore[source], source) into min-heap',
    '    while heap is not empty:',
    '        (f, cell) = pop min from heap; skip if visited',
    '        if cell == target: return optimal path',
    '        for each (neighbor, cost) of cell:',
    '            tentativeG = gScore[cell] + cost',
    '            if tentativeG < gScore[neighbor]:',
    '                update gScore, fScore; parent[neighbor] = cell; push',
    '    return no path found',
  ],

  code: {
    python: `import heapq
import math

DIRS_4 = [(-1, 0), (1, 0), (0, -1), (0, 1)]

def manhattan(r, c, tr, tc):
    return abs(r - tr) + abs(c - tc)

def astar_grid(grid, source, target, heuristic=manhattan):
    rows, cols = len(grid), len(grid[0])
    tr, tc = target
    g_score = {source: 0}
    parent = {}
    visited = set()

    h_start = heuristic(source[0], source[1], tr, tc)
    heap = [(h_start, source)]

    while heap:
        f, cell = heapq.heappop(heap)
        if cell in visited:
            continue
        visited.add(cell)

        if cell == target:
            return reconstruct_path(parent, source, target), g_score[target]

        row, col = cell
        for dr, dc in DIRS_4:
            nr, nc = row + dr, col + dc
            if (0 <= nr < rows and 0 <= nc < cols
                    and grid[nr][nc] == 0
                    and (nr, nc) not in visited):
                cost = 1.0
                new_g = g_score[cell] + cost
                if new_g < g_score.get((nr, nc), math.inf):
                    g_score[(nr, nc)] = new_g
                    h = heuristic(nr, nc, tr, tc)
                    f_score = new_g + h
                    parent[(nr, nc)] = cell
                    heapq.heappush(heap, (f_score, (nr, nc)))

    return None, math.inf  # no path found

def reconstruct_path(parent, source, target):
    path = [target]
    while path[-1] != source:
        path.append(parent[path[-1]])
    return path[::-1]`,
  },
};

export default astarGrid;
