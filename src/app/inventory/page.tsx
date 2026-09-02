"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Trash2, 
  X,
  AlertCircle
} from "lucide-react";

export default function InventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  // Modals state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Product Form states (Name, Location, Type, Quantity)
  // Product Form states (Name, Location, Type, Quantity)
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formType, setFormType] = useState("");
  const [formStock, setFormStock] = useState(1);
  const [formPrice, setFormPrice] = useState(0);

  // Delete confirm modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  useEffect(() => {
    let ignore = false;

    const normalizeProduct = (p: Record<string, unknown>): Product => {
      const rawSku = p.sku ? String(p.sku) : "";
      const parsedType = rawSku 
        ? (rawSku.includes("_") ? rawSku.split("_")[0] : rawSku) 
        : (p.item_type ? String(p.item_type) : "");

      const stockNum = typeof p.stock_quantity === "number" ? p.stock_quantity : (typeof p.stock === "number" ? p.stock : 0);
      const targetNum = typeof p.target_quantity === "number" ? p.target_quantity : (typeof p.target === "number" ? p.target : 0);

      return {
        id: String(p.id || ""),
        name: String(p.name || ""),
        category: String(p.category || ""),
        sku: p.sku ? String(p.sku) : null,
        item_type: parsedType,
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

  // 3. Location Categories & Types: Only from actual products
  const existingLocations = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((p) => (p.category || "").trim())
          .filter(Boolean)
      )
    );
  }, [products]);

  const categoriesList = useMemo(() => ["all", ...existingLocations], [existingLocations]);

  // Derived active category (auto-fallback to 'all' if selected is not present)
  const activeCategory = categoriesList.includes(selectedCategory) ? selectedCategory : "all";

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

  // 4. Filter & Aggregate Products:
  // When 'all' (전체보기) is active, merge items with the same name into 1 row with combined total stock quantity
  const filteredProducts = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    if (activeCategory === "all") {
      const map = new Map<string, {
        product: Product;
        totalStock: number;
        totalTarget: number;
        locations: Set<string>;
      }>();

      for (const p of products) {
        const pName = (p.name || "").trim();
        const pCategory = (p.category || "").trim();
        const pType = (p.item_type || "").trim();

        if (searchLower) {
          const matches = pName.toLowerCase().includes(searchLower) ||
                          pCategory.toLowerCase().includes(searchLower) ||
                          pType.toLowerCase().includes(searchLower);
          if (!matches) continue;
        }

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

          if (p.edit_date && (!existing.product.edit_date || new Date(p.edit_date) > new Date(existing.product.edit_date))) {
            existing.product.edit_user = p.edit_user;
            existing.product.edit_date = p.edit_date;
          }
          if (!existing.product.item_type && p.item_type) {
            existing.product.item_type = p.item_type;
          }
        }
      }

      return Array.from(map.values())
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
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Specific Location Tab: show only items in that location
      return products
        .filter((p) => {
          const pCategory = (p.category || "").trim();
          const pName = (p.name || "").trim();
          const pType = (p.item_type || "").trim();

          const matchesCategory = pCategory === activeCategory || pCategory.includes(activeCategory);
          if (!matchesCategory) return false;

          if (searchLower) {
            return pName.toLowerCase().includes(searchLower) ||
                   pCategory.toLowerCase().includes(searchLower) ||
                   pType.toLowerCase().includes(searchLower);
          }
          return true;
        })
        .map((p) => ({
          ...p,
          locations: p.category ? [p.category] : [],
          locationCount: 1,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [products, activeCategory, search]);

  // 5. Open Form Modal for Create/Update
  const openItemModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setFormName(product.name);
      setFormCategory(product.category);
      setFormType(product.item_type || "");
      setFormStock(product.stock);
      setFormPrice(product.price || 0);
    } else {
      setEditingProduct(null);
      setFormName("");
      setFormCategory("");
      setFormType("");
      setFormStock(1);
      setFormPrice(0);
    }
    setItemModalOpen(true);
  };

  // 6. Save Product (Insert or Update)
  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    const userShort = user.email ? user.email.split("@")[0].toUpperCase() : "USER";
    const skuVal = formType ? `${formType}_${Date.now().toString(36)}` : null;

    const payload = {
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
        // Update
        const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
        if (error) throw error;
        await logActivity("UPDATE", `${formName} 품목 정보를 수정했습니다.`);
      } else {
        // Insert
        let { error } = await supabase.from("products").insert([payload]);
        if (error && error.message?.includes("sku")) {
          // If SKU constraint error, retry with null
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
        await logActivity("CREATE", `${formName} 품목을 새로 추가했습니다.`);
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

      {/* Dynamic Location Categories Tabs (Fixed 5-item ratio, stacked from left, scrollable when >5) */}
      <div className="flex items-center gap-2 sm:gap-2.5 w-full overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5 -mx-0.5 mb-4 sm:mb-6 shrink-0 justify-start">
        {categoriesList.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setSelectedCategory(c)}
            className={`w-[calc((100%-32px)/5)] sm:w-[calc((100%-40px)/5)] min-w-[calc((100%-32px)/5)] sm:min-w-[calc((100%-40px)/5)] shrink-0 py-2.5 px-1 sm:px-2 rounded-2xl text-[11px] sm:text-xs font-bold text-center truncate transition-all duration-200 cursor-pointer select-none active:scale-95 ${
              activeCategory === c
                ? "bg-blue-600 text-white border border-blue-600 shadow-md shadow-blue-600/30 font-black"
                : "bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-white shadow-xs"
            }`}
            title={c === "all" ? "전체보기" : c}
          >
            {c === "all" ? "전체보기" : c}
          </button>
        ))}
      </div>

      {/* Product List Section (No Outer Box Wrapper) */}
      <div className="flex-1 flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-20">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 sm:p-20 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <AlertCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {activeCategory === "all" 
                ? "등록된 품목이 없습니다." 
                : `'${activeCategory}' 위치에 등록된 품목이 없습니다.`}
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
                        <td className="px-8 py-5">
                          <div className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-base">{p.name}</span>

                            {/* Location Badges */}
                            {p.locations && p.locations.length > 0 ? (
                              p.locations.map((loc) => (
                                <span
                                  key={loc}
                                  className="px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md text-[10px] font-bold border border-zinc-200/60 dark:border-zinc-700/60"
                                >
                                  {loc}
                                </span>
                              ))
                            ) : (
                              <span className="px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md text-[10px] font-bold border border-zinc-200/60 dark:border-zinc-700/60">
                                {p.category || "기타"}
                              </span>
                            )}

                            {/* Type Badge */}
                            {p.item_type && (
                              <span className="px-2 py-0.5 bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-md text-[9px] font-black border border-blue-500/20">
                                {p.item_type}
                              </span>
                            )}

                            {/* Status Badge (No '정상', only '품절' or '부족') */}
                            {isOut ? (
                              <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-black rounded-md">
                                품절
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black rounded-md">
                                부족
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-8 py-5 text-right">
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
                            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">개</span>
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
                    {/* Left: Product Name, Category/Type Badges */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white truncate">
                          {p.name}
                        </h4>

                        {/* Location Badges */}
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

                        {/* Type Badge */}
                        {p.item_type && (
                          <span className="text-[10px] bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-black px-2 py-0.5 rounded-md border border-blue-500/20 shrink-0">
                            {p.item_type}
                          </span>
                        )}

                        {/* Status Badge (No '정상', only '품절' or '부족') */}
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
                      <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">개</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 1. Item Form Modal (NEW/EDIT) */}
      {itemModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-[480px] rounded-[2.5rem] shadow-2xl p-7 sm:p-9 space-y-6 border border-zinc-200 dark:border-zinc-800">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight font-headline">
                  Item
                </h3>
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {editingProduct ? "품목 정보 수정" : "새로운 품목 등록"}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setItemModalOpen(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Form Fields: Name, Location, Type, Quantity */}
            <form onSubmit={saveProduct} className="space-y-4">
              
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
                  className="w-full px-4 py-3.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white transition-all"
                />
              </div>

              {/* 2. Location (위치) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                  위치 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-4 py-3.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white transition-all"
                />
                {existingLocations.length > 0 && (
                  <div className="flex gap-1.5 pt-1 flex-wrap">
                    {existingLocations.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setFormCategory(loc)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none active:scale-95 ${
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

              {/* 3. Type (유형) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                  유형
                </label>
                <input
                  type="text"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-4 py-3.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white transition-all"
                />
                {existingTypes.length > 0 && (
                  <div className="flex gap-1.5 pt-1 flex-wrap">
                    {existingTypes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormType(t)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none active:scale-95 ${
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

              {/* 4. Quantity (수량) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                  수량 <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setFormStock((prev) => Math.max(0, prev - 1))}
                    className="w-11 h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-black text-base border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
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
                    className="flex-1 min-w-0 w-full py-2.5 sm:py-3 px-3 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-center font-black text-sm sm:text-base text-zinc-900 dark:text-white tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setFormStock((prev) => prev + 1)}
                    className="w-11 h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-black text-base border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
                    title="+1"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              {editingProduct ? (
                <div className="flex gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingProduct(editingProduct);
                      setItemModalOpen(false);
                      setDeleteModalOpen(true);
                    }}
                    className="px-4 py-3.5 border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl font-black text-sm transition-all cursor-pointer"
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemModalOpen(false)}
                    className="flex-1 py-3.5 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-black text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
                  >
                    저장
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setItemModalOpen(false)}
                    className="flex-1 py-3.5 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-black text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
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
