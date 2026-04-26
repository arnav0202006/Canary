"use client"

import { 
  User, 
  Bell,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/components/auth-provider"

export default function SettingsPage() {
  const { user } = useAuth()

  // Extract user data
  const userEmail = user?.email ?? "user@canary.dev"
  const userInitials = userEmail.substring(0, 2).toUpperCase()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Config</h1>
        <p className="text-muted-foreground">Your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/30 border border-border/30">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-card/30 border-border/40">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Your Profile</CardTitle>
              <CardDescription className="font-mono text-xs">account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">{userInitials}</AvatarFallback>
                </Avatar>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={userEmail} disabled />
              </div>

              <p className="text-xs text-muted-foreground">
                Your email address is managed by Supabase and cannot be changed from here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-card/30 border-border/40">
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { id: "deploy_success", label: "Deployment Success", description: "Get notified when deployments complete successfully", default: true },
                { id: "deploy_fail", label: "Deployment Failures", description: "Get notified when deployments fail", default: true },
                { id: "errors", label: "Error Alerts", description: "Get notified about new or recurring errors", default: true },
                { id: "latency", label: "Latency Warnings", description: "Get notified when latency exceeds thresholds", default: false },
                { id: "weekly", label: "Weekly Summary", description: "Receive a weekly summary of agent performance", default: true }
              ].map((pref) => (
                <div key={pref.id} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={pref.id}>{pref.label}</Label>
                    <p className="text-xs text-muted-foreground">{pref.description}</p>
                  </div>
                  <Switch id={pref.id} defaultChecked={pref.default} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/30 border-border/40">
            <CardHeader>
              <CardTitle className="text-base">Notification Channel</CardTitle>
              <CardDescription>Where to send notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Email</Label>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
                <Switch defaultChecked={true} disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
