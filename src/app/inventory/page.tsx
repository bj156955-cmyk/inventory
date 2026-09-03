"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { Product, Activity } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Trash2, 
  X, 
  AlertCircle, 
  ArrowUpDown, 
  Check,
  Upload,
  Download,
  FileSpreadsheet,
  ChevronDown,
  CheckCircle2,
  Loader2
} from "lucide-react";

export type SortOption = "recent" | "oldest" | "name_asc" | "name_desc";

export interface ParsedImportItem {
  name: string;
  category: string;
  item_type: string;
  stock: number;
  unit: string;
  target: number;
  price: number;
}

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "recent", label: "최신순" },
  { id: "oldest", label: "오래된순" },
  { id: "name_asc", label: "이름순" },
  { id: "name_desc", label: "이름 역순" },
];

interface ItemModalProps {
  editingProduct: Product | null;
  defaultLocation: string;
  existingLocations: string[];
  existingTypes: string[];
  activeLocationsCount: number;
  onClose: () => void;
  onDeleteRequest: (prod: Product) => void;
  onSave: (data: {
    name: string;
    category: string;
    type: string;
    stock: number;
    unit: string;
    price: number;
  }) => Promise<void>;
}

function ItemModal({
  editingProduct,
  defaultLocation,
  existingLocations,
  existingTypes,
  activeLocationsCount,
  onClose,
  onDeleteRequest,
  onSave,
}: ItemModalProps) {
  const [formName, setFormName] = useState(() => editingProduct?.name || "");
  const [formCategory, setFormCategory] = useState(() => editingProduct?.category || defaultLocation || "");
  const [formType, setFormType] = useState(() => editingProduct?.item_type || "");
  const [formStock, setFormStock] = useState(() => (editingProduct ? editingProduct.stock : 1));
  const [formUnit, setFormUnit] = useState(() => editingProduct?.unit || "");
  const formPrice = editingProduct?.price || 0;

  const [itemLogs, setItemLogs] = useState<Activity[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch modification logs if editing an existing product
  useEffect(() => {
    if (!editingProduct) return;

    let ignore = false;
    const fetchLogs = async () => {
      setLoadingLogs(true);
      try {
        const cleanName = (editingProduct.name || "").trim();
        const cleanCat = (editingProduct.category || "").trim();
        const cleanType = (editingProduct.item_type || "").trim();

        let query = supabase.from("activities").select("*");

        if (cleanCat && activeLocationsCount === 1) {
          if (cleanType) {
            query = query.or(`message.ilike.%[${cleanCat}]%[${cleanType}]%[${cleanName}]%,message.ilike.%[${cleanCat}]%[${cleanName}]%`);
          } else {
            query = query.ilike("message", `%[${cleanCat}]%[${cleanName}]%`);
          }
        } else {
          query = query.or(`message.ilike.%[${cleanName}]%,message.ilike.%${cleanName}%`);
        }

        const { data, error } = await query
          .order("created_at", { ascending: false })
          .limit(15);

        if (!ignore) {
          if (!error && data) {
            setItemLogs(data as Activity[]);
          } else {
            setItemLogs([]);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error fetching logs in ItemModal:", err);
          setItemLogs([]);
        }
      } finally {
        if (!ignore) {
          setLoadingLogs(false);
        }
      }
    };

    fetchLogs();

    return () => {
      ignore = true;
    };
  }, [editingProduct, activeLocationsCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSave({
        name: formName,
        category: formCategory,
        type: formType,
        stock: formStock,
        unit: formUnit,
        price: formPrice,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-[460px] rounded-[2rem] shadow-2xl p-6 sm:p-7 space-y-4 border border-zinc-200 dark:border-zinc-800">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight font-headline">
              Item
            </h3>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
              {editingProduct ? "품목 정보 수정" : "새로운 품목 등록"}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Fields: Name, Location & Type (2-Col Grid), Quantity & Unit */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 1. Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
              이름 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white transition-all"
            />
          </div>

          {/* 2 & 3. Location & Type - 2-Column Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Location */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                위치 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white transition-all"
              />
              {existingLocations.length > 0 && (
                <div className="flex gap-1 pt-0.5 flex-wrap">
                  {existingLocations.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setFormCategory(loc)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer select-none active:scale-95 ${
                        formCategory === loc
                          ? "bg-blue-600 text-white border-blue-600 font-black shadow-xs"
                          : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-700/80"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                유형
              </label>
              <input
                type="text"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white transition-all"
              />
              {existingTypes.length > 0 && (
                <div className="flex gap-1 pt-0.5 flex-wrap">
                  {existingTypes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer select-none active:scale-95 ${
                        formType === t
                          ? "bg-blue-600 text-white border-blue-600 font-black shadow-xs"
                          : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-700/80"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. Quantity & Unit */}
          <div className="grid grid-cols-12 gap-2.5">
            {/* Quantity */}
            <div className="col-span-8 flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                수량 <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => setFormStock((prev) => Math.max(0, prev - 1))}
                  className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-black text-base border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
                  title="-1"
                >
                  -
                </button>
                <input
                  type="number"
                  required
                  min={0}
                  value={formStock}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormStock(val === "" ? 0 : Math.max(0, parseInt(val, 10) || 0));
                  }}
                  className="flex-1 min-w-0 w-full py-2 px-2 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-center font-black text-sm sm:text-base text-zinc-900 dark:text-white tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => setFormStock((prev) => prev + 1)}
                  className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-black text-base border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
                  title="+1"
                >
                  +
                </button>
              </div>
            </div>

            {/* Unit */}
            <div className="col-span-4 flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                단위
              </label>
              <input
                type="text"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                className="w-full py-2 px-3 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-center font-bold text-sm text-zinc-900 dark:text-white transition-all h-10"
              />
            </div>
          </div>

          {/* 5. Item Modification History / Change Logs (최신 3건) */}
          {editingProduct && (
            <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                  수정 이력 (최근 3건)
                </span>
                {editingProduct.updated_at && (
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    최근: {new Date(editingProduct.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {loadingLogs ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 py-0.5">이력을 불러오는 중...</p>
                ) : itemLogs.filter((log) => log.message.includes("재고") || log.message.includes("수량")).length > 0 ? (
                  itemLogs
                    .filter((log) => log.message.includes("재고") || log.message.includes("수량"))
                    .slice(0, 3)
                    .map((log) => {
                      let displayMsg = log.message;

                      // Format: [장소] [유형] [품목] 재고 +N or [장소] [품목] 재고 +N
                      const threeMatch = displayMsg.match(/^\[(.*?)\]\s*\[(.*?)\]\s*\[(.*?)\]\s*(.*)$/);
                      const twoMatch = displayMsg.match(/^\[(.*?)\]\s*\[(.*?)\]\s*(.*)$/);

                      if (threeMatch) {
                        const loc = threeMatch[1];
                        const change = threeMatch[4];
                        displayMsg = activeLocationsCount !== 1 ? `${loc} ${change}` : change;
                      } else if (twoMatch) {
                        const loc = twoMatch[1];
                        const change = twoMatch[3];
                        displayMsg = activeLocationsCount !== 1 ? `${loc} ${change}` : change;
                      } else {
                        const singleMatch = displayMsg.match(/^\[.*?\]\s*(.*)$/);
                        if (singleMatch && singleMatch[1]) {
                          displayMsg = singleMatch[1];
                        }
                      }

                      // Convert older format to clean delta
                      const qtyMatch = displayMsg.match(/수량\s*\((\d+)개?\s*→\s*(\d+)개?\)/);
                      if (qtyMatch) {
                        const oldQty = parseInt(qtyMatch[1], 10);
                        const newQty = parseInt(qtyMatch[2], 10);
                        const diff = newQty - oldQty;
                        displayMsg = displayMsg.replace(/수량\s*\(\d+개?\s*→\s*\d+개?\)/, `재고 ${diff > 0 ? `+${diff}` : diff}`);
                      }

                      const formattedDate = (() => {
                        try {
                          const d = new Date(log.created_at);
                          return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                        } catch {
                          return log.created_at;
                        }
                      })();

                      return (
                        <div key={log.id} className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-zinc-600 dark:text-zinc-300 font-medium truncate">
                              {displayMsg}
                            </span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 tabular-nums">
                              {log.user_email || "USER"} • {formattedDate}
                            </span>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 py-0.5">수정 이력이 없습니다.</p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {editingProduct ? (
            <div className="flex gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => onDeleteRequest(editingProduct)}
                className="px-4 py-2.5 border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                삭제
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? "등록 중..." : "등록"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Client-only Sort state (Saved per user in localStorage)
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("inventory_sort_option") as SortOption | null;
        if (saved && ["recent", "oldest", "name_asc", "name_desc"].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return "recent";
  });
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Modals state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Delete confirm modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Desktop Excel Actions Menu & Import file ref
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import states
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreviewItems, setImportPreviewItems] = useState<ParsedImportItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    newCount: number;
    mergedCount: number;
    errors: string[];
  } | null>(null);

  const handleSelectSort = (opt: SortOption) => {
    setSortOption(opt);
    try {
      localStorage.setItem("inventory_sort_option", opt);
    } catch {}
    setSortMenuOpen(false);
  };

  const normalizeProduct = (p: Record<string, unknown>): Product => {
    const rawSku = p.sku ? String(p.sku) : "";
    let parsedType = "";
    let parsedUnit = "";

    if (rawSku.includes(":::")) {
      const parts = rawSku.split(":::");
      parsedType = parts[0] ? parts[0].trim() : "";
      // Only consider parts[1] as unit if parts has at least 3 elements (type, unit, hash)
      if (parts.length >= 3) {
        parsedUnit = parts[1] ? parts[1].trim() : "";
      } else {
        parsedUnit = "";
      }
    } else if (rawSku.includes("_")) {
      parsedType = rawSku.split("_")[0] || "";
      parsedUnit = "";
    } else {
      parsedType = rawSku || (p.item_type ? String(p.item_type) : "");
      parsedUnit = p.unit ? String(p.unit) : "";
    }

    // Filter out accidental hash / random strings from unit
    if (/^[a-z0-9]{6,12}$/i.test(parsedUnit)) {
      parsedUnit = "";
    }

    const stockNum = typeof p.stock_quantity === "number" ? p.stock_quantity : (typeof p.stock === "number" ? p.stock : 0);
    const targetNum = typeof p.target_quantity === "number" ? p.target_quantity : (typeof p.target === "number" ? p.target : 0);

    return {
      id: String(p.id || ""),
      name: String(p.name || ""),
      category: String(p.category || ""),
      sku: p.sku ? String(p.sku) : null,
      item_type: parsedType,
      unit: parsedUnit,
      stock_quantity: stockNum,
      stock: stockNum,
      target_quantity: targetNum,
      target: targetNum,
      price: typeof p.price === "number" ? p.price : 0,
      updated_by: p.updated_by ? String(p.updated_by) : (p.edit_user ? String(p.edit_user) : ""),
      edit_user: p.updated_by ? String(p.updated_by) : (p.edit_user ? String(p.edit_user) : ""),
      updated_at: p.updated_at ? String(p.updated_at) : (p.edit_date ? String(p.edit_date) : ""),
      edit_date: p.updated_at ? String(p.updated_at) : (p.edit_date ? String(p.edit_date) : ""),
    };
  };

  useEffect(() => {
    let ignore = false;

    const loadProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("name", { ascending: true });
        if (error) throw error;
        if (!ignore) setProducts((data || []).map(normalizeProduct));
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadProducts();

    // 2. Setup Realtime subscription
    const channel = supabase
      .channel("inventory-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setProducts((prev) => 
              [...prev, normalizeProduct(payload.new)].sort((a, b) => a.name.localeCompare(b.name))
            );
          } else if (payload.eventType === "UPDATE") {
            setProducts((prev) =>
              prev.map((p) => (p.id === payload.new.id ? normalizeProduct(payload.new) : p))
            );
          } else if (payload.eventType === "DELETE") {
            setProducts((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper log activity
  const logActivity = async (type: "ORDER" | "RECEIVE" | "CREATE" | "UPDATE" | "DELETE", message: string) => {
    if (!user) return;
    const userEmail = user.email || "UNKNOWN";
    const shortUser = userEmail.split("@")[0].toUpperCase();
    try {
      await supabase.from("activities").insert([
        {
          type,
          message,
          user_email: shortUser,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.error("Failed to log activity:", err);
    }
  };

  // 3. Location Categories: Only from actual products
  const existingLocations = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((p) => (p.category || "").trim())
          .filter(Boolean)
      )
    );
  }, [products]);

  // Active locations: All locations by default (전체보기), or user-selected subset
  const activeLocations = useMemo(() => {
    if (selectedLocations === null) {
      return existingLocations;
    }
    return selectedLocations.filter((loc) => existingLocations.includes(loc));
  }, [selectedLocations, existingLocations]);

  // Toggle single location selection (다중 선택 및 한 번 더 눌러 취소)
  const toggleLocation = (loc: string) => {
    setSelectedLocations((prev) => {
      const current = prev === null ? [...existingLocations] : prev;
      if (current.includes(loc)) {
        return current.filter((l) => l !== loc);
      } else {
        return [...current, loc];
      }
    });
  };

  // 4. Existing Types: Only types that previously exist in products
  const existingTypes = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((p) => (p.item_type || "").trim())
          .filter(Boolean)
      )
    );
  }, [products]);

  // 5. Map of same-item occurrences across all locations (normalized by lowercase name)
  const sameNameItemsMap = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const nameKey = (p.name || "").trim().toLowerCase();
      if (!nameKey) continue;
      const list = map.get(nameKey) || [];
      list.push(p);
      map.set(nameKey, list);
    }
    return map;
  }, [products]);

  // 6. Filter & Sort Products (Display separately per location, do not aggregate)
  const filteredProducts = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    const applySort = (list: Product[]) => {
      return [...list].sort((a, b) => {
        if (sortOption === "recent") {
          const timeA = a.updated_at ? new Date(a.updated_at).getTime() : (a.edit_date ? new Date(a.edit_date).getTime() : 0);
          const timeB = b.updated_at ? new Date(b.updated_at).getTime() : (b.edit_date ? new Date(b.edit_date).getTime() : 0);
          if (timeB !== timeA) return timeB - timeA;
          const nameCmp = a.name.localeCompare(b.name, "ko");
          if (nameCmp !== 0) return nameCmp;
          return (a.category || "").localeCompare(b.category || "", "ko");
        }
        if (sortOption === "oldest") {
          const timeA = a.updated_at ? new Date(a.updated_at).getTime() : (a.edit_date ? new Date(a.edit_date).getTime() : 0);
          const timeB = b.updated_at ? new Date(b.updated_at).getTime() : (b.edit_date ? new Date(b.edit_date).getTime() : 0);
          if (timeA !== timeB) return timeA - timeB;
          const nameCmp = a.name.localeCompare(b.name, "ko");
          if (nameCmp !== 0) return nameCmp;
          return (a.category || "").localeCompare(b.category || "", "ko");
        }
        if (sortOption === "name_asc") {
          const cmp = a.name.localeCompare(b.name, "ko");
          if (cmp !== 0) return cmp;
          return (a.category || "").localeCompare(b.category || "", "ko");
        }
        if (sortOption === "name_desc") {
          const cmp = b.name.localeCompare(a.name, "ko");
          if (cmp !== 0) return cmp;
          return (a.category || "").localeCompare(b.category || "", "ko");
        }
        return 0;
      });
    };

    if (activeLocations.length === 0) {
      return [];
    }

    // Filter products belonging to any active selected location
    const matchedProducts = products.filter((p) => {
      const pCat = (p.category || "").trim();
      const pName = (p.name || "").trim();
      const pType = (p.item_type || "").trim();

      const inSelectedLoc = activeLocations.includes(pCat);
      if (!inSelectedLoc) return false;

      if (searchLower) {
        return pName.toLowerCase().includes(searchLower) ||
               pCat.toLowerCase().includes(searchLower) ||
               pType.toLowerCase().includes(searchLower);
      }
      return true;
    });

    // Do NOT aggregate items across locations: each product row is kept individually
    const list = matchedProducts.map((p) => {
      const pCat = (p.category || "").trim();
      return {
        ...p,
        category: pCat || "기타",
        locations: pCat ? [pCat] : [],
        locationCount: 1,
      };
    });

    return applySort(list);
  }, [products, activeLocations, search, sortOption]);

  // 7. Group products by name to bundle multi-location items in purple boxes
  const groupedProducts = useMemo(() => {
    type ProductGroup = {
      key: string;
      name: string;
      isMultiLocation: boolean;
      totalStock: number;
      unit: string;
      items: Product[];
    };

    const groups: ProductGroup[] = [];
    const map = new Map<string, ProductGroup>();

    for (const p of filteredProducts) {
      const nameKey = (p.name || "").trim().toLowerCase();
      const allOccurrences = sameNameItemsMap.get(nameKey) || [];
      const isMulti = allOccurrences.length > 1;

      if (!map.has(nameKey)) {
        const grp: ProductGroup = {
          key: nameKey,
          name: p.name,
          isMultiLocation: isMulti,
          totalStock: p.stock,
          unit: p.unit || "",
          items: [p],
        };
        map.set(nameKey, grp);
        groups.push(grp);
      } else {
        const grp = map.get(nameKey)!;
        grp.items.push(p);
        grp.totalStock += p.stock;
        if (!grp.unit && p.unit) grp.unit = p.unit;
      }
    }

    return groups;
  }, [filteredProducts, sameNameItemsMap]);

  // 8. Open Form Modal for Create/Update
  const openItemModal = (product: Product | null = null) => {
    setEditingProduct(product);
    setItemModalOpen(true);
  };

  // 6. Save Product (Insert, Update, or Merge duplicate in same location)
  const handleSaveProduct = async (formData: {
    name: string;
    category: string;
    type: string;
    stock: number;
    unit: string;
    price: number;
  }) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    const userShort = user.email ? user.email.split("@")[0].toUpperCase() : "USER";
    const typeVal = formData.type.trim();
    const unitVal = formData.unit.trim();
    const skuVal = `${typeVal}:::${unitVal}:::${Date.now().toString(36)}`;

    const payload: Record<string, unknown> = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      sku: skuVal,
      stock_quantity: formData.stock,
      target_quantity: formData.stock,
      price: formData.price || 0,
      updated_by: userShort,
      updated_at: new Date().toISOString()
    };

    try {
      if (editingProduct) {
        const oldName = (editingProduct.name || "").trim();
        const newName = formData.name.trim();
        const oldCat = (editingProduct.category || "").trim();
        const newCat = formData.category.trim();
        const oldType = (editingProduct.item_type || "").trim();
        const newType = typeVal;
        const oldStock = editingProduct.stock;
        const newStock = formData.stock;
        const delta = newStock - oldStock;

        // Update DB
        const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
        if (error) throw error;
        
        // Log ONLY when stock quantity changes - tagged with [장소] [유형] [품목명]
        if (delta !== 0) {
          const sign = delta > 0 ? `+${delta}` : `${delta}`;
          const currentCat = newCat || oldCat || "기타";
          const currentType = newType || oldType || "기타";
          await logActivity("UPDATE", `[${currentCat}] [${currentType}] [${newName || oldName}] 재고 ${sign}`);
        }
      } else {
        // Auto-merge if product with same name + location + type already exists
        const { data: existingRows } = await supabase
          .from("products")
          .select("*")
          .eq("name", formData.name.trim())
          .eq("category", formData.category.trim());

        const matched = existingRows?.find((r) => {
          const rSku = r.sku ? String(r.sku) : "";
          let rType = "";
          if (rSku.includes(":::")) {
            rType = rSku.split(":::")[0];
          } else if (rSku.includes("_")) {
            rType = rSku.split("_")[0];
          } else {
            rType = rSku;
          }
          return typeVal === rType || (!typeVal && !rType);
        }) || (existingRows && existingRows.length === 1 ? existingRows[0] : null);

        if (matched) {
          // Merge: Add stock to existing product instead of creating duplicate box
          const newTotalStock = (matched.stock_quantity || 0) + formData.stock;
          const { error } = await supabase
            .from("products")
            .update({
              stock_quantity: newTotalStock,
              target_quantity: newTotalStock,
              sku: skuVal,
              updated_by: userShort,
              updated_at: new Date().toISOString()
            })
            .eq("id", matched.id);

          if (error) throw error;

          const currentType = typeVal || "기타";
          await logActivity("UPDATE", `[${formData.category.trim()}] [${currentType}] [${formData.name.trim()}] 재고 +${formData.stock}`);
        } else {
          // Insert new item
          let { error } = await supabase.from("products").insert([payload]);
          if (error && error.message?.includes("sku")) {
            payload.sku = null;
            const retry = await supabase.from("products").insert([payload]);
            error = retry.error;
          }
          if (error) {
            const lowerMsg = error.message?.toLowerCase() || "";
            if (error.code === "23505" || lowerMsg.includes("duplicate key") || lowerMsg.includes("unique")) {
              if (lowerMsg.includes("name") || lowerMsg.includes("products_name_key")) {
                alert(`이미 '${formData.name}' 이름의 품목이 등록되어 있습니다.\n\n동일한 품목을 다른 장소에 별도로 등록하시려면 품목명에 장소를 함께 기재해 주세요.\n(예: ${formData.name} (${formData.category}))`);
                return;
              }
            }
            throw error;
          }
          const currentType = typeVal || "기타";
          await logActivity("CREATE", `[${formData.category.trim()}] [${currentType}] [${formData.name.trim()}] 재고 +${formData.stock}`);
        }
      }
      setItemModalOpen(false);
    } catch (err: unknown) {
      console.error("Error saving product:", err);
      const errMsg = err instanceof Error ? err.message : (typeof err === "object" && err !== null && "message" in err ? String((err as { message: unknown }).message) : "알 수 없는 오류가 발생했습니다.");
      alert(`품목 저장 오류: ${errMsg}`);
    }
  };

  // 7. Delete Product (Also clean up activity logs for this exact product so recreating starts fresh)
  const handleDelete = async () => {
    if (!deletingProduct) return;
    try {
      const cleanName = (deletingProduct.name || "").trim();
      const cleanCat = (deletingProduct.category || "").trim();

      // 1. Delete product row
      const { error } = await supabase.from("products").delete().eq("id", deletingProduct.id);
      if (error) throw error;

      // 2. Clear all activity logs for this exact item box in this location so recreating starts fresh
      if (cleanCat && cleanName) {
        await supabase
          .from("activities")
          .delete()
          .ilike("message", `%[${cleanCat}]%[${cleanName}]%`);
      }

      await logActivity("DELETE", `${deletingProduct.name} 품목을 삭제했습니다.`);
      setDeleteModalOpen(false);
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  // 9. Download Excel Template (양식 다운로드)
  const handleDownloadTemplate = () => {
    const headers = [
      "품목명 (필수)",
      "보관위치 (필수)",
      "분류 (선택)",
      "현재재고 (필수)",
      "단위 (선택)",
      "목표재고 (선택)",
      "단가 (선택)",
    ];

    const sampleRows = [
      ["에탄올 99%", "1층 실험실", "시약", 10, "병", 15, 25000],
      ["마이크로피펫 팁 (200ul)", "2층 창고", "소모품", 5, "box", 10, 18000],
      ["라텍스 장갑 (M)", "사무실", "소모품", 3, "box", 5, 12000],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws["!cols"] = [
      { wch: 25 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "재고등록양식");
    XLSX.writeFile(wb, "재고_일괄등록_양식.xlsx");
  };

  // 10. Export Inventory to Excel (현재 재고 목록 엑셀 내보내기)
  const handleExportExcel = () => {
    if (products.length === 0) {
      alert("내보낼 재고 데이터가 없습니다.");
      return;
    }

    const headers = [
      "품목명",
      "보관위치",
      "분류",
      "현재재고",
      "단위",
      "목표재고",
      "단가(원)",
      "최종수정자",
      "최종수정일",
    ];

    const listToExport = filteredProducts.length > 0 ? filteredProducts : products;

    const rows = listToExport.map((p) => [
      p.name,
      p.category || "기타",
      p.item_type || "-",
      p.stock,
      p.unit || "-",
      p.target,
      p.price || 0,
      p.updated_by || "-",
      p.updated_at ? new Date(p.updated_at).toLocaleString("ko-KR") : "-",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [
      { wch: 25 },
      { wch: 18 },
      { wch: 15 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "재고목록");

    const todayStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `재고목록_${todayStr}.xlsx`);
  };

  // 11. Trigger File Upload (Import)
  const handleTriggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) {
          alert("유효한 시트를 찾을 수 없습니다.");
          return;
        }

        const ws = wb.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
        if (!rawRows || rawRows.length < 2) {
          alert("파일에 데이터가 없거나 서식이 비어 있습니다.");
          return;
        }

        const headerRow = (rawRows[0] || []).map((h) => String(h || "").trim().toLowerCase());

        const nameIdx = headerRow.findIndex((h) => h.includes("품목") || h.includes("이름") || h.includes("name"));
        const catIdx = headerRow.findIndex((h) => h.includes("위치") || h.includes("카테고리") || h.includes("category") || h.includes("장소"));
        const typeIdx = headerRow.findIndex((h) => h.includes("분류") || h.includes("유형") || h.includes("type"));
        const stockIdx = headerRow.findIndex((h) => h.includes("재고") || h.includes("수량") || h.includes("stock"));
        const unitIdx = headerRow.findIndex((h) => h.includes("단위") || h.includes("unit"));
        const targetIdx = headerRow.findIndex((h) => h.includes("목표") || h.includes("적정") || h.includes("target"));
        const priceIdx = headerRow.findIndex((h) => h.includes("단가") || h.includes("가격") || h.includes("price") || h.includes("금액"));

        if (nameIdx === -1) {
          alert("품목명(이름) 열을 찾을 수 없습니다.\n양식을 다운로드하여 양식대로 작성해 주세요.");
          return;
        }

        const parsed: ParsedImportItem[] = [];
        for (let i = 1; i < rawRows.length; i++) {
          const r = rawRows[i];
          if (!r || r.length === 0) continue;
          const name = String(r[nameIdx] || "").trim();
          if (!name) continue;

          const category = catIdx !== -1 && r[catIdx] ? String(r[catIdx]).trim() : "기타";
          const itemType = typeIdx !== -1 && r[typeIdx] ? String(r[typeIdx]).trim() : "";
          const stock = stockIdx !== -1 ? Math.max(0, parseInt(String(r[stockIdx] || "0").replace(/[^0-9-]/g, ""), 10) || 0) : 0;
          const unit = unitIdx !== -1 && r[unitIdx] ? String(r[unitIdx]).trim() : "개";
          const target = targetIdx !== -1 ? Math.max(0, parseInt(String(r[targetIdx] || "0").replace(/[^0-9-]/g, ""), 10) || 0) : stock;
          const price = priceIdx !== -1 ? Math.max(0, parseInt(String(r[priceIdx] || "0").replace(/[^0-9-]/g, ""), 10) || 0) : 0;

          parsed.push({
            name,
            category: category || "기타",
            item_type: itemType,
            stock,
            unit: unit || "개",
            target: target || stock,
            price,
          });
        }

        if (parsed.length === 0) {
          alert("등록 가능한 품목이 없습니다. 파일 내용을 확인해 주세요.");
          return;
        }

        setImportPreviewItems(parsed);
        setImportResult(null);
        setImportModalOpen(true);
      } catch (err) {
        console.error("Error reading excel file:", err);
        alert("엑셀 파일을 읽는 중 오류가 발생했습니다. 올바른 엑셀 파일인지 확인해 주세요.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 12. Batch Import Execution
  const handleExecuteImport = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (importPreviewItems.length === 0) return;

    setImporting(true);
    const userShort = user.email ? user.email.split("@")[0].toUpperCase() : "USER";
    let newCount = 0;
    let mergedCount = 0;
    const errorList: string[] = [];

    try {
      // 1. Fetch latest products for accurate matching
      const { data: latestRows, error: fetchErr } = await supabase
        .from("products")
        .select("*");
      if (fetchErr) throw fetchErr;

      const existingList = (latestRows || []).map(normalizeProduct);

      for (let i = 0; i < importPreviewItems.length; i++) {
        const item = importPreviewItems[i];
        const cleanName = item.name.trim();
        const cleanCat = item.category.trim();
        const cleanType = item.item_type.trim();

        const matched = existingList.find(
          (p) =>
            p.name.trim().toLowerCase() === cleanName.toLowerCase() &&
            (p.category || "").trim().toLowerCase() === cleanCat.toLowerCase() &&
            (!cleanType || (p.item_type || "").trim().toLowerCase() === cleanType.toLowerCase())
        );

        if (matched) {
          // Merge
          const newTotalStock = matched.stock + item.stock;
          const { error: updErr } = await supabase
            .from("products")
            .update({
              stock_quantity: newTotalStock,
              target_quantity: item.target || newTotalStock,
              price: item.price || matched.price || 0,
              updated_by: userShort,
              updated_at: new Date().toISOString(),
            })
            .eq("id", matched.id);

          if (updErr) {
            errorList.push(`${cleanName} (${cleanCat}): ${updErr.message}`);
          } else {
            matched.stock = newTotalStock;
            mergedCount++;
          }
        } else {
          // Insert new
          const skuVal = `${cleanType}:::${item.unit}:::${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2, 6)}`;
          const payload: Record<string, unknown> = {
            name: cleanName,
            category: cleanCat || "기타",
            sku: skuVal,
            stock_quantity: item.stock,
            target_quantity: item.target || item.stock,
            price: item.price || 0,
            updated_by: userShort,
            updated_at: new Date().toISOString(),
          };

          let { error: insErr } = await supabase.from("products").insert([payload]);
          if (insErr && insErr.message?.includes("sku")) {
            payload.sku = null;
            const retry = await supabase.from("products").insert([payload]);
            insErr = retry.error;
          }

          if (insErr) {
            errorList.push(`${cleanName} (${cleanCat}): ${insErr.message}`);
          } else {
            newCount++;
          }
        }
      }

      await logActivity("CREATE", `엑셀 일괄 등록 완료 (신규 ${newCount}건, 합산 ${mergedCount}건)`);

      // Reload products
      const { data: refreshed } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });
      if (refreshed) {
        setProducts(refreshed.map(normalizeProduct));
      }

      setImportResult({
        success: newCount + mergedCount,
        newCount,
        mergedCount,
        errors: errorList,
      });
    } catch (err: unknown) {
      console.error("Import error:", err);
      const errMsg = err instanceof Error ? err.message : "일괄 등록 처리 중 오류가 발생했습니다.";
      alert(errMsg);
    } finally {
      setImporting(false);
    }
  };

  // 13. Listen for actions dispatched from AppLayout (최상단 바)
  useEffect(() => {
    const handleImport = () => handleTriggerImport();
    const handleExport = () => handleExportExcel();
    const handleDownload = () => handleDownloadTemplate();

    window.addEventListener("inventory-import", handleImport);
    window.addEventListener("inventory-export", handleExport);
    window.addEventListener("inventory-download-template", handleDownload);

    return () => {
      window.removeEventListener("inventory-import", handleImport);
      window.removeEventListener("inventory-export", handleExport);
      window.removeEventListener("inventory-download-template", handleDownload);
    };
  });

  // 14. Close desktop menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(e.target as Node)) {
        setDesktopMenuOpen(false);
      }
    };
    if (desktopMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [desktopMenuOpen]);

  return (
    <div className="flex-1 p-3 sm:p-6 md:p-8 flex flex-col min-h-0 bg-zinc-50 dark:bg-zinc-950">
      
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Top Search Bar & Circular Plus Button */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 mb-3 sm:mb-3.5">
        {/* Standalone Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="품목 이름, 위치 검색..."
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all"
          />
        </div>

        {/* Desktop-only Excel Actions Menu */}
        <div className="relative hidden md:block" ref={desktopMenuRef}>
          <button
            type="button"
            onClick={() => setDesktopMenuOpen((prev) => !prev)}
            className="h-10 sm:h-11 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-2xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            title="엑셀 관리 (Import / Export / 양식 다운로드)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>엑셀 관리</span>
            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${desktopMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {desktopMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-2 z-50 animate-fadeIn space-y-1">
              <button
                type="button"
                onClick={() => {
                  setDesktopMenuOpen(false);
                  handleTriggerImport();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-zinc-800 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs transition-all cursor-pointer text-left"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Import (엑셀 업로드)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDesktopMenuOpen(false);
                  handleExportExcel();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold text-xs transition-all cursor-pointer text-left"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Export (엑셀 내보내기)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDesktopMenuOpen(false);
                  handleDownloadTemplate();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-zinc-800 dark:text-zinc-200 hover:text-amber-600 dark:hover:text-amber-400 font-bold text-xs transition-all cursor-pointer text-left"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>양식 다운로드</span>
              </button>
            </div>
          )}
        </div>

        {/* Circular Plus Button */}
        <button
          onClick={() => openItemModal(null)}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-600/30 transition-all active:scale-90 cursor-pointer shrink-0"
          title="새 품목 등록"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* 2nd Row: Dynamic Location Tabs (Multi-select) + Sort Button (Right under + button) */}
      <div className="flex items-center gap-2.5 sm:gap-3 w-full mb-3.5 sm:mb-5 shrink-0 justify-between">
        {/* Location Tabs: Multi-select & toggle cancel enabled, smooth scroll if exceeding */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5 -mx-0.5 justify-start">
          {existingLocations.map((loc) => {
            const isSelected = activeLocations.includes(loc);
            return (
              <button
                key={loc}
                type="button"
                onClick={() => toggleLocation(loc)}
                className={`w-[calc((100%-18px)/4)] sm:w-[calc((100%-32px)/5)] min-w-[64px] sm:min-w-[76px] shrink-0 py-2.5 px-1 sm:px-2 rounded-2xl text-[11px] sm:text-xs font-bold text-center truncate transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                  isSelected
                    ? "bg-blue-600 text-white border border-blue-600 shadow-md shadow-blue-600/30 font-black"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-800 dark:hover:text-zinc-200 shadow-xs"
                }`}
                title={`${loc} (${isSelected ? "선택됨 - 누르면 취소" : "선택 안 됨 - 누르면 선택"})`}
              >
                {loc}
              </button>
            );
          })}
        </div>

        {/* Sort Button & Popover Dropdown (Aligned vertically with the + button above) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setSortMenuOpen((prev) => !prev)}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer select-none active:scale-95 shadow-xs ${
              sortMenuOpen
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30"
                : "bg-white dark:bg-zinc-900 border-zinc-200/90 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-white"
            }`}
            title={`정렬: ${SORT_OPTIONS.find((o) => o.id === sortOption)?.label || "정렬"}`}
          >
            <ArrowUpDown className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Sort Popover Menu */}
          {sortMenuOpen && (
            <>
              {/* Invisible Backdrop */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setSortMenuOpen(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 z-50 animate-fadeIn space-y-0.5">
                <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    정렬 기준
                  </p>
                </div>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectSort(opt.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-extrabold"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Product List Section (No Outer Box Wrapper) */}
      <div className="flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-20">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : activeLocations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 sm:p-20 text-center space-y-2 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <AlertCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-1" />
            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">
              선택된 장소가 없습니다.
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              상단의 장소 버튼을 눌러 확인하려는 위치를 선택해 주세요.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 sm:p-20 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <AlertCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              선택한 장소에 등록된 품목이 없습니다.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block flex-1 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">품목 및 위치</th>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-right">현재 재고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {groupedProducts.map((group) => {
                    // Multi-location: Bundled together in a Purple Box
                    if (group.isMultiLocation && group.items.length > 1) {
                      return (
                        <tr key={group.key} className="bg-indigo-50/20 dark:bg-indigo-950/20">
                          <td colSpan={2} className="px-6 py-3.5">
                            <div className="bg-indigo-50/75 dark:bg-indigo-950/45 border-2 border-indigo-200/90 dark:border-indigo-800/80 rounded-2xl p-4 space-y-2.5 shadow-xs">
                              {/* Purple Box Header */}
                              <div className="flex items-center justify-between pb-2 border-b border-indigo-200/70 dark:border-indigo-800/60">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-base text-indigo-950 dark:text-indigo-100">
                                    {group.name}
                                  </span>
                                </div>
                                <div className="flex items-baseline gap-1.5 text-right">
                                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">총 재고</span>
                                  <span className="text-lg font-black text-indigo-950 dark:text-indigo-100 tabular-nums">
                                    {group.totalStock}
                                  </span>
                                  {group.unit && <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">{group.unit}</span>}
                                </div>
                              </div>

                              {/* Separate Location Rows inside the Purple Box */}
                              <div className="space-y-1.5">
                                {group.items.map((p) => {
                                  const isLow = p.stock > 0 && p.stock <= p.target * 0.3;
                                  const isOut = p.stock === 0;
                                  return (
                                    <div
                                      key={p.id}
                                      onClick={() => openItemModal(p)}
                                      className="flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-zinc-900 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50 transition-all cursor-pointer select-none group shadow-2xs"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 rounded-lg text-xs font-black border border-indigo-200 dark:border-indigo-800">
                                          {p.category || "기타"}
                                        </span>
                                        {p.item_type && (
                                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md text-[9px] font-black border border-blue-500/20">
                                            {p.item_type}
                                          </span>
                                        )}
                                        {isOut ? (
                                          <span className="px-1.5 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-black rounded-md">
                                            품절
                                          </span>
                                        ) : isLow ? (
                                          <span className="px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black rounded-md">
                                            부족
                                          </span>
                                        ) : null}
                                      </div>

                                      <div className="flex items-baseline gap-1">
                                        <span className={`text-base font-black tabular-nums ${
                                          isOut ? "text-rose-500 dark:text-rose-400 line-through" : isLow ? "text-amber-500 dark:text-amber-400" : "text-zinc-900 dark:text-white"
                                        }`}>
                                          {p.stock}
                                        </span>
                                        {p.unit && <span className="text-xs font-bold text-zinc-400">{p.unit}</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // Single-location item row
                    const p = group.items[0];
                    const isLow = p.stock > 0 && p.stock <= p.target * 0.3;
                    const isOut = p.stock === 0;
                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => openItemModal(p)}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 active:bg-zinc-100 dark:active:bg-zinc-800/70 transition-colors cursor-pointer select-none"
                      >
                        <td className="px-8 py-4">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 min-w-0">
                            <span className="font-extrabold text-base text-zinc-900 dark:text-white leading-snug break-words">
                              {p.name}
                            </span>
                            <div className="inline-flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md text-[10px] font-bold border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                                {p.category || "기타"}
                              </span>
                              {p.item_type && (
                                <span className="px-2 py-0.5 bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-md text-[9px] font-black border border-blue-500/20 shrink-0">
                                  {p.item_type}
                                </span>
                              )}
                              {isOut ? (
                                <span className="px-1.5 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-black rounded-md shrink-0">
                                  품절
                                </span>
                              ) : isLow ? (
                                <span className="px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black rounded-md shrink-0">
                                  부족
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex items-baseline justify-end gap-1">
                            <span className={`text-lg font-black tabular-nums ${
                              isOut 
                                ? "text-rose-500 dark:text-rose-400 line-through" 
                                : isLow 
                                ? "text-amber-500 dark:text-amber-400" 
                                : "text-zinc-900 dark:text-white"
                            }`}>
                              {p.stock}
                            </span>
                            {p.unit && (
                              <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">{p.unit}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile List View */}
            <div className="md:hidden flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-0.5">
              {groupedProducts.map((group) => {
                // Multi-location: Bundled together in a Purple Box on Mobile
                if (group.isMultiLocation && group.items.length > 1) {
                  return (
                    <div 
                      key={group.key}
                      className="bg-indigo-50/75 dark:bg-indigo-950/45 border-2 border-indigo-200/90 dark:border-indigo-800/80 rounded-2xl p-3.5 space-y-2.5 shadow-xs"
                    >
                      {/* Box Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-indigo-200/70 dark:border-indigo-800/60">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-black text-sm sm:text-base text-indigo-950 dark:text-indigo-100">
                            {group.name}
                          </h4>
                        </div>
                        <div className="flex items-baseline gap-1 text-right">
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">총</span>
                          <span className="text-base font-black text-indigo-950 dark:text-indigo-100 tabular-nums">
                            {group.totalStock}
                          </span>
                          {group.unit && <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">{group.unit}</span>}
                        </div>
                      </div>

                      {/* Separate Location Rows inside the Purple Box */}
                      <div className="space-y-1.5">
                        {group.items.map((p) => {
                          const isLow = p.stock > 0 && p.stock <= p.target * 0.3;
                          const isOut = p.stock === 0;
                          return (
                            <div
                              key={p.id}
                              onClick={() => openItemModal(p)}
                              className="flex items-center justify-between px-3 py-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-indigo-100 dark:border-indigo-900/50 active:scale-[0.99] transition-all cursor-pointer select-none shadow-2xs"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-bold px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                                  {p.category || "기타"}
                                </span>
                                {p.item_type && (
                                  <span className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black px-1.5 py-0.5 rounded-md border border-blue-500/20">
                                    {p.item_type}
                                  </span>
                                )}
                                {isOut ? (
                                  <span className="px-1.5 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-black rounded-md">
                                    품절
                                  </span>
                                ) : isLow ? (
                                  <span className="px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black rounded-md">
                                    부족
                                  </span>
                                ) : null}
                              </div>

                              <div className="flex items-baseline gap-1 text-right">
                                <span className={`text-base font-black tabular-nums ${
                                  isOut ? "text-rose-500 dark:text-rose-400 line-through" : isLow ? "text-amber-500 dark:text-amber-400" : "text-zinc-900 dark:text-white"
                                }`}>
                                  {p.stock}
                                </span>
                                {p.unit && <span className="text-xs font-bold text-zinc-400">{p.unit}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // Single-location item card on mobile
                const p = group.items[0];
                const isLow = p.stock > 0 && p.stock <= p.target * 0.3;
                const isOut = p.stock === 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => openItemModal(p)}
                    className="bg-white dark:bg-zinc-900 px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs flex items-center justify-between gap-3 active:scale-[0.99] transition-all cursor-pointer select-none hover:border-zinc-400 dark:hover:border-zinc-700 active:bg-zinc-50 dark:active:bg-zinc-800/60"
                  >
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h4 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white leading-snug break-words">
                        {p.name}
                      </h4>
                      <div className="inline-flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold px-2 py-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                          {p.category || "기타"}
                        </span>
                        {p.item_type && (
                          <span className="text-[10px] bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-black px-2 py-0.5 rounded-md border border-blue-500/20 shrink-0">
                            {p.item_type}
                          </span>
                        )}
                        {isOut ? (
                          <span className="px-1.5 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-black rounded-md shrink-0">
                            품절
                          </span>
                        ) : isLow ? (
                          <span className="px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black rounded-md shrink-0">
                            부족
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-0.5 shrink-0 text-right pl-2">
                      <span className={`text-lg sm:text-xl font-black tabular-nums ${
                        isOut 
                          ? "text-rose-500 dark:text-rose-400 line-through" 
                          : isLow 
                          ? "text-amber-500 dark:text-amber-400" 
                          : "text-zinc-900 dark:text-white"
                      }`}>
                        {p.stock}
                      </span>
                      {p.unit && (
                        <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">{p.unit}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 1. Isolated Item Form Modal (Zero lag, zero input dropping, instant IME typing) */}
      {itemModalOpen && (
        <ItemModal
          key={editingProduct ? editingProduct.id : "new-item-modal"}
          editingProduct={editingProduct}
          defaultLocation={activeLocations.length === 1 ? activeLocations[0] : ""}
          existingLocations={existingLocations}
          existingTypes={existingTypes}
          activeLocationsCount={activeLocations.length}
          onClose={() => setItemModalOpen(false)}
          onDeleteRequest={(prod) => {
            setDeletingProduct(prod);
            setItemModalOpen(false);
            setDeleteModalOpen(true);
          }}
          onSave={handleSaveProduct}
        />
      )}

      {/* 2. Delete Confirm Modal */}
      {deleteModalOpen && deletingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-[400px] rounded-[2.5rem] shadow-2xl p-8 space-y-6 text-center border border-zinc-200 dark:border-zinc-800">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-2 text-zinc-900 dark:text-white">
              <Trash2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">정말 삭제하시겠습니까?</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-2 leading-relaxed">
                &quot;{deletingProduct.name}&quot; 품목을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-black text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white rounded-2xl font-black text-sm shadow-md active:scale-95 transition-all cursor-pointer"
              >
                삭제 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Excel Import Preview & Execution Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-[620px] rounded-[2.5rem] shadow-2xl p-6 sm:p-8 space-y-5 border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[85vh] animate-fadeIn">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg sm:text-xl text-zinc-900 dark:text-white">
                    재고 일괄 등록 (Import)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-0.5">
                    {importResult 
                      ? "일괄 등록 결과 안내" 
                      : `엑셀 파일에서 총 ${importPreviewItems.length}개의 품목을 읽었습니다.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImportModalOpen(false);
                  setImportResult(null);
                }}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {importResult ? (
              // Result View
              <div className="py-6 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-zinc-900 dark:text-white">
                    일괄 등록이 완료되었습니다!
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold mt-1.5">
                    신규 등록: <span className="text-blue-600 dark:text-blue-400 font-extrabold">{importResult.newCount}건</span> · 기존 재고 합산: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{importResult.mergedCount}건</span>
                  </p>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="w-full bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-3 text-left space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400">일부 품목 실패 ({importResult.errors.length}건):</p>
                    {importResult.errors.map((err, idx) => (
                      <p key={idx} className="text-[11px] text-rose-500 font-mono">{err}</p>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setImportModalOpen(false);
                    setImportResult(null);
                  }}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm transition-all shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  확인
                </button>
              </div>
            ) : (
              // Preview View
              <>
                <div className="flex-1 overflow-y-auto custom-scrollbar border border-zinc-200/80 dark:border-zinc-800 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-zinc-100 dark:bg-zinc-800/80 sticky top-0 font-black text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2.5">품목명</th>
                        <th className="px-3.5 py-2.5">위치</th>
                        <th className="px-3.5 py-2.5">분류</th>
                        <th className="px-3.5 py-2.5 text-right">수량</th>
                        <th className="px-3.5 py-2.5 text-right">단가</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                      {importPreviewItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 font-medium">
                          <td className="px-3.5 py-2 font-bold text-zinc-900 dark:text-white truncate max-w-[140px]">{item.name}</td>
                          <td className="px-3.5 py-2 text-zinc-600 dark:text-zinc-300">{item.category}</td>
                          <td className="px-3.5 py-2 text-zinc-500">{item.item_type || "-"}</td>
                          <td className="px-3.5 py-2 text-right font-black tabular-nums">{item.stock}{item.unit}</td>
                          <td className="px-3.5 py-2 text-right tabular-nums text-zinc-500">{item.price ? `${item.price.toLocaleString()}원` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>동일한 위치에 같은 품목이 이미 등록되어 있는 경우 재고가 합산되며, 없는 품목은 새로 등록됩니다.</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => {
                      setImportModalOpen(false);
                      setImportResult(null);
                    }}
                    className="flex-1 py-3.5 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleExecuteImport}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm shadow-md shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>등록 처리 중...</span>
                      </>
                    ) : (
                      <span>{importPreviewItems.length}개 품목 등록 시작</span>
                    )}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
