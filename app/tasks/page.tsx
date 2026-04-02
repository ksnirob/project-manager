"use client";

import { Suspense, useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { createPortal } from "react-dom";
import { FloatingCard } from "@/components/ui/FloatingCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { GlassModal } from "@/components/ui/GlassModal";
import { Plus, GripVertical, Trash2, Edit, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createTask, updateTask, updateTaskStatus, deleteTask } from "@/lib/actions";
import type { Task, TaskStatus, TaskPriority, Project, Client } from "@prisma/client";

type TimeRange = "all" | "weekly" | "monthly" | "yearly";
const timeRangeOptions: Array<{ value: TimeRange; label: string }> = [
  { value: "all", label: "All" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "yearly", label: "Year" },
];

type TaskWithProject = Task & { project: Project & { client: Client } };

const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: "bg-white/10", text: "text-white/60", border: "border-white/10" },
  MEDIUM: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/20" },
  HIGH: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/20" },
  URGENT: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/20" },
};

const columnColors: Record<string, { header: string; border: string; bg: string }> = {
  "col-todo": { header: "text-white/60", border: "border-white/10", bg: "bg-white/[0.02]" },
  "col-inprogress": { header: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/5" },
  "col-done": { header: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
};

type TaskData = Record<string, { id: string; content: string; priority: string; projectId: string; description?: string; dueDate?: Date | null }>;

function KanbanBoardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdFilter = searchParams.get("projectId");
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  const fetchData = async () => {
    try {
      const tasksUrl = projectIdFilter
        ? `/api/tasks?projectId=${encodeURIComponent(projectIdFilter)}`
        : "/api/tasks";

      const [tasksRes, projectsRes] = await Promise.all([
        fetch(tasksUrl),
        fetch("/api/projects"),
      ]);

      if (tasksRes.status === 401 || projectsRes.status === 401) {
        router.replace("/login");
        return;
      }

      const [tasksData, projectsData] = await Promise.all([
        tasksRes.json(),
        projectsRes.json(),
      ]);

      if (!tasksRes.ok || !Array.isArray(tasksData)) {
        console.error("Failed to fetch tasks:", tasksData);
        setTasks([]);
      } else {
        setTasks(tasksData);
      }

      if (!projectsRes.ok || !Array.isArray(projectsData)) {
        console.error("Failed to fetch projects:", projectsData);
        setProjects([]);
      } else {
        setProjects(projectsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setTasks([]);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, [projectIdFilter]);

  const filteredProjectTitle = projectIdFilter
    ? projects.find((project) => project.id === projectIdFilter)?.title
    : null;

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

  const filteredTasks = tasks.filter((task) => isInTimeRange(task.createdAt));

  const data = {
    tasks: filteredTasks.reduce((acc, task) => {
      acc[task.id] = {
        id: task.id,
        content: task.title,
        priority: task.priority,
        projectId: task.projectId,
        description: task.description || undefined,
        dueDate: task.dueDate || undefined,
      };
      return acc;
    }, {} as TaskData),
    columns: {
      "col-todo": {
        id: "col-todo",
        title: "To Do",
        taskIds: filteredTasks.filter((t) => t.status === "TODO").map((t) => t.id),
      },
      "col-inprogress": {
        id: "col-inprogress",
        title: "In Progress",
        taskIds: filteredTasks.filter((t) => t.status === "IN_PROGRESS").map((t) => t.id),
      },
      "col-done": {
        id: "col-done",
        title: "Done",
        taskIds: filteredTasks.filter((t) => t.status === "DONE").map((t) => t.id),
      },
    },
    columnOrder: ["col-todo", "col-inprogress", "col-done"],
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const statusMap: Record<string, TaskStatus> = {
      "col-todo": "TODO",
      "col-inprogress": "IN_PROGRESS",
      "col-done": "DONE",
    };

    const newStatus = statusMap[destination.droppableId];

    try {
      await updateTaskStatus(draggableId, newStatus, destination.index);
      await fetchData();
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const taskData = {
      title: formData.get("title") as string,
      projectId: formData.get("projectId") as string,
      description: formData.get("description") as string || undefined,
      priority: formData.get("priority") as TaskPriority,
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : undefined,
    };

    try {
      await createTask(taskData);
      await fetchData();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTask) return;
    
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const taskData = {
      title: formData.get("title") as string,
      projectId: formData.get("projectId") as string,
      description: formData.get("description") as string || undefined,
      priority: formData.get("priority") as TaskPriority,
      status: formData.get("status") as TaskStatus,
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : undefined,
    };

    try {
      await updateTask(editingTask.id, taskData);
      await fetchData();
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error("Failed to update task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      await deleteTask(id);
      await fetchData();
    }
  };

  const openEditModal = (task: TaskWithProject) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const isOverdue = (dueDate: Date | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Task Board</h1>
          <p className="text-white/50">Drag and drop tasks to update their status.</p>
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
          <AnimatedButton onClick={openCreateModal}>
            <Plus className="w-5 h-5" /> Add Task
          </AnimatedButton>
        </div>
      </div>

      {projectIdFilter && (
        <FloatingCard className="!p-4 border-indigo-500/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm text-indigo-200">
              Showing tasks for project: <span className="font-semibold">{filteredProjectTitle || "Selected project"}</span>
            </p>
            <Link
              href="/tasks"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Clear filter
            </Link>
          </div>
        </FloatingCard>
      )}

      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full min-w-[900px]">
            {data.columnOrder.map((columnId) => {
              const column = data.columns[columnId as keyof typeof data.columns];
              const columnTaskIds = column.taskIds;
              const colors = columnColors[column.id];

              return (
                <div key={column.id} className="flex-1 flex flex-col min-w-[280px] w-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${column.id === "col-todo" ? "bg-white/40" : column.id === "col-inprogress" ? "bg-blue-500" : "bg-emerald-500"}`} />
                      <h3 className={`font-semibold ${colors.header}`}>{column.title}</h3>
                    </div>
                    <span className="bg-white/10 px-2.5 py-1 rounded-lg text-xs font-medium text-white/50">
                      {columnTaskIds.length}
                    </span>
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 min-h-[500px] rounded-2xl p-3 transition-all duration-300 border ${
                          snapshot.isDraggingOver
                            ? `bg-indigo-500/10 border-indigo-500/30`
                            : colors.border
                        }`}
                      >
                        {isLoading ? (
                          <div className="space-y-3">
                            {[1, 2].map((i) => (
                              <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
                            ))}
                          </div>
                        ) : (
                          columnTaskIds.map((taskId, index) => {
                            const task = data.tasks[taskId];
                            const fullTask = tasks.find((t) => t.id === task.id);
                            const priorityStyle = priorityColors[task.priority];
                            const taskOverdue = task.dueDate && fullTask && isOverdue(fullTask.dueDate) && column.id !== "col-done";

                            return (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  (() => {
                                    const draggableContent = (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className="mb-3"
                                        style={{
                                          ...provided.draggableProps.style,
                                          ...(snapshot.isDragging ? { zIndex: 9999 } : {}),
                                        }}
                                      >
                                        <FloatingCard
                                          hoverEffect={false}
                                          className={`p-4 transition-all duration-200 ${
                                            snapshot.isDragging
                                              ? "rotate-2 scale-105 shadow-xl shadow-indigo-500/20"
                                              : "hover:border-indigo-500/20"
                                          }`}
                                        >
                                          <div className="flex items-start gap-3">
                                            <div
                                              {...provided.dragHandleProps}
                                              className="text-white/30 hover:text-white/60 cursor-grab active:cursor-grabbing pt-0.5"
                                            >
                                              <GripVertical size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-start justify-between gap-2 mb-2">
                                                <p className="font-medium text-sm text-white/90 leading-snug">
                                                  {task.content}
                                                </p>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <button
                                                    onClick={() => openEditModal(fullTask!)}
                                                    className="text-white/30 hover:text-white/70 transition-colors p-1"
                                                  >
                                                    <Edit size={14} />
                                                  </button>
                                                  <button
                                                    onClick={() => handleDeleteTask(task.id)}
                                                    className="text-white/30 hover:text-red-400 transition-colors p-1"
                                                  >
                                                    <Trash2 size={14} />
                                                  </button>
                                                </div>
                                              </div>

                                              {task.description && (
                                                <p className="text-xs text-white/40 mb-3 line-clamp-2">
                                                  {task.description}
                                                </p>
                                              )}

                                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-md border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
                                                  {task.priority}
                                                </span>
                                                {fullTask?.project && (
                                                  <span className="text-[10px] px-2 py-1 rounded-md bg-white/5 text-white/40 border border-white/10">
                                                    {fullTask.project.title}
                                                  </span>
                                                )}
                                              </div>

                                              {task.dueDate && (
                                                <div className={`flex items-center gap-1.5 text-xs ${taskOverdue ? "text-red-400" : "text-white/40"}`}>
                                                  {taskOverdue ? <Clock size={12} /> : <Calendar size={12} />}
                                                  <span>{new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                                  {taskOverdue && <span className="text-[10px] font-medium">(Overdue)</span>}
                                                </div>
                                              )}

                                              <div className="mt-2 text-[11px] text-white/40">
                                                Created {new Date(fullTask?.createdAt || new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                              </div>
                                            </div>
                                          </div>
                                        </FloatingCard>
                                      </div>
                                    );

                                    return snapshot.isDragging ? createPortal(draggableContent, document.body) : draggableContent;
                                  })()
                                )}
                              </Draggable>
                            );
                          })
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      <GlassModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTask ? "Edit Task" : "Add Task"}
      >
        <form className="space-y-4" onSubmit={editingTask ? handleUpdateTask : handleCreateTask}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Task Title *</label>
            <input
              type="text"
              name="title"
              placeholder="e.g. Design landing page"
              required
              defaultValue={editingTask?.title}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Project *</label>
            <select
              name="projectId"
              required
              defaultValue={editingTask?.projectId || projectIdFilter || ""}
              className="w-full"
            >
              <option value="" disabled>Select Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80">Priority</label>
              <select
                name="priority"
                defaultValue={editingTask?.priority || "MEDIUM"}
                className="w-full"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80">Deadline</label>
              <input
                type="date"
                name="dueDate"
                defaultValue={editingTask?.dueDate ? new Date(editingTask.dueDate).toISOString().split("T")[0] : ""}
                className="w-full"
              />
            </div>
          </div>
          {editingTask && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80">Status</label>
              <select
                name="status"
                defaultValue={editingTask.status}
                className="w-full"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Description</label>
            <textarea
              name="description"
              placeholder="Task details..."
              rows={3}
              defaultValue={editingTask?.description || ""}
              className="w-full resize-none"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <AnimatedButton type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </AnimatedButton>
            <AnimatedButton type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
            </AnimatedButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}

export default function KanbanBoard() {
  return (
    <Suspense fallback={<div className="p-4 text-white/60">Loading tasks...</div>}>
      <KanbanBoardContent />
    </Suspense>
  );
}
