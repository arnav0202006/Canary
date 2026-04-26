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
  CartesianGrid,
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
    time: i % 4 === 0 || i === hours - 1 ? `${i}h` : '',
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
          <div className="h-[250px] bg-muted rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={requests} margin={{ top: 5, right: 25, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="requestGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(200 100% 70%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(200 100% 70%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(0 0% 70%)', fontSize: 11 }}
                  interval={0}
                  tickFormatter={(value) => value}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(0 0% 70%)', fontSize: 11 }}
                  width={45}
                  tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 15%)',
                    border: '1px solid hsl(0 0% 30%)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'hsl(0 0% 90%)'
                  }}
                  formatter={(value: number) => [value.toLocaleString(), 'Requests']}
                />
                <Area 
                  type="monotone"
                  dataKey="value" 
                  stroke="hsl(200 100% 70%)" 
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
          <div className="h-[250px] bg-muted rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={errors} margin={{ top: 5, right: 25, left: 5, bottom: 5 }}>
                <XAxis 
                  dataKey="time" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(0 0% 70%)', fontSize: 11 }}
                  interval={0}
                  tickFormatter={(value) => value}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(0 0% 70%)', fontSize: 11 }}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 15%)',
                    border: '1px solid hsl(0 0% 30%)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'hsl(0 0% 90%)'
                  }}
                  labelStyle={{ color: 'hsl(0 0% 90%)' }}
                  itemStyle={{ color: 'hsl(0 0% 90%)' }}
                  formatter={(value: number) => [value, 'Errors']}
                />
                <Line 
                  type="monotone"
                  dataKey="value" 
                  stroke="hsl(0 100% 70%)" 
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
          <div className="h-[250px] bg-muted rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deploymentsData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" />
                <XAxis 
                  dataKey="date" 
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  tick={{ fill: 'hsl(0 0% 70%)', fontSize: 11 }}
                />
                <YAxis 
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  tick={{ fill: 'hsl(0 0% 70%)', fontSize: 11 }}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 15%)',
                    border: '1px solid hsl(0 0% 30%)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'hsl(0 0% 90%)'
                  }}
                  labelStyle={{ color: 'hsl(0 0% 90%)' }}
                  itemStyle={{ color: 'hsl(0 0% 90%)' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconSize={8}
                />
                <Bar 
                  dataKey="success" 
                  fill="hsl(142 76% 36%)"
                  stroke="hsl(142 76% 36%)"
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                  name="Success"
                />
                <Bar 
                  dataKey="failed" 
                  fill="hsl(0 84% 60%)"
                  stroke="hsl(0 84% 60%)"
                  strokeWidth={1}
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
          <div className="h-[250px] bg-muted rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" />
                <XAxis 
                  type="number"
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  tick={{ fill: 'hsl(0 0% 70%)', fontSize: 11 }}
                  tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value}
                />
                <YAxis 
                  type="category"
                  dataKey="range"
                  tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  tick={{ fill: 'hsl(0 0% 70%)', fontSize: 11 }}
                  width={70}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 15%)',
                    border: '1px solid hsl(0 0% 30%)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'hsl(0 0% 90%)'
                  }}
                  labelStyle={{ color: 'hsl(0 0% 90%)' }}
                  itemStyle={{ color: 'hsl(0 0% 90%)' }}
                  cursor={{ fill: 'transparent' }}
                  formatter={(value: number) => [value.toLocaleString(), 'Requests']}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(0 0% 60%)"
                  stroke="hsl(0 0% 60%)"
                  strokeWidth={1}
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
