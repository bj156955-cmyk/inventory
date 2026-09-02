"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  Check
} from "lucide-react";

export type SortOption = "recent" | "oldest" | "name_asc" | "name_desc";

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "recent", label: "최신순" },
  { id: "oldest", label: "오래된순" },
  { id: "name_asc", label: "이름순" },
  { id: "name_desc", label: "이름 역순" },
];

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
  
  // Product Form states (Name, Location, Type, Quantity, Unit)
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formType, setFormType] = useState("");
  const [formStock, setFormStock] = useState(1);
  const [formUnit, setFormUnit] = useState("");
  const [formPrice, setFormPrice] = useState(0);

  // Item modification logs state
  const [itemLogs, setItemLogs] = useState<Activity[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Delete confirm modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const handleSelectSort = (opt: SortOption) => {
    setSortOption(opt);
    try {
      localStorage.setItem("inventory_sort_option", opt);
    } catch {}
    setSortMenuOpen(false);
  };

  useEffect(() => {
    let ignore = false;

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

  // Existing Types: Only types that previously exist in products
  const existingTypes = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((p) => (p.item_type || "").trim())
          .filter(Boolean)
      )
    );
  }, [products]);

  // 4. Filter, Aggregate & Sort Products:
  // - If 0 locations selected: empty list
  // - If 1 location selected: individual items in that location
  // - If 2+ locations selected: merge same name items across selected locations (합산)
  const filteredProducts = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    const applySort = (list: Product[]) => {
      return [...list].sort((a, b) => {
        if (sortOption === "recent") {
          const timeA = a.updated_at ? new Date(a.updated_at).getTime() : (a.edit_date ? new Date(a.edit_date).getTime() : 0);
          const timeB = b.updated_at ? new Date(b.updated_at).getTime() : (b.edit_date ? new Date(b.edit_date).getTime() : 0);
          return timeB - timeA;
        }
        if (sortOption === "oldest") {
          const timeA = a.updated_at ? new Date(a.updated_at).getTime() : (a.edit_date ? new Date(a.edit_date).getTime() : 0);
          const timeB = b.updated_at ? new Date(b.updated_at).getTime() : (b.edit_date ? new Date(b.edit_date).getTime() : 0);
          return timeA - timeB;
        }
        if (sortOption === "name_asc") {
          return a.name.localeCompare(b.name, "ko");
        }
        if (sortOption === "name_desc") {
          return b.name.localeCompare(a.name, "ko");
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

    if (activeLocations.length === 1) {
      // Single Location Selected: show items for that location
      const list = matchedProducts.map((p) => ({
        ...p,
        locations: p.category ? [p.category] : [],
        locationCount: 1,
      }));
      return applySort(list);
    } else {
      // Multiple Locations Selected (or All): aggregate items with same name across selected locations
      const map = new Map<string, {
        product: Product;
        totalStock: number;
        totalTarget: number;
        locations: Set<string>;
      }>();

      for (const p of matchedProducts) {
        const pName = (p.name || "").trim();
        const pCategory = (p.category || "").trim();

        const key = pName.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            product: { ...p },
            totalStock: p.stock,
            totalTarget: p.target,
            locations: new Set(pCategory ? [pCategory] : []),
          });
        } else {
          const existing = map.get(key)!;
          existing.totalStock += p.stock;
          existing.totalTarget += p.target;
          if (pCategory) existing.locations.add(pCategory);

          if (p.updated_at && (!existing.product.updated_at || new Date(p.updated_at) > new Date(existing.product.updated_at))) {
            existing.product.updated_by = p.updated_by;
            existing.product.updated_at = p.updated_at;
          }
          if (!existing.product.item_type && p.item_type) {
            existing.product.item_type = p.item_type;
          }
          if (!existing.product.unit && p.unit) {
            existing.product.unit = p.unit;
          }
        }
      }

      const aggregatedList = Array.from(map.values())
        .map(({ product, totalStock, totalTarget, locations }) => {
          const locArray = Array.from(locations);
          return {
            ...product,
            stock: totalStock,
            stock_quantity: totalStock,
            target: totalTarget,
            target_quantity: totalTarget,
            category: locArray.join(", "),
            locations: locArray,
            locationCount: locArray.length,
          };
        });

      return applySort(aggregatedList);
    }
  }, [products, activeLocations, search, sortOption]);

  // Fetch activity logs for a specific product and optional location
  const fetchItemLogs = useCallback(async (productName: string, categoryName?: string) => {
    if (!productName) {
      setItemLogs([]);
      return;
    }
    setLoadingLogs(true);
    try {
      const cleanName = productName.trim();
      const cleanCat = categoryName?.trim();

      let query = supabase.from("activities").select("*");

      if (cleanCat && activeLocations.length === 1) {
        // Isolate logs to this specific location AND item name
        query = query
          .ilike("message", `%[${cleanCat}]%[${cleanName}]%`)
          .order("created_at", { ascending: false })
          .limit(15);
      } else {
        // Multiple or all locations selected: fetch logs for this item name
        query = query
          .or(`message.ilike.%[${cleanName}]%,message.ilike.%${cleanName}%`)
          .order("created_at", { ascending: false })
          .limit(15);
      }

      const { data, error } = await query;

      if (!error && data) {
        setItemLogs(data as Activity[]);
      } else {
        setItemLogs([]);
      }
    } catch (err) {
      console.error("Error fetching item logs:", err);
      setItemLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, [activeLocations]);

  // 5. Open Form Modal for Create/Update
  const openItemModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setFormName(product.name);
      setFormCategory(product.category);
      setFormType(product.item_type || "");
      setFormStock(product.stock);
      setFormUnit(product.unit || "");
      setFormPrice(product.price || 0);
      fetchItemLogs(product.name, product.category);
    } else {
      setEditingProduct(null);
      setFormName("");
      setFormCategory(activeLocations.length === 1 ? activeLocations[0] : "");
      setFormType("");
      setFormStock(1);
      setFormUnit("");
      setFormPrice(0);
      setItemLogs([]);
    }
    setItemModalOpen(true);
  };

  // 6. Save Product (Insert, Update, or Merge duplicate in same location)
  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    const userShort = user.email ? user.email.split("@")[0].toUpperCase() : "USER";
    const typeVal = formType.trim();
    const unitVal = formUnit.trim();
    const skuVal = `${typeVal}:::${unitVal}:::${Date.now().toString(36)}`;

    const payload: Record<string, unknown> = {
      name: formName.trim(),
      category: formCategory.trim(),
      sku: skuVal,
      stock_quantity: formStock,
      target_quantity: formStock,
      price: formPrice || 0,
      updated_by: userShort,
      updated_at: new Date().toISOString()
    };

    try {
      if (editingProduct) {
        const oldName = (editingProduct.name || "").trim();
        const newName = formName.trim();
        const oldCat = (editingProduct.category || "").trim();
        const newCat = formCategory.trim();
        const oldStock = editingProduct.stock;
        const newStock = formStock;
        const delta = newStock - oldStock;

        // Update DB
        const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
        if (error) throw error;
        
        // Log ONLY when stock quantity changes - tagged with [장소] [품목명]
        if (delta !== 0) {
          const sign = delta > 0 ? `+${delta}` : `${delta}`;
          const currentCat = newCat || oldCat || "기타";
          await logActivity("UPDATE", `[${currentCat}] [${newName || oldName}] 재고 ${sign}`);
        }
      } else {
        // Auto-merge if product with same name + location + type already exists
        const { data: existingRows } = await supabase
          .from("products")
          .select("*")
          .eq("name", formName.trim())
          .eq("category", formCategory.trim());

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
          const newTotalStock = (matched.stock_quantity || 0) + formStock;
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

          await logActivity("UPDATE", `[${formCategory.trim()}] [${formName.trim()}] 재고 +${formStock}`);
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
                alert(`이미 '${formName}' 이름의 품목이 등록되어 있습니다.\n\n동일한 품목을 다른 장소에 별도로 등록하시려면 품목명에 장소를 함께 기재해 주세요.\n(예: ${formName} (${formCategory}))`);
                return;
              }
            }
            throw error;
          }
          await logActivity("CREATE", `[${formCategory.trim()}] [${formName.trim()}] 재고 +${formStock}`);
        }
      }
      setItemModalOpen(false);
    } catch (err: unknown) {
      console.error("Error saving product:", err);
      const errMsg = err instanceof Error ? err.message : (typeof err === "object" && err !== null && "message" in err ? String((err as { message: unknown }).message) : "알 수 없는 오류가 발생했습니다.");
      alert(`품목 저장 오류: ${errMsg}`);
    }
  };

  // 7. Delete Product
  const handleDelete = async () => {
    if (!deletingProduct) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", deletingProduct.id);
      if (error) throw error;
      await logActivity("DELETE", `${deletingProduct.name} 품목을 삭제했습니다.`);
      setDeleteModalOpen(false);
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  return (
    <div className="flex-1 p-3 sm:p-6 md:p-8 flex flex-col min-h-0 bg-zinc-50 dark:bg-zinc-950">
      
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
                  {filteredProducts.map((p) => {
                    const isLow = p.stock > 0 && p.stock <= p.target * 0.3;
                    const isOut = p.stock === 0;
                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => openItemModal(p)}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 active:bg-zinc-100 dark:active:bg-zinc-800/70 transition-colors cursor-pointer select-none"
                      >
                        <td className="px-8 py-4">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                            {/* Product Name */}
                            <span className="font-extrabold text-base text-zinc-900 dark:text-white leading-snug break-words">
                              {p.name}
                            </span>

                            {/* Category & Status Badges Group (Wraps together cleanly when name is long) */}
                            <div className="inline-flex items-center gap-1.5 flex-wrap">
                              {p.locations && p.locations.length > 0 ? (
                                p.locations.map((loc) => (
                                  <span
                                    key={loc}
                                    className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md text-[10px] font-bold border border-zinc-200/60 dark:border-zinc-700/60 shrink-0"
                                  >
                                    {loc}
                                  </span>
                                ))
                              ) : (
                                <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md text-[10px] font-bold border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                                  {p.category || "기타"}
                                </span>
                              )}

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

            {/* Mobile List View (Clean touchable cards showing stock on the right) */}
            <div className="md:hidden flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-0.5">
              {filteredProducts.map((p) => {
                const isLow = p.stock > 0 && p.stock <= p.target * 0.3;
                const isOut = p.stock === 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => openItemModal(p)}
                    className="bg-white dark:bg-zinc-900 px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs flex items-center justify-between gap-3 hover:border-zinc-400 dark:hover:border-zinc-700 active:scale-[0.99] active:bg-zinc-50 dark:active:bg-zinc-800/60 transition-all cursor-pointer select-none"
                  >
                    {/* Left: Product Name & Category Badges (Inline with clean wrap on overflow) */}
                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h4 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white leading-snug break-words">
                        {p.name}
                      </h4>

                      {/* Location & Type Badges Group */}
                      <div className="inline-flex items-center gap-1.5 flex-wrap">
                        {p.locations && p.locations.length > 0 ? (
                          p.locations.map((loc) => (
                            <span
                              key={loc}
                              className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold px-2 py-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-700/60 shrink-0"
                            >
                              {loc}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold px-2 py-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                            {p.category || "기타"}
                          </span>
                        )}

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

                    {/* Right: Current Stock on the right */}
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

      {/* 1. Item Form Modal (NEW/EDIT - Balanced Wide 2-Col Layout with No Scroll) */}
      {itemModalOpen && (
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
                onClick={() => setItemModalOpen(false)}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Form Fields: Name, Location & Type (2-Col Grid), Quantity & Unit */}
            <form onSubmit={saveProduct} className="space-y-3.5">
              
              {/* 1. Name (이름) */}
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

              {/* 2 & 3. Location (위치) & Type (유형) - 2-Column Grid */}
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

              {/* 4. Quantity (수량) & Unit (단위) */}
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
                      onChange={(e) => setFormStock(Math.max(0, Number(e.target.value)))}
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

              {/* 5. Item Modification History / Change Logs (최신 3줄만 간결 표시) */}
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

                          // Format: [장소] [품목] 재고 +N
                          const locItemMatch = displayMsg.match(/^\[(.*?)\]\s*\[(.*?)\]\s*(.*)$/);
                          if (locItemMatch) {
                            const loc = locItemMatch[1];
                            const change = locItemMatch[3];
                            displayMsg = activeLocations.length !== 1 ? `${loc} ${change}` : change;
                          } else {
                            const singleMatch = displayMsg.match(/^\[.*?\]\s*(.*)$/);
                            if (singleMatch && singleMatch[1]) {
                              displayMsg = singleMatch[1];
                            }
                          }

                          // Convert older "수량 (5개 → 6개)" format to clean delta
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
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 py-0.5">
                        기록된 재고 변경 이력이 없습니다.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {editingProduct ? (
                <div className="flex gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingProduct(editingProduct);
                      setItemModalOpen(false);
                      setDeleteModalOpen(true);
                    }}
                    className="px-4 py-2.5 border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemModalOpen(false)}
                    className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
                  >
                    저장
                  </button>
                </div>
              ) : (
                <div className="flex gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setItemModalOpen(false)}
                    className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
                  >
                    저장
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
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

    </div>
  );
}
