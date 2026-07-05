import { Component as AuroraBackground } from "@/components/ui/aurora-background";

export default function Demo() {
  return (
    <AuroraBackground className="min-h-screen flex items-center justify-center">
      <div className="text-center px-6 max-w-2xl">
        <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-4">
          Introducing Aurora
        </p>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.05]">
          Beautiful by
          <br />
          default
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
          A living gradient mesh that breathes life into any page.
          Drop it in. Ship it. Done.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button className="rounded-full bg-foreground text-background px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity">
            Get Started
          </button>
          <button className="rounded-full border border-border bg-background/50 backdrop-blur-sm text-foreground px-6 py-3 text-sm font-semibold hover:bg-background/80 transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </AuroraBackground>
  );
}
