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

  // 1. Fetch initial data
  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
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

  // 3. Category Chips extraction
  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  // 4. Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
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
      setFormCategory("");
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
    <div className="flex-1 p-3 sm:p-6 md:p-8 space-y-3 sm:space-y-4 flex flex-col min-h-0 bg-surface dark:bg-slate-900">
      
      {/* Top Filter, Search & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 shrink-0 bg-white dark:bg-slate-800/80 p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl shadow-sm border border-black/[0.03] dark:border-white/[0.03]">
        {/* Category Chips with Horizontal Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 ${
                selectedCategory === cat
                  ? "bg-primary dark:bg-blue-600 text-white shadow-sm"
                  : "bg-surface-container-low dark:bg-slate-700 text-on-surface-variant dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-slate-600"
              }`}
            >
              {cat === "all" ? "전체 보기" : cat}
            </button>
          ))}
        </div>

        {/* Right Controls: Search + New Item + Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 dark:text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="품목 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-container-low dark:bg-slate-700/60 border border-transparent dark:border-white/[0.05] rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/10 dark:focus:ring-blue-500/10 text-foreground transition-all"
            />
          </div>

          <button
            onClick={() => openItemModal(null)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-container dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
            title="새 품목 등록"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">새 품목</span>
          </button>

          <button
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            className="p-2 bg-surface-container-low dark:bg-slate-700/60 text-on-surface-variant/60 dark:text-gray-400 hover:text-primary dark:hover:text-white rounded-xl transition-all cursor-pointer active:scale-95 shrink-0"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product List Section */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-md border border-black/[0.02] dark:border-white/[0.02] overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-20">
            <RefreshCw className="w-8 h-8 text-primary dark:text-blue-500 animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-on-surface-variant/30" />
            <p className="text-sm font-semibold text-on-surface-variant/60 dark:text-gray-400">
              일치하는 품목이 없습니다.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low/50 dark:bg-slate-700/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant dark:text-gray-300 uppercase tracking-widest">품목 상세</th>
                    <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant dark:text-gray-300 uppercase tracking-widest">카테고리</th>
                    <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant dark:text-gray-300 uppercase tracking-widest text-center">재고 현황</th>
                    <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant dark:text-gray-300 uppercase tracking-widest text-right">단가 (₩)</th>
                    <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant dark:text-gray-300 uppercase tracking-widest text-center">동작</th>
                    <th className="px-8 py-5 text-[10px] font-black text-on-surface-variant dark:text-gray-300 uppercase tracking-widest text-right">편집</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                  {filteredProducts.map((p) => {
                    const isLow = p.stock > 0 && p.stock <= p.target * 0.3;
                    const isOut = p.stock === 0;
                    return (
                      <tr key={p.id} className="hover:bg-surface-container-lowest/40 dark:hover:bg-slate-700/20 transition-all">
                        <td className="px-8 py-5">
                          <div>
                            <div className="font-bold text-sm text-primary dark:text-white">{p.name}</div>
                            {p.edit_user && (
                              <div className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-1">
                                {p.edit_user} • {p.edit_date ? new Date(p.edit_date).toLocaleDateString() : ""}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 bg-surface-container-high dark:bg-slate-700 text-on-surface-variant dark:text-gray-300 rounded-lg text-[10px] font-bold">
                            {p.category || "기타"}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col items-center">
                            <span className={`text-base font-black tabular-nums ${
                              isOut ? "text-red-500/80" : isLow ? "text-amber-500" : "text-primary dark:text-blue-400"
                            }`}>
                              {p.stock}
                            </span>
                            <span className="text-[10px] text-on-surface-variant/40 dark:text-gray-500 font-bold mt-0.5">
                              목표 {p.target}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right font-bold text-sm tabular-nums text-primary-container dark:text-gray-300">
                          {p.price.toLocaleString()}
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => adjustStock(p, 1)}
                              className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold hover:shadow active:scale-95 transition-all"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => adjustStock(p, -1)}
                              className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center justify-center font-bold hover:shadow active:scale-95 transition-all"
                              disabled={p.stock <= 0}
                            >
                              -1
                            </button>
                            <button
                              onClick={() => {
                                setOrderingProduct(p);
                                setOrderQty(0);
                                setOrderModalOpen(true);
                              }}
                              className="w-8 h-8 rounded-lg bg-primary/5 dark:bg-blue-500/10 text-primary dark:text-blue-400 flex items-center justify-center hover:shadow active:scale-95 transition-all"
                              title="Order (출고)"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openItemModal(p)}
                              className="p-2 text-on-surface-variant/40 hover:text-primary dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingProduct(p);
                                setDeleteModalOpen(true);
                              }}
                              className="p-2 text-on-surface-variant/40 hover:text-error transition-colors"
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

            {/* Mobile List View */}
            <div className="md:hidden flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar">
              {filteredProducts.map((p) => {
                const isLow = p.stock > 0 && p.stock <= p.target * 0.3;
                const isOut = p.stock === 0;
                return (
                  <div key={p.id} className="bg-white dark:bg-slate-800/95 p-4 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] space-y-3 shadow-sm active:border-black/10 transition-all">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-sm sm:text-base text-primary dark:text-white truncate">{p.name}</h4>
                          {isOut ? (
                            <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[9px] font-black rounded-md shrink-0">
                              품절
                            </span>
                          ) : isLow ? (
                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[9px] font-black rounded-md shrink-0">
                              부족
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center mt-1">
                          <span className="text-[10px] bg-surface-container-low dark:bg-slate-700 text-on-surface-variant dark:text-gray-300 font-bold px-2 py-0.5 rounded-md border border-black/[0.02] dark:border-white/[0.02]">
                            {p.category || "기타"}
                          </span>
                          <span className="text-[10px] text-on-surface-variant/60 dark:text-gray-400 font-semibold">
                            ₩{p.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openItemModal(p)}
                          className="p-2 text-on-surface-variant/40 hover:text-primary dark:text-gray-400 dark:hover:text-white rounded-lg active:scale-95 cursor-pointer"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingProduct(p);
                            setDeleteModalOpen(true);
                          }}
                          className="p-2 text-on-surface-variant/40 hover:text-error rounded-lg active:scale-95 cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-black/[0.03] dark:border-white/[0.03] gap-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-on-surface-variant/40 dark:text-gray-500 tracking-wider">현재 재고</span>
                        <span className={`text-xl font-black tracking-tight ${
                          isOut ? "text-red-500" : isLow ? "text-amber-500" : "text-primary dark:text-blue-400"
                        }`}>
                          {p.stock} <span className="text-xs font-semibold text-on-surface-variant/40 dark:text-gray-500">/ {p.target}개</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => adjustStock(p, 1)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-black text-xs shadow-sm active:scale-90 transition-transform cursor-pointer border border-emerald-100 dark:border-emerald-900/30"
                          title="입고 +1"
                        >
                          +1 입고
                        </button>
                        <button
                          onClick={() => adjustStock(p, -1)}
                          className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-black text-xs shadow-sm active:scale-90 transition-transform disabled:opacity-30 disabled:pointer-events-none cursor-pointer border border-red-100 dark:border-red-900/30"
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
                          className="p-2 rounded-xl bg-surface-container-low dark:bg-slate-700 text-primary dark:text-blue-400 shadow-sm active:scale-90 transition-transform cursor-pointer"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[500px] rounded-[2.5rem] shadow-[0_32px_80px_rgba(0,0,0,0.4)] p-8 md:p-10 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-primary dark:text-white tracking-tighter">
                {editingProduct ? "자재 정보 수정" : "새로운 자재 등록"}
              </h3>
              <button 
                onClick={() => setItemModalOpen(false)}
                className="p-2 hover:bg-surface-container-low dark:hover:bg-slate-800 rounded-full"
              >
                <X className="w-5 h-5 text-on-surface-variant/40" />
              </button>
            </div>
            
            <form onSubmit={saveProduct} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-on-surface-variant/50 dark:text-gray-400 tracking-wider">Item Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 자작나무 합판 (Birch Plywood)"
                  className="w-full px-4 py-3 bg-surface-container-low dark:bg-slate-800 border border-black/[0.03] dark:border-white/[0.03] rounded-xl outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-blue-500/20 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-on-surface-variant/50 dark:text-gray-400 tracking-wider">Category</label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="예: 목재"
                    className="w-full px-4 py-3 bg-surface-container-low dark:bg-slate-800 border border-black/[0.03] dark:border-white/[0.03] rounded-xl outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-blue-500/20 text-sm font-medium"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-on-surface-variant/50 dark:text-gray-400 tracking-wider">Unit Price (₩)</label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    placeholder="단가 입력"
                    className="w-full px-4 py-3 bg-surface-container-low dark:bg-slate-800 border border-black/[0.03] dark:border-white/[0.03] rounded-xl outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-blue-500/20 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-on-surface-variant/50 dark:text-gray-400 tracking-wider">Current Stock</label>
                  <input
                    type="number"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-surface-container-low dark:bg-slate-800 border border-black/[0.03] dark:border-white/[0.03] rounded-xl outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-blue-500/20 text-sm font-medium"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-on-surface-variant/50 dark:text-gray-400 tracking-wider">Target Quantity</label>
                  <input
                    type="number"
                    required
                    value={formTarget}
                    onChange={(e) => setFormTarget(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-surface-container-low dark:bg-slate-800 border border-black/[0.03] dark:border-white/[0.03] rounded-xl outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-blue-500/20 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="flex-1 py-4 border border-black/5 dark:border-white/5 rounded-2xl font-black text-sm text-primary dark:text-gray-300 hover:bg-surface-container-low dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-primary dark:bg-blue-600 text-white rounded-2xl font-black text-sm shadow-md hover:shadow-xl active:scale-95 transition-all cursor-pointer"
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

            <div className="bg-surface-container-low dark:bg-slate-800 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary dark:text-blue-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-primary dark:text-white">{orderingProduct.name}</p>
                <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-0.5">현재 재고: {orderingProduct.stock}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-on-surface-variant/50 dark:text-gray-400 ml-1">출고량 입력</label>
              <input
                type="number"
                min="1"
                max={orderingProduct.stock}
                value={orderQty || ""}
                onChange={(e) => setOrderQty(Number(e.target.value))}
                placeholder="출고할 수량을 적어주세요."
                className="w-full px-4 py-4 bg-surface-container-low dark:bg-slate-800 text-center font-black text-2xl rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-blue-500/20"
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setOrderModalOpen(false)}
                className="flex-1 py-4 border border-black/5 dark:border-white/5 rounded-2xl font-black text-sm text-primary dark:text-gray-300 hover:bg-surface-container-low dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleOrder}
                className="flex-1 py-4 bg-primary dark:bg-blue-600 text-white rounded-2xl font-black text-sm shadow-md hover:shadow-xl active:scale-95 transition-all cursor-pointer"
              >
                출고 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete Confirm Modal */}
      {deleteModalOpen && deletingProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[400px] rounded-[2.5rem] shadow-2xl p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-error/10 rounded-2xl flex items-center justify-center mx-auto mb-2 text-error">
              <Trash2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-primary-container dark:text-white tracking-tighter">정말 삭제하시겠습니까?</h3>
              <p className="text-xs text-on-surface-variant dark:text-gray-400 font-semibold mt-2 leading-relaxed">
                &quot;{deletingProduct.name}&quot; 품목을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-4 border border-black/5 dark:border-white/5 rounded-2xl font-black text-sm text-primary dark:text-gray-300 hover:bg-surface-container-low dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-4 bg-error text-white rounded-2xl font-black text-sm shadow-md hover:shadow-xl active:scale-95 transition-all cursor-pointer"
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
