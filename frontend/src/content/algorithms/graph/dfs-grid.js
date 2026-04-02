const dfsGrid = {
  pseudocode: [
    'function DFS_Grid(grid, source, target):',
    '    stack = empty stack',
    '    visited = empty set',
    '    pathStack = empty list; push source',
    '    while pathStack diverges from current:',
    '        backtrack (pop pathStack until adjacent)',
    '    while stack is not empty:',
    '        cell = pop(); if visited skip; mark visited',
    '        if cell == target: return pathStack as path',
    '        for each neighbor of cell (reversed):',
    '            if inBounds and not wall and not visited:',
    '                push neighbor onto stack',
    '    return no path found',
  ],

  code: {
    python: `DIRS_4 = [(-1, 0), (1, 0), (0, -1), (0, 1)]

def dfs_grid(grid, source, target):
    rows, cols = len(grid), len(grid[0])
    stack = [source]
    visited = set()
    path_stack = []

    # precompute passable neighbors for adjacency checks
    neighbors = {}
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 0:
                neighbors[(r, c)] = set()
                for dr, dc in DIRS_4:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                        neighbors[(r, c)].add((nr, nc))

    while stack:
        cell = stack.pop()
        if cell in visited:
            continue

        visited.add(cell)

        # backtrack path_stack until current cell is adjacent
        while path_stack and cell not in neighbors.get(path_stack[-1], set()):
            path_stack.pop()
        path_stack.append(cell)

        if cell == target:
            return list(path_stack)

        row, col = cell
        for dr, dc in reversed(DIRS_4):
            nr, nc = row + dr, col + dc
            if (0 <= nr < rows and 0 <= nc < cols
                    and grid[nr][nc] == 0
                    and (nr, nc) not in visited):
                stack.append((nr, nc))

    return None  # no path found`,
  },
};

export default dfsGrid;
