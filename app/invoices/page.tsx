"use client";

import { useState, useEffect } from "react";
import { FloatingCard } from "@/components/ui/FloatingCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { GlassModal } from "@/components/ui/GlassModal";
import { Plus, Download, FileText, Search, CheckCircle, Clock, AlertCircle, Edit, Trash2, MoreVertical, Eye, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { createInvoice, updateInvoice, deleteInvoice } from "@/lib/actions";
import { apiFetch } from "@/lib/api";
import type { Invoice, InvoiceStatus, Client, InvoiceSource } from "@prisma/client";
import { jsPDF } from "jspdf";

type TimeRange = "all" | "weekly" | "monthly" | "yearly";
const timeRangeOptions: Array<{ value: TimeRange; label: string }> = [
  { value: "all", label: "All" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "yearly", label: "Year" },
];

type ProjectOption = { id: string; title: string; clientId: string };
type TaskOption = { id: string; title: string; projectId: string; project: { title: string; clientId: string } };
type PaymentItem = { id: string; amount: number; paidAt: string | Date; method?: string | null; reference?: string | null; notes?: string | null };
type InvoiceWithClient = Invoice & {
  client: Client;
  project?: { id: string; title: string } | null;
  task?: { id: string; title: string } | null;
  payments?: PaymentItem[];
  source: InvoiceSource;
  paidAmount?: number;
  balance?: number;
};

const getInvoicePaidAmount = (invoice: InvoiceWithClient) =>
  Number((invoice as InvoiceWithClient & { paidAmount?: number }).paidAmount || 0);
const getInvoiceDueAmount = (invoice: InvoiceWithClient) => Math.max(invoice.amount - getInvoicePaidAmount(invoice), 0);

const statusStyles = {
  PAID: { icon: CheckCircle, className: "text-emerald-400 bg-emerald-500/15 border-emerald-500/20" },
  PARTIAL: { icon: Clock, className: "text-amber-400 bg-amber-500/15 border-amber-500/20" },
  UNPAID: { icon: AlertCircle, className: "text-red-400 bg-red-500/15 border-red-500/20" },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithClient | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceWithClient | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceWithClient | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentItem | null>(null);

  const fetchData = async () => {
    try {
      const [invoicesRes, clientsRes, projectsRes, tasksRes] = await Promise.all([
        apiFetch("/invoices"),
        apiFetch("/clients"),
        apiFetch("/projects"),
        apiFetch("/tasks"),
      ]);
      const invoicesData = await invoicesRes.json();
      const clientsData = await clientsRes.json();
      const projectsData = await projectsRes.json();
      const tasksData = await tasksRes.json();

      const nextInvoices = Array.isArray(invoicesData?.invoices) ? invoicesData.invoices : [];
      const nextClients = Array.isArray(clientsData) ? clientsData : [];

      setInvoices(nextInvoices);
      setClients(nextClients);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch {
      setInvoices([]);
      setClients([]);
      setProjects([]);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  const handleCreateInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const invoiceData = {
      clientId: formData.get("clientId") as string,
      amount: Number(formData.get("amount")),
      projectId: (formData.get("projectId") as string) || undefined,
      taskId: (formData.get("taskId") as string) || undefined,
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : undefined,
      notes: formData.get("notes") as string || undefined,
    };

    try {
      await createInvoice(invoiceData);
      await fetchData();
      setIsModalOpen(false);
    } catch {
      // create invoice failed
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingInvoice) return;
    
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const invoiceData = {
      clientId: formData.get("clientId") as string,
      amount: Number(formData.get("amount")),
      projectId: (formData.get("projectId") as string) || null,
      taskId: (formData.get("taskId") as string) || null,
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : undefined,
      notes: (formData.get("notes") as string)?.trim() || null,
    };

    try {
      await updateInvoice(editingInvoice.id, invoiceData);
      await fetchData();
      setIsModalOpen(false);
      setEditingInvoice(null);
    } catch {
      // update invoice failed
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentInvoice) return;
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await apiFetch(
        editingPayment
          ? `/invoices/${paymentInvoice.id}/payments/${editingPayment.id}`
          : `/invoices/${paymentInvoice.id}/payments`, {
        method: editingPayment ? "PATCH" : "POST",
        body: JSON.stringify({
          amount: Number(formData.get("amount")),
          paidAt: formData.get("paidAt") || undefined,
          method: formData.get("method") || undefined,
          reference: formData.get("reference") || undefined,
          notes: formData.get("notes") || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        alert(result.error || "Failed to record payment");
        return;
      }
      setPaymentInvoice(null);
      setEditingPayment(null);
      await fetchData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      await deleteInvoice(id);
      await fetchData();
    }
    setMenuOpen(null);
  };

  const openEditModal = (invoice: InvoiceWithClient) => {
    setEditingInvoice(invoice);
    setIsModalOpen(true);
    setMenuOpen(null);
  };

  const openCreateModal = () => {
    setEditingInvoice(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingInvoice(null);
  };

  const createInvoicePdf = (invoice: InvoiceWithClient) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const issueDate = new Date(invoice.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const dueDate = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "N/A";

    const statusLabel = invoice.status === "UNPAID" ? "Unpaid" : invoice.status === "PAID" ? "Paid" : "Partial";

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 140, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("INVOICE", 48, 74);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(invoice.invoiceNo, pageWidth - 48, 74, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Issue Date: ${issueDate}`, pageWidth - 48, 96, { align: "right" });

    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("BILL TO", 48, 188);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.text(invoice.client.name, 48, 214);
    if (invoice.client.company) {
      doc.setFontSize(11);
      doc.text(invoice.client.company, 48, 236);
    }
    doc.setFontSize(11);
    doc.text(invoice.client.email, 48, invoice.client.company ? 254 : 236);

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(pageWidth - 230, 170, 182, 116, 10, 10, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Invoice Summary", pageWidth - 210, 194);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Status: ${statusLabel}`, pageWidth - 210, 218);
    doc.text(`Due Date: ${dueDate}`, pageWidth - 210, 238);
    doc.text(`Amount: $${invoice.amount.toLocaleString()}`, pageWidth - 210, 258);

    doc.setDrawColor(226, 232, 240);
    doc.line(48, 312, pageWidth - 48, 312);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Description", 48, 338);
    doc.text("Amount", pageWidth - 48, 338, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Services for ${invoice.client.name}`, 48, 366);
    doc.text(`$${invoice.amount.toLocaleString()}`, pageWidth - 48, 366, { align: "right" });

    doc.line(48, 384, pageWidth - 48, 384);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Total", pageWidth - 150, 414);
    doc.text(`$${invoice.amount.toLocaleString()}`, pageWidth - 48, 414, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Notes", 48, 472);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const noteLines = doc.splitTextToSize(invoice.notes || "No notes provided.", pageWidth - 96);
    doc.text(noteLines, 48, 494);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Thank you for your business.", 48, pageHeight - 48);

    return doc;
  };

  const openPreviewModal = (invoice: InvoiceWithClient) => {
    const doc = createInvoicePdf(invoice);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);

    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
    }

    setViewingInvoice(invoice);
    setPreviewPdfUrl(url);
    setMenuOpen(null);
  };

  const closePreviewModal = () => {
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
    }
    setPreviewPdfUrl(null);
    setViewingInvoice(null);
  };

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

  const filteredInvoices = (invoices ?? [])
    .filter(
      (inv) =>
        (inv.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase())) &&
        isInTimeRange(inv.createdAt)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalOutstandingInRange = filteredInvoices
    .reduce((sum, inv) => sum + getInvoiceDueAmount(inv), 0);

  const totalPaidInRange = filteredInvoices
    .reduce((sum, inv) => sum + getInvoicePaidAmount(inv), 0);

  const collectedInRange = filteredInvoices
    .filter((inv) => Boolean(inv.paidAt) && getInvoicePaidAmount(inv) > 0)
    .reduce((sum, inv) => sum + getInvoicePaidAmount(inv), 0);

  const isOverdue = (dueDate: Date | null, status: InvoiceStatus) => {
    if (!dueDate || status === "PAID") return false;
    return new Date(dueDate) < new Date();
  };

  const handleDownloadInvoice = (invoice: InvoiceWithClient) => {
    const doc = createInvoicePdf(invoice);
    doc.save(`${invoice.invoiceNo}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Invoices</h1>
          <p className="text-white/50">Generate and track payments from clients.</p>
        </div>
        <div className="flex w-full md:w-auto flex-col sm:flex-row gap-2 sm:items-center">
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
            Create Invoice
          </AnimatedButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <FloatingCard className="!p-4 z-20">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search invoices by client or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none !pl-12 pr-4 py-2 text-white placeholder-white/40 focus:ring-0"
              />
            </div>
          </FloatingCard>

          <div className="space-y-4">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
              ))
            ) : filteredInvoices.length === 0 ? (
              <FloatingCard className="text-center py-16">
                <FileText className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/50 text-lg mb-2">
                    {searchQuery ? "No invoices match your search." : timeRange === "all" ? "No invoices yet." : "No invoices in this range."}
                </p>
                <p className="text-white/30 text-sm mb-6">
                  {searchQuery ? "Try a different search term." : "Create your first invoice to get started."}
                </p>
                {!searchQuery && (
                  <AnimatedButton onClick={openCreateModal}>
                    <Plus className="w-4 h-4" />
                    Create First Invoice
                  </AnimatedButton>
                )}
              </FloatingCard>
            ) : (
              filteredInvoices.map((invoice, i) => {
                const Status = statusStyles[invoice.status as keyof typeof statusStyles];
                const invoiceOverdue = isOverdue(invoice.dueDate, invoice.status);

                return (
                  <motion.div
                    key={invoice.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, type: "spring" }}
                    className={menuOpen === invoice.id ? "relative z-50" : "relative z-0"}
                  >
                    <FloatingCard className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 group !overflow-visible">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
                          <FileText size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{invoice.invoiceNo}</h3>
                            {invoiceOverdue && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
                                OVERDUE
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-white/50">{invoice.client.name}</p>
                          <p className="text-xs text-indigo-300/70">
                            {invoice.task?.title
                              ? `Task: ${invoice.task.title}`
                              : invoice.project?.title
                                ? `Project: ${invoice.project.title}`
                                : "Standalone custom invoice"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-start lg:items-center gap-6 w-full lg:w-auto">
                        <div>
                          <p className="text-xs text-white/40 mb-0.5">Issue Date</p>
                          <p className="text-sm text-white/70">
                            {new Date(invoice.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-white/40 mb-0.5">Due Date</p>
                          <p className={`text-sm ${invoiceOverdue ? "text-red-400" : "text-white/70"}`}>
                            {invoice.dueDate
                              ? new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "—"}
                          </p>
                        </div>

                        <div className="flex flex-col items-start lg:items-end">
                          <p className="text-xs text-white/40 mb-1">Status</p>
                          <span className={`min-w-[96px] px-3 py-1.5 rounded-lg text-center text-xs font-medium border ${Status.className}`}>
                            {invoice.status === "PAID" ? "Paid" : invoice.status === "PARTIAL" ? "Partial" : "Unpaid"}
                          </span>
                        </div>

                        <div className="lg:text-right min-w-[120px]">
                          <p className="text-xs text-white/40 mb-0.5">Amount</p>
                          <p className="text-xl font-bold text-white/90">
                            ${invoice.amount.toLocaleString()}
                          </p>
                          <p className="text-[11px] text-white/45">Paid ${getInvoicePaidAmount(invoice).toLocaleString()}</p>
                          <p className="text-[11px] text-white/45">Due ${getInvoiceDueAmount(invoice).toLocaleString()}</p>
                        </div>

                        <div className="flex items-center gap-1 lg:ml-4">
                          {getInvoiceDueAmount(invoice) > 0 && (
                            <button
                              onClick={() => { setEditingPayment(null); setPaymentInvoice(invoice); }}
                              className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-colors"
                              title="Record payment"
                            >
                              <DollarSign size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => openPreviewModal(invoice)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                            title="Preview invoice"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDownloadInvoice(invoice)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            title="Download invoice"
                          >
                            <Download size={16} />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setMenuOpen(menuOpen === invoice.id ? null : invoice.id)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {menuOpen === invoice.id && (
                              <div className="absolute right-0 mt-1 w-36 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl py-1 z-50 shadow-xl">
                                <button
                                  onClick={() => openEditModal(invoice)}
                                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-2.5 text-white/80"
                                >
                                  <Edit size={14} /> Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(invoice.id)}
                                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-2.5 text-red-400"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </FloatingCard>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <FloatingCard>
            <h3 className="text-lg font-semibold mb-6">Payment Summary</h3>
            <div className="space-y-5">
              <div>
                <p className="text-sm text-white/50 mb-1">Total Outstanding</p>
                <p className="text-3xl font-bold text-red-400">
                  ${totalOutstandingInRange.toLocaleString()}
                </p>
              </div>
              <div className="w-full h-px bg-white/10" />
              <div>
                <p className="text-sm text-white/50 mb-1">Collected ({timeRange === "all" ? "All Time" : timeRange[0].toUpperCase() + timeRange.slice(1)})</p>
                <p className="text-2xl font-bold text-emerald-400">
                  ${collectedInRange.toLocaleString()}
                </p>
              </div>
              <div className="w-full h-px bg-white/10" />
              <div>
                <p className="text-sm text-white/50 mb-1">Total Paid ({timeRange === "all" ? "All Time" : timeRange[0].toUpperCase() + timeRange.slice(1)})</p>
                <p className="text-2xl font-bold text-indigo-400">
                  ${totalPaidInRange.toLocaleString()}
                </p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard>
            <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm text-white/60">Unpaid</span>
                </div>
                <span className="text-sm font-medium">{filteredInvoices.filter(i => i.status === "UNPAID").length}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm text-white/60">Partial</span>
                </div>
                <span className="text-sm font-medium">{filteredInvoices.filter(i => i.status === "PARTIAL").length}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-white/60">Paid</span>
                </div>
                <span className="text-sm font-medium">{filteredInvoices.filter(i => i.status === "PAID").length}</span>
              </div>
            </div>
          </FloatingCard>
        </div>
      </div>

      <GlassModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingInvoice ? "Edit Invoice" : "Create Invoice"}
      >
        <form className="space-y-4" onSubmit={editingInvoice ? handleUpdateInvoice : handleCreateInvoice}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Client *</label>
            <select
              name="clientId"
              required
              defaultValue={editingInvoice?.clientId}
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
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Amount ($) *</label>
            <input
              type="number"
              name="amount"
              placeholder="5000"
              required
              min="0.01"
              step="0.01"
              defaultValue={editingInvoice?.amount}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80">Related Project</label>
              <select name="projectId" defaultValue={editingInvoice?.projectId || ""} className="w-full">
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80">Related Task</label>
              <select name="taskId" defaultValue={editingInvoice?.taskId || ""} className="w-full">
                <option value="">No task</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>{task.project.title} / {task.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80">Due Date</label>
              <input
                type="date"
                name="dueDate"
                defaultValue={editingInvoice?.dueDate ? new Date(editingInvoice.dueDate).toISOString().split("T")[0] : ""}
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Notes</label>
            <textarea
              name="notes"
              placeholder="Invoice notes..."
              rows={3}
              defaultValue={editingInvoice?.notes || ""}
              className="w-full resize-none"
            />
          </div>
          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
            <AnimatedButton type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </AnimatedButton>
            <AnimatedButton type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingInvoice ? "Update Invoice" : "Create Invoice"}
            </AnimatedButton>
          </div>
        </form>
      </GlassModal>

      <GlassModal
        isOpen={Boolean(paymentInvoice)}
        onClose={() => { setPaymentInvoice(null); setEditingPayment(null); }}
        title={editingPayment ? "Edit Payment" : "Record Payment"}
      >
        {paymentInvoice && (
          <form key={editingPayment?.id || "new-payment"} className="space-y-4" onSubmit={handleRecordPayment}>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
              <div className="flex justify-between"><span className="text-white/50">Invoice</span><span>{paymentInvoice.invoiceNo}</span></div>
              <div className="mt-2 flex justify-between"><span className="text-white/50">Balance due</span><span className="font-semibold text-amber-300">${getInvoiceDueAmount(paymentInvoice).toLocaleString()}</span></div>
            </div>
            {paymentInvoice.payments && paymentInvoice.payments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white/80">Payment History</h3>
                  {editingPayment && (
                    <button type="button" onClick={() => setEditingPayment(null)} className="text-xs text-indigo-300 hover:text-indigo-200">Add new instead</button>
                  )}
                </div>
                <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                  {paymentInvoice.payments.map((payment) => (
                    <div key={payment.id} className={`flex items-center justify-between rounded-xl border p-3 ${editingPayment?.id === payment.id ? "border-indigo-400/50 bg-indigo-500/10" : "border-white/10 bg-white/[0.03]"}`}>
                      <div>
                        <p className="font-semibold text-emerald-300">${payment.amount.toLocaleString()}</p>
                        <p className="text-xs text-white/45">{new Date(payment.paidAt).toLocaleDateString()} · {payment.method || "No method"}{payment.reference ? ` · ${payment.reference}` : ""}</p>
                      </div>
                      <button type="button" onClick={() => setEditingPayment(payment)} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white">Edit</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/80">Payment Amount *</label>
                <input name="amount" type="number" min="0.01" max={getInvoiceDueAmount(paymentInvoice) + (editingPayment?.amount || 0)} step="0.01" required defaultValue={editingPayment?.amount} className="w-full" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/80">Payment Date</label>
                <input name="paidAt" type="date" defaultValue={editingPayment ? new Date(editingPayment.paidAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)} className="w-full" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/80">Method</label>
                <select name="method" defaultValue={editingPayment?.method || "Bank Transfer"} className="w-full">
                  <option>Bank Transfer</option><option>Cash</option><option>Card</option><option>Mobile Banking</option><option>Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/80">Reference</label>
                <input name="reference" placeholder="Transaction ID" defaultValue={editingPayment?.reference || ""} className="w-full" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80">Notes</label>
              <textarea name="notes" rows={2} defaultValue={editingPayment?.notes || ""} className="w-full resize-none" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <AnimatedButton type="button" variant="ghost" onClick={() => { setPaymentInvoice(null); setEditingPayment(null); }}>Cancel</AnimatedButton>
              <AnimatedButton type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : editingPayment ? "Update Payment" : "Record Payment"}</AnimatedButton>
            </div>
          </form>
        )}
      </GlassModal>

      <GlassModal
        isOpen={Boolean(viewingInvoice)}
        onClose={closePreviewModal}
        title="Invoice Preview"
        className="max-w-5xl"
      >
        {viewingInvoice && previewPdfUrl && (
          <div className="space-y-5">
            <div className="h-[62dvh] overflow-hidden rounded-xl border border-white/10 bg-white sm:h-[70vh]">
              <iframe
                src={previewPdfUrl}
                title={`Preview ${viewingInvoice.invoiceNo}`}
                className="w-full h-full"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <AnimatedButton type="button" variant="ghost" onClick={closePreviewModal}>
                Close
              </AnimatedButton>
              <AnimatedButton
                type="button"
                onClick={() => handleDownloadInvoice(viewingInvoice)}
              >
                <Download size={16} /> Download PDF
              </AnimatedButton>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
}
