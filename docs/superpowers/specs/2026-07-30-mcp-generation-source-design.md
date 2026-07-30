# MangaForge MCP Generation Source Design

Date: 2026-07-30
Status: approved
Scope: novel prose draft generation through MCP, with a generic MCP client and a Buda-specific adapter

## Problem

MangaForge currently obtains chapter prose through ordinary model-provider APIs. Those calls are effectively stateless: every generation request must carry the current chapter task, prior causes and consequences, authoritative story state, continuity constraints, and output contract.

Buda exposes persistent Agents, Drive storage, asynchronous Sessions, and MCP tools. It can serve as an alternative prose executor, but its remote memory must not replace MangaForge's local truth layer or take control of the production workflow.

The project needs an MCP integration that:

1. treats Buda like the current prose-output model rather than a workflow owner;
2. preserves the existing context compiler, quality gates, revisions, storage, Story State, and Memory Palace;
3. supports multiple Buda accounts and their independent Agent quotas;
4. provides a reusable MCP protocol layer without forcing every MCP service into the model Provider abstraction; and
5. prevents stale or rejected remote content from becoming novel canon.

## Decisions

- Add an independent GenerationSource boundary.
- Keep model Providers and MCP Servers as separate configuration domains.
- Add a generic MCP client and a Buda-specific adapter.
- A project that selects MCP must explicitly bind one MCP Server, one MCP Key, one adapter, and one remote Agent.
- Each project uses one long-lived Buda Agent and creates an independent Session for each chapter-generation attempt.
- A complete rewrite creates a new Session. An explicit continuation, expansion, or repair may resume the Session that produced the current candidate.
- MangaForge sends the complete compiled chapter prompt on every generation request even when the remote Agent has memory.
- MangaForge remains the sole authority for canon, quality decisions, storage, and memory.
- Buda failure never causes a silent automatic fallback to a model.
- Initial delivery uses local plaintext MCP key storage, matching the project's current maturity. Key encryption or operating-system keychain integration is deferred.

## Alternatives considered

### Treat MCP as a model Provider

This looks small initially, but it mixes model selection and request formatting with MCP initialization, tool discovery, remote Sessions, polling, cancellation, and Drive synchronization. It would make provider-runtime responsible for unrelated lifecycles and would make future MCP adapters harder to isolate.

### Independent GenerationSource

This is the chosen approach. The prose draft stage selects either a ModelGenerationSource or McpGenerationSource. The model implementation delegates to the existing generator. The MCP implementation delegates protocol behavior to the generic client and service semantics to a selected adapter.

### Separate MCP Gateway process

A gateway would centralize connections for multiple products, but MangaForge is currently a local desktop application. A new process, deployment surface, and internal API are not justified for the first integration.

## Architecture

The target flow is:

    MangaForge context compiler
      -> GenerationSource resolver
         -> ModelGenerationSource
         -> McpGenerationSource
              -> generic MCP client
              -> Buda adapter
      -> normalized prose candidate
      -> existing transport and chapter-number checks
      -> existing word-count, continuity, and quality loops
      -> chapter storage
      -> Story State and Memory Palace updates

The integration boundary is the prose-draft call in:

- ui/server/src/novel-writing-service/service/generate-chapter-draft-prose.ts
- ui/server/src/novel-writing-service/service/create-novel-writing-service.ts

The existing runtime injection point remains useful. The default injected prose generator becomes a GenerationSource dispatcher. ModelGenerationSource delegates without changing the current model behavior. MCP is not added to provider-runtime.

Only the initial prose-draft stage is routed through MCP in the first release. Scene-card creation, preflight repair, review, revision, expansion, contraction, humanization, commercial editing, and Story State extraction continue to use their current implementations and stage-model choices.

## GenerationSource contract

The application-level contract has one purpose: obtain a prose candidate for a prepared chapter task.

    interface GenerationSource {
      generateProse(request: ProseGenerationRequest): Promise<ProseGenerationResult>
    }

    interface ProseGenerationRequest {
      requestId: string
      project: NovelProject
      chapter: NovelChapter
      chapterNo: number
      paragraphTask: string
      promptDiagnostics: unknown
      contextPackage: unknown
      maxTokens?: number
      temperature?: number
      abortSignal?: AbortSignal
      onProgress?: (event: GenerationSourceProgress) => Promise<void> | void
    }

    interface ProseGenerationResult {
      prose_chapters: Array<{
        chapter_no: number
        title?: string
        chapter_text: string
      }>
      source: "model" | "mcp"
      completed: boolean
      modelName?: string
      adapter_id?: string
      session_id?: string
      raw?: unknown
    }

The MCP source does not rewrite or summarize paragraphTask. It may add a small execution envelope containing the request ID, chapter identity, authority order, and response-format reminder, but the compiled MangaForge task remains intact.

The source must not silently truncate paragraphTask. If the live Buda tool schema or remote service rejects the compiled task size, generation fails with MCP_INPUT_TOO_LARGE. A future adapter may add a verified multipart-input protocol, but version 1 does not claim multipart support without a Buda contract that guarantees the Agent will wait for all parts before writing.

## MCP configuration

The configuration experience mirrors Provider plus Key, while the data and routes remain separate so model synchronization, model health checks, and model-key deletion do not accidentally operate on MCP credentials.

### MCP Server records

MCP Servers are stored in workspace/mcp-servers.json.

    interface McpServerRecord {
      id: string
      display_name: string
      transport: "streamable_http" | "stdio"
      url: string
      auth_type: "bearer" | "none"
      adapter_id: string
      is_active: boolean
      startup_timeout_ms: number
      tool_timeout_ms: number
      generation_timeout_ms: number
      poll_initial_ms: number
      poll_max_ms: number
      enabled_tools: string[]
      custom_headers: Record<string, string>
    }

The initial implementation accepts Streamable HTTP for production generation. The stdio value is reserved for a later release and must fail validation if selected for a prose source in version 1.

The built-in Buda template uses:

- ID: buda
- URL: https://buda.im/api/mcp
- transport: streamable_http
- authentication: bearer
- adapter: buda
- startup timeout: 15 seconds
- tool timeout: 60 seconds
- end-to-end generation timeout: 600 seconds
- polling: starts at 1 second and is capped at 5 seconds

All timeout and polling values remain editable.

### MCP Key records

MCP credentials are stored in workspace/mcp-keys.json.

    interface McpKeyRecord {
      id: number
      mcp_server_id: string
      key: string
      description: string
      is_active: boolean
      priority: number
      success_count: number
      failure_count: number
      last_checked?: string
      last_used?: string
      avg_latency?: number
    }

Each Buda account is a separate MCP Key record. Multiple keys may refer to the same Buda Server record. The key is stored in plaintext for this release, but API responses, UI fields, progress events, and logs must expose only a masked value. Editing a key is overwrite-only; an ordinary read endpoint never returns the original secret.

The priority field is retained only for familiar sorting in the account-management UI. Project generation always uses its explicitly bound Key and never rotates to another Key automatically.

Web-login email and password are never part of the MCP configuration. Buda MCP authentication requires a separately created sk_ API key.

### Project binding

The project stores the selection in reference_config:

    {
      "prose_generation_source": {
        "version": "prose_generation_source_v1",
        "type": "mcp",
        "mcp": {
          "server_id": "buda",
          "key_id": 3,
          "adapter_id": "buda",
          "agent_id": "agent_xxx"
        }
      }
    }

Projects without this object, or with type equal to model, retain the current model behavior without migration.

For an MCP-bound project, an ordinary model_id request parameter does not bypass the binding. The explicit UI action to generate temporarily with a model sends a distinct source override, and the resulting run records that override. This prevents old clients or stale UI state from silently changing the configured source.

For an MCP binding to be valid:

1. the Server and Key exist and are active;
2. the Key belongs to the selected Server;
3. the adapter exists in the local adapter registry;
4. the Agent is returned by a live list operation using the selected Key; and
5. the same server, key, and Agent tuple is not bound to another project.

One Buda account may therefore serve two projects when each project uses a different Agent. MangaForge does not limit the number of Buda accounts.

Server and Key deletion is blocked while a project references them. Disabling a referenced record is allowed only after an explicit warning, and the project then fails generation preflight until the binding is repaired.

## Generic MCP client

The client uses the official Model Context Protocol TypeScript client rather than a hand-written JSON-RPC implementation.

Responsibilities:

- create a transport from the Server configuration;
- apply Bearer or no-auth credentials without leaking them to logs;
- perform the initialize handshake;
- retain Server information, capabilities, and instructions;
- discover tools with pagination;
- enforce the configured allow list;
- preserve content, structuredContent, isError, and _meta;
- distinguish protocol errors from successful tool responses containing isError;
- apply startup and per-tool timeouts;
- propagate AbortSignal;
- close the connection and any server-side MCP transport Session; and
- recover once when an expired MCP transport Session can safely be reinitialized.

Client instances are keyed by server ID plus key ID. Connections with different credentials are never shared. The lifecycle is explicit:

    Connecting -> Ready -> Closed

Tool names and schemas are discovered before adapter execution. An adapter declares logical capabilities, and its resolver maps those capabilities to the discovered tools. Production fails with MCP_CAPABILITY_MISSING when required tools or compatible schemas are absent.

The effective callable tool set is the intersection of the adapter's declared operations and the optional Server allow list. Diagnostics may display other discovered tools, but prose production cannot call them. Server instructions are retained for diagnostics and adapter-level constraints; they are not automatically appended to the novel prompt.

Version 1 does not expose a user-programmable arbitrary-tool workflow. Adding another prose-producing MCP website requires a new adapter while reusing this client.

## Buda adapter

The Buda adapter translates the generic client into the following logical operations:

- list Agents;
- create a MangaForge prose Agent;
- read and write Agent Drive files;
- create or resume a Session;
- send a Session message;
- obtain Session state and messages;
- cancel an active Session; and
- extract the final assistant output.

The adapter ships with expected Buda tool aliases and schema matchers but still verifies the live tool list. Tool discovery is not bypassed by hard-coded names.

Creating an Agent is always an explicit user action. The standard Agent instruction defines it as a prose executor, states MangaForge's authority order, forbids inventing canon to repair missing input, and asks for only the requested chapter result. Existing Agents may be selected, but MangaForge does not overwrite their instructions. Reaching the remote account limit produces a visible error; MangaForge never deletes an Agent automatically.

Unbinding a project never deletes the remote Agent or its Drive. Remote deletion, if added later, is a separate destructive action with explicit confirmation.

## Drive authority and synchronization

Each bound Agent receives a deterministic MangaForge snapshot:

    /mangaforge/manifest.json
    /mangaforge/writing-bible.md
    /mangaforge/story-state.json
    /mangaforge/continuity.md
    /mangaforge/recent-chapters.md

manifest.json contains the local project identity, snapshot version, source chapter, generated timestamp, and a content hash for every file. Before creating a chapter Session, MangaForge compares hashes and uploads only changed files.

Authority order is repeated in the Agent instruction and chapter execution envelope:

1. the current chapter request and its compiled paragraphTask;
2. the current Story State and continuity snapshot;
3. the writing bible;
4. older summaries and remote Agent memory.

Remote memory may help with style and working continuity but may not override newer local facts.

Drive synchronization is required for the Buda source. A write or verification failure stops generation with a typed error rather than allowing the Agent to read a stale snapshot. Candidate prose and rejected drafts are never uploaded. Only after MangaForge accepts and stores a chapter, updates Story State, and reaches the next generation request is a new authoritative snapshot produced.

The Drive receives compressed recent-chapter context, not the unbounded full manuscript. The complete task-specific prior causes and consequences continue to be included in paragraphTask on every request.

## Chapter Session lifecycle

The normal flow is:

    validate binding
      -> connect and discover tools
      -> synchronize and verify Drive snapshot
      -> create a chapter Session
      -> persist a remote-session receipt
      -> send the complete chapter task
      -> poll Session status
      -> fetch final messages
      -> normalize the prose result
      -> run the existing MangaForge quality pipeline

Every attempt has a locally generated request ID. Creating a new Session or sending a message is not blindly retried. If Buda exposes a way to find an operation by request ID, the adapter may recover the original operation; otherwise it reports uncertainty rather than risking a duplicate.

Only one active prose-generation attempt is allowed for a bound server, key, and Agent tuple. A keyed lock covers Drive synchronization, Session creation, and the active remote run. A concurrent request fails with MCP_AGENT_BUSY; existing sequential batch production may wait at its own orchestration layer before invoking the source. This prevents Drive snapshot races and prevents a later chapter from starting before an earlier chapter has produced accepted canon.

A complete chapter regeneration creates a new Session. Explicit continuation, expansion, or repair may resume the Session that produced the currently selected candidate. Sessions are not shared between different chapters.

Buda Session states map as follows:

- pending and in_progress continue polling;
- completed triggers message retrieval and normalization;
- waiting_for_input becomes MCP_INPUT_REQUIRED in version 1;
- failed becomes MCP_SESSION_FAILED;
- cancelled becomes MCP_CANCELLED.

The adapter never answers waiting_for_input on its own because doing so would allow the remote service to change the production flow.

When a remote Session is created, MangaForge appends an mcp_generate_prose run receipt keyed by request ID. The receipt stores only project and chapter identity, Server ID, Key ID, adapter ID, Agent ID, Session ID, snapshot hash, status, timestamps, and a prompt hash. It does not store the MCP key or create a second full copy of the prompt.

Terminal status updates the receipt. A successful chapter also records the latest MCP receipt in the chapter raw_payload. The existing generate_prose run remains the outer production record.

## Result normalization

The adapter checks structuredContent first, then textual content blocks, then the final Buda assistant message. It accepts a structured chapter object or plain chapter prose.

The result is normalized to:

    {
      "prose_chapters": [
        {
          "chapter_no": 12,
          "title": "optional title",
          "chapter_text": "candidate prose"
        }
      ],
      "source": "mcp",
      "adapter_id": "buda",
      "session_id": "session_xxx",
      "completed": true
    }

The raw MCP result may be retained in memory while normalizing, but persistent receipts store only bounded, redacted diagnostics. The normalized result then passes through the existing complete-transport assertion, target-chapter selection, plain-text fallback, minimum-prose admission, continuity checks, word-target handling, revision loops, and storage transaction.

An empty body, wrong chapter, incomplete terminal state, or malformed result is not accepted merely because the MCP call itself succeeded.

## Timeout, retry, cancellation, and fallback

The total generation deadline includes Drive synchronization, Session creation, polling, and result retrieval. An individual tool call is also bounded by tool_timeout_ms. Polling uses the configured interval and emits progress heartbeats.

Safe read operations and initial connection/tool discovery may make at most three total attempts for HTTP 408, 429, 500, 502, 503, and 504, provided the end-to-end deadline has not expired. Retry-After takes priority when present. Authentication failures, schema mismatches, missing tools, invalid arguments, and Buda business errors are not retried.

Write operations are not automatically retried unless the adapter can prove idempotency or recover the already-created resource using request ID. An expired MCP transport Session may be reinitialized once; recovery continues tracking the existing Buda Session and never creates a replacement draft silently.

Cancellation is:

    AbortSignal or client disconnect
      -> stop local polling
      -> best-effort Buda Session cancellation
      -> close the local wait
      -> persist cancelled or remote_cancel_unknown

Local cancellation is immediate even if the remote cancel tool fails.

Stable error codes include:

- MCP_BINDING_INVALID
- MCP_AUTH_FAILED
- MCP_CONNECT_TIMEOUT
- MCP_CAPABILITY_MISSING
- MCP_TOOL_ERROR
- MCP_DRIVE_SYNC_FAILED
- MCP_INPUT_TOO_LARGE
- MCP_AGENT_BUSY
- MCP_SESSION_FAILED
- MCP_INPUT_REQUIRED
- MCP_GENERATION_TIMEOUT
- MCP_CANCELLED
- MCP_EMPTY_PROSE

There is no silent model fallback. A failed single chapter remains failed and does not update prose, Story State, Memory Palace, or Drive. The UI offers an explicit retry using the same MCP source and an explicit temporary model-generation action. Batch production follows its existing stop or failure-recording policy and never mixes sources without a visible user choice.

## UI and diagnostics

The settings area gains an MCP Services page with:

1. MCP Servers: templates, custom Streamable HTTP URLs, adapter selection, activation, timeouts, connection state, and recent error.
2. MCP Keys: account label, masked key, activation, authentication test, latency, Agent count, and bound projects.
3. Diagnostics: handshake status, Server information, protocol version, capabilities, tool names and schemas, adapter readiness, Agent list, latency, and the most recent redacted error.

Generic diagnostics are read-only. Drive writes, Agent creation, and other remote mutations require a named action and explicit click.

The project settings page adds a prose-generation-source selector. When MCP is selected, the user selects Server, account Key, and Agent. The adapter follows from the Server but remains visible in the binding summary. Actions are:

- test binding;
- refresh Agents;
- select an existing Agent; and
- explicitly create a MangaForge Agent.

Saving is blocked when the binding is incomplete, invalid, or already bound to another project.

The existing SSE channel adds source stages:

- connecting to MCP;
- checking tool capabilities;
- synchronizing Agent Drive;
- creating chapter Session;
- waiting for Buda Agent;
- extracting candidate prose; and
- entering MangaForge quality checks.

Buda MCP does not provide token-level prose streaming. While waiting, the UI shows stage, elapsed time, heartbeat, and cancellation. After completion, the existing server may replay the finished text in chunks so the current reading experience remains consistent.

Logs and diagnostics do not include unmasked keys or additional full copies of prompts and prose.

## HTTP API shape

The exact route modules follow the existing Express conventions. The feature exposes:

- CRUD for /api/mcp/servers;
- CRUD for /api/mcp/keys;
- POST /api/mcp/keys/:id/test;
- GET /api/mcp/keys/:id/agents;
- POST /api/mcp/keys/:id/agents for explicit creation;
- GET /api/mcp/servers/:id/diagnostics with a selected key ID;
- project configuration updates through the existing project-config route; and
- existing prose-generation routes, which resolve GenerationSource from the project binding.

Key create and update payloads accept the secret. Key read payloads return only masked_key and has_key, never key.

## Testing

### Generic MCP client unit tests

- initialize handshake and Connecting, Ready, Closed transitions;
- Streamable HTTP Bearer and no-auth setup;
- paginated tool discovery and allow-list enforcement;
- preservation of content, structuredContent, isError, and _meta;
- startup, tool, and generation timeouts;
- safe transient retries and non-retryable authentication failures;
- one-time expired-transport recovery;
- AbortSignal propagation and shutdown; and
- isolation between different Server and Key pairs.

### Buda adapter contract tests

- required-tool discovery and schema matching;
- Agent listing and explicit creation;
- remote Agent-limit failure;
- hash-based Drive synchronization and stale-snapshot rejection;
- Session creation and request-ID recovery behavior;
- pending, in_progress, waiting_for_input, completed, failed, and cancelled mappings;
- best-effort remote cancellation;
- structured and plain-text result extraction; and
- bounded, redacted receipts.

### MangaForge integration and regression tests

- absent source configuration defaults to model;
- current model prose behavior remains unchanged;
- incomplete or invalid MCP bindings fail before context leaves the application;
- ordinary model_id parameters cannot bypass an MCP project binding;
- concurrent calls for one bound Agent cannot race Drive snapshots or chapter order;
- over-limit prompts fail without silent truncation;
- MCP candidates pass through the existing chapter, truncation, word-count, continuity, quality, and storage guards;
- rejected candidates do not update chapter text, Story State, Memory Palace, or Drive;
- successful candidates retain source, Agent, Session, and snapshot provenance;
- SSE progress and cancellation remain compatible with current routes;
- single and batch generation expose failures without automatic source switching; and
- Server and Key deletion guards honor project references.

### Local integration server and live smoke test

Automated integration tests use a deterministic local Streamable HTTP MCP server. They do not depend on Buda availability.

A real Buda smoke test is manual and opt-in. It requires an sk_ MCP API key, uses a dedicated test Agent, is excluded from CI, and covers handshake, Agent listing, Drive synchronization, Session generation, result retrieval, and cancellation. Web-login credentials are not used.

## Acceptance criteria

1. Users can configure any number of Buda accounts as independent MCP Keys.
2. A project can bind one active Buda account and one unique Agent.
3. The project can select an existing Agent or explicitly create a dedicated Agent.
4. Chapter prose can be generated through Buda and then pass through the unchanged MangaForge quality and memory pipeline.
5. Every Buda request carries the current complete MangaForge chapter task.
6. Buda memory and Drive cannot override newer local canon.
7. A failed or cancelled generation leaves no accepted prose or memory update.
8. Unsafe retries do not create duplicate Sessions or messages.
9. There is no silent model fallback.
10. Existing model-based projects continue working without migration or behavior change.
11. Stored and displayed diagnostics identify the source and remote Session without leaking the MCP key.

## Non-goals

- Encrypting MCP keys or integrating an operating-system keychain.
- OAuth authentication.
- Production stdio transport.
- Arbitrary MCP tool orchestration or a user-defined tool-mapping UI.
- Token-level streaming from Buda over MCP.
- Automatic model fallback.
- Multiple Agents for one project or one Agent shared by multiple projects.
- Replacing MangaForge Story State or Memory Palace with Buda memory.
- Moving non-draft stages to MCP.
- Automatically deleting or rewriting remote Agents.

## Reference architecture sources

- Buda MCP reference: https://buda.im/zh-CN/docs/developers/mcp
- Buda API Claw documentation: https://buda.im/zh-CN/docs/developers/api-claws
- Buda OpenAPI contract: https://buda.im/api/v1/openapi.json
- OpenAI Codex MCP configuration types: https://github.com/openai/codex/blob/main/codex-rs/config/src/mcp_types.rs
- OpenAI Codex MCP client: https://github.com/openai/codex/blob/main/codex-rs/rmcp-client/src/rmcp_client.rs
- OpenAI Codex MCP tool-call handling: https://github.com/openai/codex/blob/main/codex-rs/core/src/mcp_tool_call.rs
- Model Context Protocol TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- MCP Inspector: https://github.com/modelcontextprotocol/inspector
