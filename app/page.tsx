"use client";

import { useState, useEffect } from "react";
import { FloatingCard } from "@/components/ui/FloatingCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Users, Briefcase, CheckCircle, TrendingUp, Clock, DollarSign, ArrowRight, FileText, Folder, ListTodo } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import Link from "next/link";

interface RecentProject {
  id: string;
  title: string;
  status: string;
  createdAt: Date | string;
  client?: { name: string };
}

interface RecentInvoice {
  id: string;
  invoiceNo: string;
  status: string;
  amount: number;
  createdAt: Date | string;
  client?: { name: string };
}

interface DashboardStats {
  totalClients: number;
  activeProjects: number;
  completedTasks: number;
  pendingTasks: number;
  totalProjects: number;
  monthlyRevenue: number;
  totalRevenue: number;
  revenueChartData: { name: string; revenue: number }[];
  recentProjects: RecentProject[];
  recentInvoices: RecentInvoice[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        const data = await res.json();
        if (res.ok && data.totalClients !== undefined) {
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  const statCards = [
    { title: "Total Clients", value: stats?.totalClients || 0, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10", link: "/clients" },
    { title: "Active Projects", value: stats?.activeProjects || 0, icon: Briefcase, color: "text-pink-400", bg: "bg-pink-500/10", link: "/projects" },
    { title: "Tasks Completed", value: stats?.completedTasks || 0, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", link: "/tasks" },
    { title: "Monthly Revenue", value: `$${(stats?.monthlyRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10", link: "/invoices" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-white/50">Welcome back! Here&apos;s what&apos;s happening with your business.</p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {statCards.map((stat, i) => (
          <motion.div key={i} variants={item}>
            <Link href={stat.link}>
              <FloatingCard className="h-full cursor-pointer group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/50 mb-1">{stat.title}</p>
                    <h3 className="text-3xl font-bold text-white">
                      {isLoading ? "..." : stat.value}
                    </h3>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm text-white/40 group-hover:text-white/60 transition-colors">
                  View details <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </FloatingCard>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2">
          <FloatingCard className="h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Revenue Overview</h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-white/50">Revenue</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : stats?.revenueChartData && stats.revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.4)" axisLine={false} tickLine={false} tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgba(15, 15, 15, 0.95)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)" }}
                      itemStyle={{ color: "#fff" }}
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-white/40">
                  No revenue data available yet
                </div>
              )}
            </div>
          </FloatingCard>
        </div>

        <div className="col-span-1">
          <FloatingCard className="h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Quick Overview</h3>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                    <ListTodo size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-white/50">Pending Tasks</p>
                    <p className="text-xl font-semibold">{isLoading ? "..." : stats?.pendingTasks || 0}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-white/50">Total Projects</p>
                    <p className="text-xl font-semibold">{isLoading ? "..." : stats?.totalProjects || 0}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-white/50">Total Revenue</p>
                    <p className="text-xl font-semibold">{isLoading ? "..." : `$${(stats?.totalRevenue || 0).toLocaleString()}`}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-white/70">Quick Actions</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/projects">
                  <AnimatedButton variant="secondary" size="sm" className="w-full justify-start">
                    <Folder size={16} />
                    New Project
                  </AnimatedButton>
                </Link>
                <Link href="/invoices">
                  <AnimatedButton variant="secondary" size="sm" className="w-full justify-start">
                    <FileText size={16} />
                    New Invoice
                  </AnimatedButton>
                </Link>
              </div>
            </div>
          </FloatingCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FloatingCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Recent Projects</h3>
              <Link href="/projects" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                View all
              </Link>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : stats?.recentProjects && stats.recentProjects.length > 0 ? (
              <div className="space-y-3">
                {stats.recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                        <Briefcase size={18} />
                      </div>
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <p className="text-sm text-white/40">{project.client?.name}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/60">
                      {project.status?.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-white/40 py-8">No projects yet. Create your first project!</p>
            )}
          </FloatingCard>
        </div>

        <div className="lg:col-span-1">
          <FloatingCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Recent Invoices</h3>
              <Link href="/invoices" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                View all
              </Link>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {stats.recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <FileText size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{invoice.invoiceNo}</p>
                        <p className="text-xs text-white/40">{invoice.client?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">${invoice.amount?.toLocaleString()}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        invoice.status === "PAID" ? "bg-emerald-500/20 text-emerald-400" :
                        invoice.status === "PARTIAL" ? "bg-amber-500/20 text-amber-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-white/40 py-8">No invoices yet. Create your first invoice!</p>
            )}
          </FloatingCard>
        </div>
      </div>
    </div>
  );
}
