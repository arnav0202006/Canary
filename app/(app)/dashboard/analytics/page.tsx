import { TrendingUp, TrendingDown, Activity, Clock, AlertTriangle, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  dashboardStats, 
  agentUsageStats, 
  deploymentsOverTime,
  requestsOverTime,
  errorsOverTime,
  latencyDistribution 
} from "@/lib/data/metrics"
import { AnalyticsCharts } from "@/components/analytics/analytics-charts"

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

const statCards = [
  {
    title: "Total Requests",
    value: formatNumber(dashboardStats.totalRequests),
    icon: Activity,
    trend: { value: 12.5, direction: "up" as const },
    description: "vs. last period"
  },
  {
    title: "Avg Latency",
    value: `${dashboardStats.avgLatency}ms`,
    icon: Clock,
    trend: { value: 3.2, direction: "down" as const },
    description: "vs. last period"
  },
  {
    title: "Success Rate",
    value: `${dashboardStats.successRate}%`,
    icon: Zap,
    trend: { value: 0.5, direction: "up" as const },
    description: "vs. last period"
  },
  {
    title: "Error Rate",
    value: `${((dashboardStats.errorsLast24h / dashboardStats.totalRequests) * 100).toFixed(3)}%`,
    icon: AlertTriangle,
    trend: { value: 0.8, direction: "down" as const },
    description: "vs. last period"
  }
]

const timeRanges = ["24h", "7d", "30d", "90d"]

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">The Numbers</h1>
          <p className="text-muted-foreground">How your fleet is performing</p>
        </div>
        <div className="flex items-center gap-2">
          {timeRanges.map((range) => (
            <Button
              key={range}
              variant={range === "7d" ? "default" : "outline"}
              size="sm"
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-card/30 border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">{stat.value}</div>
                <span className={`flex items-center text-xs ${
                  stat.trend.direction === "up" 
                    ? stat.title.includes("Error") ? "text-destructive" : "text-success"
                    : stat.title.includes("Error") || stat.title.includes("Latency") ? "text-success" : "text-destructive"
                }`}>
                  {stat.trend.direction === "up" ? (
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  )}
                  {stat.trend.value}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <AnalyticsCharts 
        requestsData={requestsOverTime}
        errorsData={errorsOverTime}
        agentUsageData={agentUsageStats}
        latencyData={latencyDistribution}
        deploymentsData={deploymentsOverTime}
      />

      {/* Top Agents Table */}
      <Card className="bg-card/30 border-border/40">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Leaderboard</CardTitle>
          <CardDescription className="font-mono text-xs">top agents by traffic</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agentUsageStats.map((agent, index) => {
              const maxRequests = agentUsageStats[0].requests
              const percentage = (agent.requests / maxRequests) * 100
              
              return (
                <div key={agent.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-4">{index + 1}</span>
                      <span className="text-sm font-medium">{agent.name}</span>
                    </div>
                    <span className="text-sm font-mono">{formatNumber(agent.requests)}</span>
                  </div>
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: agent.color
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
