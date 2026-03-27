import { useState } from "react";
import { format } from "date-fns";
import { useListSubmissions, useGetSubmission } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Search, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function History() {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  const { data, isLoading } = useListSubmissions({ page, limit: 20 });
  const { data: detailData, isLoading: detailLoading } = useGetSubmission(selectedId || 0, {
    query: { enabled: !!selectedId }
  });

  const getConfidenceColor = (level: string) => {
    if (level === "high") return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (level === "medium") return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-rose-500 bg-rose-500/10 border-rose-500/20";
  };

  return (
    <div className="flex flex-col h-full gap-6 relative">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Submission History</h1>
        <p className="text-muted-foreground mt-1">Review past code executions and detection logs.</p>
      </div>

      <div className="flex-1 glass-panel rounded-2xl border border-border/50 overflow-hidden flex flex-col shadow-xl">
        <div className="p-4 border-b border-border/50 bg-secondary/20 flex items-center justify-between">
          <div className="relative w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <input 
               placeholder="Filter by language..." 
               className="w-full bg-black/40 border border-white/5 rounded-lg py-2 pl-9 pr-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
             />
          </div>
          <div className="text-sm text-muted-foreground font-mono">
            {data?.total || 0} Records
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-black/40 sticky top-0 backdrop-blur-md z-10">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Preview</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading history...</TableCell>
                </TableRow>
              ) : !data?.submissions?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No submissions found.</TableCell>
                </TableRow>
              ) : (
                data.submissions.map((sub) => (
                  <TableRow 
                    key={sub.id} 
                    className="border-border/20 hover:bg-secondary/40 cursor-pointer transition-colors group"
                    onClick={() => setSelectedId(sub.id)}
                  >
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {format(new Date(sub.createdAt), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold capitalize text-foreground">{sub.detectedLanguage}</span>
                      {sub.filename && <span className="ml-2 text-xs text-muted-foreground">({sub.filename})</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-mono font-bold border", getConfidenceColor(sub.confidenceLevel))}>
                        {(sub.confidence * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub.success ? (
                        <div className="flex items-center text-emerald-400 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> OK
                        </div>
                      ) : (
                        <div className="flex items-center text-rose-400 text-sm font-medium">
                          <XCircle className="w-4 h-4 mr-1.5" /> Fail
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground font-mono text-xs opacity-70">
                      {sub.code.substring(0, 60)}{sub.code.length > 60 ? "..." : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Slide-out Detail Panel */}
      <AnimatePresence>
        {selectedId && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setSelectedId(null)}
            />
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-card border-l border-border/50 shadow-2xl z-50 flex flex-col"
            >
              {detailLoading || !detailData ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="animate-pulse text-primary font-mono">Loading details...</span>
                </div>
              ) : (
                <>
                  <div className="p-6 border-b border-border/50 bg-secondary/20 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">Submission #{detailData.id}</h2>
                      <p className="text-sm text-muted-foreground font-mono mt-1">
                        {format(new Date(detailData.createdAt), "PPpp")}
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedId(null)}
                      className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass-panel p-4 rounded-xl border border-white/5">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Language</p>
                        <p className="text-lg font-bold capitalize text-primary">{detailData.detectedLanguage}</p>
                      </div>
                      <div className="glass-panel p-4 rounded-xl border border-white/5">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Confidence</p>
                        <Badge className={cn("mt-1 border", getConfidenceColor(detailData.confidenceLevel))}>
                          {(detailData.confidence * 100).toFixed(1)}% ({detailData.confidenceLevel})
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 select-none">Source Code</h3>
                      <pre className="p-4 rounded-xl bg-[#0a0a0c] border border-border/50 font-mono text-sm text-emerald-400 overflow-x-auto">
                        {detailData.code}
                      </pre>
                    </div>
                    
                    {(detailData.stdout || detailData.stderr) && (
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 select-none flex items-center justify-between">
                          Execution Output
                          <Badge variant="outline" className={detailData.success ? "text-emerald-400 border-emerald-400/30" : "text-rose-400 border-rose-400/30"}>
                            Exit {detailData.exitCode}
                          </Badge>
                        </h3>
                        <div className="p-4 rounded-xl bg-[#0a0a0c] border border-border/50 font-mono text-sm overflow-x-auto">
                          {detailData.stdout && <div className="text-zinc-300">{detailData.stdout}</div>}
                          {detailData.stderr && <div className="text-rose-400 mt-2">{detailData.stderr}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
