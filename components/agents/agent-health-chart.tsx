"use client"

import { useEffect, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

interface HealthEvent {
  id: string
  action: "monitor_check" | "monitor_rollback"
  timestamp: string
  details: {
    score?: number
    threshold?: number
    passed?: boolean
    version_number?: number
    source?: string
    rolled_back_to?: string
  }
}

interface ChartPoint {
  time: string
  score: number | null
  threshold: number
  passed: boolean
  rollback: boolean
  version: number
  source: string
  raw: string
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props
  if (payload.rollback) {
    return (
      <g>
        <line x1={cx} y1={0} x2={cx} y2={300} stroke="hsl(var(--warning))" strokeWidth={1} strokeDasharray="4 2" opacity={0.5} />
        <polygon points={`${cx},${cy - 10} ${cx - 7},${cy + 4} ${cx + 7},${cy + 4}`} fill="hsl(var(--warning))" />
      </g>
    )
  }
  if (payload.score === null) return null
  const color = payload.passed ? "hsl(var(--success))" : "hsl(var(--destructive))"
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="hsl(var(--background))" strokeWidth={2} />
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as ChartPoint
  return (
    <div className="bg-popover border border-border rounded-lg p-3 text-xs shadow-lg space-y-1 min-w-[180px]">
      <p className="font-medium text-foreground">{d.time}</p>
      {d.rollback ? (
        <p className="text-warning font-medium">Auto-rollback triggered</p>
      ) : (
        <>
          <p>Score: <span className={d.passed ? "text-success font-medium" : "text-destructive font-medium"}>{Math.round((d.score ?? 0) * 100)}%</span></p>
          <p>Threshold: {Math.round(d.threshold * 100)}%</p>
          <p>Version: v{d.version}</p>
          <p>Source: <Badge variant="outline" className="text-[10px] py-0 px-1 ml-1">{d.source}</Badge></p>
        </>
      )}
    </div>
  )
}

export function AgentHealthChart({ agentId }: { agentId: string }) {
  const [events, setEvents] = useState<HealthEvent[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchHealth() {
    try {
      const res = await fetch(`${BACKEND_URL}/agents/${agentId}/health?limit=40`, { cache: "no-store" })
      if (res.ok) setEvents(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchHealth()
    const id = setInterval(fetchHealth, 15000)
    return () => clearInterval(id)
  }, [agentId])

  const checks = [...events].reverse()

  const data: ChartPoint[] = checks.map((e) => ({
    time: formatTime(e.timestamp),
    score: e.action === "monitor_check" ? (e.details.score ?? null) : null,
    threshold: e.details.threshold ?? 0.7,
    passed: e.details.passed ?? false,
    rollback: e.action === "monitor_rollback",
    version: e.details.version_number ?? 0,
    source: e.details.source ?? "synthetic",
    raw: e.timestamp,
  }))

  const lastCheck = [...events].find(e => e.action === "monitor_check")
  const rollbackCount = events.filter(e => e.action === "monitor_rollback").length
  const lastSource = lastCheck?.details.source ?? "—"
  const lastScore = lastCheck?.details.score
  const lastPassed = lastCheck?.details.passed

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${lastPassed ? "text-success" : lastPassed === false ? "text-destructive" : ""}`}>
              {lastScore != null ? `${Math.round(lastScore * 100)}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Latest health score</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{rollbackCount}</div>
            <p className="text-xs text-muted-foreground">Auto-rollbacks fired</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold capitalize">{lastSource.replace("_", " ")}</div>
            <p className="text-xs text-muted-foreground">Last check source</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Health Score Over Time</CardTitle>
          <CardDescription>
            Dashed line = monitor threshold (70%). Triangles = auto-rollback events. Refreshes every 15s.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
          ) : data.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
              No health checks yet — monitor runs every 60 seconds.
            </div>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 1]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickFormatter={(v) => `${Math.round(v * 100)}%`}
                    width={40}
                  />
                  <ReferenceLine
                    y={0.7}
                    stroke="hsl(var(--warning))"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{ value: "threshold", position: "insideTopRight", fill: "hsl(var(--warning))", fontSize: 10 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={<CustomDot />}
                    activeDot={false}
                    connectNulls={false}
                    name="Health Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event log */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Event Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : events.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  {e.action === "monitor_rollback" ? (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">rollback</Badge>
                  ) : e.details.passed ? (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]">pass</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">fail</Badge>
                  )}
                  <span className="text-muted-foreground">{formatTime(e.timestamp)}</span>
                  {e.action === "monitor_check" && (
                    <span>v{e.details.version_number} — {Math.round((e.details.score ?? 0) * 100)}%</span>
                  )}
                  {e.action === "monitor_rollback" && (
                    <span>v{e.details.version_number} rolled back</span>
                  )}
                </div>
                {e.details.source && (
                  <Badge variant="outline" className="text-[10px] py-0">{e.details.source.replace("_", " ")}</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
