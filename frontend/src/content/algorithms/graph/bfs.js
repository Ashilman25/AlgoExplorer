const bfs = {
  pseudocode: [
    'function BFS(graph, source, target):',
    '    queue = empty queue',
    '    visited = empty set',
    '    parent = empty map',
    '    enqueue source; mark source visited',
    '    while queue is not empty:',
    '        node = dequeue()',
    '        if node == target:',
    '            return reconstructPath(parent, source, target)',
    '        for each neighbor of node:',
    '            if neighbor not in visited:',
    '                mark neighbor visited',
    '                set parent[neighbor] = node',
    '    return no path found',
  ],

  code: {
    python: `from collections import deque

def bfs(graph, source, target):
    queue = deque([source])
    visited = {source}
    parent = {}

    while queue:
        node = queue.popleft()

        if node == target:
            return reconstruct_path(parent, source, target)

        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                parent[neighbor] = node
                queue.append(neighbor)

    return None  # no path found

def reconstruct_path(parent, source, target):
    path = [target]
    while path[-1] != source:
        path.append(parent[path[-1]])
    return path[::-1]`,

    javascript: `function bfs(graph, source, target) {
    const queue = [source];
    const visited = new Set([source]);
    const parent = new Map();

    while (queue.length > 0) {
        const node = queue.shift();

        if (node === target) {
            return reconstructPath(parent, source, target);
        }

        for (const neighbor of graph[node]) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                parent.set(neighbor, node);
                queue.push(neighbor);
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

public List<Integer> bfs(Map<Integer, List<Integer>> graph,
                         int source, int target) {
    Queue<Integer> queue = new LinkedList<>();
    Set<Integer> visited = new HashSet<>();
    Map<Integer, Integer> parent = new HashMap<>();

    queue.add(source);
    visited.add(source);

    while (!queue.isEmpty()) {
        int node = queue.poll();

        if (node == target) {
            return reconstructPath(parent, source, target);
        }

        for (int neighbor : graph.get(node)) {
            if (!visited.contains(neighbor)) {
                visited.add(neighbor);
                parent.put(neighbor, node);
                queue.add(neighbor);
            }
        }
    }

    return null; // no path found
}

private List<Integer> reconstructPath(Map<Integer, Integer> parent,
                                      int source, int target) {
    List<Integer> path = new ArrayList<>();
    for (int node = target; node != source; node = parent.get(node)) {
        path.add(node);
    }
    path.add(source);
    Collections.reverse(path);
    return path;
}`,

    cpp: `#include <vector>
#include <queue>
#include <unordered_set>
#include <unordered_map>

std::vector<int> bfs(
        const std::unordered_map<int, std::vector<int>>& graph,
        int source, int target) {
    std::queue<int> q;
    std::unordered_set<int> visited;
    std::unordered_map<int, int> parent;

    q.push(source);
    visited.insert(source);

    while (!q.empty()) {
        int node = q.front();
        q.pop();

        if (node == target) {
            std::vector<int> path;
            for (int n = target; n != source; n = parent[n])
                path.push_back(n);
            path.push_back(source);
            std::reverse(path.begin(), path.end());
            return path;
        }

        for (int neighbor : graph.at(node)) {
            if (visited.find(neighbor) == visited.end()) {
                visited.insert(neighbor);
                parent[neighbor] = node;
                q.push(neighbor);
            }
        }
    }

    return {}; // no path found
}`,
  },
};

export default bfs;
