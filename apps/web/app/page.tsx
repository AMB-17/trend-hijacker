import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h1 className="text-6xl font-bold text-gradient">
          Trend Hijacker
        </h1>
        <p className="text-xl text-muted max-w-2xl mx-auto">
          Detect early internet demand signals before they become mainstream. 
          Identify profitable opportunities by analyzing behavioral patterns in public discussions.
        </p>
        <div className="flex gap-4 justify-center pt-8">
          <Link href="/dashboard" className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold">
            View Dashboard
          </Link>
          <a href="https://github.com" className="px-8 py-3 border border-border rounded-lg hover:bg-card-hover transition-colors font-semibold">
            Learn More
          </a>
        </div>
        <div className="pt-16 grid grid-cols-3 gap-8 text-center">
          <div>
            <h3 className="text-4xl font-bold text-primary">Early</h3>
            <p className="text-muted">Signal Detection</p>
          </div>
          <div>
            <h3 className="text-4xl font-bold text-success">Real-time</h3>
            <p className="text-muted">Trend Tracking</p>
          </div>
          <div>
            <h3 className="text-4xl font-bold text-accent">AI-Powered</h3>
            <p className="text-muted">Insights</p>
          </div>
        </div>
      </div>
    </div>
  );
}
