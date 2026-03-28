const topologicalSort = {
  pseudocode: [
    "function TopologicalSort(graph, vertices):     // Kahn's algorithm",
    '    inDegree = compute in-degree for each vertex',
    '    queue = all vertices with inDegree == 0',
    '    order = empty list',
    '    while queue is not empty:',
    '        node = dequeue()',
    '        append node to order',
    '        for each neighbor of node:',
    '            inDegree[neighbor] -= 1',
    '            if inDegree[neighbor] == 0:',
    '                enqueue neighbor',
    '    if |order| != |V|:',
    '        return "cycle detected, no valid ordering"',
    '    return order',
  ],

  code: {
    python: `from collections import deque

def topological_sort(graph, vertices):
    """Kahn's algorithm for topological sorting."""
    in_degree = {v: 0 for v in vertices}
    for v in vertices:
        for neighbor in graph.get(v, []):
            in_degree[neighbor] += 1

    queue = deque([v for v in vertices if in_degree[v] == 0])
    order = []

    while queue:
        node = queue.popleft()
        order.append(node)

        for neighbor in graph.get(node, []):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(order) != len(vertices):
        raise ValueError("Cycle detected: no valid topological ordering")

    return order`,

    javascript: `function topologicalSort(graph, vertices) {
    // Kahn's algorithm
    const inDegree = new Map();
    for (const v of vertices) inDegree.set(v, 0);
    for (const v of vertices) {
        for (const neighbor of (graph.get(v) || [])) {
            inDegree.set(neighbor, inDegree.get(neighbor) + 1);
        }
    }

    const queue = [];
    for (const [v, deg] of inDegree) {
        if (deg === 0) queue.push(v);
    }

    const order = [];

    while (queue.length > 0) {
        const node = queue.shift();
        order.push(node);

        for (const neighbor of (graph.get(node) || [])) {
            inDegree.set(neighbor, inDegree.get(neighbor) - 1);
            if (inDegree.get(neighbor) === 0) {
                queue.push(neighbor);
            }
        }
    }

    if (order.length !== vertices.length) {
        throw new Error("Cycle detected: no valid topological ordering");
    }

    return order;
}`,

    java: `import java.util.*;

public List<Integer> topologicalSort(Map<Integer, List<Integer>> graph,
                                     List<Integer> vertices) {
    // Kahn's algorithm
    Map<Integer, Integer> inDegree = new HashMap<>();
    for (int v : vertices) inDegree.put(v, 0);
    for (int v : vertices) {
        for (int neighbor : graph.getOrDefault(v, List.of())) {
            inDegree.merge(neighbor, 1, Integer::sum);
        }
    }

    Queue<Integer> queue = new LinkedList<>();
    for (int v : vertices) {
        if (inDegree.get(v) == 0) queue.add(v);
    }

    List<Integer> order = new ArrayList<>();

    while (!queue.isEmpty()) {
        int node = queue.poll();
        order.add(node);

        for (int neighbor : graph.getOrDefault(node, List.of())) {
            inDegree.merge(neighbor, -1, Integer::sum);
            if (inDegree.get(neighbor) == 0) {
                queue.add(neighbor);
            }
        }
    }

    if (order.size() != vertices.size()) {
        throw new RuntimeException("Cycle detected: no valid ordering");
    }

    return order;
}`,

    cpp: `#include <vector>
#include <queue>
#include <unordered_map>
#include <stdexcept>

std::vector<int> topologicalSort(
        const std::unordered_map<int, std::vector<int>>& graph,
        const std::vector<int>& vertices) {
    // Kahn's algorithm
    std::unordered_map<int, int> inDegree;
    for (int v : vertices) inDegree[v] = 0;
    for (int v : vertices) {
        if (graph.count(v)) {
            for (int neighbor : graph.at(v)) {
                inDegree[neighbor]++;
            }
        }
    }

    std::queue<int> q;
    for (int v : vertices) {
        if (inDegree[v] == 0) q.push(v);
    }

    std::vector<int> order;

    while (!q.empty()) {
        int node = q.front();
        q.pop();
        order.push_back(node);

        if (graph.count(node)) {
            for (int neighbor : graph.at(node)) {
                inDegree[neighbor]--;
                if (inDegree[neighbor] == 0) {
                    q.push(neighbor);
                }
            }
        }
    }

    if (order.size() != vertices.size()) {
        throw std::runtime_error("Cycle detected: no valid ordering");
    }

    return order;
}`,
  },
};

export default topologicalSort;
