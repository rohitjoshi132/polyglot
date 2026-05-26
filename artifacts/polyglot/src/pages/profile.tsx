import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Calendar,
  Code2,
  Search,
  Trash2,
  FolderOpen,
  Loader2,
  LogOut,
  ArrowRight,
  FileCode,
  Clock,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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

  const fetchProjects = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const apiBase = import.meta.env.VITE_API_URL || "";
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

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (id: number) => {
    if (!user) return;
    setDeletingId(id);
    try {
      const token = await user.getIdToken();
      const apiBase = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiBase}/api/projects/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setTotal((prev) => prev - 1);
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoadProject = (project: Project) => {
    // Store in sessionStorage so the editor can pick it up
    sessionStorage.setItem(
      "loadProject",
      JSON.stringify({
        code: project.code,
        filename: project.filename || "",
        language: project.language || "",
        title: project.title,
      })
    );
    setLocation("/");
  };

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.language && p.language.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-6 border border-white/5">
          <User className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Not Signed In</h2>
        <p className="text-muted-foreground max-w-sm mb-6">
          Sign in to save your code projects and access them from anywhere.
        </p>
      </div>
    );
  }

  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Profile Header */}
      <div className="glass-panel rounded-2xl border border-border/50 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/30 shadow-lg shadow-primary/10"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-emerald-600/20 border-2 border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
                <span className="text-2xl font-bold text-primary">{initials}</span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-card" />
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {user.displayName || "Polyglot User"}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>
                  Joined{" "}
                  {user.metadata.creationTime
                    ? format(new Date(user.metadata.creationTime), "MMM yyyy")
                    : "recently"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Code2 className="w-4 h-4" />
                <span>{total} saved project{total !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 transition-all text-sm font-medium text-muted-foreground"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Projects Section */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Saved Projects</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Your saved code projects. Click to load in the editor.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full bg-black/40 border border-white/5 rounded-lg py-2 pl-9 pr-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 glass-panel rounded-2xl border-dashed border-border/50">
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4 border border-white/5">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-1">No Projects Yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {searchQuery
                ? "No projects match your search."
                : "Go to the editor, write some code, and click Save to store your first project."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-panel rounded-xl border border-border/50 overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
                  onClick={() => handleLoadProject(project)}
                >
                  {/* Code Preview */}
                  <div className="h-24 bg-[#0a0a0c] p-3 overflow-hidden border-b border-border/50">
                    <pre className="font-mono text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap">
                      {project.code.substring(0, 200)}
                    </pre>
                  </div>

                  {/* Project Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {project.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-2">
                          {project.language && (
                            <Badge
                              variant="secondary"
                              className="text-xs capitalize bg-secondary text-secondary-foreground border-white/5"
                            >
                              {project.language}
                            </Badge>
                          )}
                          {project.filename && (
                            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                              <FileCode className="w-3 h-3" />
                              {project.filename}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }}
                        disabled={deletingId === project.id}
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-400 text-muted-foreground transition-all"
                      >
                        {deletingId === project.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(project.updatedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                    </div>
                  </div>

                  {/* Load Indicator */}
                  <div className="px-4 py-2 bg-primary/5 border-t border-primary/10 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-primary font-medium">Load in Editor</span>
                    <ArrowRight className="w-3 h-3 text-primary" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground px-4">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
