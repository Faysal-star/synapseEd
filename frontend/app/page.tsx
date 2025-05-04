import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HeroSection } from "@/components/hero-section"
import { FeatureSection } from "@/components/feature-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"
import { ModeToggle } from "@/components/mode-toggle"

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation - Fixed at the top with glass morphism */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9">
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/20">
                <span className="text-lg font-bold text-white">S</span>
              </div>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-500">SynapseED</span>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex gap-8">
              <Link href="#features" className="text-sm font-medium transition-colors hover:text-primary relative group">
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link href="#about" className="text-sm font-medium transition-colors hover:text-primary relative group">
                About
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link href="#contact" className="text-sm font-medium transition-colors hover:text-primary relative group">
                Contact
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <ModeToggle />
              <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/30">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-col items-center mt-16">
        {/* Background gradient */}
        <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-neutral-950">
          <div className="absolute h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1a1a1a_1px,transparent_1px)]"></div>
          <div className="absolute top-0 left-0 right-0 opacity-20 dark:opacity-10 h-[500px] w-full bg-gradient-to-br from-purple-600 to-indigo-600 blur-[100px]"></div>
          <div className="absolute bottom-0 right-0 opacity-20 dark:opacity-10 h-[500px] w-[500px] bg-gradient-to-br from-pink-400 to-purple-600 blur-[100px]"></div>
        </div>
        
        <HeroSection />
        <FeatureSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  )
}
