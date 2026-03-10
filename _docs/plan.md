# Algorithm Explorer Web — Implementation Plan

## 1. Purpose of This Plan

This document translates the PRD into a practical, step-by-step implementation roadmap for building **Algorithm Explorer Web** as a full-stack, browser-based algorithm simulation platform.

The goal is not just to list features. The goal is to define the **order of execution**, the **technical milestones**, the **dependencies between parts**, and the **deliverables required** to move from an empty repository to a polished MVP and then into Phase 2 expansion.

This plan is intentionally structured to match the product vision from the PRD:
- a browser-based technical tool, not a simple website
- a timeline-driven simulation architecture
- support for graph, sorting, and dynamic programming modules
- guest-mode persistence for scenarios and runs in the MVP
- a polished interface that feels like an interactive lab environment

---

## 2. How to Use This Plan

This file should be used as the main implementation roadmap during development.

Each major phase includes:
- **objective** — what this phase accomplishes
- **why it exists** — why the phase matters in the overall architecture
- **major outputs** — what should exist at the end of the phase
- **detailed tasks** — concrete steps to complete
- **dependencies** — what must be done first
- **definition of done** — how to know the phase is actually complete

Recommended usage:
1. Treat each phase as a milestone.
2. Do not skip foundational phases just to “get to the UI.”
3. Complete the shared simulation contract before building domain-specific algorithm modules.
4. Build guest-mode MVP scope first, then layer on auth, comparison, async benchmarking, and richer export/polish features.

---

## 3. Build Strategy

## 3.1 Overall Development Philosophy

This product should be built **inside-out**, not outside-in.

That means:
1. define the architecture and contracts first
2. create the backend simulation and timeline model second
3. build one end-to-end slice that proves the architecture works
4. reuse the same patterns across the other domains
5. add persistence, history, and benchmark infrastructure after the core simulation loop works
6. polish the UX after the product is already technically sound

The biggest architectural risk is building separate one-off visualizers that do not share a common simulation model. The PRD strongly implies that the core differentiator is the **timeline-driven, replayable, explanation-aware simulation engine**. That system must be treated as the heart of the project.

## 3.2 MVP-First Strategy

Build the product in this order:
1. shared project foundation
2. shared backend contracts and timeline schema
3. shared frontend shell and playback framework
4. Graph Lab MVP
5. Sorting Lab MVP
6. DP Lab MVP
7. guest scenario persistence and guest run history
8. basic benchmark page
9. testing, polish, deployment
10. authenticated accounts and cloud sync
11. Phase 2 additions

## 3.3 Recommended MVP Scope

Implement the MVP exactly around the PRD’s core modules and algorithms:

### MVP Modules
- Graph Lab
- Sorting Lab
- DP Lab
- Scenario Library
- Run History

### MVP Algorithms
- BFS
- Dijkstra
- Quick Sort
- Merge Sort
- LCS
- Edit Distance

### MVP Feature Standard
Each MVP algorithm should support:
- valid input setup
- backend simulation run
- generated timeline
- replay controls
- explanation panel
- metrics panel
- guest-saved scenario compatibility
- guest run history compatibility

This is the minimum bar for a module to count as “done.”

### MVP Product Constraint
The MVP is explicitly **guest mode first**:
- no login, signup, or protected routes in MVP scope
- scenarios, run history, and preferences persist locally in the browser
- backend services focus on simulation, validation, and benchmark execution
- account-based sync and ownership rules are a post-MVP feature

---

## 4. Implementation Roadmap Overview

## Phase 0 — Product Framing and Technical Decisions
## Phase 1 — Repository, Tooling, and Project Setup
## Phase 2 — Shared Backend Foundations
## Phase 3 — Shared Frontend Foundations
## Phase 4 — Timeline-Driven Simulation Core
## Phase 5 — Graph Lab MVP
## Phase 6 — Sorting Lab MVP
## Phase 7 — Dynamic Programming Lab MVP
## Phase 8 — Scenario Library and Run History
## Phase 9 — Basic Benchmarking Foundation
## Phase 10 — Testing, Observability, and Error Handling
## Phase 11 — Deployment, Demo Readiness, and Portfolio Positioning
## Phase 12 — Auth, Account Sync, Settings, and Persistence Hardening
## Phase 13 — Phase 2 Expansion Plan

---

# Phase 0 — Product Framing and Technical Decisions

## Objective
Lock in the project structure, scope boundaries, technology stack, and build sequence before writing major implementation code.

## Why This Phase Exists
Without this phase, the project can drift into:
- inconsistent data contracts
- fragmented visuals
- duplicated logic across modules
- overbuilding advanced features before MVP works

## Major Outputs
- final MVP scope document
- chosen stack and versions
- architecture summary
- local development approach
- deployment target plan
- milestone schedule

## Detailed Tasks

### 0.1 Confirm Product Scope
- Re-read the PRD and isolate only the MVP requirements.
- Separate MVP from Phase 2 features.
- Create a checklist of what must ship in MVP versus what can wait.
- Explicitly mark comparison mode and async workers as non-blocking unless time permits.
- Explicitly mark authentication as post-MVP so guest mode is the default development path.

### 0.2 Finalize Stack Choices
Choose exact technologies so the implementation does not stall later.

Recommended stack:
- **Frontend:** React + JavaScript + Vite + Tailwind + Zustand + React Router + Recharts
- **Backend:** FastAPI + Pydantic + SQLAlchemy + PostgreSQL
- **Cache / async foundation:** Redis
- **Optional worker later:** Celery or RQ
- **Deployment:** Vercel for frontend, Render/Railway/Fly for backend, managed PostgreSQL, managed Redis

### 0.3 Decide MVP Persistence Strategy
For MVP, keep it simple:
- store guest scenarios in browser storage first
- store guest run history in browser storage first
- keep backend run/timeline responses easy to cache or persist locally
- use PostgreSQL only for infrastructure that clearly needs server persistence in MVP
- use Redis only where it clearly helps
- do not introduce object storage until large-scale timelines become a real issue

### 0.4 Choose MVP Auth Strategy
Lock this decision now:

**Chosen path: Guest-first MVP**
- no authentication work should block the first shipped version
- use browser persistence for scenarios, run history, and preferences
- design data shapes so they can later map cleanly to account-backed persistence
- add authentication only after the guest workflow is stable end to end

Auth is a later feature, not an MVP dependency.

### 0.5 Define Milestone Order
Create milestone sequence:
1. bootstrapped monorepo
2. backend API running
3. frontend shell running
4. shared timeline contract complete
5. Graph Lab MVP complete
6. Sorting Lab MVP complete
7. DP Lab MVP complete
8. scenarios and history complete
9. benchmark basics complete
10. deployment complete
11. auth and account sync complete

## Dependencies
None.

## Definition of Done
- MVP scope is frozen
- stack decisions are locked
- storage approach is chosen
- guest-first auth strategy is chosen
- milestone order is documented

---

# Phase 1 — Repository, Tooling, and Project Setup

## Objective
Create the full project skeleton, local development workflow, and baseline engineering standards.

## Why This Phase Exists
This phase prevents later chaos in file structure, environment configuration, and team-scale maintainability.

## Major Outputs
- repository initialized
- frontend app bootstrapped
- backend app bootstrapped
- shared docs folder
- environment variable strategy
- linting, formatting, and basic CI checks

## Detailed Tasks

### 1.1 Create Top-Level Repository Structure
Set up the repository to mirror the PRD’s recommended structure:

- `frontend/`
- `backend/`
- `docs/`
- `.env.example`
- `docker-compose.yml` (optional at first, recommended later)
- root README

### 1.2 Bootstrap Frontend
Create the frontend app with:
- Vite
- React
- JavaScript
- Tailwind CSS
- React Router
- Zustand
- ESLint
- Prettier

Then add initial folders:
- `src/app`
- `src/pages`
- `src/components`
- `src/modules`
- `src/visuals`
- `src/stores`
- `src/hooks`
- `src/services`
- `src/utils`
- `src/styles`

### 1.3 Bootstrap Backend
Create the backend app with:
- FastAPI app entrypoint
- settings/config module
- database session setup
- base SQLAlchemy model setup
- schemas folder
- API router structure
- service layer folders
- algorithms folders by domain
- simulation folder
- benchmark folder
- explain folder

### 1.4 Set Up Environment Configuration
Define environment variables for:
- frontend API base URL
- database URL
- Redis URL
- environment mode
- CORS origins

Defer auth-specific secrets such as JWT/session configuration until the auth phase is scheduled.

Create:
- `.env.example`
- local `.env`

### 1.5 Add a Minimal Health Check Flow
Backend:
- `/health`
- API version endpoint

Frontend:
- home page that fetches backend health
- global API client setup

## Dependencies
Phase 0.

## Definition of Done
- repo runs locally
- frontend loads successfully
- backend runs successfully
- frontend can reach backend
- base folders match planned architecture
- environment setup

---

# Phase 2 — Shared Backend Foundations

## Objective
Build the reusable backend systems that every module depends on.

## Why This Phase Exists
Every domain module needs consistent contracts for:
- validation
- simulation execution
- timeline generation
- explanation payloads
- metric summaries
- persistence

If the backend is not standardized, each module becomes a special case.

## Major Outputs
- domain-agnostic simulation interfaces
- shared schemas
- metadata endpoints
- backend contracts that support guest persistence cleanly
- error response system

## Detailed Tasks

### 2.1 Define Core Data Models
Create SQLAlchemy models for:
- SimulationRun cache or persisted run record if needed
- BenchmarkJob
- optional server-side artifacts only if they materially simplify MVP execution

For MVP, timeline steps can live inside a JSON field in `SimulationRun` or be returned directly without long-term server retention if the frontend is persisting guest runs locally.

Minimum fields to implement now:

#### SimulationRun
- id
- scenario_id nullable
- module_type
- algorithm_key
- config JSON
- summary JSON
- timeline JSONB
- created_at

#### BenchmarkJob
- id
- module_type
- config JSON
- status
- progress
- summary JSON
- results JSON
- created_at
- completed_at nullable

### 2.2 Define Pydantic Schemas
Create request/response models for:
- metadata responses
- create run request
- create run response
- timeline response
- run summary
- benchmark create/status/results
- guest scenario import/export payloads
- guest run history payloads
- settings requests/responses only if server-backed settings are added later

### 2.3 Create Unified Error Format
Implement one consistent error structure for the whole API.

Include:
- error code
- human-readable message
- details object

Also add exception handlers for:
- validation errors
- domain input errors
- not found errors
- permission errors
- unexpected server errors

### 2.4 Build Metadata Layer
Implement endpoints for:
- modules
- algorithms
- preset metadata

This should be driven from static definitions or configuration, not hardcoded separately in many places.

### 2.5 Build Scenario CRUD Foundations
Do not build account-scoped scenario CRUD in the backend for MVP.

Instead:
- define a stable scenario JSON shape shared by frontend and backend
- validate scenario payloads before runs are created
- support preset metadata from the backend
- leave server-side scenario CRUD for the auth phase

### 2.6 Build Run Persistence Foundations
Implement:
- create run response contract
- fetch run summary
- fetch timeline when server retention is enabled
- keep payloads compatible with frontend guest history storage

### 2.7 Build Basic Benchmark Persistence Layer
Implement benchmark data model and API placeholders even if async workers are deferred.

Support:
- create benchmark job record
- update benchmark status
- fetch benchmark results
- list benchmark history

### 2.8 Create Shared Validation Helpers
Write reusable validators for:
- graph node/edge structure
- array structure and limits
- DP input limits
- allowed module/algorithm combinations

These helpers should be usable both from API routes and simulation services.

## Dependencies
Phase 1.

## Definition of Done
- database models exist and migrate correctly
- guest-compatible run contracts work end to end
- metadata endpoints work
- API error responses are standardized

---

# Phase 3 — Shared Frontend Foundations

## Objective
Build the frontend shell, navigation, state management, API integration layer, and layout system shared across all modules.

## Why This Phase Exists
The product needs to feel like one coherent platform rather than multiple disconnected pages.

## Major Outputs
- app shell
- router
- page scaffolds
- API service layer
- global layout
- shared design system primitives
- notification and loading patterns

## Detailed Tasks

### 3.1 Build App Shell
Create:
- top navigation
- sidebar or module nav if desired
- page container layout
- consistent header styles
- consistent card/panel styles
- responsive desktop-first shell

### 3.2 Configure Routes
Create routes for:
- dashboard/home
- graph lab
- sorting lab
- DP lab
- scenario builder
- scenario library
- run history
- benchmark lab
- settings

Do not add auth routes in MVP.

### 3.3 Set Up Frontend State Management
Create stores for:
- metadata
- selected module/algorithm
- active scenario
- active run summary
- timeline data
- playback state
- benchmark job status
- guest persistence state

Keep shared concerns global, but keep module-specific state isolated when possible.

### 3.4 Build API Client Layer
Create services for:
- metadata
- runs
- benchmarks
- preset metadata
- guest persistence adapters

Centralize:
- base URL
- error handling
- response typing

### 3.5 Create Shared UI Components
Build reusable components such as:
- buttons
- cards
- tabs
- select inputs
- sliders
- modal/dialog
- tooltip
- toast system
- loading spinners/skeletons
- empty state panels
- section headers
- metrics cards

### 3.6 Establish Layout Patterns for Simulation Pages
Create the standard simulation layout:
- left configuration/control panel
- center visualization panel
- right explanation/metrics panel
- bottom playback/timeline area

Build this as a reusable layout wrapper rather than separately for each domain.

### 3.7 Add Theme and Styling Foundations
Implement:
- base color system
- semantic colors for states like active, visited, frontier, compare, error, success
- typography scale
- spacing system
- dark mode ready architecture if desired

## Dependencies
Phase 1.

## Definition of Done
- routing works
- page scaffolds exist
- reusable UI primitives exist
- frontend can call backend services
- app has a consistent layout system

---

# Phase 4 — Timeline-Driven Simulation Core

## Objective
Build the central simulation architecture that all algorithm modules will use.

## Why This Phase Exists
This is the most important technical phase in the entire project.

The product’s core differentiator is not just “visualizing algorithms.” It is the ability to:
- generate structured state transitions
- replay them
- inspect them step-by-step
- attach explanations and metrics
- reuse the same model across multiple domains

## Major Outputs
- common simulation contract
- timeline step schema
- explanation payload standard
- playback-ready frontend timeline system
- step inspector and controls

## Detailed Tasks

### 4.1 Define Common Algorithm Contract
Create a standard backend interface for every algorithm implementation.

Each algorithm should accept:
- `input_payload`
- `algorithm_config`
- `execution_mode`
- `explanation_level`

Each algorithm should return:
- `timeline_steps`
- `final_result`
- `summary_metrics`
- `algorithm_metadata`

### 4.2 Define Timeline Step Schema
Create one shared step model that can support all domains.

Minimum fields:
- `step_index`
- `event_type`
- `state_payload`
- `highlighted_entities`
- `metrics_snapshot`
- `explanation`
- `timestamp_or_order`

Then define domain-specific payload conventions for:
- graph
- sorting
- DP

### 4.3 Build Simulation Orchestrator Service
Create a backend service that:
- validates module and algorithm selection
- dispatches to the correct algorithm implementation
- collects output
- stores run record and timeline
- returns run summary

### 4.4 Build Timeline Retrieval Endpoints
Implement endpoints for:
- whole timeline fetch
- optional step window fetch for large runs
- run summary fetch

### 4.5 Create Frontend Playback Store
Implement a shared playback store containing:
- current step index
- play/pause state
- playback speed
- derived current step
- next/prev/jump controls
- scrubbing support
- reset support

### 4.6 Build Playback Controls UI
Create shared controls for:
- play
- pause
- next step
- previous step
- jump to start
- jump to end
- speed slider
- step counter
- timeline scrub bar

### 4.7 Build Step Inspector Panel
Create a shared right-side panel that shows:
- event title
- explanation text
- metrics snapshot
- changed entities
- algorithm metadata summary

### 4.8 Build a Minimal End-to-End Simulation Demo
Before creating full domain modules, build one temporary or simplified algorithm path that proves the architecture.

Example:
- a tiny BFS or a dummy step generator
- run it through backend
- store timeline
- load timeline in frontend
- play it back
- show explanation and metrics

This is the architecture proof.

## Dependencies
Phase 2 and Phase 3.

## Definition of Done
- one algorithm can generate timeline steps through the shared simulation contract
- frontend can fetch and replay the timeline
- explanation and metrics panels update by step
- playback system works independently of domain-specific rendering complexity

---

# Phase 5 — Graph Lab MVP

## Objective
Build the first complete production-quality domain module using the shared simulation architecture.

## Why This Phase Exists
Graph and pathfinding visualizations are one of the strongest showcase parts of the product and a good proof that the platform is more than a basic website.

## Major Outputs
- Graph Lab setup page
- graph/grid input support
- BFS and Dijkstra backend implementations
- graph visualization renderer
- graph scenario builder MVP

## Detailed Tasks

### 5.1 Define Graph Input Models
Support at minimum:
- node list
- edge list
- optional weights
- graph mode and grid mode distinction
- source and target
- directed/undirected option if useful

### 5.2 Build Graph Validation
Implement checks for:
- unique node IDs
- valid edge endpoints
- valid source and target
- numeric weights
- graph not empty

### 5.3 Implement BFS Simulation
BFS should produce step-by-step timeline events such as:
- initialize frontier
- dequeue node
- inspect neighbors
- mark visited
- enqueue new node
- target found
- path reconstruction complete

Each step should include explanation text and useful metrics snapshots.

### 5.4 Implement Dijkstra Simulation
Dijkstra should produce timeline events such as:
- initialize distances
- push source to priority queue
- pop min node
- inspect outgoing edges
- relax distance
- update predecessor
- push/update heap entry
- target found or completion

### 5.5 Define Graph Metrics
Track metrics like:
- nodes visited
- edges inspected
- relaxations
- frontier size
- path found boolean
- final path cost
- runtime estimate if desired

### 5.6 Build Graph Setup Page
Create UI for:
- algorithm selection
- preset selection
- graph/grid mode toggle
- source/target selection
- weight mode
- explanation detail toggle
- run button
- save scenario button

### 5.7 Build Graph Renderer
Create interactive visualization using SVG first.

Support:
- nodes
- edges
- labels
- weights
- current node highlight
- visited styling
- frontier styling
- selected path styling
- optional data structure inspector panel for queue/heap

### 5.8 Build Basic Graph/Scenario Builder
For MVP, choose the simplest builder that still feels real.

Recommended MVP builder:
- add nodes
- drag nodes
- connect edges
- edit weights
- set source and target
- load preset
- save result as scenario

Grid/maze builder can be a lighter first version if graph builder is already large.

### 5.9 Connect End-to-End Run Flow
User flow should work as:
1. configure graph input
2. save or use current input
3. click run
4. backend creates run
5. frontend loads run summary and timeline
6. playback renders graph state by step
7. user can replay and inspect steps

### 5.10 Add Graph Presets
Create a small preset library:
- simple BFS demo graph
- weighted shortest path graph
- maybe one small maze/grid example

## Dependencies
Phases 2–4.

## Definition of Done
- BFS and Dijkstra work end to end
- graph inputs validate correctly
- graph run timeline is replayable
- renderer updates correctly by step
- user can save at least one graph scenario

---

# Phase 6 — Sorting Lab MVP

## Objective
Build the sorting module using the same shared simulation framework.

## Why This Phase Exists
Sorting is visually intuitive, fast to test, and ideal for proving architecture reuse.

## Major Outputs
- Sorting Lab setup page
- Quick Sort implementation
- Merge Sort implementation
- sorting visualization renderer
- array input builder and presets

## Detailed Tasks

### 6.1 Define Array Input Schema
Support:
- array of numbers
- array preset type
- optional manual input
- duplicate density option if desired
- size limits for animation mode

### 6.2 Build Sorting Validation
Implement checks for:
- numeric values only in MVP
- non-empty input
- maximum animation size
- valid preset selection

### 6.3 Implement Quick Sort Simulation
Produce timeline events for:
- choose pivot
- compare index to pivot
- swap elements
- partition complete
- recurse left
- recurse right
- section sorted
- full completion

### 6.4 Implement Merge Sort Simulation
Produce timeline events for:
- split range
- recurse left
- recurse right
- compare merge values
- write merged value
- merged segment complete
- full completion

### 6.5 Define Sorting Metrics
Track:
- comparisons
- swaps or writes
- recursion depth
- array length
- runtime estimate if desired

### 6.6 Build Sorting Setup Page
Include:
- algorithm selector
- size input
- array preset selector
- manual editor
- generate/shuffle/reset buttons
- run button
- save scenario button

### 6.7 Build Sorting Renderer
Create animated bar/array renderer.

Support:
- current array state
- highlighted compared indices
- swapped indices
- pivot index
- sorted region
- range boundaries

### 6.8 Build Array Builder Utilities
Allow users to:
- generate random array
- create reversed array
- create nearly sorted array
- enter manual values
- use duplicates-heavy arrays

### 6.9 Connect End-to-End Run Flow
Ensure sorting follows the same full lifecycle as graph runs.

### 6.10 Add Sorting Presets
Create example presets for:
- random array
- reversed array
- nearly sorted array
- duplicates-heavy array

## Dependencies
Phases 2–4.

## Definition of Done
- Quick Sort and Merge Sort produce valid replayable timelines
- sorting visualization updates correctly per step
- metrics and explanations work
- sorting scenarios can be saved and reloaded

---

# Phase 7 — Dynamic Programming Lab MVP

## Objective
Build the dynamic programming module with table-based and explanation-rich visualization.

## Why This Phase Exists
DP is the strongest proof that the platform can handle a different visualization type and still reuse the same architecture.

## Major Outputs
- DP setup page
- LCS implementation
- Edit Distance implementation
- DP table renderer
- DP input builders

## Detailed Tasks

### 7.1 Define DP Input Schemas
Support at minimum:
- string inputs for LCS
- string inputs for Edit Distance

You may later extend with:
- knapsack item lists
- coin change inputs

### 7.2 Build DP Validation
Implement checks for:
- non-empty or allowed empty strings
- maximum table size for visualization
- valid character/string lengths

### 7.3 Implement LCS Simulation
Timeline events should include:
- initialize table
- focus current cell
- inspect dependency cells
- choose recurrence branch
- write cell value
- row or table progress
- traceback step
- final subsequence summary

### 7.4 Implement Edit Distance Simulation
Timeline events should include:
- initialize base row/column
- inspect neighbor cells
- compare characters
- choose insert/delete/replace/match
- write cell value
- traceback step if visualized
- final distance summary

### 7.5 Define DP Metrics
Track:
- cells computed
- table dimensions
- traceback length if used
- repeated subproblem avoidance explanation
- runtime estimate if desired

### 7.6 Build DP Setup Page
Include:
- algorithm selector
- string input A
- string input B
- preset selector
- explanation level toggle
- run button
- save scenario button

### 7.7 Build DP Table Renderer
Support:
- row and column headers
- active cell highlight
- dependency cell highlight
- cell value updates
- recurrence explanation display
- traceback overlay if included

### 7.8 Create DP Presets
Examples:
- short strings with obvious common subsequence
- strings with substitutions/inserts for edit distance

### 7.9 Connect End-to-End Run Flow
DP should follow the same complete lifecycle as graph and sorting.

## Dependencies
Phases 2–4.

## Definition of Done
- LCS and Edit Distance run end to end
- DP table updates by step
- explanations clearly describe recurrence decisions
- DP scenarios can be saved and reused

---

# Phase 8 — Scenario Library and Run History

## Objective
Turn the product from a one-time visual demo into a reusable platform with persistence.

## Why This Phase Exists
Persistence is one of the major differentiators in the PRD. Without it, the product feels like a collection of transient visualizations rather than a true technical tool.

## Major Outputs
- scenario library page
- run history page
- guest save/load flows for scenarios
- resume/review flows for runs

## Detailed Tasks

### 8.1 Finish Scenario CRUD Integration in Frontend
Build UI flows for:
- save scenario locally from setup page
- browse guest-saved scenarios
- filter by module
- search by title
- edit metadata
- delete scenario

### 8.2 Build Scenario Library Page
Include:
- list/grid of guest-saved scenarios
- preset grouping
- tags/filter/search
- quick actions like load, duplicate, delete

Use IndexedDB or another browser-local persistence layer rather than account-backed storage.

### 8.3 Connect Scenario Load Into Setup Pages
Allow users to select a scenario and automatically populate the correct setup screen with stored input.

### 8.4 Build Run History Page
Show:
- module type
- algorithm used
- created date
- key summary metrics
- reopen run
- rerun from same configuration
- optional save scenario from run

Back this with guest-local history in MVP.

### 8.5 Support Reopening Old Runs
Implement flow:
1. open run from history
2. fetch summary and timeline
3. route user back into simulation view
4. replay without recomputation if timeline already stored

### 8.6 Add Recent Activity on Dashboard
Display:
- recent runs
- saved scenarios preview
- featured presets

## Dependencies
Phases 2–7.

## Definition of Done
- guest user can save and load scenarios across all MVP modules
- guest user can review old runs from history
- dashboard shows recent activity

---

# Phase 9 — Basic Benchmarking Foundation

## Objective
Add the first version of benchmarking so the product begins to show measurable algorithm analysis, not just animation.

## Why This Phase Exists
Benchmarking strengthens the platform’s technical credibility and supports the PRD’s “measurable” and “experimental” positioning.

## Major Outputs
- benchmark page
- benchmark API flow
- chart-ready results
- basic results visualization

## Detailed Tasks

### 9.1 Decide MVP Benchmark Scope
Keep this small for first version.

Recommended MVP scope:
- sorting benchmarks first
- maybe graph later if time permits
- synchronous backend execution at first if datasets are small
- async workers only if needed after benchmark results already work

### 9.2 Define Benchmark Input Model
Support:
- module type
- selected algorithms
- input family
- input sizes
- trial count
- selected metrics

### 9.3 Build Benchmark Service
Implement service that:
- generates benchmark inputs
- runs chosen algorithms repeatedly
- aggregates metrics by size
- returns chart-ready series
- stores results in benchmark job record

### 9.4 Build Benchmark API Endpoints
Implement:
- create benchmark
- fetch benchmark metadata
- fetch benchmark status
- fetch benchmark results

If initial version is synchronous, status may simply jump from “running” to “completed.”

### 9.5 Build Benchmark Lab Page
Include:
- domain selector
- algorithm multiselect
- input size settings
- trial count controls
- launch benchmark action
- progress display
- chart section
- summary cards
- results table

### 9.6 Create Chart Components
Use chart components for:
- runtime by input size
- comparisons by input size
- swaps/writes by input size

### 9.7 Add Export Option If Easy
Optional MVP add-on:
- export results JSON
- export CSV

## Dependencies
Phases 2–8.

## Definition of Done
- at least one domain supports benchmark runs
- user can configure benchmark inputs
- benchmark results display correctly in charts and tables

---

# Phase 10 — Testing, Observability, and Error Handling

## Objective
Make the product stable, demonstrable, and maintainable.

## Why This Phase Exists
A portfolio-grade project should not only have features; it should also show quality engineering discipline.

## Major Outputs
- backend tests
- frontend tests
- end-to-end test coverage for core flows
- logging and metrics basics
- polished validation and error messages

## Detailed Tasks

### 10.1 Backend Unit Tests
Write tests for:
- BFS correctness
- Dijkstra correctness
- Quick Sort correctness
- Merge Sort correctness
- LCS correctness
- Edit Distance correctness
- timeline generation shape
- validation helpers
- guest scenario schema validation

### 10.2 Frontend Component Tests
Test:
- playback controls
- step inspector rendering
- module setup forms
- metrics panels
- benchmark chart rendering

### 10.3 End-to-End Flow Tests
Cover these flows:
- create scenario → run simulation → fetch timeline → replay
- save scenario → load scenario → rerun
- run benchmark → view results
- guest save scenario → reopen from history

### 10.4 Improve Error UX
Ensure the UI clearly handles:
- invalid inputs
- failed run creation
- failed benchmark requests
- missing resources
- guest storage failures/quota issues
- auth expiration after auth is added

### 10.5 Add Logging
Log at minimum:
- run creation
- algorithm execution summaries
- benchmark lifecycle
- server errors

Add auth event logging in Phase 12 when authentication is introduced.

### 10.6 Add Performance Notes and Metrics
Track:
- timeline generation duration
- endpoint latency
- benchmark completion duration
- large timeline load behavior

### 10.7 Manual QA Pass
Do a manual product walkthrough across all modules.

Specifically verify:
- visual state matches actual algorithm behavior
- explanations correspond to the current step
- playback controls never desync from rendered state
- stored scenarios reload correctly

## Dependencies
Phases 2–9.

## Definition of Done
- major backend algorithms are tested
- shared UI behaviors are tested
- core flows work without obvious breakage
- logging and error handling are production-minded

---

# Phase 11 — Deployment, Demo Readiness, and Portfolio Positioning

## Objective
Ship the project and make it presentable for recruiters, professors, and reviewers.

## Why This Phase Exists
Even a technically strong build can lose impact if it is not deployed cleanly or explained well.

## Major Outputs
- deployed frontend
- deployed backend
- configured database and Redis
- polished README
- demo dataset/presets
- resume-ready framing

## Detailed Tasks

### 11.1 Deploy Frontend
Deploy on Vercel or equivalent.

### 11.2 Deploy Backend
Deploy on Render, Railway, Fly, or equivalent.

### 11.3 Configure Managed Services
Set up:
- PostgreSQL
- Redis
- environment variables
- CORS
- production secrets

### 11.4 Verify Production Persistence
Test in production:
- create scenario
- create run
- replay timeline
- run benchmark
- guest persistence restore after refresh

### 11.5 Create Demo Presets
Curate polished demo examples for:
- BFS on simple graph
- Dijkstra on weighted graph
- Quick Sort on reversed array
- Merge Sort on duplicates-heavy array
- LCS on short strings
- Edit Distance on clear string pair

### 11.6 Write Strong README
README should include:
- what the product is
- why it is different
- architecture overview
- tech stack
- setup instructions
- screenshot/GIF sections
- key technical differentiators
- future work

### 11.7 Prepare Portfolio Assets
Create:
- architecture diagram image
- product screenshots
- short demo video or GIFs
- bullet points for resume/LinkedIn

### 11.8 Final Demo Pass
Run through a full demo narrative:
1. land on dashboard
2. load preset
3. run graph simulation
4. step through explanation and metrics
5. switch to sorting
6. run benchmark
7. open scenario library/history

## Dependencies
Phases 2–10.

## Definition of Done
- app is deployed and working
- README is polished
- demo presets are stable
- project is presentable as a portfolio centerpiece

---

# Phase 12 — Auth, Account Sync, Settings, and Persistence Hardening

## Objective
Add user accounts, cloud-backed persistence, and migration from guest mode after the MVP is shipped.

## Why This Phase Exists
This phase adds product depth without slowing down the guest-first MVP.

## Major Outputs
- login/register flow
- guest-to-account migration flow
- protected resources
- settings page
- stronger ownership rules

## Detailed Tasks

### 12.1 Implement Authentication
Support:
- register
- login
- logout
- get current user
- route protection where necessary

### 12.2 Apply Resource Ownership Rules
Ensure only owners can:
- edit/delete scenarios
- access personal run history
- access personal benchmark records

Also define how guest-created data can be claimed or imported after signup.

### 12.3 Build Settings Page
Include user preferences for:
- theme
- default playback speed
- explanation verbosity
- animation detail
- chart preferences

### 12.4 Add Guest Fallback Where Needed
Preserve the MVP guest workflow after auth launches:
- local-first use still works without signup
- prompt guest users to create an account for sync/backup
- define which resources stay local versus sync to the server
- support importing guest scenarios/history into a new account when practical

### 12.5 Improve Persistence Reliability
Add safeguards for:
- large timeline records
- safe JSON serialization/deserialization
- data migrations if schema changes

### 12.6 Extend Test Coverage for Auth and Migration
Add or update coverage for:
- signup/login/logout
- guest data import into a new account
- account-scoped scenario access
- account-scoped run history access

## Dependencies
Stable guest MVP, including Phases 2–11.

## Definition of Done
- auth flows work
- guest-to-account migration is defined and implemented for core resources
- settings persist correctly
- personal resources are scoped correctly

---

# Phase 13 — Phase 2 Expansion Plan

## Objective
Define the next layer of features after the MVP is stable.

## Why This Phase Exists
The PRD includes significant post-MVP depth. This phase prevents ad hoc expansion and preserves architectural quality.

## Major Outputs
- comparison mode roadmap
- async benchmark roadmap
- expanded algorithm roadmap
- export/share roadmap

## Detailed Tasks

### 13.1 Full Comparison Mode
Build side-by-side synchronized runs for same-domain algorithms.

Key additions:
- multiple run orchestration
- shared playback controls
- side-by-side renderers
- delta metrics tables
- comparison commentary panel

### 13.2 Async Benchmark Workers
Introduce background processing when synchronous benchmarking becomes too slow.

Add:
- Redis broker/backend
- Celery or RQ workers
- progress polling
- job retry behavior
- worker-specific monitoring

### 13.3 Expanded Graph Algorithms
Add:
- DFS
- A*
- Topological Sort
- Prim’s
- Kruskal’s
- Bellman-Ford

### 13.4 Expanded Sorting/Searching Algorithms
Add:
- Bubble Sort
- Insertion Sort
- Selection Sort
- Heap Sort
- Binary Search
- Linear Search

### 13.5 Expanded DP Algorithms
Add:
- Knapsack
- Coin Change
- Fibonacci comparison modes

### 13.6 Export and Sharing Features
Add:
- screenshot export
- shareable run links
- shareable scenario links
- downloadable reports

### 13.7 Richer Learning Features
Add:
- multiple explanation detail levels
- glossary/tooltips
- guided walkthrough mode
- bookmarked steps

## Dependencies
Stable MVP.

## Definition of Done
- post-MVP work is sequenced intentionally and can be implemented without rewriting the architecture

---

# 5. Cross-Cutting Workstreams

These workstreams should be handled throughout the project, not only at the end.

## 5.1 Design and UX Workstream
Throughout every phase:
- keep simulation pages visually consistent
- preserve clear state semantics across modules
- avoid overloading the screen with too many controls at once
- make the product feel like a browser-based technical workstation

## 5.2 Performance Workstream
Watch for:
- large timelines
- expensive rerenders in React
- graph rendering scale issues
- DP table performance on large inputs
- benchmark runtime growth

## 5.3 Reusability Workstream
Continuously enforce:
- shared simulation contracts
- shared playback system
- shared explanation formatting
- shared metrics panels where possible
- shared input validation patterns

## 5.4 Documentation Workstream
As you build, keep docs updated for:
- API contract changes
- timeline schema changes
- algorithm-specific payload conventions
- known limitations

---

# 6. Suggested Feature Delivery Order Inside MVP

If you want the most practical build sequence, follow this exact order:

1. repo and tooling
2. backend models and API skeleton
3. frontend shell and routes
4. shared timeline schema
5. shared playback system
6. Graph Lab with BFS only
7. add Dijkstra
8. scenario save/load for graph module
9. Sorting Lab with Quick Sort only
10. add Merge Sort
11. DP Lab with LCS only
12. add Edit Distance
13. run history
14. dashboard recent activity
15. basic benchmarking for sorting
16. testing and polish for guest MVP
17. deploy guest MVP
18. auth/account sync
19. settings hardening
20. auth migration and ownership polish

This order is strong because each new step reuses and validates the prior architecture.

---

# 7. Suggested Definition of MVP Complete

The MVP should only be considered complete when all of the following are true:

## Product-Level Criteria
- user can enter the app and clearly understand the available modules
- at least three algorithm domains exist and feel part of one coherent platform
- product feels like an algorithm lab, not a static educational site

## Technical Criteria
- every MVP algorithm runs through the same simulation contract
- timelines are replayable step-by-step
- explanations and metrics update correctly at each step
- guest scenarios and guest run history persist correctly

## UX Criteria
- setup pages are usable
- simulation controls are intuitive
- visuals are readable and consistent
- errors are understandable

## Delivery Criteria
- app is deployed
- README explains the architecture and features
- demo presets are polished enough for presentation

---

# 8. Risks and Mitigations

## Risk 1: Building too many algorithms too early
**Mitigation:** finish one domain end to end before broad expansion.

## Risk 2: One-off visualization logic per module
**Mitigation:** enforce shared timeline and playback systems first.

## Risk 3: Timeline payloads become inconsistent
**Mitigation:** define schema and conventions before expanding modules.

## Risk 4: Benchmarking becomes a time sink
**Mitigation:** keep first version small and sorting-focused.

## Risk 5: UI becomes cluttered
**Mitigation:** preserve the shared simulation layout and progressive disclosure of controls.

## Risk 6: Persistence becomes overly complex
**Mitigation:** keep MVP persistence local-first, keep backend contracts simple, and add account-backed sync later.

## Risk 7: Project starts looking like a class demo instead of a product
**Mitigation:** prioritize persistence, run history, benchmarking, polish, and deployment.

## Risk 8: Auth slows down the MVP before the core product works
**Mitigation:** treat auth as a dedicated post-MVP phase and do not let it block guest-mode delivery.

---

# 9. Final Build Summary

The project should be built around one central architectural truth:

**Algorithms do not render directly. They emit structured timelines, and the frontend turns those timelines into interactive, replayable visual experiences.**

If that principle is preserved, the project will scale cleanly across:
- graph algorithms
- sorting/searching algorithms
- dynamic programming algorithms
- comparison mode
- benchmark mode
- guest scenario persistence
- guest run history
- later account-backed sync and auth

That is what turns the product from “a cool visualizer” into a **full-stack algorithm simulation platform**.
