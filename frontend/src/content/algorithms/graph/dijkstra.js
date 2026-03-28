const dijkstra = {
  pseudocode: [
    'function Dijkstra(graph, source, target):',
    '    dist = map with all nodes set to infinity',
    '    parent = empty map',
    '    dist[source] = 0',
    '    PQ = min-priority queue with (0, source)',
    '    while PQ is not empty:',
    '        (d, node) = extract min from PQ',
    '        if d > dist[node]: continue    // stale entry',
    '        if node == target:',
    '            return (dist[target], reconstructPath(parent, source, target))',
    '        for each (neighbor, weight) of node:',
    '            newDist = dist[node] + weight',
    '            if newDist < dist[neighbor]:',
    '                dist[neighbor] = newDist',
    '                parent[neighbor] = node',
    '                insert (newDist, neighbor) into PQ',
    '    return no path found',
  ],

  code: {
    python: `import heapq

def dijkstra(graph, source, target):
    dist = {node: float('inf') for node in graph}
    parent = {}
    dist[source] = 0
    pq = [(0, source)]

    while pq:
        d, node = heapq.heappop(pq)

        if d > dist[node]:
            continue  # stale entry

        if node == target:
            return dist[target], reconstruct_path(parent, source, target)

        for neighbor, weight in graph[node]:
            new_dist = dist[node] + weight
            if new_dist < dist[neighbor]:
                dist[neighbor] = new_dist
                parent[neighbor] = node
                heapq.heappush(pq, (new_dist, neighbor))

    return float('inf'), None  # no path found

def reconstruct_path(parent, source, target):
    path = [target]
    while path[-1] != source:
        path.append(parent[path[-1]])
    return path[::-1]`,

    javascript: `function dijkstra(graph, source, target) {
    const dist = new Map();
    const parent = new Map();
    for (const node of graph.keys()) dist.set(node, Infinity);
    dist.set(source, 0);

    // Min-heap: [distance, node]
    const pq = [[0, source]];

    while (pq.length > 0) {
        pq.sort((a, b) => a[0] - b[0]);
        const [d, node] = pq.shift();

        if (d > dist.get(node)) continue; // stale entry

        if (node === target) {
            return { dist: dist.get(target), path: reconstructPath(parent, source, target) };
        }

        for (const [neighbor, weight] of graph.get(node)) {
            const newDist = dist.get(node) + weight;
            if (newDist < dist.get(neighbor)) {
                dist.set(neighbor, newDist);
                parent.set(neighbor, node);
                pq.push([newDist, neighbor]);
            }
        }
    }

    return { dist: Infinity, path: null };
}

function reconstructPath(parent, source, target) {
    const path = [target];
    while (path[path.length - 1] !== source) {
        path.push(parent.get(path[path.length - 1]));
    }
    return path.reverse();
}`,

    java: `import java.util.*;

public int[] dijkstra(Map<Integer, List<int[]>> graph,
                      int source, int target) {
    Map<Integer, Integer> dist = new HashMap<>();
    Map<Integer, Integer> parent = new HashMap<>();
    for (int node : graph.keySet()) dist.put(node, Integer.MAX_VALUE);
    dist.put(source, 0);

    // PQ entries: [distance, node]
    PriorityQueue<int[]> pq = new PriorityQueue<>(
        Comparator.comparingInt(a -> a[0])
    );
    pq.offer(new int[]{0, source});

    while (!pq.isEmpty()) {
        int[] entry = pq.poll();
        int d = entry[0], node = entry[1];

        if (d > dist.get(node)) continue; // stale entry

        if (node == target) {
            return reconstructPath(parent, source, target, dist.get(target));
        }

        for (int[] edge : graph.get(node)) {
            int neighbor = edge[0], weight = edge[1];
            int newDist = dist.get(node) + weight;
            if (newDist < dist.get(neighbor)) {
                dist.put(neighbor, newDist);
                parent.put(neighbor, node);
                pq.offer(new int[]{newDist, neighbor});
            }
        }
    }

    return null; // no path found
}`,

    cpp: `#include <vector>
#include <queue>
#include <unordered_map>
#include <limits>

using Graph = std::unordered_map<int, std::vector<std::pair<int,int>>>;

std::vector<int> dijkstra(const Graph& graph, int source, int target) {
    std::unordered_map<int, int> dist;
    std::unordered_map<int, int> parent;
    for (auto& [node, _] : graph) dist[node] = std::numeric_limits<int>::max();
    dist[source] = 0;

    // Min-heap: (distance, node)
    using Entry = std::pair<int, int>;
    std::priority_queue<Entry, std::vector<Entry>, std::greater<>> pq;
    pq.push({0, source});

    while (!pq.empty()) {
        auto [d, node] = pq.top();
        pq.pop();

        if (d > dist[node]) continue; // stale entry

        if (node == target) {
            std::vector<int> path;
            for (int n = target; n != source; n = parent[n])
                path.push_back(n);
            path.push_back(source);
            std::reverse(path.begin(), path.end());
            return path;
        }

        for (auto& [neighbor, weight] : graph.at(node)) {
            int newDist = dist[node] + weight;
            if (newDist < dist[neighbor]) {
                dist[neighbor] = newDist;
                parent[neighbor] = node;
                pq.push({newDist, neighbor});
            }
        }
    }

    return {}; // no path found
}`,
  },
};

export default dijkstra;
