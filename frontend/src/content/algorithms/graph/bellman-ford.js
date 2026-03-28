const bellmanFord = {
  pseudocode: [
    'function BellmanFord(graph, vertices, source):',
    '    dist = map with all vertices set to infinity',
    '    parent = empty map',
    '    dist[source] = 0',
    '    for i = 1 to |V| - 1:',
    '        for each edge (u, v, weight) in graph:',
    '            if dist[u] + weight < dist[v]:',
    '                dist[v] = dist[u] + weight',
    '                parent[v] = u',
    '    for each edge (u, v, weight) in graph:',
    '        if dist[u] + weight < dist[v]:',
    '            return "negative cycle detected"',
    '    return dist, parent',
  ],

  code: {
    python: `def bellman_ford(vertices, edges, source):
    dist = {v: float('inf') for v in vertices}
    parent = {}
    dist[source] = 0

    # Relax all edges V-1 times
    for _ in range(len(vertices) - 1):
        for u, v, weight in edges:
            if dist[u] + weight < dist[v]:
                dist[v] = dist[u] + weight
                parent[v] = u

    # Check for negative-weight cycles
    for u, v, weight in edges:
        if dist[u] + weight < dist[v]:
            raise ValueError("Graph contains a negative-weight cycle")

    return dist, parent

def get_path(parent, source, target):
    if target not in parent and target != source:
        return None
    path = [target]
    while path[-1] != source:
        path.append(parent[path[-1]])
    return path[::-1]`,

    javascript: `function bellmanFord(vertices, edges, source) {
    const dist = new Map();
    const parent = new Map();
    for (const v of vertices) dist.set(v, Infinity);
    dist.set(source, 0);

    // Relax all edges V-1 times
    for (let i = 0; i < vertices.length - 1; i++) {
        for (const [u, v, weight] of edges) {
            if (dist.get(u) + weight < dist.get(v)) {
                dist.set(v, dist.get(u) + weight);
                parent.set(v, u);
            }
        }
    }

    // Check for negative-weight cycles
    for (const [u, v, weight] of edges) {
        if (dist.get(u) + weight < dist.get(v)) {
            throw new Error("Graph contains a negative-weight cycle");
        }
    }

    return { dist, parent };
}

function getPath(parent, source, target) {
    if (!parent.has(target) && target !== source) return null;
    const path = [target];
    while (path[path.length - 1] !== source) {
        path.push(parent.get(path[path.length - 1]));
    }
    return path.reverse();
}`,

    java: `import java.util.*;

public Map<Integer, Integer> bellmanFord(List<Integer> vertices,
                                         List<int[]> edges,
                                         int source) {
    Map<Integer, Integer> dist = new HashMap<>();
    Map<Integer, Integer> parent = new HashMap<>();
    for (int v : vertices) dist.put(v, Integer.MAX_VALUE);
    dist.put(source, 0);

    // Relax all edges V-1 times
    for (int i = 0; i < vertices.size() - 1; i++) {
        for (int[] edge : edges) {
            int u = edge[0], v = edge[1], weight = edge[2];
            if (dist.get(u) != Integer.MAX_VALUE
                    && dist.get(u) + weight < dist.get(v)) {
                dist.put(v, dist.get(u) + weight);
                parent.put(v, u);
            }
        }
    }

    // Check for negative-weight cycles
    for (int[] edge : edges) {
        int u = edge[0], v = edge[1], weight = edge[2];
        if (dist.get(u) != Integer.MAX_VALUE
                && dist.get(u) + weight < dist.get(v)) {
            throw new RuntimeException("Negative-weight cycle detected");
        }
    }

    return dist;
}`,

    cpp: `#include <vector>
#include <unordered_map>
#include <limits>
#include <stdexcept>

struct Edge {
    int u, v, weight;
};

std::unordered_map<int, int> bellmanFord(
        const std::vector<int>& vertices,
        const std::vector<Edge>& edges,
        int source) {
    std::unordered_map<int, int> dist;
    std::unordered_map<int, int> parent;
    for (int v : vertices) dist[v] = std::numeric_limits<int>::max();
    dist[source] = 0;

    // Relax all edges V-1 times
    for (size_t i = 0; i < vertices.size() - 1; i++) {
        for (const auto& e : edges) {
            if (dist[e.u] != std::numeric_limits<int>::max()
                    && dist[e.u] + e.weight < dist[e.v]) {
                dist[e.v] = dist[e.u] + e.weight;
                parent[e.v] = e.u;
            }
        }
    }

    // Check for negative-weight cycles
    for (const auto& e : edges) {
        if (dist[e.u] != std::numeric_limits<int>::max()
                && dist[e.u] + e.weight < dist[e.v]) {
            throw std::runtime_error("Negative-weight cycle detected");
        }
    }

    return dist;
}`,
  },
};

export default bellmanFord;
