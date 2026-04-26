import { type Agent, type AgentVersion, type AgentStatus } from "@/lib/data/agents"
import { type Deployment, type DeploymentStatus } from "@/lib/data/deployments"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

// ── Raw backend shapes ────────────────────────────────────────────────────────

interface BackendAgent {
  id: string
  name: string
  description: string
  current_version_id: string | null
  last_known_good_id: string | null
  created_at: string
}

interface BackendVersion {
  id: string
  agent_id: string
  version_number: number
  prompt: string
  eval_score: number | null
  status: string
  created_at: string
  created_by: string
}

interface BackendDeployment {
  id: string
  version_id: string
  status: string
  traffic_percentage: number
  eval_threshold: number
  started_at: string
  completed_at: string | null
}

interface BackendAuditLog {
  id: string
  agent_id: string
  version_id: string | null
  action: string
  actor: string
  details: string
  created_at: string
}

// ── Status mappers ────────────────────────────────────────────────────────────

function toAgentStatus(currentVersionId: string | null, versions: BackendVersion[]): AgentStatus {
  const current = versions.find(v => v.id === currentVersionId)
  if (current?.status === "production") return "online"
  if (current?.status === "canary") return "deploying"
  if (current?.status === "rolled_back") return "error"
  if (versions.some(v => v.status === "canary")) return "deploying"
  return "offline"
}

function toDeploymentStatus(status: string): DeploymentStatus {
  switch (status) {
    case "production": return "success"
    case "failed":
    case "rolled_back": return "failed"
    case "canary":
    case "pending": return "in-progress"
    default: return "queued"
  }
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapAgent(a: BackendAgent, versions: BackendVersion[]): Agent {
  const current = versions.find(v => v.id === a.current_version_id)
  const latest = versions.at(-1)

  return {
    id: a.id,
    name: a.name,
    description: a.description || "No description provided.",
    status: toAgentStatus(a.current_version_id, versions),
    version: current ? `v${current.version_number}` : latest ? `v${latest.version_number}` : "undeployed",
    lastDeployment: a.created_at,
    successRate: current?.eval_score != null ? Math.round(current.eval_score * 100) : 0,
    totalRequests: 0,
    avgLatency: 0,
    errorCount: 0,
    createdAt: a.created_at,
    updatedAt: a.created_at,
    tags: [],
    owner: latest?.created_by || "system",
  }
}

function mapVersion(v: BackendVersion): AgentVersion {
  return {
    id: v.id,
    agentId: v.agent_id,
    version: `v${v.version_number}`,
    hash: v.id.slice(0, 7),
    message: `Prompt v${v.version_number} — status: ${v.status}${v.eval_score != null ? `, eval: ${Math.round(v.eval_score * 100)}%` : ""}`,
    author: v.created_by,
    authorAvatar: v.created_by.slice(0, 2).toUpperCase(),
    createdAt: v.created_at,
    changes: { additions: 0, deletions: 0 },
  }
}

function mapDeployment(d: BackendDeployment, agentId: string, agentName: string, versions: BackendVersion[]): Deployment {
  const version = versions.find(v => v.id === d.version_id)
  return {
    id: d.id,
    agentId,
    agentName,
    version: version ? `v${version.version_number}` : "unknown",
    status: toDeploymentStatus(d.status),
    trigger: "manual",
    triggeredBy: version?.created_by || "system",
    startTime: d.started_at,
    endTime: d.completed_at || undefined,
    duration: d.completed_at
      ? new Date(d.completed_at).getTime() - new Date(d.started_at).getTime()
      : undefined,
    commit: {
      hash: d.version_id.slice(0, 7),
      message: `Deploy ${version ? `v${version.version_number}` : d.version_id} — threshold: ${Math.round(d.eval_threshold * 100)}%`,
      author: version?.created_by || "system",
    },
    steps: [
      { id: "gate1", name: "Behavioral Eval (Gate 1)", status: d.status === "queued" ? "pending" : "success" },
      { id: "canary", name: "Canary Deploy", status: d.status === "canary" ? "in-progress" : d.status === "production" ? "success" : d.status === "failed" || d.status === "rolled_back" ? "failed" : "pending" },
      { id: "promote", name: "Promote to Production", status: d.status === "production" ? "success" : d.status === "rolled_back" ? "failed" : "pending" },
    ],
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, { next: { revalidate: 10 } })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

export async function fetchAgents(): Promise<Agent[] | null> {
  const raw = await get<BackendAgent[]>("/agents")
  if (!raw) return null

  const agents = await Promise.all(
    raw.map(async (a) => {
      const versions = await get<BackendVersion[]>(`/agents/${a.id}/versions`) ?? []
      return mapAgent(a, versions)
    })
  )
  return agents
}

export async function fetchAgentById(agentId: string): Promise<Agent | null> {
  const [raw, versions] = await Promise.all([
    get<BackendAgent>(`/agents/${agentId}`),
    get<BackendVersion[]>(`/agents/${agentId}/versions`),
  ])
  if (!raw) return null
  return mapAgent(raw, versions ?? [])
}

export async function fetchVersionsByAgent(agentId: string): Promise<AgentVersion[] | null> {
  const raw = await get<BackendVersion[]>(`/agents/${agentId}/versions`)
  if (!raw) return null
  return raw.map(mapVersion)
}

export async function fetchDeployments(): Promise<Deployment[] | null> {
  const agents = await get<BackendAgent[]>("/agents")
  if (!agents) return null

  const all: Deployment[] = []
  for (const agent of agents) {
    const versions = await get<BackendVersion[]>(`/agents/${agent.id}/versions`) ?? []
    const deps = await get<BackendDeployment[]>(`/agents/${agent.id}/deployments`) ?? []
    for (const d of deps) {
      all.push(mapDeployment(d, agent.id, agent.name, versions))
    }
  }
  return all.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
}

export async function fetchAuditLog(agentId: string): Promise<BackendAuditLog[] | null> {
  return get<BackendAuditLog[]>(`/agents/${agentId}/audit`)
}
