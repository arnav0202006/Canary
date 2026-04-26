export type AgentStatus = "online" | "offline" | "deploying" | "error"

export interface Agent {
  id: string
  name: string
  description: string
  status: AgentStatus
  version: string
  lastDeployment: string
  successRate: number
  totalRequests: number
  avgLatency: number
  errorCount: number
  createdAt: string
  updatedAt: string
  tags: string[]
  owner: string
  repository?: string
  lastKnownGoodId?: string | null
  currentVersionId?: string | null
}

export interface AgentVersion {
  id: string
  agentId: string
  parentVersionId?: string | null
  version: string
  hash: string
  message: string
  status: string
  evalScore: number | null
  author: string
  authorAvatar: string
  createdAt: string
  changes: {
    additions: number
    deletions: number
  }
  toolsConfig?: Record<string, unknown>
  metadata?: Record<string, unknown>
  state?: Record<string, unknown>
  context?: Record<string, unknown>
}

export interface AgentLog {
  id: string
  agentId: string
  timestamp: string
  level: "info" | "warn" | "error" | "debug"
  message: string
  metadata?: Record<string, unknown>
}

export interface AgentTrace {
  id: string
  agentId: string
  traceId: string
  startTime: string
  endTime: string
  duration: number
  status: "success" | "error" | "timeout"
  steps: TraceStep[]
}

export interface TraceStep {
  id: string
  name: string
  startTime: string
  endTime: string
  duration: number
  status: "success" | "error" | "pending"
  input?: string
  output?: string
  error?: string
}

export interface AgentError {
  id: string
  agentId: string
  type: string
  message: string
  stackTrace: string
  count: number
  firstSeen: string
  lastSeen: string
  status: "open" | "resolved" | "ignored"
}

export const agents: Agent[] = [
  {
    id: "agt_1",
    name: "customer-support-agent",
    description: "Handles customer inquiries and support tickets via natural language processing",
    status: "online",
    version: "v2.4.1",
    lastDeployment: "2026-04-24T10:30:00Z",
    successRate: 98.7,
    totalRequests: 145892,
    avgLatency: 234,
    errorCount: 12,
    createdAt: "2025-08-15T09:00:00Z",
    updatedAt: "2026-04-24T10:30:00Z",
    tags: ["production", "customer-facing", "nlp"],
    owner: "Sarah Chen",
    repository: "canary-labs/customer-support-agent"
  },
  {
    id: "agt_2",
    name: "data-pipeline-orchestrator",
    description: "Orchestrates data transformation and ETL workflows across multiple sources",
    status: "online",
    version: "v1.8.0",
    lastDeployment: "2026-04-23T16:45:00Z",
    successRate: 99.9,
    totalRequests: 892341,
    avgLatency: 1250,
    errorCount: 3,
    createdAt: "2025-06-20T14:00:00Z",
    updatedAt: "2026-04-23T16:45:00Z",
    tags: ["production", "data", "etl"],
    owner: "Marcus Johnson",
    repository: "canary-labs/data-pipeline"
  },
  {
    id: "agt_3",
    name: "code-review-assistant",
    description: "AI-powered code review agent that provides suggestions and catches bugs",
    status: "deploying",
    version: "v3.0.0-beta",
    lastDeployment: "2026-04-24T14:20:00Z",
    successRate: 97.2,
    totalRequests: 45678,
    avgLatency: 890,
    errorCount: 45,
    createdAt: "2025-11-01T11:00:00Z",
    updatedAt: "2026-04-24T14:20:00Z",
    tags: ["beta", "developer-tools", "code-analysis"],
    owner: "Alex Rivera",
    repository: "canary-labs/code-review-agent"
  },
  {
    id: "agt_4",
    name: "security-scanner",
    description: "Continuous security monitoring and vulnerability assessment agent",
    status: "online",
    version: "v1.2.3",
    lastDeployment: "2026-04-22T08:00:00Z",
    successRate: 99.5,
    totalRequests: 234567,
    avgLatency: 456,
    errorCount: 8,
    createdAt: "2025-09-10T10:00:00Z",
    updatedAt: "2026-04-22T08:00:00Z",
    tags: ["production", "security", "monitoring"],
    owner: "Jordan Lee",
    repository: "canary-labs/security-scanner"
  },
  {
    id: "agt_5",
    name: "content-moderator",
    description: "Analyzes user-generated content for policy violations and harmful content",
    status: "error",
    version: "v2.1.0",
    lastDeployment: "2026-04-21T12:00:00Z",
    successRate: 94.3,
    totalRequests: 567890,
    avgLatency: 178,
    errorCount: 156,
    createdAt: "2025-07-25T08:00:00Z",
    updatedAt: "2026-04-21T12:00:00Z",
    tags: ["production", "content", "moderation"],
    owner: "Taylor Kim",
    repository: "canary-labs/content-moderator"
  },
  {
    id: "agt_6",
    name: "recommendation-engine",
    description: "Personalized product and content recommendation system",
    status: "offline",
    version: "v4.0.2",
    lastDeployment: "2026-04-20T18:30:00Z",
    successRate: 96.8,
    totalRequests: 1234567,
    avgLatency: 89,
    errorCount: 234,
    createdAt: "2025-03-01T09:00:00Z",
    updatedAt: "2026-04-20T18:30:00Z",
    tags: ["staging", "ml", "personalization"],
    owner: "Chris Park",
    repository: "canary-labs/recommendation-engine"
  }
]

export const agentVersions: AgentVersion[] = [
  {
    id: "ver_1",
    agentId: "agt_1",
    version: "v2.4.1",
    hash: "a3f8c2d",
    message: "Fix response latency in high-traffic scenarios",
    author: "Sarah Chen",
    authorAvatar: "SC",
    createdAt: "2026-04-24T10:30:00Z",
    changes: { additions: 45, deletions: 12 }
  },
  {
    id: "ver_2",
    agentId: "agt_1",
    version: "v2.4.0",
    hash: "b7e1d9f",
    message: "Add support for multi-language responses",
    author: "Marcus Johnson",
    authorAvatar: "MJ",
    createdAt: "2026-04-20T14:00:00Z",
    changes: { additions: 234, deletions: 56 }
  },
  {
    id: "ver_3",
    agentId: "agt_1",
    version: "v2.3.2",
    hash: "c4a2e8b",
    message: "Improve context retention for longer conversations",
    author: "Sarah Chen",
    authorAvatar: "SC",
    createdAt: "2026-04-15T09:30:00Z",
    changes: { additions: 189, deletions: 78 }
  },
  {
    id: "ver_4",
    agentId: "agt_1",
    version: "v2.3.1",
    hash: "d9c5f3a",
    message: "Bug fix: Handle edge case in sentiment analysis",
    author: "Alex Rivera",
    authorAvatar: "AR",
    createdAt: "2026-04-10T16:45:00Z",
    changes: { additions: 23, deletions: 8 }
  },
  {
    id: "ver_5",
    agentId: "agt_1",
    version: "v2.3.0",
    hash: "e2b7a1c",
    message: "Major: Implement streaming responses for real-time feedback",
    author: "Sarah Chen",
    authorAvatar: "SC",
    createdAt: "2026-04-05T11:00:00Z",
    changes: { additions: 567, deletions: 234 }
  }
]

export const agentLogs: AgentLog[] = [
  {
    id: "log_1",
    agentId: "agt_1",
    timestamp: "2026-04-24T14:32:15.234Z",
    level: "info",
    message: "Request processed successfully",
    metadata: { requestId: "req_abc123", duration: 234 }
  },
  {
    id: "log_2",
    agentId: "agt_1",
    timestamp: "2026-04-24T14:32:10.567Z",
    level: "debug",
    message: "Parsing user intent from input",
    metadata: { intent: "product_inquiry", confidence: 0.94 }
  },
  {
    id: "log_3",
    agentId: "agt_1",
    timestamp: "2026-04-24T14:32:08.123Z",
    level: "info",
    message: "New request received from user",
    metadata: { userId: "usr_xyz789", channel: "web" }
  },
  {
    id: "log_4",
    agentId: "agt_1",
    timestamp: "2026-04-24T14:31:45.890Z",
    level: "warn",
    message: "Response latency exceeded threshold",
    metadata: { threshold: 200, actual: 345 }
  },
  {
    id: "log_5",
    agentId: "agt_1",
    timestamp: "2026-04-24T14:31:20.456Z",
    level: "error",
    message: "Failed to connect to knowledge base",
    metadata: { error: "ETIMEDOUT", retries: 3 }
  }
]

export const agentTraces: AgentTrace[] = [
  {
    id: "trace_1",
    agentId: "agt_1",
    traceId: "tr_9f8e7d6c",
    startTime: "2026-04-24T14:32:08.123Z",
    endTime: "2026-04-24T14:32:15.234Z",
    duration: 7111,
    status: "success",
    steps: [
      {
        id: "step_1",
        name: "Parse Input",
        startTime: "2026-04-24T14:32:08.123Z",
        endTime: "2026-04-24T14:32:08.456Z",
        duration: 333,
        status: "success",
        input: "What's the status of my order?",
        output: "{ intent: 'order_status', confidence: 0.96 }"
      },
      {
        id: "step_2",
        name: "Retrieve Context",
        startTime: "2026-04-24T14:32:08.456Z",
        endTime: "2026-04-24T14:32:10.123Z",
        duration: 1667,
        status: "success",
        input: "user_id: usr_xyz789",
        output: "{ orders: [...], history: [...] }"
      },
      {
        id: "step_3",
        name: "Generate Response",
        startTime: "2026-04-24T14:32:10.123Z",
        endTime: "2026-04-24T14:32:14.890Z",
        duration: 4767,
        status: "success",
        input: "{ intent, context }",
        output: "Your order #12345 is currently in transit..."
      },
      {
        id: "step_4",
        name: "Format Output",
        startTime: "2026-04-24T14:32:14.890Z",
        endTime: "2026-04-24T14:32:15.234Z",
        duration: 344,
        status: "success",
        input: "raw_response",
        output: "formatted_response"
      }
    ]
  }
]

export const agentErrors: AgentError[] = [
  {
    id: "err_1",
    agentId: "agt_5",
    type: "RateLimitExceeded",
    message: "API rate limit exceeded for external moderation service",
    stackTrace: `RateLimitError: API rate limit exceeded
    at ModerationService.check (/src/services/moderation.ts:45:11)
    at ContentAnalyzer.analyze (/src/analyzers/content.ts:78:23)
    at Agent.process (/src/agent.ts:123:15)`,
    count: 89,
    firstSeen: "2026-04-21T08:00:00Z",
    lastSeen: "2026-04-24T14:30:00Z",
    status: "open"
  },
  {
    id: "err_2",
    agentId: "agt_5",
    type: "TimeoutError",
    message: "Request timed out while waiting for ML model inference",
    stackTrace: `TimeoutError: Request timeout after 30000ms
    at MLInference.predict (/src/ml/inference.ts:89:9)
    at ContentClassifier.classify (/src/classifiers/content.ts:56:18)
    at Agent.process (/src/agent.ts:125:12)`,
    count: 45,
    firstSeen: "2026-04-22T12:00:00Z",
    lastSeen: "2026-04-24T13:45:00Z",
    status: "open"
  },
  {
    id: "err_3",
    agentId: "agt_5",
    type: "ValidationError",
    message: "Invalid content format received from upstream service",
    stackTrace: `ValidationError: Expected string, received object
    at ContentValidator.validate (/src/validators/content.ts:34:11)
    at InputHandler.process (/src/handlers/input.ts:67:20)
    at Agent.process (/src/agent.ts:112:8)`,
    count: 22,
    firstSeen: "2026-04-23T16:00:00Z",
    lastSeen: "2026-04-24T09:15:00Z",
    status: "resolved"
  }
]

export function getAgentById(id: string): Agent | undefined {
  return agents.find(agent => agent.id === id)
}

export function getVersionsByAgentId(agentId: string): AgentVersion[] {
  return agentVersions.filter(v => v.agentId === agentId)
}

export function getLogsByAgentId(agentId: string): AgentLog[] {
  return agentLogs.filter(l => l.agentId === agentId)
}

export function getTracesByAgentId(agentId: string): AgentTrace[] {
  return agentTraces.filter(t => t.agentId === agentId)
}

export function getErrorsByAgentId(agentId: string): AgentError[] {
  return agentErrors.filter(e => e.agentId === agentId)
}
