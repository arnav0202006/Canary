import Link from "next/link"
import { 
  Rocket, 
  GitBranch, 
  User, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Ban,
  RotateCcw,
  Webhook,
  PlayCircle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  deployments, 
  getActiveDeployments, 
  type DeploymentStatus, 
  type DeploymentTrigger 
} from "@/lib/data/deployments"
import { DeploymentPipeline } from "@/components/deployments/deployment-pipeline"

function StatusBadge({ status }: { status: DeploymentStatus }) {
  const config = {
    success: { label: "Success", className: "bg-success/10 text-success border-success/30", icon: CheckCircle2 },
    failed: { label: "Failed", className: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
    "in-progress": { label: "In Progress", className: "bg-info/10 text-info border-info/30", icon: Loader2 },
    cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border", icon: Ban },
    queued: { label: "Queued", className: "bg-warning/10 text-warning border-warning/30", icon: Clock }
  }
  
  const { label, className, icon: Icon } = config[status]
  
  return (
    <Badge variant="outline" className={className}>
      <Icon className={`h-3 w-3 mr-1 ${status === "in-progress" ? "animate-spin" : ""}`} />
      {label}
    </Badge>
  )
}

function TriggerIcon({ trigger }: { trigger: DeploymentTrigger }) {
  const icons = {
    manual: PlayCircle,
    auto: GitBranch,
    webhook: Webhook,
    rollback: RotateCcw
  }
  const Icon = icons[trigger]
  return <Icon className="h-3 w-3" />
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

export default function DeploymentsPage() {
  const activeDeployments = getActiveDeployments()
  const recentDeployments = deployments.slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipelines</h1>
          <p className="text-muted-foreground">Push code. Ship agents. Repeat.</p>
        </div>
        <Button className="gap-2">
          <Rocket className="h-4 w-4" />
          Trigger Deploy
        </Button>
      </div>

      {/* Active Deployments */}
      {activeDeployments.length > 0 && (
        <Card className="bg-card/30 border-border/40 border-l-2 border-l-info">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-info" />
              Live
            </CardTitle>
            <CardDescription className="font-mono text-xs">shipping right now</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeDeployments.map((deployment) => (
              <div key={deployment.id} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link 
                        href={`/dashboard/agents/${deployment.agentId}`}
                        className="font-medium hover:underline"
                      >
                        {deployment.agentName}
                      </Link>
                      <Badge variant="outline" className="font-mono text-xs">
                        {deployment.version}
                      </Badge>
                      <StatusBadge status={deployment.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        <code>{deployment.commit.hash}</code>
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {deployment.triggeredBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <TriggerIcon trigger={deployment.trigger} />
                        {deployment.trigger}
                      </span>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm">
                    Cancel
                  </Button>
                </div>
                
                <DeploymentPipeline steps={deployment.steps} />
                
                <p className="text-xs text-muted-foreground mt-3">
                  {deployment.commit.message}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Deployment History */}
      <Card className="bg-card/30 border-border/40">
        <CardHeader>
          <CardTitle className="text-base font-semibold">History</CardTitle>
          <CardDescription className="font-mono text-xs">recent ships</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentDeployments.map((deployment) => (
              <div 
                key={deployment.id} 
                className="flex items-center gap-4 rounded-lg border border-white/10 p-4 bg-slate-900/50 hover:bg-slate-800/80 transition-colors"
              >
                <div className={`w-1 h-12 rounded-full ${
                  deployment.status === "success" ? "bg-success" :
                  deployment.status === "failed" ? "bg-destructive" :
                  deployment.status === "in-progress" ? "bg-info" :
                  "bg-muted"
                }`} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link 
                      href={`/dashboard/agents/${deployment.agentId}`}
                      className="font-medium hover:underline truncate"
                    >
                      {deployment.agentName}
                    </Link>
                    <Badge variant="outline" className="font-mono text-xs shrink-0">
                      {deployment.version}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {deployment.commit.message}
                  </p>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TriggerIcon trigger={deployment.trigger} />
                    <span className="capitalize">{deployment.trigger}</span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground w-20 text-right">
                    {deployment.duration ? formatDuration(deployment.duration) : "-"}
                  </div>
                  
                  <div className="text-xs text-muted-foreground w-28 text-right">
                    {formatDate(deployment.startTime)}
                  </div>
                  
                  <div className="w-24">
                    <StatusBadge status={deployment.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
