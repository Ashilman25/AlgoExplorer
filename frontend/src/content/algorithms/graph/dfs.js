const dfs = {
  pseudocode: [
    'function DFS(graph, source, target):',
    '    stack = empty stack',
    '    visited = empty set',
    '    parent = empty map',
    '    push source onto stack',
    '    while stack is not empty:',
    '        node = pop from stack',
    '        if node in visited: continue',
    '        mark node as visited',
    '        if node == target:',
    '            return reconstructPath(parent, source, target)',
    '        for each neighbor of node (reversed):',
    '            if neighbor not in visited:',
    '                parent[neighbor] = node',
    '                push neighbor onto stack',
    '    return no path found',
  ],

  code: {
    python: `def dfs(graph, source, target):
    stack = [source]
    visited = set()
    parent = {}

    while stack:
        node = stack.pop()

        if node in visited:
            continue
        visited.add(node)

        if node == target:
            return reconstruct_path(parent, source, target)

        for neighbor in reversed(graph[node]):
            if neighbor not in visited:
                parent[neighbor] = node
                stack.append(neighbor)

    return None  # no path found

def reconstruct_path(parent, source, target):
    path = [target]
    while path[-1] != source:
        path.append(parent[path[-1]])
    return path[::-1]`,

    javascript: `function dfs(graph, source, target) {
    const stack = [source];
    const visited = new Set();
    const parent = new Map();

    while (stack.length > 0) {
        const node = stack.pop();

        if (visited.has(node)) continue;
        visited.add(node);

        if (node === target) {
            return reconstructPath(parent, source, target);
        }

        const neighbors = [...graph[node]].reverse();
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                parent.set(neighbor, node);
                stack.push(neighbor);
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

public List<Integer> dfs(Map<Integer, List<Integer>> graph,
                         int source, int target) {
    Deque<Integer> stack = new ArrayDeque<>();
    Set<Integer> visited = new HashSet<>();
    Map<Integer, Integer> parent = new HashMap<>();

    stack.push(source);

    while (!stack.isEmpty()) {
        int node = stack.pop();

        if (visited.contains(node)) continue;
        visited.add(node);

        if (node == target) {
            return reconstructPath(parent, source, target);
        }

        List<Integer> neighbors = new ArrayList<>(graph.get(node));
        Collections.reverse(neighbors);
        for (int neighbor : neighbors) {
            if (!visited.contains(neighbor)) {
                parent.put(neighbor, node);
                stack.push(neighbor);
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
#include <stack>
#include <unordered_set>
#include <unordered_map>
#include <algorithm>

std::vector<int> dfs(
        const std::unordered_map<int, std::vector<int>>& graph,
        int source, int target) {
    std::stack<int> stk;
    std::unordered_set<int> visited;
    std::unordered_map<int, int> parent;

    stk.push(source);

    while (!stk.empty()) {
        int node = stk.top();
        stk.pop();

        if (visited.count(node)) continue;
        visited.insert(node);

        if (node == target) {
            std::vector<int> path;
            for (int n = target; n != source; n = parent[n])
                path.push_back(n);
            path.push_back(source);
            std::reverse(path.begin(), path.end());
            return path;
        }

        auto neighbors = graph.at(node);
        std::reverse(neighbors.begin(), neighbors.end());
        for (int neighbor : neighbors) {
            if (!visited.count(neighbor)) {
                parent[neighbor] = node;
                stk.push(neighbor);
            }
        }
    }

    return {}; // no path found
}`,
  },
};

export default dfs;
