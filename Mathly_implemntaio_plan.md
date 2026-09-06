# Build a Beautiful, Interactive Mathematics & Science Graphing Platform

You are the lead product engineer, UX designer, frontend engineer, backend engineer, and QA engineer for this project.

Build a production-quality web application that makes mathematics and science feel **visual, interactive, playful, modern, and exciting**, especially for students and young people.

The application should be inspired by the best parts of tools such as Desmos, GeoGebra, Wolfram Alpha, Khan Academy, and modern educational apps, but **do not copy their UI**.

The goal is NOT simply to create an equation plotting website.

The goal is:

> **Make people want to explore mathematics.**

A user should be able to open the homepage without creating an account, type or draw an equation, immediately see a beautiful visualization, explore it interactively, learn something from it, and discover another mathematical idea.

---

# 1. PRODUCT VISION

Build an interactive mathematical playground where users can:

- Type equations using a keyboard.
- Write equations using a digital pen/stylus.
- Draw equations on touchscreens.
- Use the application on classroom projectors and interactive whiteboards.
- Plot equations instantly.
- Explore graphs interactively.
- Compare multiple equations.
- Discover mathematical properties automatically.
- Learn through explanations.
- Receive an "Equation of the Day".
- Explore hundreds of sample equations.
- Search mathematical concepts.
- Experiment with parameters using sliders.
- Save projects when logged in.
- Share graphs with other people.
- Use the application without logging in.
- Eventually use ML/AI to understand handwritten mathematics and natural-language mathematical requests.

The experience should feel closer to:

> "a playground for mathematical discovery"

than:

> "a calculator."

---

# 2. CRITICAL PRODUCT REQUIREMENT — NO LOGIN WALL

A user MUST be able to use the core application without logging in.

Do NOT force authentication for:

- Opening the homepage.
- Exploring sample equations.
- Entering equations.
- Drawing equations.
- Plotting graphs.
- Using interactive controls.
- Exploring Equation of the Day.
- Using the graphing calculator.
- Reading explanations.

Authentication should only be required for things such as:

- Saving personal projects permanently.
- Syncing projects across devices.
- Creating private collections.
- Collaboration.
- Cloud history.
- Advanced personalization.

If a guest wants to save something, show a beautiful, non-intrusive prompt:

"Create a free account to save this experiment."

Never interrupt the core learning experience with a login wall.

Use localStorage/session storage for anonymous temporary projects where appropriate.

---

# 3. TECHNOLOGY ARCHITECTURE

Use a clean, scalable architecture.

Preferred frontend:

- React
- TypeScript
- Modern CSS / Tailwind if appropriate
- Component-driven architecture

Graph rendering:

- Canvas or WebGL
- Use a high-performance rendering approach
- Do not create thousands of DOM/SVG elements for graph points

Mathematics:

Create a dedicated math-core abstraction.

The math engine must be deterministic.

AI/ML must NOT be responsible for basic mathematical correctness.

Architecture:

    User Input
        ↓
    Input Normalization
        ↓
    Mathematical Parser
        ↓
    AST
        ↓
    Math Engine
        ↓
    Analyzer
        ↓
    Graph Sampler
        ↓
    Graph Renderer

AI/ML should sit beside this system:

    Natural Language
          ↓
        AI/ML
          ↓
    Structured Math Command
          ↓
       Validation
          ↓
       Math Engine

For advanced symbolic calculations, a Python/SymPy service may be introduced if appropriate.

Backend can use Go if the project already uses Go or if a backend needs to be implemented.

Database:

- PostgreSQL

Caching/realtime where necessary:

- Redis

Do NOT introduce unnecessary microservices during MVP.

Start with a modular monolith unless the existing repository clearly requires another architecture.

---

# 4. REPOSITORY FIRST

Before writing code:

1. Inspect the entire existing repository.
2. Understand the current architecture.
3. Identify:
   - frontend
   - backend
   - database
   - existing components
   - existing authentication
   - existing APIs
   - existing styling
   - tests
   - build system
   - deployment configuration
4. Reuse existing infrastructure where appropriate.
5. Do NOT rewrite working parts unnecessarily.
6. Identify technical debt.
7. Create a clear implementation plan.

Before implementing a major feature, understand how it fits into the existing application.

Do not blindly introduce new frameworks.

---

# 5. DESIGN PHILOSOPHY

The UI is one of the MOST IMPORTANT parts of this project.

Do not build a generic SaaS dashboard.

Do not make the application look like:

- an admin panel
- a CRUD application
- a boring school website
- a generic AI SaaS
- a spreadsheet
- a plain calculator

The visual language should communicate:

- curiosity
- discovery
- experimentation
- intelligence
- science
- mathematics
- creativity

The interface should feel modern enough that a teenager would WANT to explore it.

At the same time, it must remain professional and useful for:

- students
- teachers
- engineers
- researchers
- hobbyists
- classrooms

---

# 6. HOMEPAGE — EXTREMELY IMPORTANT

Create a spectacular homepage.

The homepage is not just a marketing page.

It should be an interactive introduction to the product.

Hero section concept:

    Explore Mathematics
    Visually.

    Type an equation.
    Draw one.
    Experiment with it.
    See mathematics come alive.

Below this, immediately provide an interactive mini graphing experience.

Example:

    ┌───────────────────────────────────────────────┐
    │ What do you want to explore?                  │
    │                                               │
    │  y = x² - 3x + 2                         ↵    │
    │                                               │
    │                 graph                         │
    │                                               │
    └───────────────────────────────────────────────┘

The user should be able to enter an equation directly from the homepage.

No login.

No signup.

No unnecessary modal.

The graph should appear immediately.

---

# 7. HERO INTERACTION

Make the homepage hero interactive.

Possible rotating examples:

    y = x²

    y = sin(x)

    x² + y² = 25

    y = e^x

    y = x³ - 3x

    r = 2sin(3θ)

When an example is selected:

- animate the equation into the input
- animate the graph drawing
- highlight interesting points
- show a short explanation

The page should communicate:

"Math is something you can PLAY with."

---

# 8. VISUAL DESIGN

Use modern visual design.

Characteristics:

- beautiful typography
- generous spacing
- subtle gradients
- tasteful animations
- smooth transitions
- responsive layouts
- excellent dark mode
- excellent light mode
- glass effects only where appropriate
- subtle grid patterns
- mathematical visual motifs
- elegant graph animations

Do NOT overuse:

- gradients
- glowing effects
- neon colors
- giant text
- excessive animations
- floating cards everywhere

The design should feel sophisticated rather than childish.

Use animation to explain concepts, not simply decorate the UI.

---

# 9. GRAPHING WORKSPACE

Create the main mathematical workspace.

Suggested structure:

    ┌─────────────────────────────────────────────────────┐
    │ Logo     Explore     Learn     Examples     Profile │
    ├──────────────┬──────────────────────────────────────┤
    │              │                                      │
    │ Equations    │                                      │
    │              │                                      │
    │ ● y = x²     │             GRAPH                    │
    │              │                                      │
    │ ● y = 2x+1   │                                      │
    │              │                                      │
    │ + Add        │                                      │
    │              │                                      │
    ├──────────────┤                                      │
    │ Analysis     │                                      │
    │              │                                      │
    │ Roots        │                                      │
    │ Vertex       │                                      │
    │ Intercepts   │                                      │
    └──────────────┴──────────────────────────────────────┘

However, adapt the exact layout to screen size.

On desktop:

- equation panel
- graph
- analysis/insights panel

On tablets:

- collapsible panels

On mobile:

- graph first
- equation controls below
- bottom sheets where appropriate

---

# 10. GRAPH INTERACTIONS

The graph should feel alive.

Support:

- zoom
- pinch zoom
- pan
- mouse drag
- touch drag
- reset viewport
- grid toggle
- axes toggle
- labels
- point inspection
- coordinate tracking
- curve tracing
- intersections
- roots
- extrema
- tangent visualization where applicable

When hovering over a curve:

Show:

    x = 2.31
    y = 4.72

Animate the point smoothly.

Do not make interaction jittery.

---

# 11. EQUATION EDITOR

Create a beautiful mathematical input system.

Support:

    x²
    x^2
    sqrt(x)
    √x
    sin(x)
    cos(x)
    log(x)
    ln(x)
    e^x
    |x|
    fractions
    π
    ∞

The editor should understand common mathematical notation.

Provide:

- autocomplete
- syntax highlighting
- error highlighting
- helpful suggestions
- mathematical keyboard
- keyboard shortcuts

Errors should be friendly.

Instead of:

    ERROR: PARSE_EXCEPTION

show:

    Hmm, we couldn't understand this part.

    Did you mean:

    y = x² + 3x - 4 ?

---

# 12. MATHEMATICAL KEYBOARD

On touch devices and classrooms, provide a dedicated mathematical keyboard.

Categories:

Basic:

    + − × ÷ =

Numbers:

    0 1 2 3 ...

Functions:

    sin cos tan
    log ln
    sqrt

Symbols:

    π ∞ θ α β

Advanced:

    ∫ ∑ ∂ √
    ≤ ≥ ≠

The keyboard should be collapsible.

Do not make it consume the entire screen unnecessarily.

---

# 13. DIGITAL PEN / HANDWRITING INPUT

This is a major feature.

Allow users to draw mathematical equations using:

- stylus
- digital pen
- mouse
- touchscreen

Example:

User writes:

    y = x² + 3x - 4

The application captures the strokes.

Pipeline:

    Pen Input
       ↓
    Stroke Processing
       ↓
    Handwriting Recognition
       ↓
    Mathematical Expression Recognition
       ↓
    Validation
       ↓
    Parsed Equation
       ↓
    Graph

Do not pretend ordinary OCR is enough.

Mathematical handwriting is structurally different from ordinary text.

For example:

    x²

requires understanding that 2 is an exponent.

    √(x+1)

requires understanding the scope of the radical.

    ∫₀¹ x² dx

requires understanding limits and structure.

Design the system so a specialized ML model can be integrated later.

For MVP, provide a clean handwriting canvas and an abstraction such as:

    HandwritingRecognizer

so the recognition implementation can be replaced later.

If an existing reliable mathematical handwriting recognition solution is available in the project environment, evaluate it before implementing a custom ML model.

---

# 14. CLASSROOM / PROJECTOR MODE

This is important.

The application should work well on:

- projectors
- interactive whiteboards
- classroom displays
- large monitors

Create a "Presentation Mode".

Features:

- large equation input
- large graph
- large controls
- minimal UI
- high contrast
- large pointer
- touch friendly controls

A teacher should be able to walk into a classroom and immediately use:

    Write equation → graph appears

without needing an account.

---

# 15. EQUATION OF THE DAY

Create a dedicated "Equation of the Day" experience.

Every day display an interesting equation.

Examples:

    Euler's Identity

    e^(iπ) + 1 = 0

or:

    x² + y² = r²

or:

    y = sin(x)

or interesting fractals, probability equations, physics equations, etc.

The experience should not just show the equation.

Show:

    Today's Equation

    e^(iπ) + 1 = 0

    Why is it interesting?

    It connects five fundamental mathematical constants...

Then:

    Explore it →

The user can interact with it.

Include:

- visualization
- explanation
- difficulty
- mathematical field
- related concepts
- "Try changing this"
- related equations

---

# 16. EQUATION LIBRARY

Create a large sample library.

Initially seed hundreds of examples.

Organize by:

Mathematics:

- Linear
- Quadratic
- Cubic
- Polynomial
- Rational
- Exponential
- Logarithmic
- Trigonometric
- Parametric
- Polar
- Implicit
- Piecewise
- Inequalities
- Calculus
- Probability
- Statistics
- Number theory

Science:

- Physics
- Astronomy
- Biology
- Chemistry
- Engineering

Difficulty:

- Beginner
- Intermediate
- Advanced
- Expert

Examples should include interesting visualizations.

Do not generate hundreds of meaningless variations.

Curate meaningful examples.

---

# 17. EXPLORE PAGE

Create an "Explore" page that feels like discovering content rather than browsing a database.

Example:

    Explore Mathematics

    🔥 Trending

    ✨ Today's picks

    🧠 Challenge yourself

    🌌 Mathematics in physics

    🌀 Beautiful equations

    📐 Geometry

    ∞ Infinity

    🎲 Probability

    🚀 Space & physics

Each card should have an interactive miniature visualization where practical.

Hovering over a card can animate the graph.

Clicking opens the full interactive experiment.

---

# 18. SAMPLE EQUATIONS

Create a structured dataset.

Example:

    {
      id,
      title,
      expression,
      category,
      difficulty,
      description,
      concepts,
      visualizationType,
      parameters,
      relatedEquations
    }

Examples should have educational metadata.

Do not hard-code this data directly into React components.

Store it as structured data or database records.

---

# 19. PARAMETER PLAYGROUND

One of the most engaging features should be parameter manipulation.

Example:

    y = ax² + bx + c

Display:

    a ─────●────────
    b ─────────●────
    c ───●──────────

When the user changes a:

- graph changes in real time
- explanation changes
- important points update

Example explanation:

    Increasing a makes the parabola narrower.

This is where the application becomes educational rather than merely computational.

---

# 20. AUTOMATIC MATHEMATICAL ANALYSIS

For every supported equation, analyze it when possible.

For:

    f(x) = x² - 5x + 6

Show:

    Type
    Quadratic

    Roots
    x = 2
    x = 3

    Vertex
    (2.5, -0.25)

    Y-intercept
    6

    Axis of symmetry
    x = 2.5

For cubic:

- roots
- extrema
- inflection point
- derivative

For trigonometric:

- period
- amplitude
- phase shift
- zeros

For exponential:

- growth/decay
- asymptote
- intercept

Only display properties that are mathematically valid.

---

# 21. MATH CORE

Create a clean abstraction:

    math-core/

        parser/
        tokenizer/
        ast/
        evaluator/
        simplifier/
        analyzer/
        derivative/
        integral/
        solver/
        sampler/
        classifier/

Example:

    parse("x² + 3x - 4")

returns an AST.

Then:

    classify(ast)

returns:

    quadratic

Then:

    analyze(ast)

returns structured mathematical properties.

Then:

    sample(ast, viewport)

returns graph segments.

---

# 22. GRAPH SAMPLING

Do NOT use naive fixed sampling.

The graph engine must handle:

    y = 1/x

    y = tan(x)

    y = sin(100x)

    y = e^x

    y = x^10

correctly.

Implement adaptive sampling where appropriate.

Detect:

- discontinuities
- undefined regions
- steep slopes
- rapid curvature
- asymptotes

Never draw an incorrect line across a discontinuity.

---

# 23. MULTIPLE EQUATIONS

Users must be able to add multiple equations.

Example:

    f(x) = x²

    g(x) = 2x + 3

    h(x) = sin(x)

Each equation should have:

- visibility
- label
- editable expression
- appearance
- analysis

Allow:

- compare
- hide/show
- focus
- delete
- duplicate

---

# 24. INTERSECTIONS

Automatically detect intersections when practical.

Example:

    f(x) = x²

    g(x) = 2x + 3

Show:

    Intersection

    (-1, 1)

and allow the user to click the intersection point.

---

# 25. AI / ML FEATURES

Use AI thoughtfully.

Do not add AI simply because "AI is trendy."

AI should improve learning.

Potential capabilities:

### Natural language → equation

User:

    "Show me a parabola that opens downward."

AI produces a structured command.

### Explain this graph

User:

    "Why does this graph have two roots?"

AI explains using the deterministic mathematical analysis.

### Generate experiments

User:

    "Give me something interesting to explore."

AI recommends an experiment from the curated library or generates a safe mathematical exploration.

### Socratic tutor

Instead of immediately giving answers:

    "What do you notice about the graph?"

    "What happens when we increase a?"

    "Can you predict where the roots move?"

Use AI as a teacher, not an answer vending machine.

---

# 26. ML HANDWRITING ARCHITECTURE

Create an abstraction:

    interface HandwritingRecognizer {
        recognize(strokes): Promise<MathExpression>
    }

Possible future implementations:

    LocalMLRecognizer
    CloudMLRecognizer
    BrowserModelRecognizer

The rest of the application should not care which model is being used.

This makes experimentation with ML possible later.

---

# 27. ACCESSIBILITY

Do not sacrifice accessibility for visual design.

Support:

- keyboard navigation
- screen readers where practical
- large text
- high contrast
- reduced motion
- touch controls
- stylus
- color-independent graph identification

Do not rely solely on colors to distinguish equations.

---

# 28. RESPONSIVE DESIGN

The application must work beautifully on:

- desktop
- laptop
- tablet
- phone
- interactive classroom display

Do not simply shrink the desktop UI.

Create intentional responsive layouts.

Desktop:

    equation panel | graph | analysis

Tablet:

    equation panel
    graph
    analysis drawer

Mobile:

    graph
    equations
    bottom sheets

---

# 29. ANIMATION PRINCIPLES

Use animation purposefully.

Examples:

When plotting:

    curve gradually draws itself

When changing a parameter:

    curve morphs smoothly

When finding a root:

    point appears and pulses subtly

When opening analysis:

    relevant graph feature highlights

When changing equation:

    old graph transitions into new graph

Avoid excessive motion.

Respect prefers-reduced-motion.

---

# 30. DARK MODE

Dark mode should be first-class.

Do not simply invert colors.

Design the graph, grid, cards, typography and controls specifically for dark mode.

The graph should remain readable.

---

# 31. PROJECT SYSTEM

Logged-in users should be able to create projects.

Project:

    title
    description
    equations
    viewport
    annotations
    settings
    createdAt
    updatedAt

Example:

    My Parabola Experiment

    y = ax² + bx + c

    a = 1
    b = -4
    c = 3

Projects should restore exactly as the user left them.

---

# 32. SHARING

Allow users to share experiments.

Example:

    /explore/abc123

Opening the URL should reproduce:

- equations
- graph viewport
- parameters
- annotations
- settings

Do not require login to VIEW shared experiments.

---

# 33. DEEP LINKING

Important states should be URL-addressable.

For example:

    /graph?equation=y%3Dx%5E2

or preferably a compressed/shareable representation.

This allows:

- sharing
- bookmarking
- classroom links
- social sharing

---

# 34. PERFORMANCE

Graph interactions must feel instantaneous.

Do not perform unnecessary server requests.

Basic operations should happen client-side:

- parsing
- evaluation
- graph sampling
- viewport changes
- simple analysis

Debounce expensive operations.

Use Web Workers if appropriate for heavy calculations.

Do not block the UI thread.

---

# 35. OFFLINE / RESILIENCE

The core graphing experience should work even with poor internet where possible.

At minimum:

- cached sample equations
- local temporary projects
- local graph calculations

The application should degrade gracefully if the backend is unavailable.

---

# 36. ERROR HANDLING

Never show raw technical errors to users.

Bad:

    TypeError: Cannot read properties of undefined

Good:

    Something went wrong while analyzing this equation.

    Try simplifying the expression or check the highlighted section.

Developer errors should still be logged properly.

---

# 37. SECURITY

Validate all user input.

Never execute arbitrary user-provided code.

Equation expressions must be interpreted by a safe mathematical parser/evaluator.

Never use:

    eval()

or equivalent unsafe execution mechanisms.

Validate AI-generated mathematical commands before sending them to the math engine.

AI output is untrusted input.

---

# 38. TESTING

Create serious tests.

Test:

### Parser

    x²
    x^2
    2x
    sin(x)
    sqrt(x)
    (x+1)/(x-2)

### Graphing

    y=x
    y=x²
    y=1/x
    y=tan(x)
    y=sin(x)

### Analysis

- roots
- extrema
- derivatives
- intercepts
- asymptotes

### UI

- equation creation
- editing
- deletion
- graph interaction
- mobile
- keyboard navigation

### Handwriting

Create mocked recognizer tests.

---

# 39. VISUAL QA

Do not consider the project complete just because tests pass.

Inspect the actual UI.

Check:

- spacing
- typography
- alignment
- graph readability
- mobile layout
- empty states
- loading states
- error states
- dark mode
- hover states
- focus states
- animations

Fix anything that looks unfinished.

---

# 40. EMPTY STATES

Empty states should encourage exploration.

Instead of:

    No equations.

Use:

    Start exploring.

    Try:

    y = x²

    or

    sin(x)

    or draw an equation with your pen.

Include clickable examples.

---

# 41. LOADING STATES

Never leave blank screens.

Use subtle mathematical loading animations.

For example:

    analyzing expression...

with a small animated graph/grid motif.

Avoid generic spinners everywhere.

---

# 42. DISCOVERY MECHANICS

Encourage exploration.

After analyzing an equation, show:

    You might also like

    → Explore cubic functions

    → What happens when a changes?

    → Try its derivative

    → Compare it with y = x

These should lead naturally into further exploration.

---

# 43. GAMIFICATION — USE CAREFULLY

Do not turn mathematics into a cheap points system.

Instead reward curiosity.

Possible:

    Daily exploration

    Mathematical challenges

    Discoveries

    Streaks

    "You explored 5 different function families."

But the product should never feel like a mobile game designed to maximize addiction.

The objective is genuine learning and curiosity.

---

# 44. SCIENCE CONNECTIONS

Do not restrict the application to abstract mathematics.

Show connections to science.

Examples:

Physics:

    projectile motion

    F = ma

    harmonic oscillation

    orbital equations

Astronomy:

    planetary orbits

Biology:

    population growth

Chemistry:

    reaction curves

Engineering:

    control systems

This can become a major differentiator.

---

# 45. LANDING PAGE SECTIONS

The homepage can contain sections such as:

1. Hero / interactive graph
2. Equation of the Day
3. Explore beautiful mathematics
4. Draw with your pen
5. Experiment with parameters
6. Mathematics in science
7. Hundreds of examples
8. Learn by experimenting
9. AI-powered mathematical exploration
10. Call to action

But do not make it feel like a conventional marketing page.

Keep interactive demonstrations throughout.

---

# 46. NAVIGATION

Keep navigation simple.

Suggested:

    Explore
    Graph
    Learn
    Examples

Optional:

    Projects

Right side:

    Sign in

Do not overwhelm users with 15 navigation items.

---

# 47. DESIGN SYSTEM

Create reusable design tokens.

Define:

- typography
- spacing
- border radius
- shadows
- colors
- graph colors
- animations
- breakpoints
- component states

Build reusable components:

    Button
    Input
    EquationEditor
    GraphCanvas
    Panel
    Card
    Modal
    Drawer
    Tooltip
    Slider
    Tabs
    CommandPalette
    Toast
    EmptyState

Avoid one-off styles everywhere.

---

# 48. COMMAND PALETTE

Consider adding:

    Ctrl + K

A command palette with:

    Plot equation
    New equation
    Add function
    Open examples
    Equation of the day
    Toggle dark mode
    Reset graph
    Presentation mode

This can make the application feel extremely polished.

---

# 49. KEYBOARD SHORTCUTS

Support useful shortcuts.

Examples:

    Ctrl/Cmd + K
    Ctrl/Cmd + Enter
    Ctrl/Cmd + Z
    Ctrl/Cmd + Shift + Z
    Delete
    Escape

Show shortcuts in tooltips.

---

# 50. MOBILE TOUCH INTERACTION

Support:

- pinch zoom
- two-finger pan where appropriate
- touch curve inspection
- touch-friendly equation editing
- stylus input

Make buttons large enough for touch.

---

# 51. FUTURE 3D ARCHITECTURE

Do not implement full 3D unless required for MVP.

But design the math-core abstraction so it can eventually support:

    z = f(x,y)

and 3D surfaces.

Do not create an architecture that assumes every graph is y=f(x).

Support conceptual graph types:

    Explicit2D
    Implicit2D
    Parametric2D
    Polar2D
    Explicit3D
    Parametric3D

---

# 52. DATA MODEL

Create appropriate database models.

At minimum:

    User
    Project
    Graph
    Expression
    SampleEquation
    Collection
    SharedGraph

Keep the schema normalized where appropriate.

Use migrations.

---

# 53. API DESIGN

Design clean APIs.

Potential endpoints:

    POST /api/graphs
    GET /api/graphs/:id
    PUT /api/graphs/:id
    DELETE /api/graphs/:id

    GET /api/examples
    GET /api/examples/:id

    GET /api/equation-of-day

    POST /api/ai/interpret
    POST /api/ai/explain

But basic graph evaluation should NOT require API requests.

---

# 54. AI SAFETY / VALIDATION

AI-generated mathematical expressions must pass through:

    AI
     ↓
    Schema validation
     ↓
    Math parser
     ↓
    Safety validation
     ↓
    Math engine

Never directly execute arbitrary AI output.

Use structured output whenever possible.

---

# 55. ANALYTICS

If analytics are implemented, keep them privacy-conscious.

Useful product metrics:

- equation plots
- example opens
- exploration completion
- parameter interactions
- handwriting usage
- popular equation categories

Do not build creepy tracking.

Use analytics to improve education and UX.

---

# 56. SEO

Public educational pages should be discoverable.

Examples:

    /learn/quadratic-functions
    /learn/linear-functions
    /learn/trigonometry
    /equations/euler-identity

Provide:

- metadata
- semantic HTML
- useful educational text
- structured content

Do not create spammy SEO pages.

---

# 57. CONTENT QUALITY

Mathematical explanations must be correct.

Do not let AI hallucinate mathematical facts.

Whenever possible:

    Math Engine → factual properties

    AI → explanation of those properties

This keeps the system reliable.

---

# 58. DEVELOPMENT PROCESS

Implement incrementally.

PHASE 1:

- repository analysis
- design system
- homepage
- equation editor
- graph renderer
- basic parser
- basic functions
- guest mode

PHASE 2:

- multiple equations
- graph interaction
- analysis engine
- examples
- Equation of the Day

PHASE 3:

- projects
- authentication
- sharing
- responsive/mobile
- presentation mode

PHASE 4:

- handwriting input abstraction
- ML recognition integration
- natural language input
- AI explanations

PHASE 5:

- advanced mathematics
- science simulations
- advanced visualization
- 3D architecture

Do not attempt to implement every advanced feature before the core experience is excellent.

---

# 59. MVP PRIORITY

If time is limited, prioritize in this order:

1. Beautiful homepage
2. Instant guest graphing
3. Excellent equation editor
4. High-quality graph renderer
5. Smooth interactions
6. Sample equations
7. Equation of the Day
8. Automatic analysis
9. Mobile/tablet
10. Presentation mode
11. Accounts/projects
12. Handwriting
13. AI/ML

A beautiful, extremely polished graphing experience is more important than having 100 unfinished features.

---

# 60. QUALITY BAR

Before declaring the project complete, ask:

### Product

Would a student want to use this?

Would a teacher want to project it?

Would someone open it just to experiment?

### UX

Can someone understand what to do within 5 seconds?

Can someone plot an equation without signing in?

Can someone discover another interesting equation after plotting one?

### Mathematics

Are calculations correct?

Are discontinuities handled?

Are explanations based on verified mathematical results?

### UI

Does every page feel intentionally designed?

Are there ugly placeholder components?

Are there inconsistent buttons?

Are loading and error states polished?

Does mobile feel native rather than compressed?

### Performance

Does graph interaction remain smooth?

Does typing feel instantaneous?

Does zooming/panning remain responsive?

---

# 61. IMPORTANT — DO NOT OVERENGINEER

Do not introduce:

- unnecessary microservices
- unnecessary dependencies
- complex state management without need
- premature Kubernetes
- excessive abstraction
- AI for deterministic mathematics
- unnecessary backend computation

Prefer simple, maintainable architecture.

---

# 62. IMPORTANT — DO NOT STOP AT "FUNCTIONAL"

The application must not merely work.

If you implement:

    input → graph

and stop there, the task is incomplete.

The final product needs:

- polished visual hierarchy
- meaningful animation
- beautiful empty states
- responsive layouts
- educational explanations
- discovery
- interaction
- accessibility
- good error handling
- coherent design system

---

# 63. FINAL UX TEST

After implementation, perform this exact journey as a new anonymous user:

1. Open homepage.
2. Understand the product without reading documentation.
3. Enter:

       y = x² - 4x + 3

4. See the graph.
5. Zoom and pan.
6. Inspect the roots.
7. Open the analysis.
8. Change the equation.
9. Add a second equation.
10. Compare them.
11. Explore an example.
12. Open Equation of the Day.
13. Try a parameter slider.
14. Try handwriting/drawing input if available.
15. Enter presentation mode.
16. Use the application on a narrow/mobile viewport.
17. Reload.
18. Verify guest state behaves sensibly.

There should be no unnecessary signup interruption.

---

# 64. FINAL DELIVERABLE

Deliver a production-quality implementation.

Before finishing:

- run the project
- run tests
- inspect the UI
- test responsive layouts
- test dark mode
- test keyboard navigation
- test graph interactions
- test malformed equations
- test discontinuities
- test multiple equations
- test guest mode
- fix visual issues
- fix console errors
- fix TypeScript errors
- fix accessibility issues
- fix performance issues

Do not leave TODO placeholders for core functionality.

If an advanced feature cannot be fully implemented, create a clean extensible abstraction and implement the best functional version possible without breaking the architecture.

---

# 65. MOST IMPORTANT PRINCIPLE

Build this product around one idea:

> **Mathematics should feel alive.**

When a user writes an equation, the application should not merely display a line.

It should make the user curious.

When the graph appears:

    "What happens if I change this?"

When they discover a root:

    "Why is it here?"

When they see a parameter change:

    "Oh — that's what this coefficient does."

When they explore an equation from physics:

    "So THAT'S how mathematics describes motion."

The product should turn:

    Equation → Graph

into:

    Question → Experiment → Visualization → Discovery → Understanding
# 59. CONCRETE MVP SCOPE

The MVP is the first genuinely usable version of the product.

The objective is NOT to implement every feature described in the long-term vision.

The objective is to deliver a polished experience where a completely new visitor can:

> Open the website → enter or draw an equation → immediately see and explore the graph → understand something about it → discover another equation.

The MVP must be **beautiful, fast, usable without login, and mathematically reliable**.

---

# 60. MVP FEATURE BOUNDARY

## MUST HAVE

The MVP MUST include:

### A. Public Homepage

A polished, responsive homepage containing:

* Product identity
* Clear explanation of what the application does
* Interactive hero graph
* Equation input directly in the hero
* Example equations
* "Equation of the Day"
* Explore/sample section
* Educational/scientific discovery section
* Clear navigation
* Guest access without login

The homepage itself must feel like part of the mathematical product, not a generic marketing landing page.

---

## B. Guest Graphing Workspace

A visitor must be able to use the graphing application immediately.

No authentication required.

Support:

* Enter equation
* Edit equation
* Delete equation
* Add multiple equations
* Show/hide equation
* Zoom
* Pan
* Reset viewport
* Coordinate grid
* X/Y axes
* Mouse interaction
* Touch interaction where practical

Example:

```
y = x²
```

must immediately render a parabola.

---

# 61. MVP EQUATION SUPPORT

The MVP should support at minimum:

### Basic arithmetic

```
+
-
*
/
^
()
```

### Variables

```
x
```

### Constants

```
π
e
```

### Functions

```
sqrt(x)
abs(x)
sin(x)
cos(x)
tan(x)
log(x)
ln(x)
exp(x)
```

### Function forms

```
y = x

y = x²

y = x³

y = 2x + 3

y = x² - 4x + 3

y = sin(x)

y = cos(x)

y = e^x

y = log(x)

y = 1/x
```

Support common mathematical input variations:

```
x^2

x²

2x

2*x

sqrt(x)

√x
```

where practical.

---

# 62. MVP EQUATION EDITOR

The equation editor must:

* support keyboard input
* provide mathematical syntax highlighting
* provide autocomplete/suggestions where practical
* highlight invalid expressions
* show friendly errors
* support basic mathematical notation
* allow rapid editing
* work on desktop and mobile

The user should not need to understand programming syntax.

For example:

```
2x² + 3x - 5
```

should be understood naturally.

Do not require:

```
2*x^2+3*x-5
```

although that form should also work.

---

# 63. MVP GRAPH ENGINE

The graph renderer must support:

* Cartesian coordinate system
* dynamic viewport
* zoom
* pan
* responsive resizing
* smooth rendering
* multiple curves
* curve hover/touch inspection
* coordinate tooltip
* discontinuity handling

The graph engine MUST NOT incorrectly connect discontinuous functions.

At minimum test:

```
y = 1/x

y = tan(x)
```

The graph must not draw a giant line through an asymptote.

---

# 64. MVP GRAPH INTERACTION

When the user moves the cursor over a graph:

Show a subtle tracking point.

For example:

```
x = 2.31
y = 4.72
```

The point should follow the curve smoothly.

If multiple equations are present, identify the active curve.

Clicking/tapping a mathematically interesting point should show useful information where available.

---

# 65. MVP AUTOMATIC ANALYSIS

Implement deterministic analysis for common polynomial functions.

At minimum support:

## Linear

```
y = mx + b
```

Display:

* slope
* y-intercept
* x-intercept when defined

## Quadratic

```
y = ax² + bx + c
```

Display:

* degree
* roots when real roots exist
* vertex
* axis of symmetry
* y-intercept
* opening direction

## Cubic

Display where reliably calculable:

* degree
* real roots
* y-intercept
* critical points where supported
* inflection point where supported

Do not display a property if it cannot be calculated reliably.

---

# 66. MVP EXAMPLE LIBRARY

Include at least **100 curated example equations**.

Do not generate random meaningless equations.

Organize examples into categories:

* Linear
* Quadratic
* Cubic
* Polynomial
* Trigonometry
* Exponential
* Logarithmic
* Rational
* Geometry
* Calculus
* Physics
* Beautiful/Interesting Mathematics

Each example should contain:

```
id
title
equation
category
difficulty
shortDescription
educationalExplanation
```

Example:

```
{
  "title": "A Simple Parabola",
  "equation": "y = x²",
  "category": "Quadratic",
  "difficulty": "Beginner",
  "shortDescription": "...",
  "educationalExplanation": "..."
}
```

---

# 67. MVP EXPLORE PAGE

Create an attractive Explore page.

It should contain:

* category filters
* search
* example cards
* difficulty filters
* featured experiments
* interesting equations
* science examples

Each card should provide enough visual information to make the user want to click.

Where practical, render a small graph preview.

Do not make it look like a boring database table.

---

# 68. MVP EQUATION OF THE DAY

Implement Equation of the Day.

For MVP:

* Maintain a curated dataset.
* Display one equation per day.
* Show title.
* Show equation.
* Show explanation.
* Show visualization.
* Provide "Explore this equation".

The selection can initially be deterministic based on date.

Example:

```
dayIndex = dayOfYear % numberOfEquations
```

Do not build an unnecessarily complex recommendation system for MVP.

---

# 69. MVP PARAMETER EXPERIMENT

Implement at least one parameter-based interactive experience.

Example:

```
y = ax² + bx + c
```

Provide sliders for:

```
a
b
c
```

Changing the sliders must update:

* graph
* important mathematical properties
* displayed equation

Example educational explanation:

```
"Increasing a makes the parabola narrower."
```

The explanation should update where practical.

This feature is a key part of the product's educational identity.

---

# 70. MVP MULTI-EQUATION COMPARISON

Allow at least 5 simultaneous equations.

Example:

```
y = x²
y = 2x + 3
y = sin(x)
```

Users must be able to:

* add
* edit
* hide
* show
* delete
* focus

each equation.

The graph must remain responsive.

---

# 71. MVP PRESENTATION MODE

Implement a basic classroom/projector mode.

It should:

* maximize graph visibility
* enlarge equations
* enlarge controls
* reduce unnecessary UI
* support touch
* support mouse
* maintain strong contrast

A teacher should be able to open the application and use it on a projector without logging in.

---

# 72. MVP HANDWRITING INPUT

The MVP should include the **handwriting interaction layer**, but do not require a perfect ML model if one is not available.

Implement:

```
HandwritingCanvas
```

and:

```
HandwritingRecognizer
```

as separate abstractions.

The handwriting canvas must support:

* mouse drawing
* touch drawing
* stylus input where browser support exists
* undo
* redo
* clear
* submit/recognize

Create a recognizer interface so a future ML model can be plugged in.

If a suitable mathematical handwriting recognition model/API is already available and can be integrated safely, implement recognition for a limited subset.

At minimum, the architecture must NOT make handwriting recognition a hard-coded part of the UI.

---

# 73. MVP AI FEATURES

AI should be limited to features that provide obvious educational value.

Implement at least one AI-powered experience if the project environment supports it.

Recommended MVP feature:

## "Explain this equation"

Example:

User enters:

```
y = x² - 4x + 3
```

The system calculates the mathematical properties deterministically.

Then AI receives the structured results and produces a friendly explanation.

Architecture:

```
Equation
   ↓
Math Parser
   ↓
Math Analysis
   ↓
Structured Results
   ↓
AI
   ↓
Explanation
```

DO NOT send the raw equation to the AI and trust the AI to calculate mathematical properties.

The math engine is the source of truth.

---

# 74. MVP AUTHENTICATION

Authentication is NOT part of the core graphing experience.

For MVP:

Guest users can:

* graph
* explore
* analyze
* use examples
* use Equation of the Day
* use parameter experiments
* use presentation mode

If authentication already exists in the repository, integrate it where appropriate.

If authentication does not exist, do not delay the core MVP unnecessarily.

A future authenticated project system should be designed for, but it is not required to block the MVP.

---

# 75. MVP LOCAL PERSISTENCE

Guest users should not lose their current work unnecessarily.

Use localStorage or another appropriate client-side persistence mechanism for:

* current equations
* viewport
* graph settings
* selected examples

Do not store sensitive information.

---

# 76. MVP RESPONSIVE REQUIREMENTS

The MVP MUST work on:

### Desktop

Minimum target:

```
1280 × 720
```

### Tablet

Examples:

```
1024 × 768

768 × 1024
```

### Mobile

Examples:

```
390 × 844

375 × 667
```

### Large display/projector

Support large screen layouts.

The UI must not simply scale down.

Create intentional layouts for each breakpoint.

---

# 77. MVP ACCESSIBILITY

Minimum requirements:

* keyboard navigation
* visible focus states
* semantic buttons
* labels for inputs
* accessible tooltips where possible
* sufficient contrast
* reduced-motion support
* touch-friendly controls

Graph information should not depend exclusively on color.

---

# 78. MVP PERFORMANCE TARGETS

The application should feel instant.

Target:

### Initial interaction

User can begin entering an equation immediately after the UI loads.

### Simple equation

For:

```
y = x²
```

graph should appear essentially immediately after valid input.

### Interaction

Zoom and pan should remain smooth.

### Parameter sliders

Graph updates should feel real-time.

Do not send every slider movement to the backend.

Use client-side computation for basic mathematics.

---

# 79. MVP SECURITY

Never use:

```
eval()
```

or arbitrary JavaScript execution to evaluate equations.

All equations must be parsed using a safe mathematical expression parser.

AI output must be treated as untrusted.

Validate AI-generated structures before processing.

Do not allow user input to execute arbitrary code.

---

# 80. MVP PAGES

The MVP should contain these core pages/views:

## 1. Homepage

Purpose:

```
Discover → Try → Explore
```

Must include interactive graphing.

---

## 2. Graph Workspace

Purpose:

```
Create and explore mathematical graphs.
```

---

## 3. Explore

Purpose:

```
Discover curated mathematical experiments.
```

---

## 4. Equation of the Day

Purpose:

```
Daily mathematical discovery.
```

---

## 5. Example / Experiment Detail

Purpose:

```
Open a specific mathematical experiment.
```

Example:

```
/explore/quadratic-parabola
```

---

## 6. Presentation Mode

Purpose:

```
Classroom/projector use.
```

This can be a workspace mode rather than a completely separate route.

---

# 81. MVP NAVIGATION

Keep navigation minimal.

Suggested:

```
Logo
Explore
Graph
Equation of the Day
```

Right side:

```
Sign in (if authentication exists)
```

Do not clutter navigation.

On mobile use:

* compact header
* menu/bottom navigation where appropriate

---

# 82. MVP VISUAL QUALITY REQUIREMENT

Every MVP page must have:

* loading state
* empty state where applicable
* error state
* hover state
* focus state
* mobile layout
* dark mode
* light mode

No page should look like a developer prototype.

Do not leave:

```
Lorem ipsum

TODO

Coming soon

Placeholder image

Broken icon

Unstyled form
```

unless explicitly intentional.

---

# 83. MVP ACCEPTANCE CRITERIA

The MVP is accepted only if ALL of the following are true.

## ACCEPTANCE TEST 1 — Anonymous User

1. Open the homepage in a fresh browser session.

2. Do not log in.

3. Enter:

   ```
   y = x²
   ```

4. The graph appears.

5. No authentication wall appears.

PASS condition:

The user can successfully explore the graph without creating an account.

---

# 84. ACCEPTANCE TEST 2 — Quadratic

Enter:

```
y = x² - 4x + 3
```

The system must:

* render the parabola
* identify it as quadratic
* identify real roots 1 and 3
* identify vertex (2, -1)
* identify y-intercept 3
* identify axis of symmetry x = 2

PASS condition:

All displayed mathematical properties are correct.

---

# 85. ACCEPTANCE TEST 3 — Linear

Enter:

```
y = 2x + 3
```

The system must identify:

```
slope = 2

y-intercept = 3

x-intercept = -1.5
```

PASS condition:

Graph and analysis agree.

---

# 86. ACCEPTANCE TEST 4 — Cubic

Enter:

```
y = x³ - x
```

The system should correctly render the cubic.

If cubic analysis is implemented, it should correctly identify the real roots:

```
-1
 0
 1
```

PASS condition:

No incorrect mathematical information is displayed.

---

# 87. ACCEPTANCE TEST 5 — Trigonometric

Enter:

```
y = sin(x)
```

PASS:

* sinusoidal curve appears
* graph can be zoomed
* graph can be panned
* curve remains responsive
* no visual artifacts appear

---

# 88. ACCEPTANCE TEST 6 — Discontinuity

Enter:

```
y = 1/x
```

PASS:

The renderer MUST NOT draw a continuous line through x = 0.

There should be two separate curve segments.

---

# 89. ACCEPTANCE TEST 7 — Multiple Equations

Add:

```
y = x²

y = 2x + 3

y = sin(x)
```

PASS:

* all curves render
* each equation can be hidden
* each can be edited
* each can be deleted
* graph remains responsive

---

# 90. ACCEPTANCE TEST 8 — Parameter Experiment

Open the quadratic parameter experiment.

Change:

```
a
```

using a slider.

PASS:

* graph changes immediately
* equation updates
* analysis updates
* no noticeable UI freezing occurs

---

# 91. ACCEPTANCE TEST 9 — Explore

Open Explore.

PASS:

* at least 100 curated examples are available
* categories work
* search works
* clicking an example opens its interactive graph
* each example contains useful educational context

---

# 92. ACCEPTANCE TEST 10 — Equation of the Day

Open Equation of the Day.

PASS:

* an equation is displayed
* explanation is shown
* graph is interactive
* user can open the full experiment
* the experience works without authentication

---

# 93. ACCEPTANCE TEST 11 — Handwriting

Open handwriting input.

PASS:

* user can draw with mouse
* user can draw with touch
* strokes can be cleared
* undo/redo works if implemented
* recognition layer is cleanly separated from drawing UI

If ML recognition is not available in the MVP:

The UI must clearly communicate that recognition is limited/not available rather than pretending it works.

---

# 94. ACCEPTANCE TEST 12 — Presentation Mode

Open presentation mode.

PASS:

* graph becomes substantially larger
* controls remain usable
* equations are readable from a distance
* interface remains responsive
* no login is required

---

# 95. ACCEPTANCE TEST 13 — Mobile

Test on approximately:

```
390 × 844
```

PASS:

* no horizontal page overflow
* equation input remains usable
* graph remains usable
* controls are touch friendly
* navigation remains usable
* analysis can be accessed without destroying the graph experience

---

# 96. ACCEPTANCE TEST 14 — Keyboard

Using only the keyboard:

* focus equation input
* enter equation
* submit
* navigate equations
* open/close panels where practical

PASS:

The core workflow is usable without a mouse.

---

# 97. ACCEPTANCE TEST 15 — Invalid Equation

Enter:

```
y = x^^^
```

PASS:

Do not crash.

Display a friendly error.

The existing graph should remain usable.

No raw stack trace should appear to the user.

---

# 98. ACCEPTANCE TEST 16 — Guest Persistence

As an anonymous user:

1. Create two equations.
2. Adjust viewport.
3. Reload the page.

PASS:

The application restores the temporary session where technically appropriate.

---

# 99. ACCEPTANCE TEST 17 — Dark Mode

Switch to dark mode.

PASS:

* graph remains readable
* equations remain readable
* controls remain readable
* contrast remains strong
* no invisible text
* no broken components

---

# 100. ACCEPTANCE TEST 18 — Reduced Motion

Enable:

```
prefers-reduced-motion
```

PASS:

Animations are reduced or disabled while functionality remains intact.

---

# 101. ACCEPTANCE TEST 19 — Performance

Test:

```
y = sin(x)

y = cos(x)

y = x²

y = x³
```

simultaneously.

Then zoom and pan repeatedly.

PASS:

The interface remains responsive and does not visibly freeze.

---

# 102. ACCEPTANCE TEST 20 — No Console/Build Errors

Before declaring MVP complete:

* TypeScript compilation passes.
* Production build passes.
* Automated tests pass.
* No unexplained console errors remain.
* No broken network requests remain.
* No obvious accessibility errors remain.

---

# 103. DEFINITION OF DONE

The MVP is DONE only when:

### Functionality

* Core graphing works.
* Equation editor works.
* Multiple equations work.
* Basic analysis works.
* Examples work.
* Equation of the Day works.
* Parameter experiment works.
* Presentation mode works.
* Guest mode works.

### UX

* Homepage is polished.
* Graphing workflow is intuitive.
* Mobile is usable.
* Touch is usable.
* Classroom use is practical.
* Error states are friendly.

### Visual

* Light mode is polished.
* Dark mode is polished.
* Animations are intentional.
* Typography is consistent.
* No placeholder UI remains.

### Engineering

* Architecture is modular.
* Math core is separated from UI.
* Equation evaluation is safe.
* No arbitrary code execution.
* Tests cover critical mathematical behavior.
* Performance is acceptable.

---

# 104. WHAT NOT TO BUILD IN MVP

Do NOT delay MVP completion by attempting to implement all of these:

* full 3D graphing
* collaborative editing
* social network
* complex user profiles
* advanced recommendation engine
* custom ML model training pipeline
* complete CAS comparable to Mathematica
* full symbolic integration engine
* real-time multiplayer
* native mobile apps
* complex billing system
* enterprise administration
* massive content management system

These belong to later phases.

Build the foundations so they CAN be added later.

---

# 105. MVP SUCCESS CRITERIA

The MVP should answer "YES" to all of these questions:

> Can a student open the site and start immediately?

YES.

> Can they graph an equation without logging in?

YES.

> Can they understand something about the graph?

YES.

> Can they experiment with it?

YES.

> Can they discover another equation?

YES.

> Can a teacher project it in a classroom?

YES.

> Does it work on a phone/tablet?

YES.

> Does it feel beautiful?

YES.

> Does mathematics feel interactive rather than static?

YES.

> Is the mathematical output trustworthy?

YES.

---

# 106. PRODUCT NORTH STAR

Do not optimize the MVP for the number of features.

Optimize it for this experience:

```
"I typed an equation..."

         ↓

"Whoa, look at that."

         ↓

"What happens if I change this?"

         ↓

"Oh, that's why."

         ↓

"What else can I explore?"
```

If a feature does not contribute meaningfully to this loop, it is lower priority for MVP.

The first version should make mathematics feel **discoverable, visual, experimental, and alive**.


That is the product.

Build the engineering architecture to support that experience from day one.