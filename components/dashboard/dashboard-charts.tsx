"use client"

import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"

interface DeploymentData {
  date: string
  success: number
  failed: number
}

export function DashboardCharts({ data }: { data: DeploymentData[] }) {
  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2}>
          <XAxis 
            dataKey="date" 
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <YAxis 
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            width={30}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '12px'
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Bar 
            dataKey="success" 
            fill="hsl(var(--success))" 
            radius={[4, 4, 0, 0]}
            name="Successful"
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
  )
}
