"use client";

import { useState, useEffect } from "react";
import { FloatingCard } from "@/components/ui/FloatingCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { GlassModal } from "@/components/ui/GlassModal";
import { Plus, MoreVertical, Calendar, DollarSign, Edit, Trash2, Folder, ArrowRight, Eye } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProject, updateProject, deleteProject } from "@/lib/actions";
import { Project, Client, ProjectStatus } from "@prisma/client";

type TimeRange = "all" | "weekly" | "monthly" | "yearly";
const timeRangeOptions: Array<{ value: TimeRange; label: string }> = [
  { value: "all", label: "All" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "yearly", label: "Year" },
];

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  ACTIVE: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
  PLANNING: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/20" },
  ON_HOLD: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/20" },
  COMPLETED: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/20" },
  CANCELLED: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/20" },
};

const statusProgress: Record<string, string> = {
  ACTIVE: "w-[60%]",
  PLANNING: "w-[20%]",
  ON_HOLD: "w-[35%]",
  COMPLETED: "w-full",
  CANCELLED: "w-[10%]",
};

const projectTypes = [
  "Web Development",
  "UI/UX",
  "Logo Design",
  "SEO",
  "Bug Fix",
] as const;

type ProjectWithClient = Project & { client: Client };

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithClient | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [includeCredentials, setIncludeCredentials] = useState(false);
  const [viewingProject, setViewingProject] = useState<ProjectWithClient | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  const fetchData = async () => {
    try {
      const [projectsRes, clientsRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/clients"),
      ]);

      if (projectsRes.status === 401 || clientsRes.status === 401) {
        router.replace("/login");
        return;
      }

      const projectsData = await projectsRes.json();
      const clientsData = await clientsRes.json();

      if (!projectsRes.ok || !Array.isArray(projectsData)) {
        console.error("Failed to fetch projects:", projectsData);
        setProjects([]);
      } else {
        setProjects(projectsData);
      }

      if (!clientsRes.ok || !Array.isArray(clientsData)) {
        console.error("Failed to fetch clients:", clientsData);
        setClients([]);
      } else {
        setClients(clientsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setProjects([]);
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const hasProjectCredentials = formData.get("hasProjectCredentials") === "on";
    const getOptionalField = (field: string) => {
      const value = formData.get(field)?.toString().trim();
      return value ? value : null;
    };

    const data = {
      title: formData.get("title") as string,
      clientId: formData.get("clientId") as string,
      budget: formData.get("budget") ? Number(formData.get("budget")) : undefined,
      deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : undefined,
      type: formData.get("type") as string || undefined,
      status: (formData.get("status") as ProjectStatus | null) ?? undefined,
      hasProjectCredentials,
      projectUrl: hasProjectCredentials ? getOptionalField("projectUrl") : null,
      cpanelUrl: hasProjectCredentials ? getOptionalField("cpanelUrl") : null,
      cpanelUsername: hasProjectCredentials ? getOptionalField("cpanelUsername") : null,
      cpanelPassword: hasProjectCredentials ? getOptionalField("cpanelPassword") : null,
      adminUrl: hasProjectCredentials ? getOptionalField("adminUrl") : null,
      adminUsername: hasProjectCredentials ? getOptionalField("adminUsername") : null,
      adminPassword: hasProjectCredentials ? getOptionalField("adminPassword") : null,
      projectFilesLink: hasProjectCredentials ? getOptionalField("projectFilesLink") : null,
    };

    try {
      if (editingProject) {
        const result = await updateProject(editingProject.id, data);
        if (!result.success) {
          alert(result.error || "Failed to update project");
          return;
        }
      } else {
        const result = await createProject(data);
        if (!result.success) {
          alert(result.error || "Failed to create project");
          return;
        }
      }
      await fetchData();
      setIsModalOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error("Failed to save project:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (project: ProjectWithClient) => {
    setEditingProject(project);
    setIncludeCredentials(
      Boolean(
        project.hasProjectCredentials ||
        project.projectUrl ||
        project.cpanelUrl ||
        project.cpanelUsername ||
        project.cpanelPassword ||
        project.adminUrl ||
        project.adminUsername ||
        project.adminPassword ||
        project.projectFilesLink
      )
    );
    setIsModalOpen(true);
    setMenuOpen(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this project? All related tasks will also be deleted.")) {
      await deleteProject(id);
      await fetchData();
    }
    setMenuOpen(null);
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setIncludeCredentials(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setIncludeCredentials(false);
  };

  const openViewProjectModal = (project: ProjectWithClient) => {
    setViewingProject(project);
  };

  const closeViewProjectModal = () => {
    setViewingProject(null);
  };

  const getStatusStyle = (status: ProjectStatus) => {
    return statusColors[status] || statusColors.PLANNING;
  };

  const projectTypeOptions = editingProject?.type && !projectTypes.includes(editingProject.type as (typeof projectTypes)[number])
    ? [editingProject.type, ...projectTypes]
    : projectTypes;

  const isInTimeRange = (dateValue: string | Date) => {
    if (timeRange === "all") return true;

    const createdAt = new Date(dateValue);
    const now = new Date();
    const rangeStart = new Date(now);

    if (timeRange === "weekly") {
      rangeStart.setDate(now.getDate() - 7);
    } else if (timeRange === "monthly") {
      rangeStart.setMonth(now.getMonth() - 1);
    } else {
      rangeStart.setFullYear(now.getFullYear() - 1);
    }

    return createdAt >= rangeStart;
  };

  const filteredProjects = projects
    .filter((project) => isInTimeRange(project.createdAt))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Projects</h1>
          <p className="text-white/50">Manage and track all your projects in one place.</p>
        </div>
        <div className="flex w-full md:w-auto flex-col md:flex-row gap-3">
          <div className="grid grid-cols-4 rounded-xl border border-white/10 bg-white/5 p-1">
            {timeRangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTimeRange(option.value)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  timeRange === option.value
                    ? "bg-indigo-500/30 text-indigo-100"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <AnimatedButton onClick={openCreateModal} className="w-full md:w-auto">
            <Plus className="w-5 h-5" />
            New Project
          </AnimatedButton>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <FloatingCard className="text-center py-20">
          <Folder className="w-20 h-20 mx-auto mb-6 text-white/15" />
          <p className="text-white/50 text-xl mb-2">No projects yet</p>
          <p className="text-white/30 mb-8">
            {timeRange === "all" ? "Create your first project to get started." : "No projects found in this time range."}
          </p>
          <AnimatedButton onClick={openCreateModal}>
            <Plus className="w-4 h-4" />
            Create First Project
          </AnimatedButton>
        </FloatingCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project, i) => {
            const statusStyle = getStatusStyle(project.status);
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4, type: "spring" }}
              >
                <FloatingCard className="h-full flex flex-col group relative">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-[50px] group-hover:bg-indigo-500/10 transition-colors" />

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                          <Folder size={18} />
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          {project.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}
                          className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {menuOpen === project.id && (
                          <div className="absolute right-0 mt-1 w-36 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl py-1 z-20 shadow-xl">
                            <button
                              onClick={() => handleEdit(project)}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-2.5 text-white/80"
                            >
                              <Edit size={14} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(project.id)}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-2.5 text-red-400"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-1">{project.title}</h3>
                      {project.type && (
                        <p className="text-sm text-indigo-400 mb-1">{project.type}</p>
                      )}
                      <p className="text-sm text-white/50 mb-5">{project.client.name}</p>
                    </div>

                    <div className="space-y-3 border-t border-white/10 pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-white/60">
                          <Calendar size={16} className="text-indigo-400/60" />
                          <span>
                            {project.deadline
                              ? new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "No deadline"}
                          </span>
                        </div>
                        {project.budget && (
                          <div className="flex items-center gap-2 text-white/60">
                            <DollarSign size={16} className="text-emerald-400/60" />
                            <span>${project.budget.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-white/45">
                        Created {new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>

                      <div className="relative">
                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ${statusProgress[project.status]}`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <Link
                        href={`/tasks?projectId=${project.id}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/60 hover:text-white transition-colors"
                      >
                        View Tasks <ArrowRight size={14} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => openViewProjectModal(project)}
                        className="cursor-pointer flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/60 hover:text-white transition-colors"
                      >
                        View Project <Eye size={14} />
                      </button>
                    </div>
                  </div>
                </FloatingCard>
              </motion.div>
            );
          })}
        </div>
      )}

      <GlassModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProject ? "Edit Project" : "Create Project"}
        className="max-w-2xl"
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Project Title *</label>
            <input
              type="text"
              name="title"
              placeholder="e.g. Website Redesign"
              required
              defaultValue={editingProject?.title}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Project Type</label>
            <select
              name="type"
              defaultValue={editingProject?.type || ""}
              className="w-full"
            >
              <option value="">Select project type</option>
              {projectTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Client *</label>
            <select
              name="clientId"
              required
              defaultValue={editingProject?.clientId}
              className="w-full"
            >
              <option value="" disabled>Select Client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80">Budget ($)</label>
              <input
                type="number"
                name="budget"
                placeholder="10000"
                defaultValue={editingProject?.budget || ""}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80">Deadline</label>
              <input
                type="date"
                name="deadline"
                defaultValue={
                  editingProject?.deadline
                    ? new Date(editingProject.deadline).toISOString().split("T")[0]
                    : ""
                }
                className="w-full"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
            <label className="flex items-center gap-3 text-sm font-medium text-white/80 cursor-pointer select-none">
              <input
                type="checkbox"
                name="hasProjectCredentials"
                checked={includeCredentials}
                onChange={(e) => setIncludeCredentials(e.target.checked)}
                className="h-4 w-4 rounded border-white/30 bg-transparent text-indigo-500 focus:ring-indigo-500"
              />
              Project Credentials
            </label>

            {includeCredentials && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/80">Project URL</label>
                  <input
                    type="url"
                    name="projectUrl"
                    placeholder="https://example.com"
                    defaultValue={editingProject?.projectUrl || ""}
                    className="w-full"
                  />
                </div>

                <div className="rounded-xl border border-white/10 p-3 space-y-3">
                  <p className="text-xs uppercase tracking-wide text-white/50">Cpanel Details</p>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-white/80">Cpanel URL</label>
                    <input
                      type="url"
                      name="cpanelUrl"
                      placeholder="https://cpanel.example.com"
                      defaultValue={editingProject?.cpanelUrl || ""}
                      className="w-full"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-white/80">Username</label>
                      <input
                        type="text"
                        name="cpanelUsername"
                        placeholder="cpanel username"
                        defaultValue={editingProject?.cpanelUsername || ""}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-white/80">Password</label>
                      <input
                        type="text"
                        name="cpanelPassword"
                        placeholder="cpanel password"
                        defaultValue={editingProject?.cpanelPassword || ""}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 p-3 space-y-3">
                  <p className="text-xs uppercase tracking-wide text-white/50">Admin URL</p>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-white/80">Admin URL</label>
                    <input
                      type="url"
                      name="adminUrl"
                      placeholder="https://example.com/admin"
                      defaultValue={editingProject?.adminUrl || ""}
                      className="w-full"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-white/80">Username</label>
                      <input
                        type="text"
                        name="adminUsername"
                        placeholder="admin username"
                        defaultValue={editingProject?.adminUsername || ""}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-white/80">Password</label>
                      <input
                        type="text"
                        name="adminPassword"
                        placeholder="admin password"
                        defaultValue={editingProject?.adminPassword || ""}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/80">Project Files Link</label>
                  <input
                    type="url"
                    name="projectFilesLink"
                    placeholder="https://drive.google.com/..."
                    defaultValue={editingProject?.projectFilesLink || ""}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
          {editingProject && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80">Status</label>
              <select
                name="status"
                defaultValue={editingProject.status}
                className="w-full"
              >
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}
          <div className="pt-4 flex justify-end gap-3">
            <AnimatedButton type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </AnimatedButton>
            <AnimatedButton type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingProject ? "Update Project" : "Create Project"}
            </AnimatedButton>
          </div>
        </form>
      </GlassModal>

      <GlassModal
        isOpen={Boolean(viewingProject)}
        onClose={closeViewProjectModal}
        title="Project Details"
        className="max-w-4xl"
      >
        {viewingProject && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/50 mb-2">Title</p>
                <p className="text-white/90 font-medium">{viewingProject.title}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/50 mb-2">Client</p>
                <p className="text-white/90 font-medium">{viewingProject.client.name}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/50 mb-2">Status</p>
                <p className="text-white/90 font-medium">{viewingProject.status.replace("_", " ")}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/50 mb-2">Type</p>
                <p className="text-white/90 font-medium">{viewingProject.type || "-"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/50 mb-2">Budget</p>
                <p className="text-white/90 font-medium">
                  {typeof viewingProject.budget === "number" ? `$${viewingProject.budget.toLocaleString()}` : "-"}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/50 mb-2">Deadline</p>
                <p className="text-white/90 font-medium">
                  {viewingProject.deadline
                    ? new Date(viewingProject.deadline).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "-"}
                </p>
              </div>
            </div>

            {(viewingProject.hasProjectCredentials ||
              viewingProject.projectUrl ||
              viewingProject.cpanelUrl ||
              viewingProject.cpanelUsername ||
              viewingProject.cpanelPassword ||
              viewingProject.adminUrl ||
              viewingProject.adminUsername ||
              viewingProject.adminPassword ||
              viewingProject.projectFilesLink) && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-white/80">Project Credentials</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-white/50 mb-1">Project URL</p>
                    <p className="text-white/90 break-all">{viewingProject.projectUrl || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-white/50 mb-1">Files Link</p>
                    <p className="text-white/90 break-all">{viewingProject.projectFilesLink || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-white/50 mb-1">Cpanel URL</p>
                    <p className="text-white/90 break-all">{viewingProject.cpanelUrl || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-white/50 mb-1">Cpanel Username</p>
                    <p className="text-white/90 break-all">{viewingProject.cpanelUsername || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-white/50 mb-1">Cpanel Password</p>
                    <p className="text-white/90 break-all">{viewingProject.cpanelPassword || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-white/50 mb-1">Admin URL</p>
                    <p className="text-white/90 break-all">{viewingProject.adminUrl || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-white/50 mb-1">Admin Username</p>
                    <p className="text-white/90 break-all">{viewingProject.adminUsername || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-white/50 mb-1">Admin Password</p>
                    <p className="text-white/90 break-all">{viewingProject.adminPassword || "-"}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Link
                href={`/tasks?projectId=${viewingProject.id}`}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-sm text-indigo-200 transition-colors"
                onClick={closeViewProjectModal}
              >
                View Project Tasks <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
}
