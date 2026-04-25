import Link from "next/link"
import { 
  GitBranch, 
  Activity, 
  Route, 
  AlertTriangle, 
  Share2, 
  BarChart3,
  ArrowRight,
  Terminal,
  CheckCircle2,
  Flame,
  Bug,
  Rocket
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const features = [
  {
    icon: GitBranch,
    title: "Version Everything",
    description: "Your agents evolve. Track every mutation. Rollback in seconds when things go sideways."
  },
  {
    icon: Activity,
    title: "Live Logs",
    description: "Real-time streams from every execution. Tail, filter, grep. Like your terminal, but everywhere."
  },
  {
    icon: Route,
    title: "Trace the Thinking",
    description: "See how your agent reasons, step by step. No more black boxes. Full transparency."
  },
  {
    icon: AlertTriangle,
    title: "Catch Failures Fast",
    description: "Errors grouped, stacked, and ready to squash. Know what broke before your users do."
  },
  {
    icon: Share2,
    title: "Map Dependencies",
    description: "Visualize the web of agent relationships. Find the domino before it falls."
  },
  {
    icon: BarChart3,
    title: "Metrics That Matter",
    description: "Latency, throughput, success rates. The numbers you need, none of the noise."
  }
]

const cliCommands = [
  { prompt: "~", command: "canary init my-agent", output: null },
  { prompt: null, command: null, output: "Initializing..." },
  { prompt: null, command: null, output: "Created .canary/config.yaml" },
  { prompt: "~", command: "canary push --deploy", output: null },
  { prompt: null, command: null, output: "Building... done (1.2s)" },
  { prompt: null, command: null, output: "Tests: 23 passed" },
  { prompt: null, command: null, output: "Deployed to production" },
  { prompt: null, command: null, output: "", special: "live" },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero - Bold, Asymmetric */}
      <section className="min-h-[90vh] flex items-center relative overflow-hidden">
        {/* Background grain texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />
        
        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left - Copy */}
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-primary/40 text-primary px-3 py-1 font-mono text-xs uppercase tracking-wider">
                  Beta
                </Badge>
                <span className="text-muted-foreground text-sm">v0.9.2</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95]">
                <span className="block">Ship agents.</span>
                <span className="block text-primary">Break nothing.</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                Git for agents. CI/CD that gets it. Observability that doesn&apos;t suck. 
                The missing layer between your code and production chaos.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" className="gap-2 text-base h-12 px-8" asChild>
                  <Link href="/dashboard">
                    Start Building
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2 text-base h-12 px-8 border-border/60" asChild>
                  <Link href="#cli">
                    <Terminal className="h-4 w-4" />
                    See the CLI
                  </Link>
                </Button>
              </div>
            </div>
            
            {/* Right - Terminal Preview */}
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/5 rounded-2xl blur-3xl" />
              <div className="relative bg-[#0c0c0c] rounded-lg border border-border/60 overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/50">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-warning/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-success/70" />
                  </div>
                  <span className="ml-3 text-xs text-muted-foreground font-mono">zsh</span>
                </div>
                <div className="p-5 font-mono text-sm space-y-1">
                  {cliCommands.map((line, i) => (
                    <div key={i} className="flex gap-2">
                      {line.prompt && (
                        <>
                          <span className="text-primary font-bold">{line.prompt}</span>
                          <span className="text-foreground">{line.command}</span>
                        </>
                      )}
                      {line.output && (
                        <span className="text-muted-foreground pl-4">{line.output}</span>
                      )}
                      {line.special === "live" && (
                        <span className="text-success pl-4 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                          Live at canary.run/agents/my-agent
                        </span>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <span className="text-primary font-bold">~</span>
                    <span className="w-2 h-5 bg-primary/80 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof - Raw Numbers */}
      <section className="border-y border-border/40 bg-card/20 py-8">
        <div className="container">
          <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-6 font-mono">
            {[
              { value: "12,847", label: "agents tracked" },
              { value: "847M", label: "executions/mo" },
              { value: "99.97%", label: "uptime" },
              { value: "~45ms", label: "p95 latency" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-3">
                <span className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Problem - Direct, Punchy */}
      <section className="py-32">
        <div className="container">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
              Agents are weird.<br />
              <span className="text-muted-foreground">Your DevOps tools don&apos;t get that.</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-12">
              Non-deterministic outputs. Chain-of-thought reasoning. Dynamic tool usage. 
              Traditional CI/CD and monitoring weren&apos;t built for this. You need something that understands 
              how agents actually work.
            </p>
            
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { icon: Flame, title: "Hot deploys", desc: "Push to production without the sweating" },
                { icon: Bug, title: "Bug hunting", desc: "Full traces when things go wrong" },
                { icon: Rocket, title: "Ship faster", desc: "From commit to production in seconds" },
              ].map((item) => (
                <div key={item.title} className="group">
                  <div className="flex items-center gap-3 mb-2">
                    <item.icon className="h-5 w-5 text-primary" />
                    <span className="font-semibold">{item.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features - Staggered Grid */}
      <section id="features" className="py-24 bg-card/20 border-y border-border/40">
        <div className="container">
          <div className="mb-16">
            <span className="font-mono text-sm text-primary uppercase tracking-wider">Features</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">
              The full stack for agent ops
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/30 rounded-lg overflow-hidden">
            {features.map((feature, i) => (
              <div 
                key={feature.title} 
                className={`bg-background p-8 ${i === 0 ? 'lg:col-span-2 lg:row-span-1' : ''}`}
              >
                <feature.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Minimal */}
      <section id="how-it-works" className="py-32">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-20">
              <span className="font-mono text-sm text-primary uppercase tracking-wider">Workflow</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2">
                From zero to deployed
              </h2>
            </div>

            <div className="space-y-16">
              {[
                { 
                  num: "01", 
                  title: "Link your agent", 
                  cmd: "canary init",
                  desc: "Point Canary at your agent. Any framework. Any runtime. One command." 
                },
                { 
                  num: "02", 
                  title: "Push changes", 
                  cmd: "canary push",
                  desc: "Every push triggers builds, tests, and staged rollouts. Automatic rollback if something breaks." 
                },
                { 
                  num: "03", 
                  title: "Watch it run", 
                  cmd: "canary logs --live",
                  desc: "Real-time logs, traces, and metrics. See everything your agent does, as it happens." 
                },
              ].map((step, i) => (
                <div key={step.num} className="grid md:grid-cols-[120px_1fr] gap-8 items-start">
                  <div className="text-6xl font-bold text-primary/20">{step.num}</div>
                  <div>
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-2xl font-semibold">{step.title}</h3>
                      <code className="text-sm font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                        {step.cmd}
                      </code>
                    </div>
                    <p className="text-muted-foreground text-lg">{step.desc}</p>
                    {i < 2 && (
                      <div className="mt-8 h-px bg-gradient-to-r from-border/60 to-transparent" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CLI Section - Bigger, Bolder */}
      <section id="cli" className="py-24 bg-card/30 border-y border-border/40">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="font-mono text-sm text-primary uppercase tracking-wider">The CLI</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
                Your new favorite command
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Install with one line. Deploy with another. The Canary CLI brings version control, 
                deployments, and debugging to your terminal. No context switching. No dashboards required.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span>Git-like commands you already know</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span>Live tail logs from any agent</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span>Rollback with a single command</span>
                </div>
              </div>
              
              <div className="mt-10">
                <code className="inline-block bg-card border border-border/60 rounded px-4 py-3 font-mono text-sm">
                  curl -fsSL https://canary.run/install.sh | sh
                </code>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-[#0c0c0c] rounded-lg border border-border/60 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                  <span className="text-xs text-muted-foreground font-mono">canary --help</span>
                </div>
                <div className="p-5 font-mono text-xs space-y-2 text-muted-foreground">
                  <div><span className="text-primary">canary</span> - version control for AI agents</div>
                  <div className="pt-2">COMMANDS:</div>
                  <div className="pl-4">
                    <div><span className="text-foreground">init</span>      Initialize a new agent project</div>
                    <div><span className="text-foreground">push</span>      Push changes and deploy</div>
                    <div><span className="text-foreground">pull</span>      Pull remote changes</div>
                    <div><span className="text-foreground">logs</span>      Stream live logs</div>
                    <div><span className="text-foreground">trace</span>     View execution traces</div>
                    <div><span className="text-foreground">rollback</span>  Revert to previous version</div>
                    <div><span className="text-foreground">status</span>    Check deployment status</div>
                  </div>
                  <div className="pt-2">FLAGS:</div>
                  <div className="pl-4">
                    <div>--env        Target environment (dev/prod)</div>
                    <div>--watch      Watch mode for live changes</div>
                    <div>--verbose    Detailed output</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations - Simple */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <span className="font-mono text-sm text-primary uppercase tracking-wider">Integrations</span>
            <h2 className="text-2xl font-bold mt-2">Works with what you use</h2>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 max-w-3xl mx-auto">
            {["Fetch.ai", "LangChain", "AutoGPT", "CrewAI", "OpenAI", "Anthropic", "Vercel", "Railway"].map((name) => (
              <div key={name} className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - Bold */}
      <section className="py-32 border-t border-border/40">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Stop babysitting.<br />
              <span className="text-primary">Start shipping.</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              Join the teams building reliable agents with Canary. 
              Free during beta. No credit card needed.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gap-2 text-base h-12 px-10" asChild>
                <Link href="/dashboard">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              Or run <code className="text-primary font-mono">npx create-canary</code> to start locally
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
