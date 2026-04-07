# Algorithm Explorer

**A browser-based platform for visualizing, replaying, and benchmarking algorithms.**

[Live Demo](https://algo-explorer-amber.vercel.app) &nbsp;&middot;&nbsp; Built with React, FastAPI, and a lot of graph paper

---

## What is this?

Algorithm Explorer is an interactive lab environment where you can watch algorithms think. Not just the final output — the actual decision-making, step by step.

Pick an algorithm, set up an input (or load a preset), hit run, and watch it work through the problem. Every step is captured in a timeline you can scrub through, pause, rewind, and inspect. Each step comes with a plain-english explanation of what the algorithm is doing and why.

It covers three domains: **graph/pathfinding**, **sorting**, and **dynamic programming** — all running through the same simulation engine. The platform also includes a benchmark lab for measuring performance across input sizes, side-by-side algorithm comparison, a scenario library for saving your favorite inputs, and run history so you can revisit past simulations.

This isn't a toy visualizer. It's a full-stack application with 25 algorithms, a custom design system, user authentication, and a deployment pipeline. I built it to be the kind of tool I wished I had when I was learning these algorithms — and to push myself as a software engineer.

---

## Features

### Algorithm Labs

Each lab is a self-contained workspace for experimenting with a family of algorithms.

- **Graph Lab** — Build graphs by clicking to add nodes and dragging to connect them. Set edge weights, choose source/target nodes, and run pathfinding algorithms on your custom graph. Also supports a grid mode where you paint walls on a grid and watch algorithms find paths around them.

- **Sorting Lab** — Generate arrays (random, reversed, nearly sorted, with duplicates) and watch sorting algorithms work through them with highlighted comparisons, swaps, and partitions.

- **DP Lab** — Enter strings, weights, or values and watch dynamic programming tables fill cell by cell, with traceback paths and recurrence explanations.

### Playback System

Every algorithm produces a structured timeline. The playback system lets you:

- Play, pause, step forward/backward through execution
- Adjust playback speed
- Scrub to any point in the timeline
- See metrics update in real time (comparisons, swaps, nodes visited, etc.)
- Read step-by-step explanations of what the algorithm is deciding

### Code Panel

A floating panel shows pseudocode and real implementations (Python, JavaScript, Java, C++) with the current line highlighted as the algorithm runs. Useful for connecting the visual animation to actual code.

### Benchmark Lab

Run algorithms across a range of input sizes with repeated trials and see the resulting performance curves. Useful for building intuition about time complexity — seeing O(n log n) vs O(n^2) on a chart hits different than reading it in a textbook.

### Compare Mode

Run two algorithms on the same input side by side. Same data, different approaches — see exactly how BFS and DFS explore a graph differently, or how Quick Sort and Merge Sort break down the same array.

### Scenarios & History

Save inputs you've built so you can come back to them. Every simulation run is logged so you can revisit and replay past executions.

---

## Algorithms

**Graph & Pathfinding** — BFS, DFS, Dijkstra, A*, Bellman-Ford, Kruskal's, Prim's, Topological Sort, plus BFS/DFS/Dijkstra/A* on grids

**Sorting & Searching** — Quick Sort, Merge Sort, Bubble Sort, Insertion Sort, Heap Sort, Selection Sort, Binary Search, Linear Search

**Dynamic Programming** — Longest Common Subsequence, Edit Distance, 0/1 Knapsack, Coin Change, Fibonacci (recursion vs memoization vs tabulation)

---

## Architecture

The core idea is simple: **algorithms don't render anything.** They produce structured data — a timeline of steps — and the frontend turns that timeline into an interactive, replayable experience.

This means the same playback controls, step inspector, explanation panel, and code highlighter work identically whether you're watching Dijkstra on a graph, Merge Sort on an array, or Edit Distance filling a DP table. One simulation engine, three domains.

**Backend:** A FastAPI server runs the algorithm, captures every state change into a list of timeline steps, and stores the result. Each step records what's active, what's in the frontier/stack/queue, current metrics, and a human-readable explanation.

**Frontend:** A React app fetches the timeline and feeds it into a shared playback store (Zustand). Domain-specific renderers (canvas-based graph/grid visualizer, bar charts for sorting, table grids for DP) subscribe to the current step and render accordingly.

**Benchmarks** run in background workers using process-level parallelism to saturate available CPU cores across multiple input sizes and trials.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 19, Vite, Tailwind CSS v4, Zustand, React Router v7, Recharts, HTML Canvas |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic, SQLite (dev) / PostgreSQL (prod) |
| Testing | Pytest (735 tests), Vitest (444 tests), Playwright (E2E), Testing Library |
| Infrastructure | Vercel (frontend), Render (backend), Redis + RQ (local benchmark workers) |



---

## Project Stats

- 25 algorithms across 3 domains
- 1,179 automated tests
- 34,000+ lines of application code
- 20+ reusable UI components in a custom design system
- Full auth system with guest-first UX and session migration
- Deployed and live

---

## Why I Built This

I wanted to build something that actually helps people understand algorithms - not just watch colored bars swap positions. The explanations, the timeline scrubbing, the ability to build your own inputs and see exactly how the algorithm handles them - that's the part textbooks can't do.

On the engineering side, this was an exercise in building a real product from scratch: designing a system architecture that scales across domains, writing a proper design system, handling auth and persistence, setting up CI/testing, and deploying to production. Every phase taught me something new.

If you're a student, I hope this helps you build intuition. If you're an engineer, I hope the architecture is interesting. If you're a recruiter - hi, I like building things.

---

## License

MIT
