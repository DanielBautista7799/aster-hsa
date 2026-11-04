# Aster HSA - AI Usage and Collaboration

## 1. AI Tools Used

| AI tool | What I used it for | Why I chose it | 
| ----- | ----- | ----- | 
| **ChatGPT (OpenAI)** | Iterating on the database schema, defining project milestones, and reworking the backend architecture to support simultaneous CRUD transactions. | I relied on it due to an extensive databank of conversation history, which allowed for a highly contextual, efficient, and less mechanical collaboration. | 
| **Claude Code (Anthropic)** | Initializing the frontend architecture, building the core views, debugging, and polishing the React/MUI components. | Its strong context retention from previous sessions made iterative UI development, feature implementation, and debugging significantly faster. | 

### How I approached AI collaboration

My approach centered on establishing the foundation and using AI to improve and refine it. I drafted the base database schema and boilerplate requirements, then brought in ChatGPT to help improve the database locking and transaction strategy when I encountered bottlenecks with concurrent CRUD operations. On the frontend, I defined the base layout and custom color palette, then directed Claude to build on that setup and polish the code to match my overall vision. Throughout the project, I laid down the initial boilerplate and logic, while the AI functioned as a collaborator to elevate the system design, catch edge cases, and refine the final implementation.

## 2. Which Parts of the Project AI Helped With

| Project area | What AI helped with | What I decided, reviewed, or changed | 
| ----- | ----- | ----- | 
| **Requirements and planning** | Acted as a sounding board to map out the initial project scope and improve the end goals. | I defined the base requirements, prioritizing data integrity, integer-cent arithmetic, and relying on database constraints. | 
| **Architecture and design decisions** | Brainstormed approaches for handling concurrent requests and provided improved syntax for different lock types. | I set up the base synchronous FastAPI + SQLAlchemy model and chose PostgreSQL over SQLite to allow the AI to utilize real row-level locks. | 
| **Backend and API** | Improved the boilerplate for thin FastAPI routes, Pydantic models, and basic service functions. | I reviewed the separation of concerns, ensuring business rules lived in services and that the AI handled domain errors properly. | 
| **Database and data model** | Drafted the initial Alembic migration scripts and refined my base schema specifications. | I drafted the base boilerplate schema, and the AI helped improve it by optimizing what to store and what to exclude to avoid data drift. | 
| **Transaction processing and concurrency** | Helped write and refine the SQL syntax for the transaction blocks to handle simultaneous operations. | I evaluated and approved the AI's suggested atomic conditional `UPDATE` and locking strategy, ensuring it correctly solved the race conditions we identified. | 
| **Frontend and user experience** | Handled the initial React/Vite setup, built out the component views, and polished the CSS/MUI implementation. | I provided the base UX layout and color palette, and reviewed the `refresh()` pattern to ensure the browser never trusts its own computed balance. | 
| **Testing and debugging** | Generated testing boilerplate and assisted with debugging failing tests during the concurrency implementation. | I defined the base testing edge cases (e.g., race conditions, concurrent identical timestamps) and verified the test suite runs. | 
| **Documentation and final review** | Polished markdown formatting and checked for grammatical consistency. | I drafted the base architectural narrative, explaining the tradeoffs, transaction boundaries, and design logic. | 

### Ownership and design judgment

* **Requirements I prioritized:** Establishing the base rules for database-level integrity (no negative balances, no floating-point math), explicit transaction boundaries, and a robust concurrency model using PostgreSQL.

* **Decisions I made:** Using cursor pagination for the transaction history to handle append-only ledgers; favoring database locks; keeping the UI state intentionally minimal by re-fetching the server's balance rather than computing it locally.

* **Suggestions I accepted or revised:** I accepted Claude's improvements to the React component structure and layout generation, revising the styling and component arrangement as needed to match my specific UX vision.

* **Suggestions I rejected or deferred, and why:** I prioritized database-level transaction safety over application-level balance checks. We also tested the implementation against an intentionally unsafe read-modify-write approach to verify that our concurrency tests could detect race conditions.

* **Parts of the implementation I made sure I understood:** The exact behavior of PostgreSQL transaction isolation levels. I made absolutely certain I understood how the AI's suggested database locks queue in concurrent environments to prevent deadlocks and race conditions.

## 3. Representative Prompts and Workflows

### Workflow 1: Planning and Designing the Application

**Goal:** Establish a complete architecture and implementation specification before beginning full application development.

**Tool used:** ChatGPT

**Representative prompt or workflow:**

> I discussed the assignment requirements with ChatGPT to break them into features and establish a technology stack (React, FastAPI, SQLAlchemy, PostgreSQL) I was familiar with. I specifically asked ChatGPT to help plan an approach for handling concurrent financial transactions so that simultaneous purchases couldn't spend more money than the account held.

**AI output:** Provided an improved implementation specification covering database design, API endpoints, and a strategy for managing concurrency based on my initial ideas.

**My review and follow-up:** I expanded the specification to emphasize a realistic user experience (virtual card presentation, transaction history) and a dedicated method for demonstrating concurrent transactions. I also rejected adding unnecessary features like real banking integrations or authentication, since a local simulation was required.

**Result:** A detailed, concrete implementation plan and acceptance criteria were established before utilizing Claude Code for development.

### Workflow 2: Improving Transaction History

**Goal:** Implement cursor-based pagination for the Activity page to handle large transaction volumes without sacrificing performance or usability.

**Tool used:** Claude Code

**Representative prompt or workflow:**

> I instructed Claude to implement pagination for the transaction history while preserving existing search and filter functions. I emphasized that older transactions might contain matching search results not yet loaded in the browser, so searching and filtering must work across the entire history, not just the visible page.

**AI output:** Claude implemented cursor-based pagination and moved the search functionality to the backend database.

**My review and follow-up:** I required Claude to add regression tests specifically covering pagination, filtering, and edge cases where new transactions are inserted mid-scroll while a user is browsing the history.

**Result:** The Activity page now reliably loads transactions in batches, handles server-side filtering across the entire ledger, and guarantees that rows inserted mid-walk do not cause duplicates or gaps.

### Workflow 3: Independent Verification of Concurrent Behavior

**Goal:** Verify that the financial transaction logic remained correct under concurrent requests, specifically seeking out edge cases that standard functional tests might miss.

**Tool used:** Claude Code (with independent review agents)

**Representative prompt or workflow:**

> I explicitly instructed Claude not to treat passing tests as absolute proof of correctness. I directed it to review its own implementation using an independent review agent to hunt for weaknesses, and to trace any discovered problems to their root causes rather than relying on the original agent's conclusions.

**AI output:** The independent review agent successfully discovered a subtle concurrency flaw where declined transactions could occasionally record an outdated account balance in the ledger.

**My review and follow-up:** I instructed Claude to revisit the core architectural decisions to fix the root cause, rather than applying a temporary software workaround, and to verify the fix thoroughly with new regression tests.

**Result:** The AI successfully identified a flaw through prompted adversarial review and implemented a robust database-level fix, proving the value of independent verification.

## 4. Example of Incorrect, Incomplete, or Unhelpful AI Output

### Inconsistent Transaction History on Concurrent Declines

| Question | My explanation | 
| ----- | ----- | 
| **What did AI originally produce or suggest?** | The AI initially generated an implementation that relied solely on the atomic conditional `UPDATE` for approved purchases, checking transaction eligibility against a simple, unlocked read of the account balance. | 
| **What was wrong, incomplete, or unhelpful?** | Because there was no up-front database lock on the account row, declined transactions could read a stale balance while another transaction (like a deposit) was mid-flight. When the decline was logged, it recorded the outdated balance. | 
| **Why did the issue matter?** | Although the *actual* account balance remained mathematically correct (overspending was still prevented), the transaction history became inconsistent because the `balance_after` chain was broken. In a financial system, the ledger must maintain exact mathematical continuity. | 
| **How was the issue discovered?** | I prompted Claude's independent review agent to actively search for concurrency weaknesses that the original tests missed. The agent traced an edge-case race condition between a simultaneous deposit and a declined purchase. | 
| **How was it corrected, and by whom?** | Under my direction to address the root cause, Claude corrected the logic by adding an explicit PostgreSQL account row lock (`SELECT ... FOR NO KEY UPDATE`) *before* evaluating any purchase, forcing concurrent operations to queue sequentially. | 
| **How did I verify the correction?** | I required Claude to write regression tests asserting that history remained a perfect mathematical chain. To verify the tests actually worked, I had the AI temporarily restore the old, flawed logic, confirming the tests failed, before reapplying the fix and seeing them pass. | 

### What changed

**Before:** The system read the account balance at the start of a request without taking a lock. If a concurrent transaction modified the balance before the first request finished processing a decline, the declined record would save the stale, initial balance into the ledger history.

**After:** The transaction immediately acquires a `FOR NO KEY UPDATE` lock on the account row from the very beginning. This ensures that even declined transactions queue properly and record the exact, serialization-safe balance at the exact moment of decision.

**What I learned:** I learned that passing tests are not sufficient proof of correctness, especially in highly concurrent systems. AI code must be rigorously stress-tested against edge cases. Furthermore, instructing an AI to use an independent, secondary "review agent" to critique its own work is a highly effective validation strategy.

## 5. How I Verified the Final Implementation

### Automated and technical checks

| Check | Who ran it | Actual result | What it verified | 
| ----- | ----- | ----- | ----- | 
| **Backend tests** | Claude Code / Pytest | 126 passed | Backend API, account operations, deposits, purchases, validation, and database integrity. | 
| **Frontend tests** | Claude Code / Vitest | 51 passed | Frontend logic, monetary input validation, API error handling, and UI components. | 
| **Concurrency tests** | Claude Code / Pytest | Passed | Verified simultaneous transactions couldn't overdraw accounts under heavy load. | 
| **Browser / end-to-end tests** | Playwright | 15-step walkthrough passed | Tested account creation, deposits, cards, purchases, transaction history, and concurrency flows end-to-end. | 
| **Linting, type checking, and builds** | ESLint, Ruff, TSC | Passed | Checked code quality, formatting, and strict type safety across the stack. | 
| **Database / persistence checks** | Docker Compose | Passed | Verified the frontend, backend, and PostgreSQL database initialized and worked together correctly. | 

### My hands-on verification

| Feature or workflow | What I did myself | What I observed | 
| ----- | ----- | ----- | 
| **Local setup and startup** | Cloned the repository and ran `docker compose up`. | Clean build; containers orchestrated correctly; UI accessible on local port. | 
| **Create an account** | Navigated the UI to manually register a test account. | Form validation enforced rules; backend prevented duplicate emails. | 
| **Deposit funds** | Submitted manual deposits via the UI. | Balance updated instantly; appropriate ledger entries were generated. | 
| **Issue or manage a card** | Triggered card issuance through the browser. | Virtual card displayed correctly with last 4 digits; no PAN/CVV exposed. | 
| **Qualified and unqualified purchases** | Submitted purchases for both eligible (e.g., pharmacy) and ineligible categories. | Proper acceptance/declines; balance correctly deducted only for valid expenses. | 
| **Insufficient funds / invalid input** | Attempted to spend beyond the balance and submit malformed string amounts. | 201 status for legitimate declines; 422 errors for malformed string inputs; no negative balances. | 
| **Concurrent transactions** | Used the custom Concurrency Lab page to fire simultaneous requests. | System cleanly handled the burst; exact mathematical chain maintained in history. | 
| **Transaction history and receipts** | Scrolled through paginated history and utilized search/filters. | Seamless loading of older records; accurate server-side filtering without gaps. | 
| **UI, navigation, and responsive design** | Resized browser window and clicked through core tabs. | MUI layout adapted cleanly; single-page navigation remained smooth. | 

### Final requirements review

* **How I checked each assignment requirement:** I mapped every core requirement from the assignment brief (account creation, deposits, purchases, concurrency, history) directly to the deployed application, testing each through the UI and confirming with database queries.

* **What I verified independently rather than relying only on AI claims:** I personally verified the Docker build process, ran the UI flows, and mandated *mutation testing*, temporarily replacing the safe transaction implementation with an unsafe version to prove the automated tests would actually fail.

* **Known limitations or checks I could not complete:** The Playwright E2E tests were executed locally during development to ensure correctness but are not formally committed into a continuous integration pipeline for this repository.

* **Why I consider the submitted implementation ready:** It strictly meets all requirements, boasts robust database-level concurrency safeguards, handles edge cases gracefully, and has been verified by both extensive automated testing and hands-on functional review.

## 6. Reflection on Judgment, Ownership, and Verification

**What AI did well:** The AI was exceptional at accelerating boilerplate generation, establishing the React component structure, and rapidly iterating on frontend styling. Once I defined the architectural boundaries and base schemas, it executed the syntax flawlessly and caught minor typing errors.

**Where human judgment mattered most:** Human direction was critical in interpreting the assignment, defining strict project goals, and establishing the base architecture. My judgment was necessary to oversee the database-level `CHECK` constraints and locks over application-level state, and to prevent the AI from adding scope-creep features (like real authentication or banking integrations).

**What I would do differently when using AI on another project:** I would formalize the use of independent AI "review agents" much earlier in the pipeline. Rather than waiting until I suspected an issue, I would build adversarial review prompts into my standard workflow for any complex logic or database migrations.

**What I can explain or defend about this implementation:** I can confidently defend the entire transaction lifecycle and concurrency model. I understand the mechanics of our row-level locking strategy, how the cursor pagination query prevents gaps when new rows arrive, and why we intentionally excluded standard financial data (like PAN or SSN) to align with a purely local simulation.
