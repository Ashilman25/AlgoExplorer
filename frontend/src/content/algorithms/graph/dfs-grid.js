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

    javascript: `const DIRS_4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function dfsGrid(grid, source, target) {
    const rows = grid.length, cols = grid[0].length;
    const stack = [source];
    const visited = new Set();
    const pathStack = [];

    // precompute passable neighbors for adjacency checks
    const neighbors = new Map();
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 0) {
                const adj = new Set();
                for (const [dr, dc] of DIRS_4) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                        && grid[nr][nc] === 0) {
                        adj.add(\`\${nr},\${nc}\`);
                    }
                }
                neighbors.set(\`\${r},\${c}\`, adj);
            }
        }
    }

    while (stack.length > 0) {
        const cell = stack.pop();
        const cellKey = \`\${cell[0]},\${cell[1]}\`;
        if (visited.has(cellKey)) continue;
        visited.add(cellKey);

        // backtrack until current cell is adjacent
        while (pathStack.length > 0) {
            const topKey = \`\${pathStack[pathStack.length - 1][0]},\${pathStack[pathStack.length - 1][1]}\`;
            const adj = neighbors.get(topKey) || new Set();
            if (adj.has(cellKey)) break;
            pathStack.pop();
        }
        pathStack.push(cell);

        if (cell[0] === target[0] && cell[1] === target[1]) {
            return [...pathStack];
        }

        const [row, col] = cell;
        for (let i = DIRS_4.length - 1; i >= 0; i--) {
            const [dr, dc] = DIRS_4[i];
            const nr = row + dr, nc = col + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                && grid[nr][nc] === 0 && !visited.has(\`\${nr},\${nc}\`)) {
                stack.push([nr, nc]);
            }
        }
    }

    return null; // no path found
}`,

    java: `import java.util.*;

public class DFSGrid {
    static final int[][] DIRS_4 = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    public static List<int[]> dfsGrid(int[][] grid, int[] source, int[] target) {
        int rows = grid.length, cols = grid[0].length;
        Deque<int[]> stack = new ArrayDeque<>();
        Set<String> visited = new HashSet<>();
        List<int[]> pathStack = new ArrayList<>();

        // precompute passable neighbors
        Map<String, Set<String>> neighbors = new HashMap<>();
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == 0) {
                    Set<String> adj = new HashSet<>();
                    for (int[] d : DIRS_4) {
                        int nr = r + d[0], nc = c + d[1];
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                                && grid[nr][nc] == 0) {
                            adj.add(nr + "," + nc);
                        }
                    }
                    neighbors.put(r + "," + c, adj);
                }
            }
        }

        stack.push(source);

        while (!stack.isEmpty()) {
            int[] cell = stack.pop();
            String cellKey = cell[0] + "," + cell[1];
            if (visited.contains(cellKey)) continue;
            visited.add(cellKey);

            // backtrack until current cell is adjacent
            while (!pathStack.isEmpty()) {
                int[] top = pathStack.get(pathStack.size() - 1);
                String topKey = top[0] + "," + top[1];
                Set<String> adj = neighbors.getOrDefault(topKey, Set.of());
                if (adj.contains(cellKey)) break;
                pathStack.remove(pathStack.size() - 1);
            }
            pathStack.add(cell);

            if (cell[0] == target[0] && cell[1] == target[1]) {
                return new ArrayList<>(pathStack);
            }

            for (int i = DIRS_4.length - 1; i >= 0; i--) {
                int nr = cell[0] + DIRS_4[i][0], nc = cell[1] + DIRS_4[i][1];
                String nk = nr + "," + nc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                        && grid[nr][nc] == 0 && !visited.contains(nk)) {
                    stack.push(new int[]{nr, nc});
                }
            }
        }

        return null; // no path found
    }
}`,

    cpp: `#include <vector>
#include <stack>
#include <unordered_set>
#include <unordered_map>
#include <string>

using Cell = std::pair<int, int>;

const int DIRS_4[][2] = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

std::string key(int r, int c) {
    return std::to_string(r) + "," + std::to_string(c);
}

std::vector<Cell> dfs_grid(
        const std::vector<std::vector<int>>& grid,
        Cell source, Cell target) {
    int rows = grid.size(), cols = grid[0].size();
    std::stack<Cell> stk;
    std::unordered_set<std::string> visited;
    std::vector<Cell> pathStack;

    // precompute passable neighbors
    std::unordered_map<std::string, std::unordered_set<std::string>> neighbors;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 0) {
                auto& adj = neighbors[key(r, c)];
                for (auto& d : DIRS_4) {
                    int nr = r + d[0], nc = c + d[1];
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                        && grid[nr][nc] == 0) {
                        adj.insert(key(nr, nc));
                    }
                }
            }
        }
    }

    stk.push(source);

    while (!stk.empty()) {
        auto cell = stk.top();
        stk.pop();
        std::string ck = key(cell.first, cell.second);
        if (visited.count(ck)) continue;
        visited.insert(ck);

        // backtrack until current cell is adjacent
        while (!pathStack.empty()) {
            auto& top = pathStack.back();
            auto& adj = neighbors[key(top.first, top.second)];
            if (adj.count(ck)) break;
            pathStack.pop_back();
        }
        pathStack.push_back(cell);

        if (cell == target) return pathStack;

        for (int i = 3; i >= 0; i--) {
            int nr = cell.first + DIRS_4[i][0];
            int nc = cell.second + DIRS_4[i][1];
            std::string nk = key(nr, nc);
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                && grid[nr][nc] == 0 && !visited.count(nk)) {
                stk.push({nr, nc});
            }
        }
    }

    return {}; // no path found
}`,
  },
};

export default dfsGrid;
