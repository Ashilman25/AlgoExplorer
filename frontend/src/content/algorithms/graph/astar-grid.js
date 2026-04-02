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

    javascript: `const DIRS_4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function manhattan(r, c, tr, tc) {
    return Math.abs(r - tr) + Math.abs(c - tc);
}

function astarGrid(grid, source, target, heuristic = manhattan) {
    const rows = grid.length, cols = grid[0].length;
    const [tr, tc] = target;
    const gScore = new Map();
    const parent = new Map();
    const visited = new Set();

    const srcKey = \`\${source[0]},\${source[1]}\`;
    gScore.set(srcKey, 0);

    const hStart = heuristic(source[0], source[1], tr, tc);
    const heap = [[hStart, source]];

    while (heap.length > 0) {
        heap.sort((a, b) => a[0] - b[0]);
        const [f, cell] = heap.shift();
        const cellKey = \`\${cell[0]},\${cell[1]}\`;

        if (visited.has(cellKey)) continue;
        visited.add(cellKey);

        if (cell[0] === target[0] && cell[1] === target[1]) {
            return { path: reconstructPath(parent, srcKey, cellKey), cost: gScore.get(cellKey) };
        }

        const [row, col] = cell;
        const g = gScore.get(cellKey);
        for (const [dr, dc] of DIRS_4) {
            const nr = row + dr, nc = col + dc;
            const nk = \`\${nr},\${nc}\`;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                && grid[nr][nc] === 0 && !visited.has(nk)) {
                const cost = 1.0;
                const newG = g + cost;
                if (newG < (gScore.get(nk) ?? Infinity)) {
                    gScore.set(nk, newG);
                    const h = heuristic(nr, nc, tr, tc);
                    parent.set(nk, cellKey);
                    heap.push([newG + h, [nr, nc]]);
                }
            }
        }
    }

    return null; // no path found
}

function reconstructPath(parent, srcKey, targetKey) {
    const path = [];
    let key = targetKey;
    while (key) {
        const [r, c] = key.split(",").map(Number);
        path.push([r, c]);
        if (key === srcKey) break;
        key = parent.get(key);
    }
    return path.reverse();
}`,

    java: `import java.util.*;

public class AStarGrid {
    static final int[][] DIRS_4 = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    static int manhattan(int r, int c, int tr, int tc) {
        return Math.abs(r - tr) + Math.abs(c - tc);
    }

    public static List<int[]> astarGrid(int[][] grid, int[] source, int[] target) {
        int rows = grid.length, cols = grid[0].length;
        int tr = target[0], tc = target[1];
        Map<String, Double> gScore = new HashMap<>();
        Map<String, String> parent = new HashMap<>();
        Set<String> visited = new HashSet<>();

        String srcKey = source[0] + "," + source[1];
        gScore.put(srcKey, 0.0);

        double hStart = manhattan(source[0], source[1], tr, tc);

        // (f-score, row, col)
        PriorityQueue<double[]> heap = new PriorityQueue<>(
            Comparator.comparingDouble(a -> a[0]));
        heap.add(new double[]{hStart, source[0], source[1]});

        while (!heap.isEmpty()) {
            double[] top = heap.poll();
            int row = (int) top[1], col = (int) top[2];
            String cellKey = row + "," + col;

            if (visited.contains(cellKey)) continue;
            visited.add(cellKey);

            if (row == target[0] && col == target[1]) {
                return reconstructPath(parent, srcKey, cellKey);
            }

            double g = gScore.get(cellKey);
            for (int[] dir : DIRS_4) {
                int nr = row + dir[0], nc = col + dir[1];
                String nk = nr + "," + nc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                        && grid[nr][nc] == 0 && !visited.contains(nk)) {
                    double cost = 1.0;
                    double newG = g + cost;
                    if (newG < gScore.getOrDefault(nk, Double.MAX_VALUE)) {
                        gScore.put(nk, newG);
                        double h = manhattan(nr, nc, tr, tc);
                        parent.put(nk, cellKey);
                        heap.add(new double[]{newG + h, nr, nc});
                    }
                }
            }
        }

        return null; // no path found
    }

    private static List<int[]> reconstructPath(
            Map<String, String> parent, String srcKey, String targetKey) {
        List<int[]> path = new ArrayList<>();
        String key = targetKey;
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
#include <cmath>
#include <limits>

using Cell = std::pair<int, int>;

const int DIRS_4[][2] = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

std::string key(int r, int c) {
    return std::to_string(r) + "," + std::to_string(c);
}

int manhattan(int r, int c, int tr, int tc) {
    return std::abs(r - tr) + std::abs(c - tc);
}

std::vector<Cell> astar_grid(
        const std::vector<std::vector<int>>& grid,
        Cell source, Cell target) {
    int rows = grid.size(), cols = grid[0].size();
    int tr = target.first, tc = target.second;
    std::unordered_map<std::string, double> gScore;
    std::unordered_map<std::string, std::string> parent;
    std::unordered_set<std::string> visited;

    std::string sk = key(source.first, source.second);
    gScore[sk] = 0;

    double hStart = manhattan(source.first, source.second, tr, tc);

    // (f-score, row, col)
    using Entry = std::tuple<double, int, int>;
    std::priority_queue<Entry, std::vector<Entry>, std::greater<>> pq;
    pq.push({hStart, source.first, source.second});

    while (!pq.empty()) {
        auto [f, row, col] = pq.top();
        pq.pop();
        std::string ck = key(row, col);

        if (visited.count(ck)) continue;
        visited.insert(ck);

        if (row == target.first && col == target.second) {
            std::vector<Cell> path;
            std::string k = ck;
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

        double g = gScore[ck];
        for (auto& dir : DIRS_4) {
            int nr = row + dir[0], nc = col + dir[1];
            std::string nk = key(nr, nc);
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                && grid[nr][nc] == 0 && !visited.count(nk)) {
                double cost = 1.0;
                double newG = g + cost;
                double inf = std::numeric_limits<double>::infinity();
                if (newG < (gScore.count(nk) ? gScore[nk] : inf)) {
                    gScore[nk] = newG;
                    double h = manhattan(nr, nc, tr, tc);
                    parent[nk] = ck;
                    pq.push({newG + h, nr, nc});
                }
            }
        }
    }

    return {}; // no path found
}`,
  },
};

export default astarGrid;
