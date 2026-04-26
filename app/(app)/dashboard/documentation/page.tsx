import Link from "next/link"
import { ArrowLeft, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const commandGroups = [
  {
    title: "Core commands",
    items: [
      { command: "canary push <path>", description: "Push a local canary.agent.json to the platform and run the deploy pipeline." },
      { command: "canary init [--database <url>]", description: "Initialize local Canary config and store it under .canary/config.json." },
      { command: "canary doctor", description: "Run local environment checks for config, base URL, and API key." },
    ],
  },
  {
    title: "Authentication",
    items: [
      { command: "canary auth login", description: "Authenticate with the Canary backend using email/password or API key." },
      { command: "canary auth logout", description: "Clear local auth tokens and sign out of the CLI." },
      { command: "canary auth status", description: "Show the current auth status and token preview." },
    ],
  },
  {
    title: "Configuration",
    items: [
      { command: "canary config set <key> <value>", description: "Set local CLI configuration values like base-url, api-key, or database-url." },
      { command: "canary config show", description: "Show the current CLI config with sensitive values masked." },
    ],
  },
  {
    title: "Agent management",
    items: [
      { command: "canary agent create <name>", description: "Create a new agent on the platform." },
      { command: "canary agent list [--status <status>]", description: "List agents by status." },
      { command: "canary agent get <agent-id>", description: "Show details for a single agent." },
      { command: "canary agent update <agent-id>", description: "Update an agent's name or description." },
      { command: "canary agent delete <agent-id> [--force]", description: "Delete an agent when forced." },
      { command: "canary agent push [<path>]", description: "Push local agent spec to the platform and optionally create it." },
    ],
  },
  {
    title: "Version management",
    items: [
      { command: "canary version create <agent-id>", description: "Create a new version for an existing agent." },
      { command: "canary version list <agent-id>", description: "List versions for an agent." },
      { command: "canary version get <version-id>", description: "Show a single version's details." },
      { command: "canary version update <version-id>", description: "Update a version prompt." },
      { command: "canary version delete <version-id> [--force]", description: "Delete a version when forced." },
    ],
  },
  {
    title: "Evaluation",
    items: [
      { command: "canary eval run <version-id> --test-suite <path>", description: "Run evaluation for a version against a local test suite." },
      { command: "canary eval results <version-id>", description: "Fetch evaluation results for a version." },
      { command: "canary eval list <agent-id>", description: "List evaluations for an agent." },
    ],
  },
  {
    title: "Deployment",
    items: [
      { command: "canary deploy canary <version-id>", description: "Start a canary deployment for a version." },
      { command: "canary deploy promote <deployment-id>", description: "Promote a deployment." },
      { command: "canary deploy rollback <agent-id>", description: "Roll back an agent to a previous version." },
      { command: "canary deploy list <agent-id>", description: "List deployments for an agent." },
      { command: "canary deploy status <deployment-id>", description: "Get status for a deployment." },
    ],
  },
  {
    title: "Monitoring",
    items: [
      { command: "canary monitor start <agent-id>", description: "Start production monitoring for an agent." },
      { command: "canary monitor status <agent-id>", description: "Check monitoring status." },
      { command: "canary monitor violations <agent-id>", description: "View recent monitoring violations." },
      { command: "canary monitor metrics <agent-id>", description: "Fetch risk metric data for an agent." },
    ],
  },
  {
    title: "Audit",
    items: [
      { command: "canary audit logs <agent-id>", description: "List audit logs for an agent." },
      { command: "canary audit export <agent-id> --output <file>", description: "Export audit logs to JSON or CSV." },
      { command: "canary audit search <query>", description: "Search audit logs." },
    ],
  },
  {
    title: "Usage",
    items: [
      { command: "canary usage agent <agent-id>", description: "View usage metrics for an agent." },
      { command: "canary usage version <version-id>", description: "View usage metrics for a version." },
      { command: "canary usage stats", description: "View usage statistics grouped by version or agent." },
    ],
  },
]

export default function DocumentationPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            CLI Documentation
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Canary CLI reference</h1>
          <p className="max-w-2xl text-muted-foreground">
            A quick reference for the local Canary CLI commands supported by `cli/script.py`.
            Use these commands when you need to manage agents, versions, deployments, monitoring, audits, and usage from the terminal.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/dashboard/settings" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {commandGroups.map((group) => (
          <Card key={group.title} className="bg-card/30 border-border/40">
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
              <CardDescription>{group.title} commands</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.items.map((item) => (
                <div key={item.command} className="rounded-xl border border-border/50 bg-background/80 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-sm font-medium text-foreground">{item.command}</code>
                    <Badge variant="outline">CLI</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
