"use client"

import { AlertTriangle, CheckCircle2, EyeOff } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { AgentError } from "@/lib/data/agents"

interface AgentErrorsProps {
  errors: AgentError[]
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

function ErrorStatusBadge({ status }: { status: AgentError["status"] }) {
  const config = {
    open: { label: "Open", className: "bg-destructive/10 text-destructive border-destructive/30" },
    resolved: { label: "Resolved", className: "bg-success/10 text-success border-success/30" },
    ignored: { label: "Ignored", className: "bg-muted text-muted-foreground border-border" }
  }
  
  const { label, className } = config[status]
  
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}

export function AgentErrors({ errors }: AgentErrorsProps) {
  const openErrors = errors.filter(e => e.status === "open")
  const resolvedErrors = errors.filter(e => e.status === "resolved")

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold">{openErrors.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Open Errors</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-2xl font-bold">{resolvedErrors.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Resolved</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {errors.reduce((sum, e) => sum + e.count, 0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Occurrences</p>
          </CardContent>
        </Card>
      </div>

      {/* Error List */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Error Groups</CardTitle>
          <CardDescription>Errors grouped by type with occurrence counts</CardDescription>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No errors found
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-2">
              {errors.map((error) => (
                <AccordionItem key={error.id} value={error.id} className="border border-border/50 rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-4 text-left flex-1">
                      <div className={`w-1 h-8 rounded-full ${
                        error.status === "open" ? "bg-destructive" : 
                        error.status === "resolved" ? "bg-success" : "bg-muted"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-destructive">{error.type}</span>
                          <ErrorStatusBadge status={error.status} />
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {error.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{error.count}x</span>
                        <span>Last: {formatDate(error.lastSeen)}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pb-2">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Resolve
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <EyeOff className="h-3 w-3" />
                          Ignore
                        </Button>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Stack Trace</h4>
                        <pre className="text-xs bg-[#0a0a0a] rounded-lg p-4 overflow-x-auto font-mono text-muted-foreground">
                          {error.stackTrace}
                        </pre>
                      </div>

                      <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <div>
                          <span className="text-muted-foreground">First seen: </span>
                          <span className="text-foreground">{formatDate(error.firstSeen)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last seen: </span>
                          <span className="text-foreground">{formatDate(error.lastSeen)}</span>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
