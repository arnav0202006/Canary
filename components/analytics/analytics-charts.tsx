"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Area, 
  AreaChart, 
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip,
  Legend
} from "recharts"
import type { MetricDataPoint } from "@/lib/data/metrics"

interface AnalyticsChartsProps {
  requestsData: MetricDataPoint[]
  errorsData: MetricDataPoint[]
  agentUsageData: { name: string; requests: number; color: string }[]
  latencyData: { range: string; count: number }[]
  deploymentsData: { date: string; success: number; failed: number }[]
}

// Transform data for charts
function transformTimeSeriesData(data: MetricDataPoint[], hours: number = 24) {
  return data.slice(-hours).map((d, i) => ({
    time: `${i}h`,
    value: Math.round(d.value)
  }))
}

export function AnalyticsCharts({ 
  requestsData, 
  errorsData, 
  latencyData,
  deploymentsData 
}: AnalyticsChartsProps) {
  const requests = transformTimeSeriesData(requestsData, 24)
  const errors = transformTimeSeriesData(errorsData, 24)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Request Volume */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Request Volume</CardTitle>
          <CardDescription>Total requests over the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={requests}>
                <defs>
                  <linearGradient id="requestGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  width={45}
                  tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [value.toLocaleString(), 'Requests']}
                />
                <Area 
                  type="monotone"
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#requestGradientAnalytics)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Error Rate */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Error Rate</CardTitle>
          <CardDescription>Errors per hour over the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={errors}>
                <XAxis 
                  dataKey="time" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [value, 'Errors']}
                />
                <Line 
                  type="monotone"
                  dataKey="value" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Deployments */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Deployments</CardTitle>
          <CardDescription>Successful vs failed deployments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deploymentsData} barGap={4}>
                <XAxis 
                  dataKey="date" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconSize={8}
                />
                <Bar 
                  dataKey="success" 
                  fill="hsl(var(--success))" 
                  radius={[4, 4, 0, 0]}
                  name="Success"
                />
                <Bar 
                  dataKey="failed" 
                  fill="hsl(var(--destructive))" 
                  radius={[4, 4, 0, 0]}
                  name="Failed"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Latency Distribution */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Latency Distribution</CardTitle>
          <CardDescription>Response time breakdown by bucket</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyData} layout="vertical">
                <XAxis 
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value}
                />
                <YAxis 
                  type="category"
                  dataKey="range"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  width={70}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [value.toLocaleString(), 'Requests']}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--info))" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
