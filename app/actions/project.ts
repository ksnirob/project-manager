"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/auth";

export async function createProject(data: {
  title: string;
  clientId: string;
  budget?: number;
  deadline?: Date;
  type?: string;
  hasProjectCredentials?: boolean;
  projectUrl?: string | null;
  cpanelUrl?: string | null;
  cpanelUsername?: string | null;
  cpanelPassword?: string | null;
  adminUrl?: string | null;
  adminUsername?: string | null;
  adminPassword?: string | null;
  projectFilesLink?: string | null;
}) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    const project = await prisma.project.create({
      data: {
        title: data.title,
        clientId: data.clientId,
        budget: data.budget,
        deadline: data.deadline,
        type: data.type,
        createdAt: new Date(),
        hasProjectCredentials: data.hasProjectCredentials ?? false,
        projectUrl: data.projectUrl,
        cpanelUrl: data.cpanelUrl,
        cpanelUsername: data.cpanelUsername,
        cpanelPassword: data.cpanelPassword,
        adminUrl: data.adminUrl,
        adminUsername: data.adminUsername,
        adminPassword: data.adminPassword,
        projectFilesLink: data.projectFilesLink,
      },
    });

    revalidatePath("/projects");
    return { success: true, data: project };
  } catch (error) {
    console.error("Failed to create project:", error);
    return { success: false, error: "Failed to create project" };
  }
}

export async function updateProject(
  id: string,
  data: {
    title?: string;
    budget?: number;
    deadline?: Date;
    type?: string;
    status?: import("@prisma/client").ProjectStatus;
    hasProjectCredentials?: boolean;
    projectUrl?: string | null;
    cpanelUrl?: string | null;
    cpanelUsername?: string | null;
    cpanelPassword?: string | null;
    adminUrl?: string | null;
    adminUsername?: string | null;
    adminPassword?: string | null;
    projectFilesLink?: string | null;
  }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    const project = await prisma.project.update({
      where: { id },
      data,
    });

    revalidatePath("/projects");
    return { success: true, data: project };
  } catch (error) {
    console.error("Failed to update project:", error);
    return { success: false, error: "Failed to update project" };
  }
}

export async function deleteProject(id: string) {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.project.delete({ where: { id } });
    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete project:", error);
    return { success: false, error: "Failed to delete project" };
  }
}
