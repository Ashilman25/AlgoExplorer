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

    javascript: `const DIRS_4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function bfsGrid(grid, source, target) {
    const rows = grid.length, cols = grid[0].length;
    const queue = [source];
    const visited = new Set([\`\${source[0]},\${source[1]}\`]);
    const parent = new Map();

    while (queue.length > 0) {
        const [row, col] = queue.shift();

        if (row === target[0] && col === target[1]) {
            return reconstructPath(parent, source, target);
        }

        for (const [dr, dc] of DIRS_4) {
            const nr = row + dr, nc = col + dc;
            const key = \`\${nr},\${nc}\`;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                && grid[nr][nc] === 0 && !visited.has(key)) {
                visited.add(key);
                parent.set(key, \`\${row},\${col}\`);
                queue.push([nr, nc]);
            }
        }
    }

    return null; // no path found
}

function reconstructPath(parent, source, target) {
    const path = [target];
    let key = \`\${target[0]},\${target[1]}\`;
    const srcKey = \`\${source[0]},\${source[1]}\`;
    while (key !== srcKey) {
        const prev = parent.get(key);
        const [r, c] = prev.split(",").map(Number);
        path.push([r, c]);
        key = prev;
    }
    return path.reverse();
}`,

    java: `import java.util.*;

public class BFSGrid {
    static final int[][] DIRS_4 = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    public static List<int[]> bfsGrid(int[][] grid, int[] source, int[] target) {
        int rows = grid.length, cols = grid[0].length;
        Queue<int[]> queue = new LinkedList<>();
        Set<String> visited = new HashSet<>();
        Map<String, String> parent = new HashMap<>();

        queue.add(source);
        String srcKey = source[0] + "," + source[1];
        visited.add(srcKey);

        while (!queue.isEmpty()) {
            int[] cell = queue.poll();
            int row = cell[0], col = cell[1];

            if (row == target[0] && col == target[1]) {
                return reconstructPath(parent, source, target);
            }

            for (int[] dir : DIRS_4) {
                int nr = row + dir[0], nc = col + dir[1];
                String key = nr + "," + nc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                        && grid[nr][nc] == 0 && !visited.contains(key)) {
                    visited.add(key);
                    parent.put(key, row + "," + col);
                    queue.add(new int[]{nr, nc});
                }
            }
        }

        return null; // no path found
    }

    private static List<int[]> reconstructPath(
            Map<String, String> parent, int[] source, int[] target) {
        List<int[]> path = new ArrayList<>();
        String key = target[0] + "," + target[1];
        String srcKey = source[0] + "," + source[1];
        while (key != null) {
            String[] parts = key.split(",");
            path.add(new int[]{Integer.parseInt(parts[0]), Integer.parseInt(parts[1])});
            if (key.equals(srcKey)) break;
            key = parent.get(key);
        }
        Collections.reverse(path);
        return path;
    }
}`,

    cpp: `#include <vector>
#include <queue>
#include <unordered_set>
#include <unordered_map>
#include <string>

using Cell = std::pair<int, int>;

const int DIRS_4[][2] = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

std::string key(int r, int c) {
    return std::to_string(r) + "," + std::to_string(c);
}

std::vector<Cell> bfs_grid(
        const std::vector<std::vector<int>>& grid,
        Cell source, Cell target) {
    int rows = grid.size(), cols = grid[0].size();
    std::queue<Cell> q;
    std::unordered_set<std::string> visited;
    std::unordered_map<std::string, std::string> parent;

    q.push(source);
    visited.insert(key(source.first, source.second));

    while (!q.empty()) {
        auto [row, col] = q.front();
        q.pop();

        if (row == target.first && col == target.second) {
            std::vector<Cell> path;
            std::string k = key(target.first, target.second);
            std::string sk = key(source.first, source.second);
            while (true) {
                int comma = k.find(',');
                path.push_back({stoi(k.substr(0, comma)),
                                stoi(k.substr(comma + 1))});
                if (k == sk) break;
                k = parent[k];
            }
            std::reverse(path.begin(), path.end());
            return path;
        }

        for (auto& d : DIRS_4) {
            int nr = row + d[0], nc = col + d[1];
            std::string nk = key(nr, nc);
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                && grid[nr][nc] == 0
                && visited.find(nk) == visited.end()) {
                visited.insert(nk);
                parent[nk] = key(row, col);
                q.push({nr, nc});
            }
        }
    }

    return {}; // no path found
}`,
  },
};

export default bfsGrid;
