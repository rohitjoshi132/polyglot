import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Calendar, Code2, Search, Trash2,
  FolderOpen, Loader2, LogOut, ArrowRight, FileCode,
  Clock, Plus, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

interface Project {
  id: number;
  title: string;
  code: string;
  language: string | null;
  filename: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectsResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const LANG_COLORS: Record<string, string> = {
  python:     "bg-blue-500/15 text-blue-400 border-blue-500/20",
  javascript: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  typescript: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  go:         "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  rust:       "bg-orange-500/15 text-orange-400 border-orange-500/20",
  java:       "bg-red-500/15 text-red-400 border-red-500/20",
  "c++":      "bg-purple-500/15 text-purple-400 border-purple-500/20",
  c:          "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  ruby:       "bg-rose-500/15 text-rose-400 border-rose-500/20",
  kotlin:     "bg-violet-500/15 text-violet-400 border-violet-500/20",
  swift:      "bg-orange-400/15 text-orange-300 border-orange-400/20",
  haskell:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

const getLangColor = (lang?: string | null) =>
  lang ? (LANG_COLORS[lang.toLowerCase()] ?? "bg-secondary text-muted-foreground border-white/5") : "bg-secondary text-muted-foreground border-white/5";

export default function Profile() {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken(true);
      const apiBase = import.meta.env.VITE_API_URL || "https://polyglot-api-okgo.onrender.com";
      const res = await fetch(`${apiBase}/api/projects?page=${page}&limit=12`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: ProjectsResponse = await res.json();
        setProjects(data.projects);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, [user, page]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Auto-dismiss delete confirm
  useEffect(() => {
    if (deleteConfirm === null) return;
    const t = setTimeout(() => setDeleteConfirm(null), 3000);
    return () => clearTimeout(t);
  }, [deleteConfirm]);

  const handleDelete = async (id: number) => {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    if (!user) return;
    setDeletingId(id);
    setDeleteConfirm(null);
    try {
      const token = await user.getIdToken(true);
      const apiBase = import.meta.env.VITE_API_URL || "https://polyglot-api-okgo.onrender.com";
      const res = await fetch(`${apiBase}/api/projects/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setTotal((prev) => prev - 1);
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoadProject = (project: Project) => {
    sessionStorage.setItem("loadProject", JSON.stringify({
      code: project.code,
      filename: project.filename || "",
      language: project.language || "",
      title: project.title,
    }));
    setLocation("/");
  };

  const handleSignOut = async () => { await signOut(); setLocation("/"); };

  const filtered = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.language?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  /* ── Not signed in ── */
  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-10 animate-fade-up">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-secondary to-muted border border-white/5 flex items-center justify-center mb-6 shadow-xl">
          <User className="w-12 h-12 text-muted-foreground/50" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Sign In to Continue</h2>
        <p className="text-muted-foreground text-sm max-w-xs mb-6 leading-relaxed">
          Create an account or sign in to save your code projects and access them from anywhere.
        </p>
        <p className="text-xs text-muted-foreground/50">
          Use the <strong className="text-foreground/60">Sign In</strong> button in the sidebar to get started.
        </p>
      </div>
    );
  }

  const initials = user.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col h-full gap-6 animate-fade-up">

      {/* ── Profile Card ── */}
      <div className="glass-panel rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-18 h-18 rounded-2xl object-cover border-2 border-primary/25 shadow-lg shadow-primary/10"
                style={{ width: 72, height: 72 }}
              />
            ) : (
              <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-primary/25 to-emerald-600/15 border-2 border-primary/25 flex items-center justify-center shadow-lg shadow-primary/10">
                <span className="text-xl font-bold text-primary">{initials}</span>
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-card shadow-sm" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">
              {user.displayName || "Polyglot User"}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{user.email}</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Joined {user.metadata.creationTime ? format(new Date(user.metadata.creationTime), "MMM yyyy") : "recently"}
              </span>
              <span className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <strong className="text-foreground">{total}</strong>&nbsp;project{total !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchProjects}
              title="Refresh"
              className="p-2.5 rounded-xl border border-border bg-secondary/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/25 bg-primary/8 text-primary hover:bg-primary/15 transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> New Project
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 transition-all text-sm font-medium"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ── Projects Section ── */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Saved Projects</h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              Click any card to load it in the editor
            </p>
          </div>
          {/* Search */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or language…"
              className="w-full bg-black/30 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl shimmer border border-white/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 glass-panel rounded-2xl border border-dashed border-border/50">
            <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4 border border-white/5">
              <FolderOpen className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-bold mb-1.5">
              {searchQuery ? "No matches found" : "No Projects Yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              {searchQuery
                ? `No projects match "${searchQuery}". Try a different search.`
                : "Open the editor, write some code, and click Save to create your first project."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setLocation("/")}
                className="mt-5 btn-primary text-xs py-2 px-4"
              >
                <Plus className="w-3.5 h-3.5" /> Go to Editor
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((project, idx) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.04 } }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleLoadProject(project)}
                  className="group glass-panel rounded-2xl border border-border/50 overflow-hidden cursor-pointer hover:border-primary/30 hover:shadow-lg hover:shadow-primary/8 transition-all duration-300"
                >
                  {/* Code Preview */}
                  <div className="h-[88px] bg-slate-900 px-4 py-3 overflow-hidden border-b border-border relative">
                    <pre className="font-mono text-[11px] text-slate-500 leading-relaxed whitespace-pre-wrap select-none pointer-events-none">
                      {project.code.substring(0, 180)}
                    </pre>
                    {/* Fade overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {project.title}
                        </h4>
                        <div className="flex items-center flex-wrap gap-2 mt-2">
                          {project.language && (
                            <Badge className={cn("text-[10px] capitalize border px-2 py-0.5", getLangColor(project.language))}>
                              {project.language}
                            </Badge>
                          )}
                          {project.filename && (
                            <span className="text-[10px] text-muted-foreground/60 font-mono flex items-center gap-1">
                              <FileCode className="w-3 h-3" />{project.filename}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete button — two-click confirm */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                        disabled={deletingId === project.id}
                        title={deleteConfirm === project.id ? "Click again to confirm delete" : "Delete project"}
                        className={cn(
                          "p-2 rounded-lg transition-all shrink-0",
                          deleteConfirm === project.id
                            ? "bg-rose-500/20 text-rose-400 opacity-100"
                            : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400"
                        )}
                      >
                        {deletingId === project.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />
                        }
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground/50">
                      <Clock className="w-3 h-3" />
                      <span title={format(new Date(project.updatedAt), "PPpp")}>
                        Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Load CTA strip */}
                  <div className="px-4 py-2 bg-primary/5 border-t border-primary/10 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-[11px] font-semibold text-primary">Load in Editor</span>
                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary hover:border-primary/20 transition-all disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-sm text-muted-foreground px-3">
              Page <strong className="text-foreground">{page}</strong> of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-secondary hover:border-primary/20 transition-all disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
