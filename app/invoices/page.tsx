"use client";

import { useState, useEffect } from "react";
import { FloatingCard } from "@/components/ui/FloatingCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { GlassModal } from "@/components/ui/GlassModal";
import { Plus, Download, FileText, Search, CheckCircle, Clock, AlertCircle, Edit, Trash2, MoreVertical, ChevronDown, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { createInvoice, updateInvoice, deleteInvoice } from "@/lib/actions";
import { Invoice, InvoiceStatus, Client } from "@prisma/client";
import { jsPDF } from "jspdf";

type TimeRange = "all" | "weekly" | "monthly" | "yearly";
const timeRangeOptions: Array<{ value: TimeRange; label: string }> = [
  { value: "all", label: "All" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "yearly", label: "Year" },
];

type InvoiceWithClient = Invoice & { client: Client };

const statusStyles = {
  PAID: { icon: CheckCircle, className: "text-emerald-400 bg-emerald-500/15 border-emerald-500/20" },
  PARTIAL: { icon: Clock, className: "text-amber-400 bg-amber-500/15 border-amber-500/20" },
  UNPAID: { icon: AlertCircle, className: "text-red-400 bg-red-500/15 border-red-500/20" },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithClient | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [collectedThisMonth, setCollectedThisMonth] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceWithClient | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [invoicesRes, clientsRes] = await Promise.all([
        fetch("/api/invoices"),
        fetch("/api/clients"),
      ]);
      const invoicesData = await invoicesRes.json();
      const clientsData = await clientsRes.json();

      const nextInvoices = Array.isArray(invoicesData?.invoices) ? invoicesData.invoices : [];
      const nextClients = Array.isArray(clientsData) ? clientsData : [];

      setInvoices(nextInvoices);
      setTotalOutstanding(typeof invoicesData?.totalOutstanding === "number" ? invoicesData.totalOutstanding : 0);
      setCollectedThisMonth(typeof invoicesData?.collectedThisMonth === "number" ? invoicesData.collectedThisMonth : 0);
      setTotalPaid(typeof invoicesData?.totalPaid === "number" ? invoicesData.totalPaid : 0);
      setClients(nextClients);
    } catch (error) {
      setInvoices([]);
      setClients([]);
      setTotalOutstanding(0);
      setCollectedThisMonth(0);
      setTotalPaid(0);
      console.error("Failed to fetch data:", error);
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
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : undefined,
      notes: formData.get("notes") as string || undefined,
    };

    try {
      await createInvoice(invoiceData);
      await fetchData();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to create invoice:", error);
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
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : undefined,
      notes: formData.get("notes") as string || undefined,
      status: formData.get("status") as InvoiceStatus,
    };

    try {
      await updateInvoice(editingInvoice.id, invoiceData);
      await fetchData();
      setIsModalOpen(false);
      setEditingInvoice(null);
    } catch (error) {
      console.error("Failed to update invoice:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: InvoiceStatus) => {
    const previousInvoices = invoices;
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status } : inv)));

    try {
      const response = await fetch(`/api/invoices/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        setInvoices(previousInvoices);
        alert(result.error || "Failed to update invoice status");
        return;
      }

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === id
            ? {
                ...inv,
                status: result.data.status,
                paidAt: result.data.paidAt,
              }
            : inv
        )
      );

      await fetchData();
    } catch (error) {
      setInvoices(previousInvoices);
      console.error("Failed to update invoice status:", error);
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

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Anti-Gravity Manager", 48, 98);

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
    .filter((inv) => inv.status !== InvoiceStatus.PAID)
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalPaidInRange = filteredInvoices
    .filter((inv) => inv.status === InvoiceStatus.PAID)
    .reduce((sum, inv) => sum + inv.amount, 0);

  const collectedInRange = filteredInvoices
    .filter((inv) => Boolean(inv.paidAt))
    .reduce((sum, inv) => sum + inv.amount, 0);

  const isOverdue = (dueDate: Date | null, status: InvoiceStatus) => {
    if (!dueDate || status === InvoiceStatus.PAID) return false;
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
                          <div className="relative">
                            <select
                              value={invoice.status}
                              onChange={(e) => handleUpdateStatus(invoice.id, e.target.value as InvoiceStatus)}
                              className={`appearance-none min-w-[96px] pr-7 pl-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${Status.className} bg-transparent`}
                              style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
                            >
                              <option value="UNPAID">Unpaid</option>
                              <option value="PARTIAL">Partial</option>
                              <option value="PAID">Paid</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/80" />
                          </div>
                        </div>

                        <div className="lg:text-right min-w-[120px]">
                          <p className="text-xs text-white/40 mb-0.5">Amount</p>
                          <p className="text-xl font-bold text-white/90">
                            ${invoice.amount.toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 lg:ml-4">
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
                <span className="text-sm font-medium">{filteredInvoices.filter(i => i.status === InvoiceStatus.UNPAID).length}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm text-white/60">Partial</span>
                </div>
                <span className="text-sm font-medium">{filteredInvoices.filter(i => i.status === InvoiceStatus.PARTIAL).length}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-white/60">Paid</span>
                </div>
                <span className="text-sm font-medium">{filteredInvoices.filter(i => i.status === InvoiceStatus.PAID).length}</span>
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
              min="0"
              step="0.01"
              defaultValue={editingInvoice?.amount}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/80">Due Date</label>
              <input
                type="date"
                name="dueDate"
                defaultValue={editingInvoice?.dueDate ? new Date(editingInvoice.dueDate).toISOString().split("T")[0] : ""}
                className="w-full"
              />
            </div>
            {editingInvoice && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/80">Status</label>
                <select
                  name="status"
                  defaultValue={editingInvoice.status}
                  className="w-full"
                >
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
            )}
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
          <div className="pt-4 flex justify-end gap-3">
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
        isOpen={Boolean(viewingInvoice)}
        onClose={closePreviewModal}
        title="Invoice Preview"
        className="max-w-5xl"
      >
        {viewingInvoice && previewPdfUrl && (
          <div className="space-y-5">
            <div className="h-[70vh] rounded-xl border border-white/10 bg-white overflow-hidden">
              <iframe
                src={previewPdfUrl}
                title={`Preview ${viewingInvoice.invoiceNo}`}
                className="w-full h-full"
              />
            </div>

            <div className="flex justify-end gap-3">
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
