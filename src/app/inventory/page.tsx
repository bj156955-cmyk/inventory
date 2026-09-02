"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Edit, 
  Trash2, 
  ShoppingCart, 
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
  
  // Product Form states
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formStock, setFormStock] = useState(0);
  const [formTarget, setFormTarget] = useState(0);
  const [formPrice, setFormPrice] = useState(0);

  // Order modal states
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderingProduct, setOrderingProduct] = useState<Product | null>(null);
  const [orderQty, setOrderQty] = useState(0);

  // Delete confirm modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("name", { ascending: true });
        if (error) throw error;
        if (!ignore) setProducts(data || []);
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
            setProducts((prev) => [...prev, payload.new as Product].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === "UPDATE") {
            setProducts((prev) =>
              prev.map((p) => (p.id === payload.new.id ? (payload.new as Product) : p))
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

  // 3. Dynamic Location Categories (Default 4 locations + any custom locations from products)
  const DEFAULT_LOCATIONS = ["연구동", "자생동", "박사님 방", "컨테이너"];
  const dynamicLocations = Array.from(
    new Set([
      ...DEFAULT_LOCATIONS,
      ...products.map((p) => (p.category || "").trim()).filter(Boolean),
    ])
  );
  const categoriesList = ["all", ...dynamicLocations];

  // 4. Filter products by search & location category
  const filteredProducts = products.filter((p) => {
    const pCategory = (p.category || "").trim();
    const searchLower = search.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchLower) || 
                          pCategory.toLowerCase().includes(searchLower);
    const matchesCategory = selectedCategory === "all" || 
                            pCategory === selectedCategory || 
                            pCategory.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // 5. Open Form Modal for Create/Update
  const openItemModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setFormName(product.name);
      setFormCategory(product.category);
      setFormStock(product.stock);
      setFormTarget(product.target);
      setFormPrice(product.price);
    } else {
      setEditingProduct(null);
      setFormName("");
      setFormCategory(selectedCategory !== "all" ? selectedCategory : "연구동");
      setFormStock(0);
      setFormTarget(0);
      setFormPrice(0);
    }
    setItemModalOpen(true);
  };

  // 6. Save Product (Insert or Update)
  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      name: formName,
      category: formCategory,
      stock: formStock,
      target: formTarget,
      price: formPrice,
      edit_user: user.email?.split("@")[0].toUpperCase(),
      edit_date: new Date().toISOString()
    };

    try {
      if (editingProduct) {
        // Update
        const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
        if (error) throw error;
        await logActivity("UPDATE", `${formName} 품목 정보를 수정했습니다.`);
      } else {
        // Insert
        const { error } = await supabase.from("products").insert([payload]);
        if (error) throw error;
        await logActivity("CREATE", `${formName} 품목을 새로 추가했습니다.`);
      }
      setItemModalOpen(false);
    } catch (err) {
      console.error("Error saving product:", err);
    }
  };

  // 7. Order Action
  const handleOrder = async () => {
    if (!orderingProduct || !user) return;
    const newStock = orderingProduct.stock - orderQty;
    if (newStock < 0) {
      alert("출고량이 현재 재고보다 많을 수 없습니다.");
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({
          stock: newStock,
          edit_user: user.email?.split("@")[0].toUpperCase(),
          edit_date: new Date().toISOString()
        })
        .eq("id", orderingProduct.id);

      if (error) throw error;

      await logActivity(
        "ORDER", 
        `${orderingProduct.name} 품목을 ${orderQty}개 출고(Order) 처리했습니다.`
      );
      setOrderModalOpen(false);
    } catch (err) {
      console.error("Error ordering product:", err);
    }
  };

  // 8. Delete Product
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

  // 9. Quick increment/decrement buttons
  const adjustStock = async (product: Product, delta: number) => {
    if (!user) return;
    const nextStock = product.stock + delta;
    if (nextStock < 0) return;

    try {
      const { error } = await supabase
        .from("products")
        .update({
          stock: nextStock,
          edit_user: user.email?.split("@")[0].toUpperCase(),
          edit_date: new Date().toISOString()
        })
        .eq("id", product.id);

      if (error) throw error;

      const actType = delta > 0 ? "RECEIVE" : "ORDER";
      const actMsg = delta > 0 
        ? `${product.name} 재고를 ${delta}개 늘렸습니다. (수령)` 
        : `${product.name} 재고를 ${Math.abs(delta)}개 줄였습니다. (소모)`;
        
      await logActivity(actType, actMsg);
    } catch (err) {
        console.error("Error adjusting stock:", err);
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

      {/* Dynamic Location Categories Tabs (Equal Proportions & Generous Spacing) */}
      <div className="flex items-center gap-2 sm:gap-2.5 w-full overflow-x-auto no-scrollbar py-0.5 mb-4 sm:mb-6 shrink-0">
        {categoriesList.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setSelectedCategory(c)}
            className={`flex-1 min-w-[70px] sm:min-w-[80px] py-2.5 px-2 rounded-2xl text-[11px] sm:text-xs font-bold text-center whitespace-nowrap transition-all duration-200 cursor-pointer select-none active:scale-95 shrink-0 sm:shrink ${
              selectedCategory === c
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-black scale-[1.02]"
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
              {selectedCategory === "all" 
                ? "등록된 품목이 없습니다." 
                : `'${selectedCategory}' 위치에 등록된 품목이 없습니다.`}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block flex-1 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">품목 상세</th>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">보관 위치</th>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-center">재고 현황</th>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-right">단가 (₩)</th>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-center">동작</th>
                    <th className="px-8 py-5 text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-right">편집</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {filteredProducts.map((p) => {
                    const isLow = p.stock > 0 && p.stock <= p.target * 0.3;
                    const isOut = p.stock === 0;
                    return (
                      <tr key={p.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-all">
                        <td className="px-8 py-5">
                          <div>
                            <div className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                              <span>{p.name}</span>
                              {isOut ? (
                                <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-black rounded-md">
                                  품절
                                </span>
                              ) : isLow ? (
                                <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black rounded-md">
                                  부족
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black rounded-md">
                                  정상
                                </span>
                              )}
                            </div>
                            {p.edit_user && (
                              <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                                {p.edit_user} • {p.edit_date ? new Date(p.edit_date).toLocaleDateString() : ""}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-[10px] font-bold border border-zinc-200/60 dark:border-zinc-700/60">
                            {p.category || "기타"}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col items-center">
                            <span className={`text-base font-black tabular-nums ${
                              isOut 
                                ? "text-rose-400 line-through" 
                                : isLow 
                                ? "text-amber-400 font-black" 
                                : "text-emerald-400 dark:text-emerald-400"
                            }`}>
                              {p.stock}
                            </span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold mt-0.5">
                              목표 {p.target}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right font-bold text-sm tabular-nums text-zinc-800 dark:text-zinc-200">
                          {p.price.toLocaleString()}
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => adjustStock(p, 1)}
                              className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold hover:shadow-sm active:scale-95 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700"
                              title="입고 +1"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => adjustStock(p, -1)}
                              className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold hover:shadow-sm active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-zinc-200 dark:border-zinc-700"
                              disabled={p.stock <= 0}
                              title="출고 -1"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => {
                                setOrderingProduct(p);
                                setOrderQty(1);
                                setOrderModalOpen(true);
                              }}
                              className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center font-bold hover:shadow-sm active:scale-95 transition-all cursor-pointer shadow-sm shadow-blue-600/30"
                              title="일괄 출고"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openItemModal(p)}
                              className="p-2 text-zinc-400 hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingProduct(p);
                                setDeleteModalOpen(true);
                              }}
                              className="p-2 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile List View (No Outer Container Box) */}
            <div className="md:hidden flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-0.5">
              {filteredProducts.map((p) => {
                const isLow = p.stock > 0 && p.stock <= p.target * 0.3;
                const isOut = p.stock === 0;
                return (
                  <div key={p.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-sm active:border-zinc-400 transition-all">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white truncate">{p.name}</h4>
                          {isOut ? (
                            <span className="px-1.5 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-black rounded-md shrink-0">
                              품절
                            </span>
                          ) : isLow ? (
                            <span className="px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black rounded-md shrink-0">
                              부족
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black rounded-md shrink-0">
                              정상
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center mt-1">
                          <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold px-2 py-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-700/60">
                            {p.category || "기타"}
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">
                            ₩{p.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openItemModal(p)}
                          className="p-2 text-zinc-400 hover:text-blue-400 rounded-lg active:scale-95 cursor-pointer"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingProduct(p);
                            setDeleteModalOpen(true);
                          }}
                          className="p-2 text-zinc-400 hover:text-rose-400 rounded-lg active:scale-95 cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">현재 재고</span>
                        <span className={`text-xl font-black tracking-tight ${
                          isOut ? "text-rose-400 line-through" : isLow ? "text-amber-400 font-black" : "text-emerald-400"
                        }`}>
                          {p.stock} <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">/ {p.target}개</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => adjustStock(p, 1)}
                          className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-black text-xs shadow-sm active:scale-90 transition-transform cursor-pointer border border-zinc-200 dark:border-zinc-700"
                          title="입고 +1"
                        >
                          +1 입고
                        </button>
                        <button
                          onClick={() => adjustStock(p, -1)}
                          className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-black text-xs shadow-sm active:scale-90 transition-transform disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-zinc-200 dark:border-zinc-700"
                          disabled={p.stock <= 0}
                          title="출고 -1"
                        >
                          -1 출고
                        </button>
                        <button
                          onClick={() => {
                            setOrderingProduct(p);
                            setOrderQty(1);
                            setOrderModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-600/30 active:scale-90 transition-transform cursor-pointer"
                          title="일괄 출고"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </div>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-[500px] rounded-[2.5rem] shadow-2xl p-8 md:p-10 space-y-6 border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
                {editingProduct ? "자재 정보 수정" : "새로운 자재 등록"}
              </h3>
              <button 
                onClick={() => setItemModalOpen(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            
            <form onSubmit={saveProduct} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">Item Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 자작나무 합판 (Birch Plywood)"
                  className="w-full px-4 py-3 bg-surface-container-low dark:bg-slate-800 border border-black/[0.03] dark:border-white/[0.03] rounded-xl outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-blue-500/20 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">위치 (Category)</label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="예: 연구동, 자생동, 박사님 방, 컨테이너"
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium text-zinc-900 dark:text-white"
                  />
                  <div className="flex gap-1 pt-1 flex-wrap">
                    {dynamicLocations.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setFormCategory(loc)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          formCategory === loc
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">단가 (₩)</label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    placeholder="단가 입력"
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">현재 재고</label>
                  <input
                    type="number"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium text-zinc-900 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">목표 재고</label>
                  <input
                    type="number"
                    required
                    value={formTarget}
                    onChange={(e) => setFormTarget(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="flex-1 py-4 border border-zinc-200 dark:border-zinc-700 rounded-2xl font-black text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Order Qty Modal */}
      {orderModalOpen && orderingProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[420px] rounded-[2.5rem] shadow-2xl p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-primary dark:text-white tracking-tighter">품목 출고 (Order)</h3>
              <button onClick={() => setOrderModalOpen(false)}>
                <X className="w-5 h-5 text-on-surface-variant/40" />
              </button>
            </div>

            <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-900 dark:text-white">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-zinc-900 dark:text-white">{orderingProduct.name}</p>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">현재 재고: {orderingProduct.stock}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 ml-1">출고량 입력</label>
              <input
                type="number"
                min="1"
                max={orderingProduct.stock}
                value={orderQty || ""}
                onChange={(e) => setOrderQty(Number(e.target.value))}
                placeholder="출고할 수량을 적어주세요."
                className="w-full px-4 py-4 bg-zinc-100 dark:bg-zinc-800 text-center font-black text-2xl rounded-2xl outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 text-zinc-900 dark:text-white"
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setOrderModalOpen(false)}
                className="flex-1 py-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-black text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleOrder}
                className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white rounded-2xl font-black text-sm shadow-md active:scale-95 transition-all cursor-pointer"
              >
                출고 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete Confirm Modal */}
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
