import Link from "next/link"
import { Plus, Search, Grid3X3, List, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { agents as mockAgents, type AgentStatus } from "@/lib/data/agents"
import { fetchAgents } from "@/lib/api/client"

function StatusBadge({ status }: { status: AgentStatus }) {
  const config = {
    online: { label: "Online", className: "bg-success/10 text-success border-success/30" },
    offline: { label: "Offline", className: "bg-muted text-muted-foreground border-border" },
    deploying: { label: "Deploying", className: "bg-warning/10 text-warning border-warning/30" },
    error: { label: "Error", className: "bg-destructive/10 text-destructive border-destructive/30" }
  }
  
  const { label, className } = config[status]
  
  return (
    <Badge variant="outline" className={className}>
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

function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}d ago`
  } else if (hours > 0) {
    return `${hours}h ago`
  }
  return "Just now"
}

export default async function AgentsPage() {
  const liveAgents = await fetchAgents()
  const agents = liveAgents && liveAgents.length > 0 ? liveAgents : mockAgents
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Fleet</h1>
          <p className="text-muted-foreground">{agents.length} agents tracked</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Deploy New
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search agents..." 
            className="pl-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id} className="bg-card/30 border-border/40 hover:border-primary/40 transition-all group">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Link 
                    href={`/dashboard/agents/${agent.id}`}
                    className="hover:underline"
                  >
                    <CardTitle className="text-base font-medium">{agent.name}</CardTitle>
                  </Link>
                  <CardDescription className="line-clamp-2 text-xs">
                    {agent.description}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/agents/${agent.id}`}>View Details</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>Deploy</DropdownMenuItem>
                    <DropdownMenuItem>View Logs</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <StatusBadge status={agent.status} />
                <Badge variant="outline" className="font-mono text-xs">
                  {agent.version}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="rounded-sm bg-muted/20 p-2 border border-border/30">
                  <div className="text-sm font-semibold text-success">{agent.successRate}%</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">hit</div>
                </div>
                <div className="rounded-sm bg-muted/20 p-2 border border-border/30">
                  <div className="text-sm font-semibold">{formatNumber(agent.totalRequests)}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">reqs</div>
                </div>
                <div className="rounded-sm bg-muted/20 p-2 border border-border/30">
                  <div className="text-sm font-semibold">{agent.avgLatency}ms</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">p50</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                <span>Last deployed {formatTimeAgo(agent.lastDeployment)}</span>
                <span>{agent.owner}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
