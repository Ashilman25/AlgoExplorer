# Algorithm Explorer Web
## Full Product Requirements Document, System Architecture, Page-by-Page Feature Spec, and API Contract

---

# 1. Document Control

## Document Title
Algorithm Explorer Web — Product Requirements Document and Technical Specification

## Product Type
Full-stack browser-based algorithm simulation, visualization, comparison, and benchmarking platform

## Intended Audience
- Product owner
- Software engineers
- Frontend engineers
- Backend engineers
- Designers
- Recruiters / portfolio reviewers
- Professors / project evaluators

## Document Purpose
This document defines the complete product, technical architecture, major user flows, page-by-page features, state model, backend responsibilities, and API contract for **Algorithm Explorer Web**, a high-end interactive web platform for visualizing and analyzing algorithms.

---

# 2. Executive Summary

Algorithm Explorer Web is a full-stack educational and technical simulation platform that allows users to explore algorithms through rich interactive browser-based visualizations. It supports graph/pathfinding algorithms, sorting/searching algorithms, and dynamic programming algorithms. The platform enables step-by-step playback, replayable execution timelines, explanation-aware learning, side-by-side comparison, benchmarking, scenario building, persistence, and export.

This product is intentionally designed to be much more than a normal website. It should function like a browser-based technical tool or lab environment. The strongest framing is that this is a **web-based algorithm simulation platform** rather than a simple educational site.

---

# 3. Product Vision

## Vision Statement
Build a modern browser-based platform that makes algorithms visible, interactive, replayable, explainable, and measurable.

## Core Value Proposition
Users can:
- watch algorithms execute state by state
- inspect internal decisions in real time
- compare algorithms on identical inputs
- build custom scenarios
- benchmark performance across input sizes
- save and revisit simulations
- learn not just what an algorithm outputs, but how it arrives there

## Strategic Positioning
This product combines:
- algorithm education
- simulation software
- interactive data visualization
- technical experimentation
- full-stack product engineering

---

# 4. Product Goals

## Primary Goals
1. Create a rich browser-based simulation platform for algorithm visualization.
2. Support multiple algorithm domains within one coherent product.
3. Build a reusable execution-timeline architecture that powers replay, explanation, and comparison.
4. Provide a polished user experience that feels like a technical desktop tool in the browser.
5. Demonstrate strong software architecture and engineering depth.

## Secondary Goals
1. Support benchmarking and performance analytics.
2. Support custom input/scenario creation.
3. Support persistence of user scenarios and runs.
4. Create a portfolio-ready project with strong demo value.

## Non-Goals
1. This is not a simple marketing website.
2. This is not just a single sorting visualizer.
3. This is not a competitive programming judge.
4. This is not a general-purpose coding IDE.
5. This is not intended to support arbitrary user-submitted code execution in MVP.

---

# 5. Target Users

## Primary Users
### Computer Science Students
Need step-by-step intuition and experimentation tools.

### Technical Interview Candidates
Need a visual and interactive way to compare and understand algorithms.

### Recruiters / Hiring Managers / Portfolio Reviewers
Need to see evidence of architectural depth, UI engineering, and CS knowledge.

### Professors / TAs
Need examples and demos for teaching algorithms.

## Secondary Users
### Self-Learners
Want interactive understanding rather than static textbook explanations.

### Educators / Tutors
May use the platform in lessons or demonstrations.

---

# 6. Product Principles

## 6.1 Interactivity First
Users should feel in control of the execution and exploration process.

## 6.2 Explainability by Design
The system should explain the logic behind steps, not just animate them.

## 6.3 State-Driven Architecture
Algorithms should produce structured state timelines rather than rendering directly.

## 6.4 Modularity
Algorithms, renderers, and modules should be independently extensible.

## 6.5 Visual Clarity
The interface should reduce confusion and show what matters at each step.

## 6.6 Engineering Credibility
The system should feel like serious software, not a one-off class project.

---

# 7. Product Scope

## In Scope
- Graph/pathfinding visualizations
- Sorting/searching visualizations
- Dynamic programming visualizations
- Replayable execution timelines
- Step-by-step simulation playback
- Explanations per step/event
- Benchmark and comparison tools
- Custom scenario builders
- Persistence of scenarios and runs
- Charts and metrics dashboards
- Authentication (optional but recommended)

## Out of Scope for MVP
- Collaborative multi-user sessions
- Arbitrary algorithm scripting by users
- Real-time multiplayer editing
- Native mobile app
- Course management / classrooms

---

# 8. Core Modules

## 8.1 Graph and Pathfinding Lab
Supports interactive graph and grid-based algorithm visualizations.

### Candidate Algorithms
- Breadth-First Search (BFS)
- Depth-First Search (DFS)
- Dijkstra
- A*
- Topological Sort
- Prim's (Phase 2)
- Kruskal's (Phase 2)
- Bellman-Ford (Phase 2)

### Key Features
- Graph builder
- Grid/maze builder
- Weighted edges
- Source and target selection
- Node dragging and editing
- Path highlighting
- Frontier/visited visualization
- Queue/heap/stack inspection
- Step explanation

## 8.2 Sorting and Searching Lab
Supports animated bar/array visualizations and search procedures.

### Candidate Algorithms
- Bubble Sort
- Insertion Sort
- Selection Sort
- Merge Sort
- Quick Sort
- Heap Sort
- Binary Search
- Linear Search

### Key Features
- Custom/random arrays
- Array presets (random, reversed, nearly sorted, duplicates)
- Comparison and swap highlighting
- Pivot and partition visualization
- Operation counts
- Time complexity panel
- Replay and explanation

## 8.3 Dynamic Programming Lab
Supports table-based DP and recursive-vs-optimized comparisons.

### Candidate Algorithms
- Longest Common Subsequence (LCS)
- Edit Distance
- 0/1 Knapsack
- Coin Change
- Fibonacci: recursion vs memoization vs tabulation

### Key Features
- DP table visualization
- Dependency highlighting
- Recurrence explanation
- Traceback visualization
- Memoization hit display
- Input builders for strings/items/weights

## 8.4 Comparison Mode
Compare two or more algorithms on the same input.

### Key Features
- Shared input generation
- Synchronized or independent playback
- Side-by-side rendering
- Shared metrics panel
- Delta summaries and tradeoff callouts

## 8.5 Benchmark Lab
Run performance experiments across input sizes and parameters.

### Key Features
- Input-size sweeps
- Repeated trials
- Aggregated statistics
- Runtime and operation charts
- Exportable CSV/JSON summaries
- Background job processing

## 8.6 Scenario Builder and Library
Create, save, load, and organize reusable scenarios.

### Key Features
- Saved graphs
- Saved arrays
- Saved DP inputs
- Presets and favorites
- Tags and descriptions

---

# 9. Key Use Cases

## Use Case 1: Learn a Pathfinding Algorithm
A user selects Dijkstra, loads a preset graph, runs the simulation, and steps through frontier updates and distance relaxations.

## Use Case 2: Compare BFS vs DFS on a Maze
A user opens comparison mode and observes differences in search behavior, path quality, and nodes visited.

## Use Case 3: Study Quicksort vs Merge Sort
A user compares recursive behavior, operation counts, and array transitions on the same dataset.

## Use Case 4: Understand DP Table Construction
A user enters two strings and watches the LCS table fill while the system explains recurrence choices.

## Use Case 5: Benchmark Algorithms at Scale
A user runs repeated trials and views charts for observed runtime and operation growth.

## Use Case 6: Build Custom Graphs and Reuse Them
A user creates a weighted graph, saves it, later loads it for demonstration and benchmarking.

---

# 10. User Stories

## As a Student
I want to step through an algorithm one event at a time so I can understand its internal logic.

## As a Learner
I want an explanation for each important state change so I know why the algorithm chose that step.

## As an Interview Prep User
I want to compare multiple algorithms on the same input so I can see tradeoffs clearly.

## As a Technical Reviewer
I want to see clean visualizations, metrics, and architecture-level depth in the product.

## As a Returning User
I want to save scenarios and rerun them later.

## As an Educator
I want presets that are easy to demo in class.

---

# 11. Success Metrics

## Product Metrics
- Time spent per simulation session
- Number of simulations run per user
- Number of saved scenarios created
- Benchmark jobs completed
- Percentage of users using comparison mode

## Learning/Engagement Metrics
- Replay interactions per run
- Explanation panel open rate
- Average step count inspected
- Percentage of users returning to saved scenarios

## Technical Metrics
- Time to generate simulation timeline
- Frontend playback smoothness
- API error rates
- Benchmark job completion rates

---

# 12. Functional Requirements

## 12.1 Navigation Requirements
The system shall provide:
- landing/dashboard page
- module selection
- scenario setup screen
- simulation screen
- results/summary screen
- benchmark screen
- scenario library page
- settings page

## 12.2 Simulation Requirements
The system shall support:
- play
- pause
- step forward
- step backward
- jump to start/end
- speed control
- timeline scrubbing
- run reset
- rerun on same input

## 12.3 Explanation Requirements
The system shall display:
- event type
- explanation text
- changed variables/entities
- algorithm-specific reasoning

## 12.4 Visualization Requirements
The system shall render:
- graph nodes/edges/weights
- sorting bars/partitions
- DP tables/dependencies
- metrics and stats
- active state highlighting

## 12.5 Scenario Requirements
The system shall allow users to:
- create scenarios
- edit scenarios
- save scenarios
- load scenarios
- delete scenarios
- browse presets

## 12.6 Comparison Requirements
The system shall support:
- same input for multiple algorithms
- synchronized playback
- comparative metrics summaries
- visual side-by-side analysis

## 12.7 Benchmark Requirements
The system shall allow users to:
- select one or more algorithms
- choose input families and size ranges
- set number of trials
- start asynchronous benchmark jobs
- view progress
- view aggregated results and charts
- export results

---

# 13. Non-Functional Requirements

## Performance
- UI should remain responsive during playback.
- Timelines should load fast enough for interactive use.
- Large benchmarks should execute asynchronously.

## Reliability
- Invalid inputs must be rejected with clear messages.
- Saved scenarios must load consistently.
- Benchmark jobs must survive page refresh when possible.

## Maintainability
- Algorithms must follow a common execution contract.
- Visualization modules must be isolated from backend algorithm logic.
- API contracts must be explicit and versionable.

## Extensibility
- New algorithms should be easy to add without breaking existing modules.
- New visualizations should integrate with shared playback and metrics infrastructure.

## Accessibility
- Color use should avoid meaning by color alone where possible.
- Controls should support keyboard navigation.
- Text should remain readable at standard desktop sizes.

## Security
- Authenticated resources should be protected.
- User-owned scenarios and runs should not be visible to other users without sharing.
- API inputs must be validated.

---

# 14. Product UX Overview

## 14.1 Overall Layout Philosophy
The product should feel closer to a desktop technical tool than a conventional website.

### Standard Simulation Layout
- Left: controls and setup
- Center: primary visualization canvas
- Right: metrics and explanation panel
- Bottom: playback timeline and step controls

## 14.2 Interaction Model
- Immediate visible feedback on all actions
- Clear states for running/paused/completed
- Rich hover states and tooltips
- Minimal friction between setup and execution

## 14.3 Visual Style
- modern, clean, technical
- strong spacing hierarchy
- semantic colors for state types
- dark mode optional and recommended

---

# 15. System Architecture Overview

## 15.1 High-Level Architecture
The platform consists of:
1. Frontend web app
2. Backend API and simulation engine
3. Persistence layer
4. Async benchmark worker layer
5. Caching/session layer

## 15.2 Architecture Diagram (Conceptual)
Client Browser -> React App -> FastAPI -> Algorithm/Simulation Services -> PostgreSQL / Redis / Worker Queue

---

# 16. Frontend Architecture

## 16.1 Frontend Stack
Recommended:
- React
- TypeScript preferred (JSX acceptable if needed)
- Vite
- Tailwind CSS
- Zustand or Redux Toolkit
- SVG and/or Canvas rendering
- Recharts for charts

## 16.2 Frontend Subsystems
### App Shell
- routing
- global layout
- auth provider
- theme provider
- notifications

### Module Pages
- DashboardPage
- GraphLabPage
- SortingLabPage
- DPLabPage
- ComparePage
- BenchmarkPage
- ScenarioLibraryPage
- SettingsPage

### Visualization Components
- GraphRenderer
- GridRenderer
- SortingRenderer
- DpTableRenderer
- BenchmarkCharts

### Playback System
- TimelineController
- PlaybackControls
- StepInspector
- Bookmark support (Phase 2)

### State Management
Global or shared state includes:
- active module
- selected algorithm
- current run metadata
- timeline data
- playback position
- speed setting
- selected scenario
- benchmark job status

## 16.3 Rendering Strategy
### Graph / Pathfinding
- SVG for interactive graphs and builders
- optional Canvas for dense grids or heavy redraw cases

### Sorting
- SVG or Canvas animated bars

### DP Tables
- DOM grid or Canvas; DOM grid preferred for readability and interactivity

---

# 17. Backend Architecture

## 17.1 Backend Stack
Recommended:
- FastAPI
- Pydantic
- SQLAlchemy
- PostgreSQL
- Redis
- Celery or RQ for async jobs
- NetworkX optional for graph helpers

## 17.2 Backend Subsystems
### API Layer
- request validation
- auth checks
- response formatting
- versioned endpoints

### Simulation Engine
- runs algorithms
- emits state timelines
- generates metrics
- produces explanations

### Algorithm Domain Layer
- graph algorithms
- sorting/searching algorithms
- DP algorithms

### Benchmark Service
- runs repeated experiments
- aggregates results
- writes benchmark records
- exposes progress/status

### Scenario Service
- CRUD for scenarios
- preset library
- ownership and sharing rules

### Run Persistence Service
- stores run metadata
- timeline references
- summary metrics

---

# 18. Core Architectural Principle: Timeline-Driven Simulation

## Principle
Algorithms do not animate directly. They produce a structured timeline of states/events.

## Benefits
- replay support
- step backward support
- synced comparison mode
- explanation generation
- debug visibility
- decoupled backend/frontend responsibilities

## Core Data Produced Per Run
- run metadata
- ordered step list
- event types
- visualization payloads
- metrics snapshots
- explanations
- final summary

---

# 19. Domain Data Models (Conceptual)

## 19.1 User
Fields:
- id
- email / username
- password hash (if auth enabled)
- display name
- settings JSON
- created_at

## 19.2 Scenario
Fields:
- id
- owner_id
- module_type
- scenario_type
- title
- description
- input_payload JSON
- tags
- is_preset
- created_at
- updated_at

## 19.3 SimulationRun
Fields:
- id
- owner_id
- scenario_id nullable
- module_type
- algorithm_key
- config JSON
- summary JSON
- timeline_ref
- created_at

## 19.4 TimelineStep
Possible storage approaches:
- JSONB in PostgreSQL
- compressed blob/object storage
- Redis cache + durable archive

Fields conceptually:
- run_id
- step_index
- event_type
- payload JSON
- metrics JSON
- explanation JSON/text

## 19.5 BenchmarkJob
Fields:
- id
- owner_id
- module_type
- config JSON
- status
- progress
- summary JSON
- results JSON
- created_at
- completed_at

---

# 20. Execution Timeline Schema (Conceptual)

Each step should include:
- step_index
- event_type
- state_payload
- highlighted_entities
- metrics_snapshot
- explanation
- timestamp/order

## Example Graph Timeline Payload
- current_node
- frontier_nodes
- visited_nodes
- distance_map delta or current state
- predecessor_map delta
- highlighted_edges
- active_data_structure snapshot

## Example Sorting Timeline Payload
- array_state
- compared_indices
- swapped_indices
- pivot_index
- sorted_indices or ranges
- recursion_frame info

## Example DP Timeline Payload
- table_state delta or current visible values
- active_cell
- dependency_cells
- chosen_transition
- traceback_state if relevant

---

# 21. Algorithm Contracts

Each algorithm implementation should satisfy a common backend interface.

## Common Inputs
- input_payload
- algorithm_config
- execution_mode (simulate / benchmark)
- explanation_level

## Common Outputs
- timeline_steps
- final_result
- summary_metrics
- algorithm_metadata

## Required Metadata
- algorithm_key
- display_name
- domain
- stable/optimal properties where relevant
- theoretical complexities
- required input constraints

---

# 22. Page-by-Page Feature Specification

---

## 22.1 Dashboard / Home Page

### Purpose
Act as the primary entry point into the platform and orient the user toward modules and recent activity.

### Primary Features
- hero/header with product branding
- quick start cards for modules
- recent runs
- saved scenarios preview
- featured presets
- benchmark shortcuts
- onboarding tips

### Components
- top nav
- module cards
- recent activity list
- preset carousel/list
- CTA buttons

### Key Actions
- open module
- resume recent run
- load saved scenario
- start a guided preset demo

### Data Dependencies
- recent runs API
- saved scenarios API
- presets API

---

## 22.2 Module Selection Page

### Purpose
Let the user choose the algorithm domain before setup.

### Features
- Graph & Pathfinding Lab card
- Sorting & Searching Lab card
- Dynamic Programming Lab card
- Comparison Mode card
- Benchmark Lab card

### Key Actions
- choose module
- read short module summaries
- jump to setup pages

---

## 22.3 Graph Lab Setup Page

### Purpose
Configure and prepare a graph/pathfinding simulation.

### Features
- algorithm dropdown
- graph vs grid mode
- preset selector
- random generator controls
- custom builder launcher
- weight toggle
- source/target selector
- explanation mode toggle
- playback speed default

### Algorithm-Specific Options
For A*:
- heuristic selection
- diagonal movement toggle (for grid mode)

### Validation Rules
- must have valid graph/grid structure
- must have source node
- target required for pathfinding algorithms
- weighted requirements for weighted algorithms handled explicitly

### Key Actions
- run simulation
- save scenario
- open builder
- load preset

---

## 22.4 Sorting Lab Setup Page

### Purpose
Configure a sorting/searching simulation.

### Features
- algorithm dropdown
- array size controls
- array distribution preset
- manual input editor
- duplicate density option
- nearly sorted/reversed toggle
- explanation mode toggle
- playback speed default

### Validation Rules
- array values must be numeric or supported comparable type
- size limits enforced for animation mode

### Key Actions
- generate array
- preview input
- save scenario
- run simulation

---

## 22.5 DP Lab Setup Page

### Purpose
Configure a dynamic programming simulation.

### Features by Algorithm
For LCS / Edit Distance:
- two string inputs

For Knapsack:
- item list editor
- capacity input

For Coin Change:
- coin list input
- target sum input

For Fibonacci mode:
- n input
- choose recursion/memoization/tabulation comparison

### Common Features
- explanation mode
- step detail level
- preset selector
- save scenario
- run simulation

---

## 22.6 Scenario Builder Page

### Purpose
Provide rich input-building tools.

### Builder Variants
#### Graph Builder
- add/delete nodes
- drag nodes
- connect/disconnect edges
- edit weights
- toggle directed/undirected
- assign source/target

#### Grid/Maze Builder
- draw walls/obstacles
- place source/target
- assign weighted cells optionally
- random maze generator

#### Array Builder
- enter values
- reorder manually
- shuffle
- random fill

#### DP Builder
- string editor
- item/coin table editor
- validation hints

### Key Actions
- save scenario
- return to setup with built input
- clear/reset

---

## 22.7 Simulation Page

### Purpose
Serve as the main execution, visualization, replay, and explanation environment.

### Layout
- left controls panel
- central visualization panel
- right metrics/explanation sidebar
- bottom timeline panel

### Shared Features
- play/pause
- step forward/backward
- jump to beginning/end
- speed slider
- current step indicator
- state summary banner
- export screenshot (Phase 2)

### Shared Sidebar Features
- algorithm metadata card
- current state explanation
- metrics snapshot
- theoretical complexity info
- data structure view when applicable

### Graph Visualization Features
- active node highlight
- frontier coloring
- visited state coloring
- path highlight
- queue/stack/heap inspector
- distance labels

### Sorting Visualization Features
- highlighted comparisons
- animated swaps
- pivot markers
- sorted region coloring
- operation counters

### DP Visualization Features
- active cell highlight
- dependency highlights
- recurrence display
- traceback overlay
- subproblem stats

### Key Actions
- save run
- save scenario
- switch explanation detail
- rerun
- open comparison with same input

---

## 22.8 Comparison Mode Page

### Purpose
Visualize multiple algorithms on the same input.

### Features
- select 2+ algorithms within same domain
- shared input setup
- synchronized or independent playback
- side-by-side visualization panels
- shared metrics comparison table
- summary commentary section

### Layout
- top shared controls
- main split visualization area
- lower comparison chart/table area

### Comparison Metrics Examples
Graph:
- nodes visited
- path cost
- runtime
- memory estimate

Sorting:
- comparisons
- swaps
- recursion depth
- runtime

DP:
- cells computed
- repeated subproblems avoided
- runtime

---

## 22.9 Benchmark Lab Page

### Purpose
Configure and launch systematic experiments.

### Features
- select domain
- choose algorithm set
- choose input family
- define input size range
- choose number of trials
- select metrics to chart
- launch benchmark

### Async UX
- benchmark job submission
- progress bar/status polling
- cancel if supported later
- completion notification

### Results Section
- runtime line chart
- operation count chart
- summary stats cards
- result table
- export CSV/JSON

---

## 22.10 Scenario Library Page

### Purpose
Manage saved scenarios and presets.

### Features
- my scenarios list
- presets list
- tags/filter/search
- duplicate scenario
- edit metadata
- delete scenario

### Scenario Card Content
- title
- domain
- algorithm compatibility
- short description
- created date
- quick actions

---

## 22.11 Run History Page (Recommended)

### Purpose
Review previous runs and reopen them.

### Features
- list past runs
- filter by domain/algorithm/date
- open run summary
- rerun from same config
- save scenario from run

---

## 22.12 Settings Page

### Purpose
Store user preferences.

### Features
- theme
- default playback speed
- explanation verbosity
- animation detail
- default chart preferences
- keyboard shortcut reference

---

# 23. Detailed Feature Specification by Domain

## 23.1 Graph Domain Features

### Inputs
- graph object with nodes and edges
- grid/maze object
- source/target nodes
- optional weights

### Outputs
- final path (if applicable)
- path cost
- nodes visited
- frontier evolution
- timeline of events

### Special UI Needs
- zoom/pan if graph size large
- node/edge hover tooltips
- label readability

## 23.2 Sorting Domain Features

### Inputs
- array values
- algorithm settings

### Outputs
- sorted array
- comparison count
- swap count
- timeline of transformations

### Special UI Needs
- scaling bars to viewport
- stable playback even on repeated values

## 23.3 DP Domain Features

### Inputs
- strings or tables or item sets depending on algorithm

### Outputs
- DP table
- optimal value/subsequence/path
- trace of recurrence decisions

### Special UI Needs
- scrolling for large tables
- compact view vs expanded explanation view

---

# 24. Authentication and User Management

## MVP Decision
Authentication is optional, but recommended for stronger product depth.

## Features if Auth Enabled
- registration/login/logout
- saved scenarios tied to user
- saved runs tied to user
- preferences stored per user

## If No Auth in MVP
- support guest/local session mode
- browser local storage for temporary scenarios
- add auth later without changing core run system

---

# 25. Persistence Strategy

## What Must Be Persisted
- users/preferences (if auth)
- saved scenarios
- run metadata
- benchmark jobs/results
- preset definitions

## Timeline Storage Options
### Option A: Store full timeline in PostgreSQL JSONB
Pros: simple
Cons: can get large

### Option B: Store summary in Postgres, timeline in compressed object store/file store
Pros: scalable
Cons: more complexity

### Recommended Approach
MVP:
- store timelines as JSONB for manageable sizes
Later:
- move larger runs/benchmarks to object storage

---

# 26. Caching Strategy

Use Redis for:
- active run timelines
- active benchmark job progress
- recent scenario/preset caching
- comparison session temporary state

Benefits:
- faster reloads
- reduced DB load
- background job coordination

---

# 27. Background Job Strategy

Benchmark workloads can become heavy and should not block request-response flows.

## Recommended Job Types
- benchmark experiments
- large comparison batch generation
- export/report generation

## Worker Stack
- Celery or RQ
- Redis broker/backend

## Benchmark Job Lifecycle
1. create benchmark record
2. enqueue job
3. worker processes trials
4. worker updates progress
5. results stored
6. frontend polls status endpoint

---

# 28. API Contract

The following section defines a practical versioned REST API for the platform.

Base path: `/api/v1`

---

## 28.1 Auth Endpoints

### POST `/auth/register`
Create a new account.

#### Request Body
```json
{
  "email": "user@example.com",
  "username": "andrew",
  "password": "securePassword123"
}
```

#### Response
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "andrew"
  },
  "access_token": "jwt-token",
  "token_type": "bearer"
}
```

### POST `/auth/login`
Authenticate user.

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Response
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "andrew"
  },
  "access_token": "jwt-token",
  "token_type": "bearer"
}
```

### GET `/auth/me`
Get current authenticated user.

#### Response
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "andrew",
  "settings": {
    "theme": "dark",
    "default_playback_speed": 1.0
  }
}
```

---

## 28.2 Metadata Endpoints

### GET `/metadata/modules`
Return available modules and descriptions.

### GET `/metadata/algorithms`
Return all supported algorithms and metadata.

#### Example Response
```json
[
  {
    "key": "dijkstra",
    "display_name": "Dijkstra",
    "domain": "graph",
    "time_complexity": "O((V+E) log V)",
    "space_complexity": "O(V)",
    "supports_weighted": true,
    "supports_target": true
  }
]
```

### GET `/metadata/presets`
List preset scenarios.

---

## 28.3 Scenario Endpoints

### POST `/scenarios`
Create/save a scenario.

#### Request Body
```json
{
  "title": "Weighted sample graph",
  "description": "Demo graph for Dijkstra and A*",
  "module_type": "graph",
  "scenario_type": "custom_graph",
  "input_payload": {
    "nodes": [{"id": "A", "x": 100, "y": 120}],
    "edges": [{"source": "A", "target": "B", "weight": 5}],
    "source": "A",
    "target": "F"
  },
  "tags": ["weighted", "demo"]
}
```

#### Response
```json
{
  "id": 42,
  "title": "Weighted sample graph",
  "module_type": "graph",
  "scenario_type": "custom_graph",
  "tags": ["weighted", "demo"],
  "created_at": "2026-03-07T18:00:00Z"
}
```

### GET `/scenarios`
List saved scenarios for current user.

Query params:
- `module_type`
- `tag`
- `search`

### GET `/scenarios/{scenario_id}`
Retrieve a single scenario.

### PATCH `/scenarios/{scenario_id}`
Update scenario metadata or payload.

### DELETE `/scenarios/{scenario_id}`
Delete scenario.

---

## 28.4 Simulation Endpoints

### POST `/runs`
Create and execute a simulation run.

#### Request Body
```json
{
  "module_type": "graph",
  "algorithm_key": "dijkstra",
  "input_payload": {
    "nodes": [
      {"id": "A", "x": 100, "y": 100},
      {"id": "B", "x": 200, "y": 120}
    ],
    "edges": [
      {"source": "A", "target": "B", "weight": 4}
    ],
    "source": "A",
    "target": "B"
  },
  "config": {
    "explanation_level": "standard",
    "timeline_mode": "full",
    "include_metrics": true
  },
  "scenario_id": 42
}
```

#### Response
```json
{
  "run_id": 501,
  "module_type": "graph",
  "algorithm_key": "dijkstra",
  "status": "completed",
  "timeline_step_count": 18,
  "summary": {
    "path_found": true,
    "path_cost": 4,
    "nodes_visited": 2,
    "runtime_ms": 3.4
  }
}
```

### GET `/runs/{run_id}`
Get run metadata and summary.

### GET `/runs/{run_id}/timeline`
Get ordered timeline steps.

#### Response Shape
```json
{
  "run_id": 501,
  "steps": [
    {
      "step_index": 0,
      "event_type": "initialize",
      "state_payload": {
        "current_node": null,
        "frontier_nodes": ["A"],
        "visited_nodes": [],
        "distances": {"A": 0, "B": null}
      },
      "metrics_snapshot": {
        "nodes_visited": 0,
        "relaxations": 0
      },
      "explanation": {
        "title": "Initialize source node",
        "body": "The source node starts with distance 0 and is added to the frontier."
      }
    }
  ]
}
```

### GET `/runs/{run_id}/steps/{step_index}`
Optional endpoint for large timelines; returns one step or a window of steps.

### DELETE `/runs/{run_id}`
Delete a run record.

---

## 28.5 Comparison Endpoints

### POST `/comparisons`
Run multiple algorithms on the same input.

#### Request Body
```json
{
  "module_type": "graph",
  "algorithm_keys": ["dijkstra", "astar"],
  "input_payload": {
    "grid": {
      "rows": 10,
      "cols": 10,
      "walls": [[1, 2], [1, 3]],
      "source": [0, 0],
      "target": [9, 9]
    }
  },
  "config": {
    "explanation_level": "standard"
  }
}
```

#### Response
```json
{
  "comparison_id": 77,
  "runs": [
    {
      "algorithm_key": "dijkstra",
      "run_id": 600,
      "timeline_step_count": 120,
      "summary": {
        "path_found": true,
        "path_cost": 18,
        "nodes_visited": 64,
        "runtime_ms": 5.9
      }
    },
    {
      "algorithm_key": "astar",
      "run_id": 601,
      "timeline_step_count": 88,
      "summary": {
        "path_found": true,
        "path_cost": 18,
        "nodes_visited": 39,
        "runtime_ms": 4.3
      }
    }
  ]
}
```

### GET `/comparisons/{comparison_id}`
Return comparison metadata and run summaries.

---

## 28.6 Benchmark Endpoints

### POST `/benchmarks`
Start a benchmark job.

#### Request Body
```json
{
  "module_type": "sorting",
  "algorithm_keys": ["quick_sort", "merge_sort", "heap_sort"],
  "input_family": "random_array",
  "parameters": {
    "sizes": [100, 500, 1000, 5000],
    "trials_per_size": 10,
    "value_range": [1, 10000]
  },
  "metrics": ["runtime_ms", "comparisons", "swaps"]
}
```

#### Response
```json
{
  "benchmark_id": 900,
  "status": "queued"
}
```

### GET `/benchmarks/{benchmark_id}`
Get benchmark job metadata.

### GET `/benchmarks/{benchmark_id}/status`
Get status and progress.

#### Example Response
```json
{
  "benchmark_id": 900,
  "status": "running",
  "progress": 0.45,
  "completed_trials": 18,
  "total_trials": 40
}
```

### GET `/benchmarks/{benchmark_id}/results`
Get benchmark results and chart-ready series.

#### Example Response
```json
{
  "benchmark_id": 900,
  "status": "completed",
  "summary": {
    "best_runtime_algorithm": "merge_sort"
  },
  "series": {
    "runtime_ms": [
      {
        "algorithm_key": "quick_sort",
        "points": [
          {"size": 100, "mean": 1.2, "median": 1.1, "stddev": 0.2}
        ]
      }
    ]
  },
  "table": [
    {
      "algorithm_key": "quick_sort",
      "size": 100,
      "runtime_mean": 1.2,
      "comparisons_mean": 640
    }
  ]
}
```

---

## 28.7 Run History Endpoints

### GET `/history/runs`
List historical runs.

Query params:
- `module_type`
- `algorithm_key`
- `limit`
- `offset`

### GET `/history/benchmarks`
List historical benchmark jobs.

---

## 28.8 Settings Endpoints

### GET `/settings`
Retrieve user settings.

### PATCH `/settings`
Update user settings.

#### Example Request
```json
{
  "theme": "dark",
  "default_playback_speed": 1.25,
  "explanation_level": "standard"
}
```

---

# 29. Validation Rules

## Common Rules
- unsupported algorithm/module combinations rejected
- missing required inputs rejected
- malformed payloads rejected

## Graph Rules
- node IDs must be unique
- source/target must exist in graph
- edge endpoints must exist
- weight must be numeric if provided

## Sorting Rules
- array length limits enforced for animation mode
- values must be valid comparable numbers in MVP

## DP Rules
- strings length limits enforced for large visual tables
- knapsack items must have valid weights/values
- coin values must be positive integers

---

# 30. Error Handling

## API Error Format
Recommended unified error shape:
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Source node must exist in the graph.",
    "details": {
      "field": "input_payload.source"
    }
  }
}
```

## Frontend Error UX
- inline validation messages on setup pages
- toast/alert for run or benchmark failures
- retry actions where sensible

---

# 31. Security and Permissions

## Authenticated Resource Rules
- only owners can edit/delete personal scenarios and runs
- presets are read-only to normal users
- benchmark/job access restricted to owner unless shared

## Basic Security Requirements
- password hashing
- JWT expiration and validation
- input sanitation/validation
- rate limits on heavy endpoints if public

---

# 32. Observability and Logging

## Recommended Logging
- run creation logs
- algorithm execution summaries
- benchmark lifecycle logs
- auth logs
- API error logs

## Recommended Metrics
- average timeline generation time
- benchmark job durations
- endpoint latency
- worker failure counts

---

# 33. Testing Strategy

## Frontend Tests
- component rendering tests
- playback control behavior
- page-level integration tests
- state store tests

## Backend Tests
- algorithm correctness tests
- timeline generation tests
- API contract tests
- scenario CRUD tests
- benchmark aggregation tests

## End-to-End Tests
- create scenario -> run simulation -> fetch timeline -> replay
- launch benchmark -> poll status -> view results

---

# 34. Deployment Architecture

## Recommended Deployment
### Frontend
- Vercel

### Backend
- Render / Railway / Fly.io

### Database
- managed PostgreSQL

### Redis
- managed Redis instance

### Worker
- separate worker process for benchmark jobs

---

# 35. Recommended Repository Structure

```text
algorithm-explorer-web/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── modules/
│   │   │   ├── graph/
│   │   │   ├── sorting/
│   │   │   ├── dp/
│   │   │   ├── compare/
│   │   │   └── benchmark/
│   │   ├── visuals/
│   │   │   ├── graph/
│   │   │   ├── sorting/
│   │   │   ├── dp/
│   │   │   └── charts/
│   │   ├── stores/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   └── styles/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── algorithms/
│   │   │   ├── graph/
│   │   │   ├── sorting/
│   │   │   └── dp/
│   │   ├── simulation/
│   │   ├── benchmark/
│   │   ├── explain/
│   │   ├── persistence/
│   │   └── db/
│   └── requirements.txt
│
├── docs/
├── docker-compose.yml
└── README.md
```

---

# 36. MVP Definition

## MVP Modules
- Graph Lab
- Sorting Lab
- DP Lab
- basic Scenario Library

## MVP Algorithms
- BFS
- Dijkstra
- Quick Sort
- Merge Sort
- LCS
- Edit Distance

## MVP Features
- create simulation run
- render timeline playback
- explanation panel
- metrics panel
- save/load scenarios
- run history
- basic benchmark page (Phase 1.5 if possible)

## MVP Exclusions
- advanced worker orchestration if not needed initially
- social sharing
- classroom mode
- extensive export/report generation

---

# 37. Post-MVP / Phase 2 Features

- full comparison mode
- async benchmark workers
- scenario tagging/filtering improvements
- more algorithms per domain
- advanced explanation detail levels
- screenshot export
- shareable scenario/run links
- richer keyboard shortcuts

---

# 38. Portfolio Positioning / Resume Language

Recommended framing:

- Built a full-stack browser-based algorithm simulation platform using React and FastAPI with replayable execution timelines, custom scenario builders, and benchmarking analytics.
- Engineered a timeline-driven backend architecture that emitted structured algorithm states for graph, sorting, and dynamic programming visualizations.
- Developed side-by-side comparison workflows, explanation-aware learning panels, and persistent run/scenario storage.

---

# 39. Key Technical Differentiators

This product stands out because it combines:
- custom visualization engineering
- backend simulation/state modeling
- algorithmic depth
- async benchmarking infrastructure
- modular architecture
- product-quality UI/UX

It should be presented not as “another website,” but as a **full-stack interactive technical platform**.

---

# 40. Final Product Statement

Algorithm Explorer Web is a modular, browser-based algorithm lab that transforms algorithms into replayable, explainable, and measurable experiences. It combines interactive visualization, backend-driven state simulation, persistent scenario management, comparative analysis, and benchmark tooling into one cohesive full-stack product.

It is designed to demonstrate both strong computer science fundamentals and production-minded software engineering.

