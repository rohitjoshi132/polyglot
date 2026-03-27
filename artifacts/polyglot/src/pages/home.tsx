import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  SearchCode, 
  Code2, 
  TerminalSquare, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Info
} from "lucide-react";
import { useDetectLanguage, useCompileCode } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function Home() {
  const [code, setCode] = useState("");
  const [filename, setFilename] = useState("");
  const [languageOverride, setLanguageOverride] = useState("");
  
  const { toast } = useToast();

  const { mutate: detect, isPending: isDetecting, data: detectResult } = useDetectLanguage({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Detection Complete",
          description: "Language analyzed successfully.",
        });
      },
      onError: (error) => {
        toast({
          title: "Detection Failed",
          description: error.error || "An error occurred",
          variant: "destructive",
        });
      }
    }
  });

  const { mutate: compile, isPending: isCompiling, data: compileResult } = useCompileCode({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: data.success ? "Compilation Successful" : "Compilation Failed",
          description: `Exited with code ${data.exitCode} in ${data.compilationMs}ms`,
          variant: data.success ? "default" : "destructive",
        });
      },
      onError: (error) => {
        toast({
          title: "Compilation Error",
          description: error.error || "Failed to compile code",
          variant: "destructive",
        });
      }
    }
  });

  const handleDetect = () => {
    if (!code.trim()) {
      toast({ title: "No code", description: "Please enter some code to detect.", variant: "destructive" });
      return;
    }
    detect({ data: { code, filename: filename || undefined } });
  };

  const handleCompile = () => {
    if (!code.trim()) {
      toast({ title: "No code", description: "Please enter some code to compile.", variant: "destructive" });
      return;
    }
    compile({ data: { 
      code, 
      filename: filename || undefined, 
      language: languageOverride || undefined 
    }});
  };

  // Determine which data to show in the right panel
  const showDetectionResults = !!detectResult && !compileResult;
  const showCompilationResults = !!compileResult;
  
  const currentLang = compileResult?.detected || detectResult?.detected;
  const currentConf = compileResult?.confidence || detectResult?.confidence;
  const currentLevel = compileResult?.confidenceLevel || detectResult?.confidenceLevel;

  const getConfidenceColor = (level?: string) => {
    if (level === "high") return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (level === "medium") return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-rose-500 bg-rose-500/10 border-rose-500/20";
  };
  
  const getProgressColor = (level?: string) => {
    if (level === "high") return "bg-emerald-500";
    if (level === "medium") return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col md:flex-row gap-6 h-full min-h-[600px]">
        
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Editor</h1>
              <p className="text-muted-foreground mt-1 text-sm">Write code, detect language automatically, and execute instantly.</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col rounded-2xl glass-panel overflow-hidden border border-border/50 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300 shadow-xl shadow-black/20">
            {/* Editor Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-secondary/30 border-b border-border/50">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
              <div className="flex-1 ml-4 relative">
                <Code2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="filename.ext (optional)" 
                  className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 pl-9 pr-4 text-sm font-mono text-emerald-400 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>
            
            {/* Main Textarea */}
            <div className="relative flex-1 bg-black/20">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="// Paste or type your source code here..."
                className="absolute inset-0 w-full h-full p-6 bg-transparent border-none outline-none font-mono text-base text-zinc-300 placeholder:text-zinc-700 resize-none"
                spellCheck={false}
              />
            </div>

            {/* Editor Footer / Actions */}
            <div className="p-4 bg-secondary/30 border-t border-border/50 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Override</span>
                <input 
                  value={languageOverride}
                  onChange={(e) => setLanguageOverride(e.target.value)}
                  placeholder="Auto-detect" 
                  className="w-32 bg-black/40 border border-white/5 rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDetect}
                  disabled={isDetecting || isCompiling}
                  className="flex items-center px-4 py-2 rounded-lg font-medium text-sm border border-border bg-card hover:bg-secondary hover:text-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDetecting ? <span className="animate-spin mr-2">⟳</span> : <SearchCode className="w-4 h-4 mr-2" />}
                  Detect Language
                </button>
                <button
                  onClick={handleCompile}
                  disabled={isCompiling || isDetecting}
                  className="flex items-center px-6 py-2 rounded-lg font-semibold text-sm bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
                >
                  {isCompiling ? <span className="animate-spin mr-2">⟳</span> : <Play className="w-4 h-4 mr-2 fill-current" />}
                  Compile & Run
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="w-full md:w-96 lg:w-[450px] flex flex-col h-full">
          <AnimatePresence mode="wait">
            {!showDetectionResults && !showCompilationResults && (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-8 glass-panel rounded-2xl border-dashed border-border/50"
              >
                <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-6 border border-white/5">
                  <TerminalSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Awaiting Code</h3>
                <p className="text-muted-foreground text-sm max-w-[250px]">
                  Submit your code to see language detection confidence and execution outputs here.
                </p>
              </motion.div>
            )}

            {(showDetectionResults || showCompilationResults) && (
              <motion.div 
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col rounded-2xl glass-panel border border-border/50 overflow-hidden shadow-2xl shadow-black/40"
              >
                {/* Result Header Badge */}
                <div className="p-6 bg-gradient-to-br from-secondary/50 to-background border-b border-border/50">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase mb-1">Detected Language</p>
                      <h2 className="text-3xl font-display font-bold text-foreground capitalize">
                        {currentLang}
                      </h2>
                    </div>
                    {currentLevel && (
                      <Badge variant="outline" className={cn("px-3 py-1 uppercase tracking-wider text-xs font-bold border", getConfidenceColor(currentLevel))}>
                        {currentLevel} Confidence
                      </Badge>
                    )}
                  </div>
                  
                  {currentConf !== undefined && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-mono">Accuracy Score</span>
                        <span className="font-mono font-bold">{(currentConf * 100).toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={currentConf * 100} 
                        className="h-2 bg-black/40" 
                        indicatorClassName={getProgressColor(currentLevel)} 
                      />
                    </div>
                  )}
                </div>

                {/* Tabs Area */}
                <Tabs defaultValue={showCompilationResults ? "output" : "detection"} className="flex-1 flex flex-col">
                  <div className="px-6 pt-4 border-b border-border/50">
                    <TabsList className="bg-black/40 border border-white/5 w-full">
                      {showCompilationResults && <TabsTrigger value="output" className="flex-1 data-[state=active]:bg-secondary">Output</TabsTrigger>}
                      <TabsTrigger value="detection" className="flex-1 data-[state=active]:bg-secondary">Detection Details</TabsTrigger>
                    </TabsList>
                  </div>

                  {showCompilationResults && (
                    <TabsContent value="output" className="flex-1 p-0 m-0 overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between px-6 py-3 bg-secondary/20 border-b border-border/50 text-sm">
                        <div className="flex items-center gap-2">
                          {compileResult.success ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Success
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/20">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Failed
                            </Badge>
                          )}
                          <span className="text-muted-foreground font-mono">Exit Code: {compileResult.exitCode}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground font-mono">
                          <Clock className="w-3 h-3 mr-1" />
                          {compileResult.compilationMs}ms
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 bg-[#0a0a0c]">
                        {compileResult.stdout && (
                          <div className="mb-4">
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 select-none">Standard Output</p>
                            <pre className="font-mono text-sm text-zinc-300 whitespace-pre-wrap break-all">{compileResult.stdout}</pre>
                          </div>
                        )}
                        {compileResult.stderr && (
                          <div>
                            <p className="text-xs text-rose-500/70 font-bold uppercase tracking-wider mb-2 select-none">Standard Error</p>
                            <pre className="font-mono text-sm text-rose-400 whitespace-pre-wrap break-all">{compileResult.stderr}</pre>
                          </div>
                        )}
                        {!compileResult.stdout && !compileResult.stderr && (
                          <div className="text-zinc-600 font-mono text-sm italic">No output generated.</div>
                        )}
                        
                        {!compileResult.toolchainAvailable && (
                          <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex flex-col gap-2">
                            <div className="flex items-center font-bold">
                              <Info className="w-4 h-4 mr-2" /> Toolchain Missing
                            </div>
                            <p className="text-sm opacity-90">{compileResult.installHint}</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="detection" className="flex-1 p-0 m-0 overflow-y-auto">
                    <div className="p-6 space-y-6">
                      {detectResult?.signals && detectResult.signals.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                            <SearchCode className="w-4 h-4 mr-2 text-primary" /> Detection Signals
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {detectResult.signals.map((sig, i) => (
                              <Badge key={i} variant="secondary" className="bg-secondary text-secondary-foreground border-white/5 font-mono font-normal">
                                {sig}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {detectResult?.candidates && detectResult.candidates.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                            <Code2 className="w-4 h-4 mr-2 text-primary" /> Ranked Alternatives
                          </h4>
                          <div className="space-y-3">
                            {detectResult.candidates.filter(c => c.language !== currentLang).map((candidate, i) => (
                              <div key={i} className="flex flex-col gap-1.5 p-3 rounded-lg bg-black/20 border border-white/5">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="font-medium capitalize">{candidate.language}</span>
                                  <span className="font-mono text-muted-foreground">{(candidate.confidence * 100).toFixed(1)}%</span>
                                </div>
                                <Progress value={candidate.confidence * 100} className="h-1.5 bg-black/40" indicatorClassName="bg-zinc-600" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
