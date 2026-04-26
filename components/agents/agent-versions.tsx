"use client"

import { GitCommit } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { AgentVersion } from "@/lib/data/agents"

interface AgentVersionsProps {
  versions: AgentVersion[]
  lastKnownGoodId?: string | null
  currentVersionId?: string | null
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

function StatusBadge({ status }: { status: string }) {
  if (status === "production") return (
    <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">Production</Badge>
  )
  if (status === "rejected") return (
    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">Rejected</Badge>
  )
  if (status === "canary") return (
    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">Canary</Badge>
  )
  if (status === "rolled_back") return (
    <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">Rolled Back</Badge>
  )
  return (
    <Badge variant="outline" className="text-xs">Pending</Badge>
  )
}

export function AgentVersions({ versions, lastKnownGoodId, currentVersionId }: AgentVersionsProps) {
  const sorted = [...versions].reverse()

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Version History</CardTitle>
        <CardDescription>All deployments and version changes for this agent</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
          <div className="space-y-6">
            {sorted.map((version, index) => (
              <div key={version.id} className="relative flex gap-4">
                <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                  index === 0
                    ? "bg-primary border-primary"
                    : "bg-background border-border"
                }`}>
                  <GitCommit className={`h-4 w-4 ${index === 0 ? "text-primary-foreground" : "text-muted-foreground"}`} />
                </div>

                <div className="flex-1 rounded-lg border border-border/50 bg-muted/20 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-mono text-primary">{version.hash}</code>
                      <span className="text-sm font-medium">{version.version}</span>
                      {index === 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Latest</span>
                      )}
                      <StatusBadge status={version.status} />
                      {version.id === lastKnownGoodId && (
                        <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded border border-success/30">LKG</span>
                      )}
                      {version.evalScore != null && (
                        <span className="text-xs font-mono text-muted-foreground">eval: {Math.round(version.evalScore * 100)}%</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px] bg-muted">
                          {version.authorAvatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{version.author}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(version.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
