const bfsGrid = {
  pseudocode: [
    'function BFS_Grid(grid, source, target):',
    '    queue = empty queue',
    '    visited = empty set',
    '    parent = empty map; enqueue source; mark visited',
    '    while queue is not empty:',
    '        cell = dequeue()',
    '        if cell == target:',
    '            return reconstructPath(parent, source, target)',
    '        for each neighbor of cell:',
    '            if inBounds and not wall and not visited:',
    '                mark visited; parent[neighbor] = cell; enqueue',
    '    return no path found',
  ],

  code: {
    python: `from collections import deque

DIRS_4 = [(-1, 0), (1, 0), (0, -1), (0, 1)]

def bfs_grid(grid, source, target):
    rows, cols = len(grid), len(grid[0])
    queue = deque([source])
    visited = {source}
    parent = {}

    while queue:
        row, col = queue.popleft()

        if (row, col) == target:
            return reconstruct_path(parent, source, target)

        for dr, dc in DIRS_4:
            nr, nc = row + dr, col + dc
            if (0 <= nr < rows and 0 <= nc < cols
                    and grid[nr][nc] == 0
                    and (nr, nc) not in visited):
                visited.add((nr, nc))
                parent[(nr, nc)] = (row, col)
                queue.append((nr, nc))

    return None  # no path found

def reconstruct_path(parent, source, target):
    path = [target]
    while path[-1] != source:
        path.append(parent[path[-1]])
    return path[::-1]`,
  },
};

export default bfsGrid;
