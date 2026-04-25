"use client"

import { useState } from "react"
import { 
  User, 
  Users, 
  Key, 
  Link2, 
  Bell, 
  CreditCard,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Check
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const apiKeys = [
  { 
    id: "key_1", 
    name: "Production API Key", 
    prefix: "cnry_prod_", 
    lastUsed: "2 hours ago",
    created: "Jan 15, 2026"
  },
  { 
    id: "key_2", 
    name: "Development API Key", 
    prefix: "cnry_dev_", 
    lastUsed: "5 minutes ago",
    created: "Mar 22, 2026"
  },
  { 
    id: "key_3", 
    name: "CI/CD Integration", 
    prefix: "cnry_ci_", 
    lastUsed: "1 day ago",
    created: "Apr 10, 2026"
  }
]

const teamMembers = [
  { id: "1", name: "Sarah Chen", email: "sarah@canary.dev", role: "Owner", avatar: "SC" },
  { id: "2", name: "Marcus Johnson", email: "marcus@canary.dev", role: "Admin", avatar: "MJ" },
  { id: "3", name: "Alex Rivera", email: "alex@canary.dev", role: "Developer", avatar: "AR" },
  { id: "4", name: "Jordan Lee", email: "jordan@canary.dev", role: "Developer", avatar: "JL" }
]

const integrations = [
  { id: "1", name: "GitHub", description: "Connect your repositories", connected: true, icon: "GH" },
  { id: "2", name: "Slack", description: "Get deployment notifications", connected: true, icon: "SL" },
  { id: "3", name: "PagerDuty", description: "Alert on-call when agents fail", connected: false, icon: "PD" },
  { id: "4", name: "Datadog", description: "Export metrics to Datadog", connected: false, icon: "DD" }
]

function ApiKeyRow({ apiKey }: { apiKey: typeof apiKeys[0] }) {
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const maskedKey = `${apiKey.prefix}${"•".repeat(24)}`
  const fullKey = `${apiKey.prefix}sk_live_abcdef123456789`

  const copyKey = () => {
    navigator.clipboard.writeText(fullKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between py-4 border-b border-border/50 last:border-0">
      <div className="space-y-1">
        <div className="font-medium text-sm">{apiKey.name}</div>
        <div className="flex items-center gap-2">
          <code className="text-xs text-muted-foreground font-mono">
            {showKey ? fullKey : maskedKey}
          </code>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowKey(!showKey)}>
            {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyKey}>
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Last used: {apiKey.lastUsed}</div>
          <div className="text-xs text-muted-foreground">Created: {apiKey.created}</div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Config</h1>
        <p className="text-muted-foreground">Your account, team, and integrations</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/30 border border-border/30">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Link2 className="h-4 w-4" />
            Integrations
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
              <CardDescription className="font-mono text-xs">personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">SC</AvatarFallback>
                </Avatar>
                <Button variant="outline">Change Avatar</Button>
              </div>
              
              <Separator />
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue="Sarah Chen" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="sarah@canary.dev" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" defaultValue="Canary Labs" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" defaultValue="Engineering Lead" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card className="bg-card/30 border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Team Members</CardTitle>
                <CardDescription>Manage who has access to this workspace</CardDescription>
              </div>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Invite Member
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-muted text-sm">{member.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={member.role === "Owner" ? "default" : "outline"}>
                        {member.role}
                      </Badge>
                      {member.role !== "Owner" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card className="bg-card/30 border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">API Keys</CardTitle>
                <CardDescription>Manage your API keys for programmatic access</CardDescription>
              </div>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Key
              </Button>
            </CardHeader>
            <CardContent>
              {apiKeys.map((key) => (
                <ApiKeyRow key={key.id} apiKey={key} />
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/30 border-border/40 border-l-4 border-l-warning">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Security Note:</strong> API keys provide full access to your account. 
                Keep them secure and never share them in public repositories or client-side code.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className="bg-card/30 border-border/40">
            <CardHeader>
              <CardTitle className="text-base">Connected Services</CardTitle>
              <CardDescription>Integrate Canary with your existing tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div key={integration.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center font-mono text-sm">
                        {integration.icon}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{integration.name}</div>
                        <div className="text-xs text-muted-foreground">{integration.description}</div>
                      </div>
                    </div>
                    <Button variant={integration.connected ? "outline" : "default"}>
                      {integration.connected ? "Configure" : "Connect"}
                    </Button>
                  </div>
                ))}
              </div>
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
              <CardTitle className="text-base">Notification Channels</CardTitle>
              <CardDescription>Where should we send notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { id: "email", label: "Email", description: "sarah@canary.dev", default: true },
                { id: "slack", label: "Slack", description: "#canary-alerts", default: true },
                { id: "webhook", label: "Webhook", description: "Not configured", default: false }
              ].map((channel) => (
                <div key={channel.id} className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor={channel.id}>{channel.label}</Label>
                    <p className="text-xs text-muted-foreground">{channel.description}</p>
                  </div>
                  <Switch id={channel.id} defaultChecked={channel.default} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
