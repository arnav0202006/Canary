"use client"

import { GitCommit, Plus, Minus, RotateCcw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { AgentVersion } from "@/lib/data/agents"

interface AgentVersionsProps {
  versions: AgentVersion[]
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

export function AgentVersions({ versions }: AgentVersionsProps) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Version History</CardTitle>
        <CardDescription>All deployments and version changes for this agent</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
          
          <div className="space-y-6">
            {versions.map((version, index) => (
              <div key={version.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                  index === 0 
                    ? "bg-primary border-primary" 
                    : "bg-background border-border"
                }`}>
                  <GitCommit className={`h-4 w-4 ${index === 0 ? "text-primary-foreground" : "text-muted-foreground"}`} />
                </div>
                
                <div className="flex-1 rounded-lg border border-border/50 bg-muted/20 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-primary">{version.hash}</code>
                        <span className="text-sm font-medium">{version.version}</span>
                        {index === 0 && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1">{version.message}</p>
                    </div>
                    {index !== 0 && (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs">
                        <RotateCcw className="h-3 w-3" />
                        Rollback
                      </Button>
                    )}
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
                    
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1 text-success">
                        <Plus className="h-3 w-3" />
                        {version.changes.additions}
                      </span>
                      <span className="flex items-center gap-1 text-destructive">
                        <Minus className="h-3 w-3" />
                        {version.changes.deletions}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDate(version.createdAt)}
                      </span>
                    </div>
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
