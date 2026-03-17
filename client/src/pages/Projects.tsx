import { useActiveProject } from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderKanban,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Globe,
  FileText,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

export default function Projects() {
  const { projects, isLoading, setActiveProjectId, activeProject } = useActiveProject();
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<{ id: number; name: string; color: string; domain: string; description: string } | null>(null);

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: (newProject) => {
      utils.projects.list.invalidate();
      setCreateOpen(false);
      if (newProject) setActiveProjectId(newProject.id);
      toast.success("Project created successfully");
    },
    onError: () => toast.error("Failed to create project"),
  });

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      setEditProject(null);
      toast.success("Project updated");
    },
    onError: () => toast.error("Failed to update project"),
  });

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      toast.success("Project deleted");
    },
    onError: () => toast.error("Failed to delete project"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your content projects and their settings.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl font-bold shadow-md">
              <Plus className="w-4 h-4" /> New Project
            </Button>
          </DialogTrigger>
          <ProjectFormDialog
            title="Create Project"
            description="Set up a new content project."
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FolderKanban className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-1">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Create your first project to start organizing your SEO content, keywords, and topic clusters.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2 rounded-xl font-bold">
              <Plus className="w-4 h-4" /> Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <Card
              key={project.id}
              className={`shadow-sm cursor-pointer transition-all hover:shadow-md ${activeProject?.id === project.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setActiveProjectId(project.id)}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: project.color }}>
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">{project.name}</CardTitle>
                    {project.domain && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Globe className="w-3 h-3" /> {project.domain}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditProject({
                          id: project.id,
                          name: project.name,
                          color: project.color,
                          domain: project.domain ?? "",
                          description: project.description ?? "",
                        });
                      }}
                      className="cursor-pointer"
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Are you sure you want to delete this project?")) {
                          deleteMutation.mutate({ id: project.id });
                        }
                      }}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                {project.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> 0 articles</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 0 published</span>
                </div>
                {activeProject?.id === project.id && (
                  <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    Active
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editProject && (
        <Dialog open={!!editProject} onOpenChange={(open) => !open && setEditProject(null)}>
          <ProjectFormDialog
            title="Edit Project"
            description="Update your project settings."
            defaultValues={editProject}
            onSubmit={(data) => updateMutation.mutate({ id: editProject.id, ...data })}
            isLoading={updateMutation.isPending}
          />
        </Dialog>
      )}
    </div>
  );
}

// ---- Project Form Dialog ----
function ProjectFormDialog({
  title,
  description,
  defaultValues,
  onSubmit,
  isLoading,
}: {
  title: string;
  description: string;
  defaultValues?: { name: string; color: string; domain: string; description: string };
  onSubmit: (data: { name: string; color?: string; domain?: string; description?: string }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [color, setColor] = useState(defaultValues?.color ?? "#6366f1");
  const [domain, setDomain] = useState(defaultValues?.domain ?? "");
  const [desc, setDesc] = useState(defaultValues?.description ?? "");

  return (
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Project Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Medicare FAQ" />
        </div>
        <div className="grid gap-2">
          <Label>Color</Label>
          <div className="flex gap-2 flex-wrap">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg transition-all ${color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="domain">Domain (optional)</Label>
          <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. example.com" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Input id="description" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Brief description of this project" />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => onSubmit({ name, color, domain: domain || undefined, description: desc || undefined })}
          disabled={!name.trim() || isLoading}
          className="font-bold"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues ? "Save Changes" : "Create Project"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
