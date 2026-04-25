"use client"

import { CheckCircle2, XCircle, Loader2, Clock, SkipForward } from "lucide-react"
import type { DeploymentStep } from "@/lib/data/deployments"

interface DeploymentPipelineProps {
  steps: DeploymentStep[]
}

function StepIcon({ status }: { status: DeploymentStep["status"] }) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="h-5 w-5 text-success" />
    case "failed":
      return <XCircle className="h-5 w-5 text-destructive" />
    case "in-progress":
      return <Loader2 className="h-5 w-5 text-info animate-spin" />
    case "pending":
      return <Clock className="h-5 w-5 text-muted-foreground" />
    case "skipped":
      return <SkipForward className="h-5 w-5 text-muted-foreground" />
  }
}

export function DeploymentPipeline({ steps }: DeploymentPipelineProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2 flex-1">
          <div className={`flex items-center gap-2 flex-1 rounded-md px-3 py-2 ${
            step.status === "success" ? "bg-success/10" :
            step.status === "failed" ? "bg-destructive/10" :
            step.status === "in-progress" ? "bg-info/10" :
            "bg-muted/30"
          }`}>
            <StepIcon status={step.status} />
            <span className={`text-sm font-medium ${
              step.status === "pending" || step.status === "skipped" 
                ? "text-muted-foreground" 
                : "text-foreground"
            }`}>
              {step.name}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-4 h-px ${
              step.status === "success" ? "bg-success" :
              step.status === "failed" ? "bg-destructive" :
              "bg-border"
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}
