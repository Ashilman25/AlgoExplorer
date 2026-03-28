const astar = {
  pseudocode: [
    'function AStar(graph, source, target, h):',
    '    gScore = map with all nodes set to infinity',
    '    fScore = map with all nodes set to infinity',
    '    parent = empty map',
    '    gScore[source] = 0',
    '    fScore[source] = h(source, target)',
    '    openSet = min-priority queue with (fScore[source], source)',
    '    closedSet = empty set',
    '    while openSet is not empty:',
    '        (f, node) = extract min from openSet',
    '        if node == target:',
    '            return reconstructPath(parent, source, target)',
    '        add node to closedSet',
    '        for each (neighbor, weight) of node:',
    '            if neighbor in closedSet: continue',
    '            tentativeG = gScore[node] + weight',
    '            if tentativeG < gScore[neighbor]:',
    '                parent[neighbor] = node',
    '                gScore[neighbor] = tentativeG',
    '                fScore[neighbor] = tentativeG + h(neighbor, target)',
    '                insert (fScore[neighbor], neighbor) into openSet',
    '    return no path found',
  ],

  code: {
    python: `import heapq
import math

def heuristic(a, b, positions):
    """Euclidean distance heuristic."""
    ax, ay = positions[a]
    bx, by = positions[b]
    return math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)

def astar(graph, source, target, positions):
    g_score = {node: float('inf') for node in graph}
    f_score = {node: float('inf') for node in graph}
    parent = {}

    g_score[source] = 0
    f_score[source] = heuristic(source, target, positions)
    open_set = [(f_score[source], source)]
    closed_set = set()

    while open_set:
        f, node = heapq.heappop(open_set)

        if node == target:
            return reconstruct_path(parent, source, target)

        if node in closed_set:
            continue
        closed_set.add(node)

        for neighbor, weight in graph[node]:
            if neighbor in closed_set:
                continue
            tentative_g = g_score[node] + weight
            if tentative_g < g_score[neighbor]:
                parent[neighbor] = node
                g_score[neighbor] = tentative_g
                f_score[neighbor] = tentative_g + heuristic(neighbor, target, positions)
                heapq.heappush(open_set, (f_score[neighbor], neighbor))

    return None  # no path found

def reconstruct_path(parent, source, target):
    path = [target]
    while path[-1] != source:
        path.append(parent[path[-1]])
    return path[::-1]`,

    javascript: `function heuristic(a, b, positions) {
    const [ax, ay] = positions[a];
    const [bx, by] = positions[b];
    return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function astar(graph, source, target, positions) {
    const gScore = new Map();
    const fScore = new Map();
    const parent = new Map();
    for (const node of graph.keys()) {
        gScore.set(node, Infinity);
        fScore.set(node, Infinity);
    }

    gScore.set(source, 0);
    fScore.set(source, heuristic(source, target, positions));
    const openSet = [[fScore.get(source), source]];
    const closedSet = new Set();

    while (openSet.length > 0) {
        openSet.sort((a, b) => a[0] - b[0]);
        const [f, node] = openSet.shift();

        if (node === target) {
            return reconstructPath(parent, source, target);
        }

        if (closedSet.has(node)) continue;
        closedSet.add(node);

        for (const [neighbor, weight] of graph.get(node)) {
            if (closedSet.has(neighbor)) continue;
            const tentativeG = gScore.get(node) + weight;
            if (tentativeG < gScore.get(neighbor)) {
                parent.set(neighbor, node);
                gScore.set(neighbor, tentativeG);
                fScore.set(neighbor, tentativeG + heuristic(neighbor, target, positions));
                openSet.push([fScore.get(neighbor), neighbor]);
            }
        }
    }

    return null; // no path found
}

function reconstructPath(parent, source, target) {
    const path = [target];
    while (path[path.length - 1] !== source) {
        path.push(parent.get(path[path.length - 1]));
    }
    return path.reverse();
}`,

    java: `import java.util.*;

public List<Integer> astar(Map<Integer, List<int[]>> graph,
                           int source, int target,
                           Map<Integer, int[]> positions) {
    Map<Integer, Double> gScore = new HashMap<>();
    Map<Integer, Double> fScore = new HashMap<>();
    Map<Integer, Integer> parent = new HashMap<>();
    for (int node : graph.keySet()) {
        gScore.put(node, Double.MAX_VALUE);
        fScore.put(node, Double.MAX_VALUE);
    }

    gScore.put(source, 0.0);
    fScore.put(source, heuristic(source, target, positions));

    PriorityQueue<double[]> openSet = new PriorityQueue<>(
        Comparator.comparingDouble(a -> a[0])
    );
    openSet.offer(new double[]{fScore.get(source), source});
    Set<Integer> closedSet = new HashSet<>();

    while (!openSet.isEmpty()) {
        double[] entry = openSet.poll();
        int node = (int) entry[1];

        if (node == target) {
            return reconstructPath(parent, source, target);
        }

        if (closedSet.contains(node)) continue;
        closedSet.add(node);

        for (int[] edge : graph.get(node)) {
            int neighbor = edge[0];
            double weight = edge[1];
            if (closedSet.contains(neighbor)) continue;
            double tentativeG = gScore.get(node) + weight;
            if (tentativeG < gScore.get(neighbor)) {
                parent.put(neighbor, node);
                gScore.put(neighbor, tentativeG);
                fScore.put(neighbor, tentativeG + heuristic(neighbor, target, positions));
                openSet.offer(new double[]{fScore.get(neighbor), neighbor});
            }
        }
    }

    return null; // no path found
}

private double heuristic(int a, int b, Map<Integer, int[]> positions) {
    int[] pa = positions.get(a), pb = positions.get(b);
    return Math.sqrt(Math.pow(pa[0] - pb[0], 2) + Math.pow(pa[1] - pb[1], 2));
}`,

    cpp: `#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <cmath>
#include <algorithm>

using Graph = std::unordered_map<int, std::vector<std::pair<int,int>>>;
using Pos = std::unordered_map<int, std::pair<double,double>>;

double heuristic(int a, int b, const Pos& positions) {
    auto [ax, ay] = positions.at(a);
    auto [bx, by] = positions.at(b);
    return std::sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by));
}

std::vector<int> astar(const Graph& graph, int source, int target,
                       const Pos& positions) {
    std::unordered_map<int, double> gScore, fScore;
    std::unordered_map<int, int> parent;
    for (auto& [node, _] : graph) {
        gScore[node] = 1e18;
        fScore[node] = 1e18;
    }

    gScore[source] = 0;
    fScore[source] = heuristic(source, target, positions);

    using Entry = std::pair<double, int>;
    std::priority_queue<Entry, std::vector<Entry>, std::greater<>> openSet;
    openSet.push({fScore[source], source});
    std::unordered_set<int> closedSet;

    while (!openSet.empty()) {
        auto [f, node] = openSet.top();
        openSet.pop();

        if (node == target) {
            std::vector<int> path;
            for (int n = target; n != source; n = parent[n])
                path.push_back(n);
            path.push_back(source);
            std::reverse(path.begin(), path.end());
            return path;
        }

        if (closedSet.count(node)) continue;
        closedSet.insert(node);

        for (auto& [neighbor, weight] : graph.at(node)) {
            if (closedSet.count(neighbor)) continue;
            double tentativeG = gScore[node] + weight;
            if (tentativeG < gScore[neighbor]) {
                parent[neighbor] = node;
                gScore[neighbor] = tentativeG;
                fScore[neighbor] = tentativeG + heuristic(neighbor, target, positions);
                openSet.push({fScore[neighbor], neighbor});
            }
        }
    }

    return {}; // no path found
}`,
  },
};

export default astar;
