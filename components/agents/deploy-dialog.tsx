"use client"

import { useState } from "react"
import { Plus, Rocket, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

type Step = "agent" | "version" | "deploy" | "result"

interface DeployResult {
  status: string
  message: string
  eval_score: number | null
}

export function DeployDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("agent")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [agentName, setAgentName] = useState("")
  const [agentDesc, setAgentDesc] = useState("")
  const [agentId, setAgentId] = useState("")

  const [prompt, setPrompt] = useState("")
  const [author, setAuthor] = useState("")
  const [versionId, setVersionId] = useState("")

  const [threshold, setThreshold] = useState("90")
  const [traffic, setTraffic] = useState("10")

  const [result, setResult] = useState<DeployResult | null>(null)

  function reset() {
    setStep("agent")
    setAgentName(""); setAgentDesc(""); setAgentId("")
    setPrompt(""); setAuthor(""); setVersionId("")
    setThreshold("90"); setTraffic("10")
    setResult(null); setError("")
  }

  async function handleCreateAgent() {
    if (!agentName.trim()) { setError("Agent name is required."); return }
    setError(""); setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: agentName.trim(), description: agentDesc.trim() }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setAgentId(data.id)
      setStep("version")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create agent.")
    } finally {
      setLoading(false)
    }
  }

  async function handleStoreVersion() {
    if (!prompt.trim()) { setError("System prompt is required."); return }
    setError(""); setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/agents/${agentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), created_by: author.trim() || "user" }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setVersionId(data.id)
      setStep("deploy")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to store version.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDeploy() {
    setError(""); setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/agents/${agentId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version_id: versionId,
          traffic_percentage: parseInt(traffic) || 10,
          eval_threshold: (parseInt(threshold) || 90) / 100,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult(data)
      setStep("result")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Deploy failed.")
    } finally {
      setLoading(false)
    }
  }

  const statusColor =
    result?.status === "production" ? "text-green-400" :
    result?.status === "rejected" || result?.status === "rolled_back" ? "text-red-400" :
    "text-yellow-400"

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Deploy New
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">

        {step === "agent" && (
          <>
            <DialogHeader>
              <DialogTitle>Register Agent</DialogTitle>
              <DialogDescription>Give your agent a name to start tracking it in Canary.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Agent Name</Label>
                <Input
                  placeholder="customer-support-agent"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreateAgent()}
                />
              </div>
              <div className="space-y-1">
                <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  placeholder="Handles customer inquiries..."
                  value={agentDesc}
                  onChange={e => setAgentDesc(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button onClick={handleCreateAgent} disabled={loading} className="w-full">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Next — Store Version
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "version" && (
          <>
            <DialogHeader>
              <DialogTitle>Store Version</DialogTitle>
              <DialogDescription>
                Snapshot the system prompt for <span className="font-medium text-foreground">{agentName}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>System Prompt</Label>
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="You are a helpful customer support agent..."
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Author <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  placeholder="your-name"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button onClick={handleStoreVersion} disabled={loading} className="w-full">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Next — Configure Deploy
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "deploy" && (
          <>
            <DialogHeader>
              <DialogTitle>Canary Deploy</DialogTitle>
              <DialogDescription>
                Run behavioral evals and deploy to canary with auto-rollback.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Canary Traffic %</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={traffic}
                  onChange={e => setTraffic(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Auto-rollback Threshold %</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={threshold}
                  onChange={e => setThreshold(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-rollback if eval score drops below this value.
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button onClick={handleDeploy} disabled={loading} className="w-full gap-2">
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Running evals...</>
                  : <><Rocket className="h-4 w-4" /> Deploy</>
                }
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "result" && result && (
          <>
            <DialogHeader>
              <DialogTitle>Deploy Complete</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="rounded-md border border-border/50 bg-muted/20 p-4 space-y-2">
                <p className="text-sm font-medium">
                  Status: <span className={statusColor}>{result.status.toUpperCase()}</span>
                </p>
                {result.eval_score != null && (
                  <p className="text-sm">
                    Eval score: <span className="font-mono">{Math.round(result.eval_score * 100)}%</span>
                  </p>
                )}
                <p className="text-sm text-muted-foreground">{result.message}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); setOpen(false) }} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </>
        )}

      </DialogContent>
    </Dialog>
  )
}
