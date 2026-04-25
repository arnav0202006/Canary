"use client"

import { ChevronRight, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { AgentTrace, TraceStep } from "@/lib/data/agents"

interface AgentTracesProps {
  traces: AgentTrace[]
}

function formatDuration(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  return `${ms}ms`
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
}

function StepStatusIcon({ status }: { status: TraceStep["status"] }) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-success" />
    case "error":
      return <XCircle className="h-4 w-4 text-destructive" />
    case "pending":
      return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
  }
}

function TraceStatusBadge({ status }: { status: AgentTrace["status"] }) {
  const config = {
    success: "bg-success/10 text-success border-success/30",
    error: "bg-destructive/10 text-destructive border-destructive/30",
    timeout: "bg-warning/10 text-warning border-warning/30"
  }
  
  return (
    <Badge variant="outline" className={config[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

export function AgentTraces({ traces }: AgentTracesProps) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Execution Traces</CardTitle>
        <CardDescription>Step-by-step breakdown of agent executions</CardDescription>
      </CardHeader>
      <CardContent>
        {traces.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No traces available
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {traces.map((trace) => (
              <AccordionItem key={trace.id} value={trace.id} className="border border-border/50 rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-4 text-left">
                    <code className="text-sm font-mono text-primary">{trace.traceId}</code>
                    <TraceStatusBadge status={trace.status} />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(trace.duration)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(trace.startTime)}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pb-2">
                    {trace.steps.map((step, index) => (
                      <div key={step.id} className="relative">
                        {index < trace.steps.length - 1 && (
                          <div className="absolute left-[9px] top-6 bottom-0 w-px bg-border" />
                        )}
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <StepStatusIcon status={step.status} />
                          </div>
                          <div className="flex-1 rounded-lg bg-muted/20 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{step.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(step.duration)}
                              </span>
                            </div>
                            {step.input && (
                              <div className="mb-2">
                                <span className="text-xs text-muted-foreground">Input:</span>
                                <pre className="mt-1 text-xs bg-background rounded p-2 overflow-x-auto">
                                  {step.input}
                                </pre>
                              </div>
                            )}
                            {step.output && (
                              <div>
                                <span className="text-xs text-muted-foreground">Output:</span>
                                <pre className="mt-1 text-xs bg-background rounded p-2 overflow-x-auto">
                                  {step.output}
                                </pre>
                              </div>
                            )}
                            {step.error && (
                              <div className="mt-2 text-xs text-destructive">
                                Error: {step.error}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  )
}
