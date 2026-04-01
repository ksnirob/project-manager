"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { isAdminAuthenticated } from "@/lib/auth";

export async function createTask(data: {
  title: string;
  projectId: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date;
}) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        projectId: data.projectId,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate,
        createdAt: new Date(),
        order: await prisma.task.count({
            where: { projectId: data.projectId, status: TaskStatus.TODO }
        })
      },
    });

    revalidatePath("/tasks");
    return { success: true, data: task };
  } catch (error) {
    console.error("Failed to create task:", error);
    return { success: false, error: "Failed to create task" };
  }
}

export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: Date;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    revalidatePath("/tasks");
    return { success: true, data: task };
  } catch (error) {
    console.error("Failed to update task:", error);
    return { success: false, error: "Failed to update task" };
  }
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
  order: number
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    const task = await prisma.task.update({
      where: { id },
      data: { status, order },
    });

    revalidatePath("/tasks");
    return { success: true, data: task };
  } catch (error) {
    console.error("Failed to update task status:", error);
    return { success: false, error: "Failed to update task status" };
  }
}

export async function deleteTask(id: string) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.task.delete({ where: { id } });
    revalidatePath("/tasks");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete task:", error);
    return { success: false, error: "Failed to delete task" };
  }
}
