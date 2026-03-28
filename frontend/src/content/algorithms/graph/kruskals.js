const kruskals = {
  pseudocode: [
    'function Kruskal(vertices, edges):',
    '    sort edges by weight ascending',
    '    parent = map: each vertex is its own parent',
    '    rank = map: each vertex has rank 0',
    '    mst = empty list',
    '    for each (u, v, weight) in sorted edges:',
    '        rootU = find(u)',
    '        rootV = find(v)',
    '        if rootU != rootV:',
    '            union(rootU, rootV)',
    '            add (u, v, weight) to mst',
    '            if |mst| == |V| - 1: break',
    '    return mst',
    '',
    'function find(x):',
    '    if parent[x] != x: parent[x] = find(parent[x])   // path compression',
    '    return parent[x]',
    '',
    'function union(a, b):',
    '    if rank[a] < rank[b]: swap(a, b)',
    '    parent[b] = a',
    '    if rank[a] == rank[b]: rank[a] += 1',
  ],

  code: {
    python: `class UnionFind:
    def __init__(self, vertices):
        self.parent = {v: v for v in vertices}
        self.rank = {v: 0 for v in vertices}

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # path compression
        return self.parent[x]

    def union(self, a, b):
        root_a, root_b = self.find(a), self.find(b)
        if root_a == root_b:
            return False
        if self.rank[root_a] < self.rank[root_b]:
            root_a, root_b = root_b, root_a
        self.parent[root_b] = root_a
        if self.rank[root_a] == self.rank[root_b]:
            self.rank[root_a] += 1
        return True

def kruskal(vertices, edges):
    edges.sort(key=lambda e: e[2])  # sort by weight
    uf = UnionFind(vertices)
    mst = []

    for u, v, weight in edges:
        if uf.find(u) != uf.find(v):
            uf.union(u, v)
            mst.append((u, v, weight))
            if len(mst) == len(vertices) - 1:
                break

    return mst`,

    javascript: `class UnionFind {
    constructor(vertices) {
        this.parent = new Map();
        this.rank = new Map();
        for (const v of vertices) {
            this.parent.set(v, v);
            this.rank.set(v, 0);
        }
    }

    find(x) {
        if (this.parent.get(x) !== x) {
            this.parent.set(x, this.find(this.parent.get(x))); // path compression
        }
        return this.parent.get(x);
    }

    union(a, b) {
        let rootA = this.find(a);
        let rootB = this.find(b);
        if (rootA === rootB) return false;
        if (this.rank.get(rootA) < this.rank.get(rootB)) {
            [rootA, rootB] = [rootB, rootA];
        }
        this.parent.set(rootB, rootA);
        if (this.rank.get(rootA) === this.rank.get(rootB)) {
            this.rank.set(rootA, this.rank.get(rootA) + 1);
        }
        return true;
    }
}

function kruskal(vertices, edges) {
    edges.sort((a, b) => a[2] - b[2]); // sort by weight
    const uf = new UnionFind(vertices);
    const mst = [];

    for (const [u, v, weight] of edges) {
        if (uf.find(u) !== uf.find(v)) {
            uf.union(u, v);
            mst.push([u, v, weight]);
            if (mst.length === vertices.length - 1) break;
        }
    }

    return mst;
}`,

    java: `import java.util.*;

public class Kruskal {
    private Map<Integer, Integer> parent = new HashMap<>();
    private Map<Integer, Integer> rank = new HashMap<>();

    private int find(int x) {
        if (parent.get(x) != x) {
            parent.put(x, find(parent.get(x))); // path compression
        }
        return parent.get(x);
    }

    private boolean union(int a, int b) {
        int rootA = find(a), rootB = find(b);
        if (rootA == rootB) return false;
        if (rank.get(rootA) < rank.get(rootB)) {
            int tmp = rootA; rootA = rootB; rootB = tmp;
        }
        parent.put(rootB, rootA);
        if (rank.get(rootA).equals(rank.get(rootB))) {
            rank.put(rootA, rank.get(rootA) + 1);
        }
        return true;
    }

    public List<int[]> kruskal(List<Integer> vertices, List<int[]> edges) {
        for (int v : vertices) {
            parent.put(v, v);
            rank.put(v, 0);
        }

        edges.sort(Comparator.comparingInt(e -> e[2])); // sort by weight
        List<int[]> mst = new ArrayList<>();

        for (int[] edge : edges) {
            int u = edge[0], v = edge[1], weight = edge[2];
            if (find(u) != find(v)) {
                union(u, v);
                mst.add(edge);
                if (mst.size() == vertices.size() - 1) break;
            }
        }

        return mst;
    }
}`,

    cpp: `#include <vector>
#include <algorithm>
#include <unordered_map>

struct Edge {
    int u, v, weight;
};

class UnionFind {
    std::unordered_map<int, int> parent, rank_;
public:
    UnionFind(const std::vector<int>& vertices) {
        for (int v : vertices) { parent[v] = v; rank_[v] = 0; }
    }

    int find(int x) {
        if (parent[x] != x)
            parent[x] = find(parent[x]); // path compression
        return parent[x];
    }

    bool unite(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (rank_[ra] < rank_[rb]) std::swap(ra, rb);
        parent[rb] = ra;
        if (rank_[ra] == rank_[rb]) rank_[ra]++;
        return true;
    }
};

std::vector<Edge> kruskal(const std::vector<int>& vertices,
                          std::vector<Edge> edges) {
    std::sort(edges.begin(), edges.end(),
              [](const Edge& a, const Edge& b) {
                  return a.weight < b.weight;
              });

    UnionFind uf(vertices);
    std::vector<Edge> mst;

    for (const auto& e : edges) {
        if (uf.find(e.u) != uf.find(e.v)) {
            uf.unite(e.u, e.v);
            mst.push_back(e);
            if (mst.size() == vertices.size() - 1) break;
        }
    }

    return mst;
}`,
  },
};

export default kruskals;
