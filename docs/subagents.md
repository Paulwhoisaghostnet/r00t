# Subagents you can use

Subagents that exist in this project. The main agent can delegate to them; Cursor also picks up any `.cursor/agents/*.md` files automatically.

---

## Project-defined

### Charlie

**Purpose:** Ghostnet testing with 5 wallets. Runs the chore list (each task × each wallet) and logs issues.

**Invoke:** “call Charlie”, “run Charlie”, “Charlie run the chore list”, “Charlie test the app”.

**Files:** `.cursor/rules/charlie.mdc`, `.cursor/agents/charlie.md`, `nimrod/charlie-chore-list.md`, `nimrod/charlie-test-log.md`, `nimrod/charlie-ghostnet-wallets.md` (gitignored).

### Skrib (skr1b3)

**Purpose:** Admin docs. Updates the Tezos bible and Nimrod docs when Tezos work or Nimrod decisions happen.

**Invoke:** “call Skrib”, “run Skrib”, “Skrib update the docs”, “have Skrib update the bible”.

**Files:** `.cursor/rules/skr1b3.mdc`, `.cursor/agents/skrib.md`, `nimrod/skr1b3-triggers.md`, `docs/tezos-bible.md`, `nimrod/`.

---

## From Cursor community / docs

### Verifier

**Purpose:** Validates completed work: checks implementations are functional, runs tests, reports what passed vs what’s incomplete. (Implements the [Cursor docs](https://cursor.com/docs/context/subagents) custom subagent example.)

**Invoke:** Ask the main agent to “verify the work”, “run tests and report”, or “have the Verifier check the implementation”. The agent can delegate to the Verifier subagent when verification is needed.

**File:** `.cursor/agents/verifier.md`

### Code Reviewer

**Purpose:** Reviews code for quality, security, and maintainability. Outputs Summary, Critical issues, Suggestions, Commendations. (From [Developer Toolkit](https://developertoolkit.ai/en/claude-code/advanced-techniques/custom-subagents/) custom subagent pattern.)

**Invoke:** Ask the main agent to “review the code”, “run a code review”, or “have the Code Reviewer check the changes”. Use after implementing features.

**File:** `.cursor/agents/code-reviewer.md`

### Test Writer

**Purpose:** Writes test suites (unit and integration). Follows AAA, tests behavior not implementation, matches project test patterns. (From Developer Toolkit custom subagent pattern.)

**Invoke:** Ask the main agent to “write tests”, “add test coverage”, or “have the Test Writer create tests for this”.

**File:** `.cursor/agents/test-writer.md`

### Tezos Expert

**Purpose:** Instinctively knows Tezos development pathways and languages: smart contracts (LIGO, SmartPy, Archetype, Michelson), dApp stack (Beacon, Taquito, TzKT), testnets (Ghostnet, Shadownet), Etherlink L2. Guides architecture, contract design, and "how do I build X on Tezos". Uses **docs/tezos-bible.md** as this project’s reference.

**Invoke:** "ask the Tezos Expert", "how do I do X on Tezos", "Tezos Expert: design the flow", or when making Tezos stack or language choices.

**File:** `.cursor/agents/tezos-expert.md`

---

No separate rule files for Verifier, Code Reviewer, or Test Writer; Cursor loads subagents from `.cursor/agents/` by name and description.

---

To add another subagent: add a `.md` file under `.cursor/agents/` with YAML frontmatter (`name`, `description`) and the prompt, then list it here.
