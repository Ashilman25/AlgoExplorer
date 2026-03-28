const prims = {
  pseudocode: [
    'function Prim(graph, source):',
    '    inMST = empty set',
    '    mstEdges = empty list',
    '    totalWeight = 0',
    '    PQ = min-priority queue',
    '    add source to inMST',
    '    for each (neighbor, weight) of source:',
    '        insert (weight, source, neighbor) into PQ',
    '    while PQ is not empty and |inMST| < |V|:',
    '        (weight, u, v) = extract min from PQ',
    '        if v in inMST: continue',
    '        add v to inMST',
    '        add (u, v, weight) to mstEdges',
    '        totalWeight += weight',
    '        for each (neighbor, w) of v:',
    '            if neighbor not in inMST:',
    '                insert (w, v, neighbor) into PQ',
    '    return mstEdges, totalWeight',
  ],

  code: {
    python: `import heapq

def prim(graph, source):
    in_mst = {source}
    mst_edges = []
    total_weight = 0

    # Seed the priority queue with edges from source
    pq = []
    for neighbor, weight in graph[source]:
        heapq.heappush(pq, (weight, source, neighbor))

    while pq and len(in_mst) < len(graph):
        weight, u, v = heapq.heappop(pq)

        if v in in_mst:
            continue

        in_mst.add(v)
        mst_edges.append((u, v, weight))
        total_weight += weight

        for neighbor, w in graph[v]:
            if neighbor not in in_mst:
                heapq.heappush(pq, (w, v, neighbor))

    return mst_edges, total_weight`,

    javascript: `function prim(graph, source) {
    const inMST = new Set([source]);
    const mstEdges = [];
    let totalWeight = 0;

    // Seed the priority queue with edges from source
    const pq = [];
    for (const [neighbor, weight] of graph.get(source)) {
        pq.push([weight, source, neighbor]);
    }

    while (pq.length > 0 && inMST.size < graph.size) {
        pq.sort((a, b) => a[0] - b[0]);
        const [weight, u, v] = pq.shift();

        if (inMST.has(v)) continue;

        inMST.add(v);
        mstEdges.push([u, v, weight]);
        totalWeight += weight;

        for (const [neighbor, w] of graph.get(v)) {
            if (!inMST.has(neighbor)) {
                pq.push([w, v, neighbor]);
            }
        }
    }

    return { edges: mstEdges, totalWeight };
}`,

    java: `import java.util.*;

public class Prim {
    public List<int[]> prim(Map<Integer, List<int[]>> graph, int source) {
        Set<Integer> inMST = new HashSet<>();
        List<int[]> mstEdges = new ArrayList<>();
        int totalWeight = 0;

        // PQ entries: [weight, from, to]
        PriorityQueue<int[]> pq = new PriorityQueue<>(
            Comparator.comparingInt(a -> a[0])
        );

        inMST.add(source);
        for (int[] edge : graph.get(source)) {
            pq.offer(new int[]{edge[1], source, edge[0]});
        }

        while (!pq.isEmpty() && inMST.size() < graph.size()) {
            int[] entry = pq.poll();
            int weight = entry[0], u = entry[1], v = entry[2];

            if (inMST.contains(v)) continue;

            inMST.add(v);
            mstEdges.add(new int[]{u, v, weight});
            totalWeight += weight;

            for (int[] edge : graph.get(v)) {
                if (!inMST.contains(edge[0])) {
                    pq.offer(new int[]{edge[1], v, edge[0]});
                }
            }
        }

        return mstEdges;
    }
}`,

    cpp: `#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>

using Graph = std::unordered_map<int, std::vector<std::pair<int,int>>>;

struct Edge {
    int weight, from, to;
    bool operator>(const Edge& o) const { return weight > o.weight; }
};

std::vector<Edge> prim(const Graph& graph, int source) {
    std::unordered_set<int> inMST;
    std::vector<Edge> mstEdges;
    int totalWeight = 0;

    std::priority_queue<Edge, std::vector<Edge>, std::greater<>> pq;

    inMST.insert(source);
    for (auto& [neighbor, weight] : graph.at(source)) {
        pq.push({weight, source, neighbor});
    }

    while (!pq.empty() && inMST.size() < graph.size()) {
        auto [weight, u, v] = pq.top();
        pq.pop();

        if (inMST.count(v)) continue;

        inMST.insert(v);
        mstEdges.push_back({weight, u, v});
        totalWeight += weight;

        for (auto& [neighbor, w] : graph.at(v)) {
            if (!inMST.count(neighbor)) {
                pq.push({w, v, neighbor});
            }
        }
    }

    return mstEdges;
}`,
  },
};

export default prims;
