import Link from "next/link"
import { 
  Bot, 
  Rocket, 
  CheckCircle2, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { agents, type AgentStatus } from "@/lib/data/agents"
import { dashboardStats, recentActivity, deploymentsOverTime } from "@/lib/data/metrics"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"

const statCards = [
  {
    title: "Total Agents",
    value: dashboardStats.totalAgents,
    icon: Bot,
    trend: { value: 2, direction: "up" as const },
    description: "Active agents"
  },
  {
    title: "Active Deployments",
    value: dashboardStats.activeDeployments,
    icon: Rocket,
    trend: null,
    description: "Currently running"
  },
  {
    title: "Success Rate",
    value: `${dashboardStats.successRate}%`,
    icon: CheckCircle2,
    trend: { value: 1.2, direction: "up" as const },
    description: "Last 24 hours"
  },
  {
    title: "Errors (24h)",
    value: dashboardStats.errorsLast24h,
    icon: AlertTriangle,
    trend: { value: 12, direction: "down" as const },
    description: "From yesterday"
  }
]

function StatusDot({ status }: { status: AgentStatus }) {
  const colors = {
    online: "bg-success",
    offline: "bg-muted-foreground",
    deploying: "bg-warning animate-pulse",
    error: "bg-destructive"
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />
}

function getActivityIcon(type: string, status?: string) {
  const baseClass = "h-4 w-4"
  switch (type) {
    case "deployment":
      return <Rocket className={`${baseClass} ${status === "success" ? "text-success" : status === "error" ? "text-destructive" : "text-info"}`} />
    case "error":
      return <AlertTriangle className={`${baseClass} text-destructive`} />
    case "alert":
      return <AlertTriangle className={`${baseClass} text-warning`} />
    default:
      return <Activity className={`${baseClass} text-muted-foreground`} />
  }
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))
  
  if (hours > 24) {
    return `${Math.floor(hours / 24)}d ago`
  } else if (hours > 0) {
    return `${hours}h ago`
  } else if (minutes > 0) {
    return `${minutes}m ago`
  }
  return "Just now"
}

export default function DashboardPage() {
  const topAgents = agents.slice(0, 4)
  const activities = recentActivity.slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-muted-foreground">Everything&apos;s running. Mostly.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/agents">All Agents</Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-card/30 border-border/40 hover:border-primary/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.trend && (
                  <span className={`flex items-center text-xs ${
                    stat.trend.direction === "up" 
                      ? stat.title.includes("Error") ? "text-destructive" : "text-success"
                      : stat.title.includes("Error") ? "text-success" : "text-destructive"
                  }`}>
                    {stat.trend.direction === "up" ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {stat.trend.value}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Deployments Chart */}
        <Card className="bg-card/30 border-border/40">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Deployments</CardTitle>
            <CardDescription className="font-mono text-xs">past 7d</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardCharts data={deploymentsOverTime} />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-card/30 border-border/40">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Activity Feed</CardTitle>
            <CardDescription className="font-mono text-xs">live updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getActivityIcon(activity.type, activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents Quick View */}
      <Card className="bg-card/30 border-border/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Your Fleet</CardTitle>
            <CardDescription className="font-mono text-xs">top agents</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/agents">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {topAgents.map((agent) => (
              <Link 
                key={agent.id} 
                href={`/dashboard/agents/${agent.id}`}
                className="block"
              >
                <div className="p-4 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <StatusDot status={agent.status} />
                    <Badge variant="outline" className="text-xs font-mono">
                      {agent.version}
                    </Badge>
                  </div>
                  <h3 className="font-medium text-sm truncate mb-1">{agent.name}</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{agent.successRate}% success</span>
                    <span>{agent.avgLatency}ms</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
