import Link from "next/link"
import { Bird, Github, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col mx-16">
      <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/90 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Bird className="h-6 w-6 text-primary transition-transform group-hover:rotate-12" />
            <span className="text-lg font-bold tracking-tight">canary</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </Link>
            <Link href="#cli" className="text-muted-foreground hover:text-foreground transition-colors">
              CLI
            </Link>
            <Link href="https://docs.canary.run" className="text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
              <Link href="https://github.com/canary-dev">
                <Github className="h-4 w-4" />
              </Link>
            </Button>
            <div className="w-px h-4 bg-border/50 mx-1" />
            <Button variant="ghost" size="sm" className="text-sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" className="font-medium" asChild>
              <Link href="/dashboard">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border/30 py-16">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Bird className="h-5 w-5 text-primary" />
                <span className="font-bold">canary</span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-xs mb-6">
                Version control and observability for AI agents. 
                Built for teams that ship fast.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" asChild>
                  <Link href="https://github.com/canary-dev">
                    <Github className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" asChild>
                  <Link href="https://twitter.com/canarydev">
                    <Twitter className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Changelog</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Roadmap</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm mb-3">Developers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">API Reference</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">CLI Reference</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Status</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-border/30 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              2026 Canary Labs, Inc. All rights reserved.
            </p>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
