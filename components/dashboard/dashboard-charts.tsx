"use client"

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface DeploymentData {
  date: string
  success: number
  failed: number
}

export function DashboardCharts({ data }: { data: DeploymentData[] }) {
  return (
    <div className="h-[200px] bg-muted rounded p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" />
          <XAxis 
            dataKey="date" 
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            tick={{ fill: 'hsl(0 0% 70%)', fontSize: 12 }}
          />
          <YAxis 
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            tick={{ fill: 'hsl(0 0% 70%)', fontSize: 12 }}
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
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            iconSize={8}
          />
          <Bar 
            dataKey="success" 
            fill="hsl(0 0% 75%)" 
            stroke="hsl(0 0% 75%)"
            strokeWidth={1}
            radius={[4, 4, 0, 0]}
            name="Successful"
          />
          <Bar 
            dataKey="failed" 
            fill="hsl(0 0% 55%)" 
            stroke="hsl(0 0% 55%)"
            strokeWidth={1}
            radius={[4, 4, 0, 0]}
            name="Failed"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
