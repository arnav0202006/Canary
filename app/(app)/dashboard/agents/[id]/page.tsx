import Link from "next/link"
import { notFound } from "next/navigation"
import { 
  ArrowLeft, 
  ExternalLink, 
  GitBranch,
  Rocket,
  MoreHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  getAgentById, 
  getVersionsByAgentId, 
  getLogsByAgentId,
  getTracesByAgentId,
  getErrorsByAgentId,
  type AgentStatus 
} from "@/lib/data/agents"
import { AgentVersions } from "@/components/agents/agent-versions"
import { AgentLogs } from "@/components/agents/agent-logs"
import { AgentTraces } from "@/components/agents/agent-traces"
import { AgentErrors } from "@/components/agents/agent-errors"
import { AgentMetrics } from "@/components/agents/agent-metrics"

function StatusBadge({ status }: { status: AgentStatus }) {
  const config = {
    online: { label: "Online", className: "bg-success/10 text-success border-success/30" },
    offline: { label: "Offline", className: "bg-muted text-muted-foreground border-border" },
    deploying: { label: "Deploying", className: "bg-warning/10 text-warning border-warning/30" },
    error: { label: "Error", className: "bg-destructive/10 text-destructive border-destructive/30" }
  }
  
  const { label, className } = config[status]
  
  return (
    <Badge variant="outline" className={`${className} text-xs`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === "online" ? "bg-success" :
        status === "deploying" ? "bg-warning animate-pulse" :
        status === "error" ? "bg-destructive" :
        "bg-muted-foreground"
      }`} />
      {label}
    </Badge>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

export default async function AgentDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const agent = getAgentById(id)
  
  if (!agent) {
    notFound()
  }

  const versions = getVersionsByAgentId(id)
  const logs = getLogsByAgentId(id)
  const traces = getTracesByAgentId(id)
  const errors = getErrorsByAgentId(id)

  const stats = [
    { label: "Total Requests", value: formatNumber(agent.totalRequests) },
    { label: "Success Rate", value: `${agent.successRate}%` },
    { label: "Avg Latency", value: `${agent.avgLatency}ms` },
    { label: "Errors (24h)", value: agent.errorCount.toString() }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href="/dashboard/agents">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
            <StatusBadge status={agent.status} />
          </div>
          <p className="text-muted-foreground ml-11">{agent.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <GitBranch className="h-4 w-4" />
            {agent.version}
          </Button>
          <Button className="gap-2">
            <Rocket className="h-4 w-4" />
            Deploy
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View Repository
              </DropdownMenuItem>
              <DropdownMenuItem>Edit Configuration</DropdownMenuItem>
              <DropdownMenuItem>Rollback</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Delete Agent</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card/50 border-border/50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="versions" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="traces">Traces</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="versions" className="space-y-4">
          <AgentVersions versions={versions} />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <AgentLogs logs={logs} />
        </TabsContent>

        <TabsContent value="traces" className="space-y-4">
          <AgentTraces traces={traces} />
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <AgentErrors errors={errors} />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <AgentMetrics agentId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
