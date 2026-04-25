"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw, Loader2 } from "lucide-react"
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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

interface RollbackResult {
  agent_id: string
  rolled_back_to_version_id: string
  message: string
}

export function RollbackButton({ agentId, agentName }: { agentId: string; agentName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<RollbackResult | null>(null)

  async function handleRollback() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${BACKEND_URL}/agents/${agentId}/rollback`, {
        method: "POST",
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }
      const data = await res.json()
      setResult(data)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Rollback failed.")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setOpen(false)
    setResult(null)
    setError("")
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) handleClose() }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Rollback
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle>Rollback to Last Known Good</DialogTitle>
              <DialogDescription>
                This will revert <span className="font-medium text-foreground">{agentName}</span> to
                its last known good version. The current version will be marked as rolled back.
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRollback} disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Rollback
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Rollback Complete</DialogTitle>
            </DialogHeader>
            <div className="rounded-md border border-border/50 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">{result.message}</p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
