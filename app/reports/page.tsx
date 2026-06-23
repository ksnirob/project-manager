"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FloatingCard } from "@/components/ui/FloatingCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Briefcase, CheckCircle, DollarSign, FileText, FolderKanban, RefreshCw, Users } from "lucide-react";
import Link from "next/link";

type StatusCount = {
  name: string;
  value: number;
};

type ProjectItem = {
  id: string;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  createdAt: string | Date;
};

type TaskItem = {
  id: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  createdAt: string | Date;
};

type InvoiceItem = {
  id: string;
  status: "UNPAID" | "PARTIAL" | "PAID";
  amount: number;
  createdAt: string | Date;
  paidAt?: string | Date | null;
};

type StatsResponse = {
  totalClients: number;
  activeProjects: number;
  completedTasks: number;
  pendingTasks: number;
  totalProjects: number;
  monthlyRevenue: number;
  totalRevenue: number;
  revenueChartData: { name: string; revenue: number }[];
};

type InvoiceResponse = {
  invoices: InvoiceItem[];
  totalOutstanding: number;
  collectedThisMonth: number;
  totalPaid: number;
};

const projectStatusLabels: Record<ProjectItem["status"], string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const taskStatusLabels: Record<TaskItem["status"], string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const invoiceStatusLabels: Record<InvoiceItem["status"], string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partial",
  PAID: "Paid",
};

const chartColors = ["#6366f1", "#ec4899", "#22c55e", "#f59e0b", "#ef4444"];
type DateRangeFilter = "all" | "this_month" | "last_30" | "this_year";
type ProjectStatusFilter = "all" | ProjectItem["status"];
type TaskStatusFilter = "all" | TaskItem["status"];
type InvoiceStatusFilter = "all" | InvoiceItem["status"];

const dateRangeOptions: Array<{ value: DateRangeFilter; label: string }> = [
  { value: "all", label: "All Time" },
  { value: "this_month", label: "This Month" },
  { value: "last_30", label: "Last 30 Days" },
  { value: "this_year", label: "This Year" },
];

const projectStatusOptions: Array<{ value: ProjectStatusFilter; label: string }> = [
  { value: "all", label: "All Projects" },
  ...Object.entries(projectStatusLabels).map(([value, label]) => ({ value: value as ProjectItem["status"], label })),
];

const taskStatusOptions: Array<{ value: TaskStatusFilter; label: string }> = [
  { value: "all", label: "All Tasks" },
  ...Object.entries(taskStatusLabels).map(([value, label]) => ({ value: value as TaskItem["status"], label })),
];

const invoiceStatusOptions: Array<{ value: InvoiceStatusFilter; label: string }> = [
  { value: "all", label: "All Invoices" },
  ...Object.entries(invoiceStatusLabels).map(([value, label]) => ({ value: value as InvoiceItem["status"], label })),
];

const countByStatus = <T extends string>(items: Array<{ status: T }>, labels: Record<T, string>) =>
  Object.entries(labels).map(([status, label]) => ({
    name: label as string,
    value: items.filter((item) => item.status === status).length,
  }));

const getRangeStart = (range: DateRangeFilter) => {
  const now = new Date();

  if (range === "this_month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (range === "last_30") {
    const date = new Date(now);
    date.setDate(now.getDate() - 30);
    return date;
  }

  if (range === "this_year") {
    return new Date(now.getFullYear(), 0, 1);
  }

  return null;
};

const isInDateRange = (value: string | Date | null | undefined, range: DateRangeFilter) => {
  if (range === "all") return true;
  if (!value) return false;

  const date = new Date(value);
  const rangeStart = getRangeStart(range);
  return rangeStart ? date >= rangeStart : true;
};

const getInvoiceDate = (invoice: InvoiceItem) => invoice.paidAt || invoice.createdAt;

const buildRevenueTrend = (invoices: InvoiceItem[]) => {
  const paidInvoices = invoices.filter((invoice) => invoice.status === "PAID");
  const grouped = new Map<string, number>();

  paidInvoices.forEach((invoice) => {
    const date = new Date(invoice.paidAt || invoice.createdAt);
    const key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    grouped.set(key, (grouped.get(key) || 0) + invoice.amount);
  });

  return Array.from(grouped.entries()).map(([name, revenue]) => ({ name, revenue }));
};

export default function ReportsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatusFilter>("all");
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>("all");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatusFilter>("all");

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, projectsRes, tasksRes, invoicesRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/projects"),
        fetch("/api/tasks"),
        fetch("/api/invoices"),
      ]);

      if ([statsRes, projectsRes, tasksRes, invoicesRes].some((res) => res.status === 401)) {
        router.replace("/login");
        return;
      }

      const [statsData, projectsData, tasksData, invoicesData] = await Promise.all([
        statsRes.json(),
        projectsRes.json(),
        tasksRes.json(),
        invoicesRes.json(),
      ]);

      setStats(statsRes.ok ? statsData : null);
      setProjects(projectsRes.ok && Array.isArray(projectsData) ? projectsData : []);
      setTasks(tasksRes.ok && Array.isArray(tasksData) ? tasksData : []);

      if (invoicesRes.ok && invoicesData && Array.isArray((invoicesData as InvoiceResponse).invoices)) {
        const data = invoicesData as InvoiceResponse;
        setInvoices(data.invoices);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      setStats(null);
      setProjects([]);
      setTasks([]);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          isInDateRange(project.createdAt, dateRange) &&
          (projectStatusFilter === "all" || project.status === projectStatusFilter)
      ),
    [dateRange, projectStatusFilter, projects]
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          isInDateRange(task.createdAt, dateRange) &&
          (taskStatusFilter === "all" || task.status === taskStatusFilter)
      ),
    [dateRange, taskStatusFilter, tasks]
  );

  const filteredInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          isInDateRange(getInvoiceDate(invoice), dateRange) &&
          (invoiceStatusFilter === "all" || invoice.status === invoiceStatusFilter)
      ),
    [dateRange, invoiceStatusFilter, invoices]
  );

  const filteredInvoiceTotals = useMemo(() => {
    const now = new Date();

    return {
      totalOutstanding: filteredInvoices
        .filter((invoice) => invoice.status !== "PAID")
        .reduce((sum, invoice) => sum + invoice.amount, 0),
      collectedThisMonth: filteredInvoices
        .filter((invoice) => {
          if (invoice.status !== "PAID") return false;
          const paidDate = new Date(invoice.paidAt || invoice.createdAt);
          return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, invoice) => sum + invoice.amount, 0),
      totalPaid: filteredInvoices
        .filter((invoice) => invoice.status === "PAID")
        .reduce((sum, invoice) => sum + invoice.amount, 0),
    };
  }, [filteredInvoices]);

  const revenueTrendData = useMemo(() => buildRevenueTrend(filteredInvoices), [filteredInvoices]);

  const projectStatusData = useMemo<StatusCount[]>(
    () => countByStatus(filteredProjects, projectStatusLabels),
    [filteredProjects]
  );
  const taskStatusData = useMemo<StatusCount[]>(
    () => countByStatus(filteredTasks, taskStatusLabels),
    [filteredTasks]
  );
  const invoiceStatusData = useMemo<StatusCount[]>(
    () => countByStatus(filteredInvoices, invoiceStatusLabels),
    [filteredInvoices]
  );

  const completionRate = filteredTasks.length ? Math.round((filteredTasks.filter((task) => task.status === "DONE").length / filteredTasks.length) * 100) : 0;
  const paidInvoiceRate = filteredInvoices.length ? Math.round((filteredInvoices.filter((invoice) => invoice.status === "PAID").length / filteredInvoices.length) * 100) : 0;

  const summaryCards = [
    {
      label: "Total Clients",
      value: stats?.totalClients || 0,
      icon: Users,
      color: "text-indigo-300",
      bg: "bg-indigo-500/10",
    },
    {
      label: "Total Projects",
      value: filteredProjects.length,
      icon: Briefcase,
      color: "text-pink-300",
      bg: "bg-pink-500/10",
    },
    {
      label: "Task Completion",
      value: `${completionRate}%`,
      icon: CheckCircle,
      color: "text-emerald-300",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Total Paid",
      value: `$${filteredInvoiceTotals.totalPaid.toLocaleString()}`,
      icon: DollarSign,
      color: "text-amber-300",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Reports</h1>
          <p className="text-white/50">Review project, task, and invoice performance in one place.</p>
        </div>
        <AnimatedButton type="button" onClick={fetchReports} variant="secondary" className="w-full md:w-auto">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </AnimatedButton>
      </div>

      <FloatingCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <ReportSelect label="Date Range" value={dateRange} onChange={(value) => setDateRange(value as DateRangeFilter)} options={dateRangeOptions} />
          <ReportSelect label="Project Status" value={projectStatusFilter} onChange={(value) => setProjectStatusFilter(value as ProjectStatusFilter)} options={projectStatusOptions} />
          <ReportSelect label="Task Status" value={taskStatusFilter} onChange={(value) => setTaskStatusFilter(value as TaskStatusFilter)} options={taskStatusOptions} />
          <ReportSelect label="Invoice Status" value={invoiceStatusFilter} onChange={(value) => setInvoiceStatusFilter(value as InvoiceStatusFilter)} options={invoiceStatusOptions} />
          <button
            type="button"
            onClick={() => {
              setDateRange("all");
              setProjectStatusFilter("all");
              setTaskStatusFilter("all");
              setInvoiceStatusFilter("all");
            }}
            className="h-11 self-end rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Reset Filters
          </button>
        </div>
      </FloatingCard>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {summaryCards.map((card) => (
          <FloatingCard key={card.label} className="h-full">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white/50 mb-1">{card.label}</p>
                <p className="text-3xl font-bold">{isLoading ? "..." : card.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </FloatingCard>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <FloatingCard className="xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Revenue Trend</h2>
              <p className="text-sm text-white/45">Paid invoices matching the current filters</p>
            </div>
            <BarChart3 className="h-5 w-5 text-indigo-300" />
          </div>
          <div className="h-80">
            {isLoading ? (
              <div className="h-full rounded-xl bg-white/5 animate-pulse" />
            ) : revenueTrendData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrendData} margin={{ left: -20, right: 12, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.45)" axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.45)" axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(15,15,15,0.96)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#818cf8" strokeWidth={3} fill="#6366f1" fillOpacity={0.18} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/40">No revenue data yet</div>
            )}
          </div>
        </FloatingCard>

        <FloatingCard>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Invoice Health</h2>
              <p className="text-sm text-white/45">{paidInvoiceRate}% fully paid</p>
            </div>
            <FileText className="h-5 w-5 text-amber-300" />
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-white/45">Outstanding</p>
              <p className="text-2xl font-bold">${filteredInvoiceTotals.totalOutstanding.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-white/45">Collected This Month</p>
              <p className="text-2xl font-bold">${filteredInvoiceTotals.collectedThisMonth.toLocaleString()}</p>
            </div>
            <Link href="/invoices" className="block">
              <AnimatedButton variant="secondary" className="w-full">
                View Invoices
              </AnimatedButton>
            </Link>
          </div>
        </FloatingCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <StatusPanel title="Project Status" icon={FolderKanban} data={projectStatusData} chartType="pie" />
        <StatusPanel title="Task Status" icon={CheckCircle} data={taskStatusData} chartType="bar" />
        <StatusPanel title="Invoice Status" icon={FileText} data={invoiceStatusData} chartType="bar" />
      </div>
    </div>
  );
}

function ReportSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-white/40">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 !w-full rounded-xl border border-white/10 bg-white/5 !px-4 !py-0 text-sm leading-none text-white/75"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusPanel({
  title,
  icon: Icon,
  data,
  chartType,
}: {
  title: string;
  icon: React.ElementType;
  data: StatusCount[];
  chartType: "bar" | "pie";
}) {
  const hasData = data.some((item) => item.value > 0);

  return (
    <FloatingCard className="h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Icon className="h-5 w-5 text-indigo-300" />
      </div>
      <div className="h-56">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-white/40">No data yet</div>
        ) : chartType === "pie" ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.filter((item) => item.value > 0)} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "rgba(15,15,15,0.96)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -24, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.45)" axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.45)" axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "rgba(15,15,15,0.96)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-white/55">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
              {item.name}
            </span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </FloatingCard>
  );
}
