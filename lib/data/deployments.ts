export type DeploymentStatus = "success" | "failed" | "in-progress" | "cancelled" | "queued"
export type DeploymentTrigger = "manual" | "auto" | "webhook" | "rollback"

export interface Deployment {
  id: string
  agentId: string
  agentName: string
  version: string
  status: DeploymentStatus
  trigger: DeploymentTrigger
  triggeredBy: string
  startTime: string
  endTime?: string
  duration?: number
  commit: {
    hash: string
    message: string
    author: string
  }
  steps: DeploymentStep[]
}

export interface DeploymentStep {
  id: string
  name: string
  status: "success" | "failed" | "in-progress" | "pending" | "skipped"
  score?: number
  startTime?: string
  endTime?: string
  duration?: number
  logs?: string[]
}

export const deployments: Deployment[] = [
  {
    id: "dep_1",
    agentId: "agt_3",
    agentName: "code-review-assistant",
    version: "v3.0.0-beta",
    status: "in-progress",
    trigger: "manual",
    triggeredBy: "Alex Rivera",
    startTime: "2026-04-24T14:20:00Z",
    commit: {
      hash: "f5d3e2a",
      message: "feat: Add support for TypeScript 5.4 features",
      author: "Alex Rivera"
    },
    steps: [
      {
        id: "step_1",
        name: "Build",
        status: "success",
        startTime: "2026-04-24T14:20:00Z",
        endTime: "2026-04-24T14:22:30Z",
        duration: 150000,
        logs: ["Installing dependencies...", "Building agent...", "Build complete"]
      },
      {
        id: "step_2",
        name: "Test",
        status: "success",
        startTime: "2026-04-24T14:22:30Z",
        endTime: "2026-04-24T14:25:00Z",
        duration: 150000,
        logs: ["Running unit tests...", "45 tests passed", "Running integration tests...", "12 tests passed"]
      },
      {
        id: "step_3",
        name: "Deploy",
        status: "in-progress",
        startTime: "2026-04-24T14:25:00Z",
        logs: ["Deploying to production...", "Rolling out to 25% of instances..."]
      },
      {
        id: "step_4",
        name: "Health Check",
        status: "pending"
      },
      {
        id: "step_5",
        name: "Finalize",
        status: "pending"
      }
    ]
  },
  {
    id: "dep_2",
    agentId: "agt_1",
    agentName: "customer-support-agent",
    version: "v2.4.1",
    status: "success",
    trigger: "auto",
    triggeredBy: "GitHub Actions",
    startTime: "2026-04-24T10:25:00Z",
    endTime: "2026-04-24T10:30:00Z",
    duration: 300000,
    commit: {
      hash: "a3f8c2d",
      message: "Fix response latency in high-traffic scenarios",
      author: "Sarah Chen"
    },
    steps: [
      {
        id: "step_1",
        name: "Build",
        status: "success",
        startTime: "2026-04-24T10:25:00Z",
        endTime: "2026-04-24T10:26:30Z",
        duration: 90000
      },
      {
        id: "step_2",
        name: "Test",
        status: "success",
        startTime: "2026-04-24T10:26:30Z",
        endTime: "2026-04-24T10:28:00Z",
        duration: 90000
      },
      {
        id: "step_3",
        name: "Deploy",
        status: "success",
        startTime: "2026-04-24T10:28:00Z",
        endTime: "2026-04-24T10:29:30Z",
        duration: 90000
      },
      {
        id: "step_4",
        name: "Health Check",
        status: "success",
        startTime: "2026-04-24T10:29:30Z",
        endTime: "2026-04-24T10:29:45Z",
        duration: 15000
      },
      {
        id: "step_5",
        name: "Finalize",
        status: "success",
        startTime: "2026-04-24T10:29:45Z",
        endTime: "2026-04-24T10:30:00Z",
        duration: 15000
      }
    ]
  },
  {
    id: "dep_3",
    agentId: "agt_2",
    agentName: "data-pipeline-orchestrator",
    version: "v1.8.0",
    status: "success",
    trigger: "webhook",
    triggeredBy: "Jenkins",
    startTime: "2026-04-23T16:40:00Z",
    endTime: "2026-04-23T16:45:00Z",
    duration: 300000,
    commit: {
      hash: "b7e1d9f",
      message: "Add parallel processing for large datasets",
      author: "Marcus Johnson"
    },
    steps: [
      { id: "step_1", name: "Build", status: "success", duration: 120000 },
      { id: "step_2", name: "Test", status: "success", duration: 90000 },
      { id: "step_3", name: "Deploy", status: "success", duration: 60000 },
      { id: "step_4", name: "Health Check", status: "success", duration: 15000 },
      { id: "step_5", name: "Finalize", status: "success", duration: 15000 }
    ]
  },
  {
    id: "dep_4",
    agentId: "agt_5",
    agentName: "content-moderator",
    version: "v2.1.1",
    status: "failed",
    trigger: "auto",
    triggeredBy: "GitHub Actions",
    startTime: "2026-04-24T08:00:00Z",
    endTime: "2026-04-24T08:05:00Z",
    duration: 300000,
    commit: {
      hash: "c4a2e8b",
      message: "Attempt to fix rate limit handling",
      author: "Taylor Kim"
    },
    steps: [
      { id: "step_1", name: "Build", status: "success", duration: 90000 },
      { id: "step_2", name: "Test", status: "failed", duration: 180000, logs: ["Test failed: Rate limit test case not handled correctly"] },
      { id: "step_3", name: "Deploy", status: "skipped" },
      { id: "step_4", name: "Health Check", status: "skipped" },
      { id: "step_5", name: "Finalize", status: "skipped" }
    ]
  },
  {
    id: "dep_5",
    agentId: "agt_4",
    agentName: "security-scanner",
    version: "v1.2.3",
    status: "success",
    trigger: "manual",
    triggeredBy: "Jordan Lee",
    startTime: "2026-04-22T07:55:00Z",
    endTime: "2026-04-22T08:00:00Z",
    duration: 300000,
    commit: {
      hash: "d9c5f3a",
      message: "Update vulnerability database signatures",
      author: "Jordan Lee"
    },
    steps: [
      { id: "step_1", name: "Build", status: "success", duration: 120000 },
      { id: "step_2", name: "Test", status: "success", duration: 90000 },
      { id: "step_3", name: "Deploy", status: "success", duration: 60000 },
      { id: "step_4", name: "Health Check", status: "success", duration: 15000 },
      { id: "step_5", name: "Finalize", status: "success", duration: 15000 }
    ]
  },
  {
    id: "dep_6",
    agentId: "agt_6",
    agentName: "recommendation-engine",
    version: "v4.0.2",
    status: "success",
    trigger: "rollback",
    triggeredBy: "Chris Park",
    startTime: "2026-04-20T18:25:00Z",
    endTime: "2026-04-20T18:30:00Z",
    duration: 300000,
    commit: {
      hash: "e2b7a1c",
      message: "Rollback to stable version due to memory leak",
      author: "Chris Park"
    },
    steps: [
      { id: "step_1", name: "Build", status: "success", duration: 60000 },
      { id: "step_2", name: "Test", status: "skipped" },
      { id: "step_3", name: "Deploy", status: "success", duration: 180000 },
      { id: "step_4", name: "Health Check", status: "success", duration: 30000 },
      { id: "step_5", name: "Finalize", status: "success", duration: 30000 }
    ]
  }
]

export function getDeploymentById(id: string): Deployment | undefined {
  return deployments.find(d => d.id === id)
}

export function getDeploymentsByAgentId(agentId: string): Deployment[] {
  return deployments.filter(d => d.agentId === agentId)
}

export function getActiveDeployments(): Deployment[] {
  return deployments.filter(d => d.status === "in-progress" || d.status === "queued")
}

export function getRecentDeployments(limit: number = 10): Deployment[] {
  return [...deployments]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, limit)
}
