import { TerminalSquare } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <TerminalSquare className="w-24 h-24 text-muted-foreground/30" />
        </div>
        <h1 className="text-5xl font-display font-bold">404</h1>
        <p className="text-xl text-muted-foreground font-mono">Process Exited with Code 404</p>
        <Link href="/">
          <div className="inline-flex mt-4 items-center px-6 py-3 rounded-xl font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors cursor-pointer">
            Return to Editor
          </div>
        </Link>
      </div>
    </div>
  );
}
