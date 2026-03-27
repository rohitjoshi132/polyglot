import { useListToolchains } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, TerminalSquare, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Toolchains() {
  const { data, isLoading } = useListToolchains();

  return (
    <div className="flex flex-col h-full gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Available Toolchains</h1>
        <p className="text-muted-foreground mt-1">Host system compilers and runtime environments.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 rounded-2xl glass-panel animate-pulse bg-secondary/20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data?.toolchains?.map((tc) => (
            <div 
              key={tc.language} 
              className={`rounded-2xl glass-panel p-6 border transition-all duration-300 shadow-lg ${
                tc.available 
                  ? "border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-500/5" 
                  : "border-border/50 opacity-80"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl border ${tc.available ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-secondary border-white/5 text-muted-foreground"}`}>
                    <TerminalSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg capitalize">{tc.language}</h3>
                    {tc.version ? (
                      <span className="text-xs font-mono text-muted-foreground">{tc.version}</span>
                    ) : (
                      <span className="text-xs font-mono text-muted-foreground">Version unknown</span>
                    )}
                  </div>
                </div>
                {tc.available ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30">
                    <XCircle className="w-3 h-3 mr-1" /> Missing
                  </Badge>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Execution Command</p>
                  <code className="px-2 py-1 bg-black/40 rounded border border-white/5 text-xs text-zinc-300 font-mono">
                    {tc.command}
                  </code>
                </div>
                
                {!tc.available && tc.installHint && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-amber-500 font-medium">Installation required</p>
                      <p className="text-xs text-amber-500/80 mt-1">{tc.installHint}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
