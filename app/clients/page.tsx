"use client";

import { useState, useEffect } from "react";
import { Plus, Search, MoreVertical, Mail, Phone, Building, Edit, Trash2, User, CalendarDays, MapPin } from "lucide-react";
import { FloatingCard } from "@/components/ui/FloatingCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { GlassModal } from "@/components/ui/GlassModal";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient, updateClient, deleteClient } from "@/lib/actions";
import type { Client } from "@prisma/client";

type TimeRange = "all" | "weekly" | "monthly" | "yearly";
const timeRangeOptions: Array<{ value: TimeRange; label: string }> = [
  { value: "all", label: "All" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "yearly", label: "Year" },
];

const avatarColors = [
  "from-indigo-500/20 to-purple-500/20",
  "from-pink-500/20 to-rose-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-amber-500/20 to-orange-500/20",
  "from-blue-500/20 to-cyan-500/20",
];

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        console.error("Failed to fetch clients:", data);
        setClients([]);
        return;
      }

      setClients(data);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const getOptionalField = (field: string) => {
      const value = formData.get(field)?.toString().trim();
      return value ? value : null;
    };

    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: getOptionalField("phone"),
      company: getOptionalField("company"),
      address: getOptionalField("address"),
      notes: getOptionalField("notes"),
    };

    try {
      if (editingClient) {
        const result = await updateClient(editingClient.id, data);
        if (!result.success) {
          alert(result.error || "Failed to update client");
          return;
        }
      } else {
        const result = await createClient(data);
        if (!result.success) {
          alert(result.error || "Failed to create client");
          return;
        }
      }
      await fetchClients();
      setIsModalOpen(false);
      setEditingClient(null);
    } catch (error) {
      console.error("Failed to save client:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
    setMenuOpen(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this client? All related projects and invoices will also be deleted.")) {
      await deleteClient(id);
      await fetchClients();
    }
    setMenuOpen(null);
  };

  const openCreateModal = () => {
    setEditingClient(null);
    setIsModalOpen(true);
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

  const filteredClients = clients
    .filter(
      (c) =>
        (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        isInTimeRange(c.createdAt)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getAvatarColor = (name: string) => {
    const index = name.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Clients</h1>
          <p className="text-white/50">Manage your business connections and relationships.</p>
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
            Add Client
          </AnimatedButton>
        </div>
      </div>

      <FloatingCard className="!p-4 z-20">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search clients by name, company, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none !pl-12 pr-4 py-2 text-white placeholder-white/40 focus:ring-0"
          />
        </div>
      </FloatingCard>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-white/[0.03] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <FloatingCard className="text-center py-16">
          <User className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <p className="text-white/50 text-lg mb-2">
            {searchTerm ? "No clients match your search." : "No clients yet."}
          </p>
          <p className="text-white/30 text-sm mb-6">
            {searchTerm ? "Try a different search term." : "Add your first client to get started."}
          </p>
          {!searchTerm && (
            <AnimatedButton onClick={openCreateModal}>
              <Plus className="w-4 h-4" />
              Add First Client
            </AnimatedButton>
          )}
        </FloatingCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
            >
              <FloatingCard className="h-full flex flex-col relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[40px]" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarColor(client.name)} border border-white/10 flex items-center justify-center font-bold text-lg text-white`}>
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{client.name}</h3>
                        {client.company && (
                          <p className="text-sm text-white/50">{client.company}</p>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === client.id ? null : client.id)}
                        className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                      >
                        <MoreVertical size={18} />
                      </button>
                      {menuOpen === client.id && (
                        <div className="absolute right-0 mt-1 w-36 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl py-1 z-20 shadow-xl">
                          <button
                            onClick={() => handleEdit(client)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-2.5 text-white/80"
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-2.5 text-red-400"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mt-2">
                    <a
                      href={`mailto:${client.email}`}
                      className="flex items-center gap-3 text-sm text-white/60 hover:text-indigo-400 transition-colors"
                    >
                      <Mail size={16} className="text-indigo-400/60" />
                      {client.email}
                    </a>
                    {client.phone && (
                      <div className="flex items-center gap-3 text-sm text-white/60">
                        <Phone size={16} className="text-emerald-400/60" />
                        {client.phone}
                      </div>
                    )}
                    {client.company && (
                      <div className="flex items-center gap-3 text-sm text-white/60">
                        <Building size={16} className="text-pink-400/60" />
                        {client.company}
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-3 text-sm text-white/60">
                        <MapPin size={16} className="text-amber-400/60" />
                        {client.address}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm text-white/50">
                      <CalendarDays size={16} className="text-blue-400/50" />
                      Created {new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                </div>
              </FloatingCard>
            </motion.div>
          ))}
        </div>
      )}

      <GlassModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClient(null);
        }}
        title={editingClient ? "Edit Client" : "Add New Client"}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Full Name *</label>
            <input
              type="text"
              name="name"
              placeholder="John Smith"
              required
              defaultValue={editingClient?.name}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Email Address *</label>
            <input
              type="email"
              name="email"
              placeholder="john@company.com"
              required
              defaultValue={editingClient?.email}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Company</label>
            <input
              type="text"
              name="company"
              placeholder="Company Name"
              defaultValue={editingClient?.company || ""}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Phone Number</label>
            <input
              type="text"
              name="phone"
              placeholder="+1 (555) 000-0000"
              defaultValue={editingClient?.phone || ""}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Address</label>
            <input
              type="text"
              name="address"
              placeholder="Street, City, Country"
              defaultValue={editingClient?.address || ""}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/80">Notes</label>
            <textarea
              name="notes"
              placeholder="Additional notes about this client..."
              rows={3}
              defaultValue={editingClient?.notes || ""}
              className="w-full resize-none"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <AnimatedButton
              type="button"
              variant="ghost"
              onClick={() => {
                setIsModalOpen(false);
                setEditingClient(null);
              }}
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingClient ? "Update Client" : "Add Client"}
            </AnimatedButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
