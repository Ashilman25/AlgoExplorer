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

    javascript: `const DIRS_4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function dijkstraGrid(grid, source, target) {
    const rows = grid.length, cols = grid[0].length;
    const dist = new Map();
    const parent = new Map();
    const visited = new Set();

    const srcKey = \`\${source[0]},\${source[1]}\`;
    dist.set(srcKey, 0);

    // simple priority queue using sorted insertion
    const heap = [[0, source]];

    while (heap.length > 0) {
        heap.sort((a, b) => a[0] - b[0]);
        const [d, cell] = heap.shift();
        const cellKey = \`\${cell[0]},\${cell[1]}\`;

        if (visited.has(cellKey)) continue;
        visited.add(cellKey);

        if (cell[0] === target[0] && cell[1] === target[1]) {
            return { path: reconstructPath(parent, srcKey, cellKey), cost: d };
        }

        const [row, col] = cell;
        for (const [dr, dc] of DIRS_4) {
            const nr = row + dr, nc = col + dc;
            const nk = \`\${nr},\${nc}\`;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                && grid[nr][nc] === 0 && !visited.has(nk)) {
                const cost = 1.0;
                const newDist = d + cost;
                if (newDist < (dist.get(nk) ?? Infinity)) {
                    dist.set(nk, newDist);
                    parent.set(nk, cellKey);
                    heap.push([newDist, [nr, nc]]);
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

public class DijkstraGrid {
    static final int[][] DIRS_4 = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    public static List<int[]> dijkstraGrid(int[][] grid, int[] source, int[] target) {
        int rows = grid.length, cols = grid[0].length;
        Map<String, Double> dist = new HashMap<>();
        Map<String, String> parent = new HashMap<>();
        Set<String> visited = new HashSet<>();

        String srcKey = source[0] + "," + source[1];
        dist.put(srcKey, 0.0);

        // (distance, row, col)
        PriorityQueue<double[]> heap = new PriorityQueue<>(
            Comparator.comparingDouble(a -> a[0]));
        heap.add(new double[]{0, source[0], source[1]});

        while (!heap.isEmpty()) {
            double[] top = heap.poll();
            double d = top[0];
            int row = (int) top[1], col = (int) top[2];
            String cellKey = row + "," + col;

            if (visited.contains(cellKey)) continue;
            visited.add(cellKey);

            if (row == target[0] && col == target[1]) {
                return reconstructPath(parent, srcKey, cellKey);
            }

            for (int[] dir : DIRS_4) {
                int nr = row + dir[0], nc = col + dir[1];
                String nk = nr + "," + nc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                        && grid[nr][nc] == 0 && !visited.contains(nk)) {
                    double cost = 1.0;
                    double newDist = d + cost;
                    if (newDist < dist.getOrDefault(nk, Double.MAX_VALUE)) {
                        dist.put(nk, newDist);
                        parent.put(nk, cellKey);
                        heap.add(new double[]{newDist, nr, nc});
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
#include <limits>

using Cell = std::pair<int, int>;

const int DIRS_4[][2] = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

std::string key(int r, int c) {
    return std::to_string(r) + "," + std::to_string(c);
}

std::vector<Cell> dijkstra_grid(
        const std::vector<std::vector<int>>& grid,
        Cell source, Cell target) {
    int rows = grid.size(), cols = grid[0].size();
    std::unordered_map<std::string, double> dist;
    std::unordered_map<std::string, std::string> parent;
    std::unordered_set<std::string> visited;

    std::string sk = key(source.first, source.second);
    dist[sk] = 0;

    // (distance, row, col)
    using Entry = std::tuple<double, int, int>;
    std::priority_queue<Entry, std::vector<Entry>, std::greater<>> pq;
    pq.push({0, source.first, source.second});

    while (!pq.empty()) {
        auto [d, row, col] = pq.top();
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

        for (auto& dir : DIRS_4) {
            int nr = row + dir[0], nc = col + dir[1];
            std::string nk = key(nr, nc);
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                && grid[nr][nc] == 0 && !visited.count(nk)) {
                double cost = 1.0;
                double newDist = d + cost;
                double inf = std::numeric_limits<double>::infinity();
                if (newDist < (dist.count(nk) ? dist[nk] : inf)) {
                    dist[nk] = newDist;
                    parent[nk] = ck;
                    pq.push({newDist, nr, nc});
                }
            }
        }
    }

    return {}; // no path found
}`,
  },
};

export default dijkstraGrid;
