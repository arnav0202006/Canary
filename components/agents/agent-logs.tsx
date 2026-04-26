"use client"

import { Search, Filter, Pause, Play } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { AgentLog } from "@/lib/data/agents"

interface AgentLogsProps {
  logs: AgentLog[]
  isStreaming?: boolean
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3
  })
}

function LogLevelBadge({ level }: { level: AgentLog["level"] }) {
  const config = {
    info: "bg-info/10 text-info border-info/30",
    warn: "bg-warning/10 text-warning border-warning/30",
    error: "bg-destructive/10 text-destructive border-destructive/30",
    debug: "bg-muted text-muted-foreground border-border"
  }
  
  return (
    <Badge variant="outline" className={`${config[level]} font-mono text-[10px] uppercase w-12 justify-center`}>
      {level}
    </Badge>
  )
}

export function AgentLogs({ logs, isStreaming = false }: AgentLogsProps) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Live Logs</CardTitle>
            <CardDescription>Real-time log stream from agent executions</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <Filter className="h-3 w-3" />
              Filter
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Pause className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search logs..." 
            className="pl-9 bg-background font-mono text-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border/50 bg-[#0a0a0a] overflow-hidden">
          <div className="p-4 font-mono text-sm space-y-2 max-h-[400px] overflow-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 hover:bg-muted/10 -mx-2 px-2 py-1 rounded">
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </span>
                <LogLevelBadge level={log.level} />
                <span className={`flex-1 ${
                  log.level === "error" ? "text-destructive" :
                  log.level === "warn" ? "text-warning" :
                  "text-foreground"
                }`}>
                  {log.message}
                </span>
                {log.metadata && (
                  <code className="text-xs text-muted-foreground">
                    {JSON.stringify(log.metadata)}
                  </code>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2 text-muted-foreground pt-2">
              <span
                className={
                  isStreaming
                    ? 'animate-pulse w-2 h-2 rounded-full bg-success'
                    : 'w-2 h-2 rounded-full bg-muted-foreground/50'
                }
              />
              <span className="text-xs">
                {isStreaming ? 'Streaming...' : 'Stream paused'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
