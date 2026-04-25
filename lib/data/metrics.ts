export interface MetricDataPoint {
  timestamp: string
  value: number
}

export interface DashboardStats {
  totalAgents: number
  activeDeployments: number
  successRate: number
  errorsLast24h: number
  totalRequests: number
  avgLatency: number
}

export interface ActivityItem {
  id: string
  type: "deployment" | "error" | "alert" | "version" | "agent"
  title: string
  description: string
  timestamp: string
  agentId?: string
  agentName?: string
  status?: "success" | "error" | "warning" | "info"
}

export const dashboardStats: DashboardStats = {
  totalAgents: 6,
  activeDeployments: 1,
  successRate: 97.8,
  errorsLast24h: 156,
  totalRequests: 3120935,
  avgLatency: 512
}

export const recentActivity: ActivityItem[] = [
  {
    id: "act_1",
    type: "deployment",
    title: "Deployment started",
    description: "code-review-assistant v3.0.0-beta deployment in progress",
    timestamp: "2026-04-24T14:20:00Z",
    agentId: "agt_3",
    agentName: "code-review-assistant",
    status: "info"
  },
  {
    id: "act_2",
    type: "error",
    title: "Error spike detected",
    description: "content-moderator experiencing elevated error rate (5.7%)",
    timestamp: "2026-04-24T14:15:00Z",
    agentId: "agt_5",
    agentName: "content-moderator",
    status: "error"
  },
  {
    id: "act_3",
    type: "deployment",
    title: "Deployment completed",
    description: "customer-support-agent v2.4.1 deployed successfully",
    timestamp: "2026-04-24T10:30:00Z",
    agentId: "agt_1",
    agentName: "customer-support-agent",
    status: "success"
  },
  {
    id: "act_4",
    type: "version",
    title: "New version created",
    description: "customer-support-agent v2.4.1 pushed by Sarah Chen",
    timestamp: "2026-04-24T10:25:00Z",
    agentId: "agt_1",
    agentName: "customer-support-agent",
    status: "info"
  },
  {
    id: "act_5",
    type: "alert",
    title: "Latency threshold exceeded",
    description: "data-pipeline-orchestrator avg latency above 1000ms",
    timestamp: "2026-04-24T09:45:00Z",
    agentId: "agt_2",
    agentName: "data-pipeline-orchestrator",
    status: "warning"
  },
  {
    id: "act_6",
    type: "deployment",
    title: "Deployment failed",
    description: "content-moderator v2.1.1 deployment failed at test stage",
    timestamp: "2026-04-24T08:05:00Z",
    agentId: "agt_5",
    agentName: "content-moderator",
    status: "error"
  },
  {
    id: "act_7",
    type: "agent",
    title: "Agent went offline",
    description: "recommendation-engine marked as offline for maintenance",
    timestamp: "2026-04-23T22:00:00Z",
    agentId: "agt_6",
    agentName: "recommendation-engine",
    status: "warning"
  }
]

// Generate time series data for charts
function generateTimeSeriesData(
  hours: number,
  baseValue: number,
  variance: number
): MetricDataPoint[] {
  const data: MetricDataPoint[] = []
  const now = new Date()
  
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
    const randomVariance = (Math.random() - 0.5) * 2 * variance
    const value = Math.max(0, baseValue + randomVariance)
    
    data.push({
      timestamp: timestamp.toISOString(),
      value: Math.round(value * 100) / 100
    })
  }
  
  return data
}

export const requestsOverTime = generateTimeSeriesData(24, 5000, 2000)
export const errorsOverTime = generateTimeSeriesData(24, 15, 10)
export const latencyOverTime = generateTimeSeriesData(24, 500, 150)
export const successRateOverTime = generateTimeSeriesData(24, 98, 2)

export const agentUsageStats = [
  { name: "recommendation-engine", requests: 1234567, color: "var(--chart-1)" },
  { name: "data-pipeline", requests: 892341, color: "var(--chart-2)" },
  { name: "content-moderator", requests: 567890, color: "var(--chart-3)" },
  { name: "security-scanner", requests: 234567, color: "var(--chart-4)" },
  { name: "customer-support", requests: 145892, color: "var(--chart-5)" }
]

export const deploymentsOverTime = [
  { date: "Apr 18", success: 5, failed: 1 },
  { date: "Apr 19", success: 8, failed: 0 },
  { date: "Apr 20", success: 6, failed: 2 },
  { date: "Apr 21", success: 4, failed: 1 },
  { date: "Apr 22", success: 7, failed: 0 },
  { date: "Apr 23", success: 9, failed: 1 },
  { date: "Apr 24", success: 3, failed: 1 }
]

export const latencyDistribution = [
  { range: "0-100ms", count: 45000 },
  { range: "100-200ms", count: 32000 },
  { range: "200-500ms", count: 18000 },
  { range: "500ms-1s", count: 8000 },
  { range: "1s-2s", count: 3000 },
  { range: ">2s", count: 1000 }
]
