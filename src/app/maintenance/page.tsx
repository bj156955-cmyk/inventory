"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Equipment,
  EquipmentMaintenanceItem,
  EquipmentConsumable,
  MaintenancePeriod,
} from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  Search,
  RefreshCw,
  X,
  Camera,
  CameraOff,
  ImagePlus,
  Trash2,
  Pencil,
  CheckCircle2,
  Circle,
  CircleAlert,
  Loader2,
  Wrench,
  MonitorCog,
  Package,
  TriangleAlert,
} from "lucide-react";

const EQUIPMENT_TABLE = "equipment";
const PHOTO_BUCKET = "equipment-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const PERIODS: {
  id: MaintenancePeriod;
  label: string;
  ko: string;
  activeClass: string;
  idleClass: string;
  iconClass: string;
}[] = [
  {
    id: "daily",
    label: "Daily",
    ko: "매일",
    activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30",
    idleClass:
      "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-emerald-400",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "weekly",
    label: "Weekly",
    ko: "매주",
    activeClass: "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30",
    idleClass:
      "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-blue-400",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "monthly",
    label: "Monthly",
    ko: "매월",
    activeClass: "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/30",
    idleClass:
      "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-violet-400",
    iconClass: "text-violet-600 dark:text-violet-400",
  },
];

const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const periodMeta = (p: MaintenancePeriod) => PERIODS.find((x) => x.id === p) || PERIODS[0];

function normalizeEquipment(row: Record<string, unknown>): Equipment {
  const items = Array.isArray(row.maintenance_items) ? row.maintenance_items : [];
  const consumables = Array.isArray(row.consumables) ? row.consumables : [];
  return {
    id: String(row.id || ""),
    name: String(row.name || ""),
    photo_url: row.photo_url ? String(row.photo_url) : null,
    maintenance_items: (items as Record<string, unknown>[])
      .filter((i) => i && typeof i === "object" && i.label)
      .map((i) => ({
        id: String(i.id || newId()),
        period: (["daily", "weekly", "monthly"].includes(String(i.period))
          ? String(i.period)
          : "daily") as MaintenancePeriod,
        label: String(i.label),
      })),
    consumables: (consumables as Record<string, unknown>[])
      .filter((c) => c && typeof c === "object" && c.name)
      .map((c) => ({
        id: String(c.id || newId()),
        name: String(c.name),
        quantity: Math.max(0, Number(c.quantity) || 0),
        unit: c.unit ? String(c.unit) : "",
      })),
    completed_items: Array.isArray(row.completed_items)
      ? (row.completed_items as unknown[]).map((v) => String(v))
      : [],
    last_checked_at: row.last_checked_at ? String(row.last_checked_at) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: row.created_at ? String(row.created_at) : "",
    updated_at: row.updated_at ? String(row.updated_at) : "",
  };
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/**
 * Uploads the photo to the public `equipment-photos` bucket.
 * If the bucket is not configured, the compressed image is stored inline
 * (data URL) in the row so the feature still works.
 */
async function uploadEquipmentPhoto(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  try {
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
    if (!error) {
      const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
    } else {
      console.warn("Storage upload failed, falling back to inline image:", error.message);
    }
  } catch (err) {
    console.warn("Storage upload threw, falling back to inline image:", err);
  }

  return dataUrl;
}

// ──────────────────────────────────────────────────────────────────
// Equipment Form Modal (+ 버튼 / 수정)
// ──────────────────────────────────────────────────────────────────
interface EquipmentModalProps {
  editing: Equipment | null;
  onClose: () => void;
  onDeleteRequest: (eq: Equipment) => void;
  onSave: (data: {
    name: string;
    photo: File | null;
    removePhoto: boolean;
    items: EquipmentMaintenanceItem[];
    consumables: EquipmentConsumable[];
  }) => Promise<void>;
}

function EquipmentModal({ editing, onClose, onDeleteRequest, onSave }: EquipmentModalProps) {
  const [formName, setFormName] = useState(() => editing?.name || "");
  const [previewUrl, setPreviewUrl] = useState<string>(() => editing?.photo_url || "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [items, setItems] = useState<EquipmentMaintenanceItem[]>(
    () => editing?.maintenance_items.map((i) => ({ ...i })) || []
  );
  const [consumables, setConsumables] = useState<EquipmentConsumable[]>(
    () => editing?.consumables.map((c) => ({ ...c })) || []
  );
  const [activePeriod, setActivePeriod] = useState<MaintenancePeriod>("daily");
  const [itemDraft, setItemDraft] = useState("");
  const [consumableDraft, setConsumableDraft] = useState({ name: "", quantity: 1, unit: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URL of a freshly picked file when unmounting
  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handlePhotoPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("사진 용량은 5MB 이하만 가능합니다.");
      return;
    }
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPhotoFile(file);
    setRemovePhoto(false);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const clearPhoto = () => {
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPhotoFile(null);
    setPreviewUrl("");
    setRemovePhoto(true);
  };

  const addItem = () => {
    const label = itemDraft.trim();
    if (!label) return;
    setItems((prev) => [...prev, { id: newId(), period: activePeriod, label }]);
    setItemDraft("");
  };

  const addConsumable = () => {
    const name = consumableDraft.name.trim();
    if (!name) return;
    setConsumables((prev) => [
      ...prev,
      {
        id: newId(),
        name,
        quantity: Math.max(0, Number(consumableDraft.quantity) || 0),
        unit: consumableDraft.unit.trim(),
      },
    ]);
    setConsumableDraft({ name: "", quantity: 1, unit: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!formName.trim()) {
      setError("장비 이름을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: formName.trim(),
        photo: photoFile,
        removePhoto: removePhoto && !photoFile,
        items,
        consumables,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const itemsOfActivePeriod = items.filter((i) => i.period === activePeriod);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-900 w-full sm:max-w-[560px] max-h-[92dvh] sm:max-h-[90vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 sm:px-7 pt-5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight font-headline">
                Equipment
              </h3>
              <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                {editing ? "장비 정보 수정" : "새로운 장비 등록"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-7 py-4 space-y-5">
          {/* 1. Photo */}
          <div className="flex gap-3.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 bg-zinc-50 dark:bg-zinc-800/60 flex flex-col items-center justify-center overflow-hidden shrink-0 transition-colors cursor-pointer active:scale-[0.98]"
              title="장비 사진 선택"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="장비 사진 미리보기" className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="w-7 h-7 text-zinc-400 dark:text-zinc-500 mb-1" />
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">사진 추가</span>
                </>
              )}
            </button>

            <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-sm shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>사진 촬영</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>앨범에서 선택</span>
              </button>
              {previewUrl && (
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl font-bold text-[11px] transition-all cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>사진 삭제</span>
                </button>
              )}
            </div>

            {/* Visually hidden but NOT display:none (so programmatic .click() is reliable on all browsers) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handlePhotoPicked}
              className="sr-only"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handlePhotoPicked}
              className="sr-only"
            />
          </div>

          {/* 2. Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
              장비 이름 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="예: 원심분리기 (Centrifuge)"
              className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-all"
            />
          </div>

          {/* 3. Maintenance Checklist */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
              Maintenance 항목
            </label>

            {/* Period tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/70 rounded-2xl">
              {PERIODS.map((p) => {
                const count = items.filter((i) => i.period === p.id).length;
                const active = activePeriod === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePeriod(p.id)}
                    className={`py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1 ${
                      active
                        ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className="text-[9px] opacity-60">({p.ko})</span>
                    <span
                      className={`ml-0.5 h-4 min-w-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center ${
                        count > 0
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Input row for the active period */}
            <div className="flex gap-2">
              <input
                type="text"
                value={itemDraft}
                onChange={(e) => setItemDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
                placeholder={`${periodMeta(activePeriod).label} 점검 항목 입력 후 Enter`}
                className="flex-1 min-w-0 px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-all"
              />
              <button
                type="button"
                onClick={addItem}
                disabled={!itemDraft.trim()}
                className="w-11 shrink-0 rounded-xl bg-zinc-900 dark:bg-white dark:text-zinc-950 text-white font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="항목 추가"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Item list of the active period */}
            {itemsOfActivePeriod.length > 0 ? (
              <ul className="space-y-1">
                {itemsOfActivePeriod.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${periodMeta(item.period).iconClass.replace("text-", "bg-")}`} />
                    <span className="flex-1 min-w-0 text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {item.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                      className="p-1 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                      title="항목 삭제"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 px-1 py-1">
                {periodMeta(activePeriod).label} 점검 항목이 없습니다.
              </p>
            )}
          </div>

          {/* 4. Consumables */}
          <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <label className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
              보유 중인 소모품
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                value={consumableDraft.name}
                onChange={(e) => setConsumableDraft((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addConsumable();
                  }
                }}
                placeholder="소모품 이름 (예: 필터, 글러브)"
                className="flex-1 min-w-0 px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-all"
              />
              <input
                type="number"
                min={0}
                value={consumableDraft.quantity}
                onChange={(e) =>
                  setConsumableDraft((p) => ({
                    ...p,
                    quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                  }))
                }
                className="w-14 shrink-0 px-2 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-black text-center text-zinc-900 dark:text-white tabular-nums transition-all"
                placeholder="수량"
              />
              <input
                type="text"
                value={consumableDraft.unit}
                onChange={(e) => setConsumableDraft((p) => ({ ...p, unit: e.target.value }))}
                className="w-14 shrink-0 px-2 py-2.5 bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-bold text-center text-zinc-900 dark:text-white transition-all"
                placeholder="단위"
              />
              <button
                type="button"
                onClick={addConsumable}
                disabled={!consumableDraft.name.trim()}
                className="w-11 shrink-0 rounded-xl bg-zinc-900 dark:bg-white dark:text-zinc-950 text-white font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="소모품 추가"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {consumables.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {consumables.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-xl"
                  >
                    <Package className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="flex-1 min-w-0 text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {c.name}
                    </span>
                    <span className="text-[11px] font-black text-amber-700 dark:text-amber-300 tabular-nums shrink-0">
                      {c.quantity}
                      {c.unit ? ` ${c.unit}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => setConsumables((prev) => prev.filter((x) => x.id !== c.id))}
                      className="p-0.5 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                      title="소모품 삭제"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 px-1 py-1">
                등록된 소모품이 없습니다.
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl">
              <TriangleAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 leading-relaxed">
                {error}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-7 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 flex gap-2.5">
          {editing && (
            <button
              type="button"
              onClick={() => onDeleteRequest(editing)}
              className="px-4 py-3 border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              삭제
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>저장 중...</span>
              </>
            ) : editing ? (
              "저장"
            ) : (
              "등록"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Equipment Card
// ──────────────────────────────────────────────────────────────────
interface EquipmentCardProps {
  equipment: Equipment;
  onEdit: () => void;
  onToggleItem: (itemId: string) => void;
}

function EquipmentCard({ equipment, onEdit, onToggleItem }: EquipmentCardProps) {
  const [activePeriod, setActivePeriod] = useState<MaintenancePeriod>("daily");
  const total = equipment.maintenance_items.length;
  const done = equipment.maintenance_items.filter((i) =>
    equipment.completed_items.includes(i.id)
  ).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const allDone = total > 0 && done === total;

  const itemsOfPeriod = equipment.maintenance_items.filter((i) => i.period === activePeriod);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 shadow-xs overflow-hidden flex flex-col animate-fadeIn">
      {/* Photo */}
      <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        {equipment.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={equipment.photo_url}
            alt={equipment.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700">
            <CameraOff className="w-8 h-8 mb-1" />
            <span className="text-[10px] font-bold">사진 없음</span>
          </div>
        )}

        {allDone ? (
          <span className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 bg-emerald-600/95 text-white text-[9px] font-black rounded-lg shadow-sm">
            <CheckCircle2 className="w-3 h-3" />
            점검 완료
          </span>
        ) : (
          <span className="absolute top-2.5 right-2.5 px-2 py-1 bg-black/55 backdrop-blur-sm text-white text-[9px] font-black rounded-lg tabular-nums">
            {total > 0 ? `${done}/${total}` : "항목 없음"}
          </span>
        )}
      </div>

      {/* Name + edit */}
      <div className="px-4 pt-3.5 flex items-start justify-between gap-2">
        <h3 className="font-black text-sm sm:text-base text-zinc-900 dark:text-white leading-snug break-words min-w-0">
          {equipment.name}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 shrink-0 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
          title="장비 정보 수정"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-2">
        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-1">
          <span>오늘의 점검</span>
          <span className={`tabular-nums ${allDone ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
            {percent}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              allDone ? "bg-emerald-500" : "bg-blue-600"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Period tabs */}
      <div className="px-4 pt-3 flex gap-1">
        {PERIODS.map((p) => {
          const pItems = equipment.maintenance_items.filter((i) => i.period === p.id);
          const pDone = pItems.filter((i) => equipment.completed_items.includes(i.id)).length;
          const active = activePeriod === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivePeriod(p.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer active:scale-95 ${
                active
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <span>{p.label}</span>
              {pItems.length > 0 && (
                <span className={`tabular-nums ${active ? "text-white/80" : "text-zinc-400 dark:text-zinc-500"}`}>
                  {pDone}/{pItems.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Checklist */}
      <div className="px-3.5 pt-2 pb-3 flex-1">
        {itemsOfPeriod.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
              {periodMeta(activePeriod).label} 점검 항목이 없습니다.
            </p>
            <button
              type="button"
              onClick={onEdit}
              className="mt-1 text-[10px] font-black text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              항목 추가하기
            </button>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {itemsOfPeriod.map((item) => {
              const checked = equipment.completed_items.includes(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onToggleItem(item.id)}
                    className="w-full flex items-center gap-2.5 px-1.5 py-2 rounded-xl text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer active:scale-[0.99]"
                  >
                    {checked ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-4.5 h-4.5 text-zinc-300 dark:text-zinc-600 shrink-0" />
                    )}
                    <span
                      className={`flex-1 min-w-0 text-xs font-semibold leading-snug break-words ${
                        checked
                          ? "text-zinc-400 dark:text-zinc-500 line-through"
                          : "text-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Consumables */}
      <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-1 mb-1.5">
          <Package className="w-3 h-3 text-amber-500" />
          <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            보유 소모품
          </span>
        </div>
        {equipment.consumables.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {equipment.consumables.map((c) => (
              <span
                key={c.id}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  c.quantity === 0
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                    : "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300"
                }`}
              >
                {c.name}
                <span className="tabular-nums opacity-70">
                  {c.quantity}
                  {c.unit ? ` ${c.unit}` : ""}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">등록된 소모품 없음</p>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const { user } = useAuth();
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingMessage, setSavingMessage] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const fetchEquipment = async () => {
    const fetchId = ++fetchIdRef.current;
    try {
      const { data, error } = await supabase
        .from(EQUIPMENT_TABLE)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (fetchId !== fetchIdRef.current) return;
      setEquipmentList((data || []).map(normalizeEquipment));
      setLoadError(null);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      console.error("Error fetching equipment:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("schema cache") || msg.includes("does not exist") || msg.includes("relation")) {
        setLoadError(
          'equipment 테이블이 없습니다. Supabase SQL Editor에서 "supabase_setup.sql"을 실행해 주세요.'
        );
      } else {
        setLoadError(msg);
      }
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("equipment-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: EQUIPMENT_TABLE },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setEquipmentList((prev) =>
              prev.some((e) => e.id === String(payload.new.id))
                ? prev
                : [...prev, normalizeEquipment(payload.new)]
            );
          } else if (payload.eventType === "UPDATE") {
            setEquipmentList((prev) =>
              prev.map((e) =>
                e.id === String(payload.new.id) ? normalizeEquipment(payload.new) : e
              )
            );
          } else if (payload.eventType === "DELETE") {
            setEquipmentList((prev) => prev.filter((e) => e.id !== String(payload.old.id)));
          }
        }
      )
      .subscribe((status) => {
        // Initial load once the realtime channel is connected. If realtime is
        // unavailable (or the table is missing) we still load exactly once.
        if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          if (fetchIdRef.current === 0) fetchEquipment();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // Cleanup intentionally does not abort the initial fetch; `loading` simply
    // stops when the page is remounted and a new fetch takes over.
  }, []);

  const openCreate = () => {
    setEditingEquipment(null);
    setModalOpen(true);
  };

  const openEdit = (eq: Equipment) => {
    setEditingEquipment(eq);
    setModalOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    photo: File | null;
    removePhoto: boolean;
    items: EquipmentMaintenanceItem[];
    consumables: EquipmentConsumable[];
  }) => {
    if (!user) throw new Error("로그인이 필요합니다.");
    setSavingMessage("장비 정보를 저장하는 중...");

    try {
      let photoUrl: string | null | undefined = undefined;
      if (data.photo) {
        photoUrl = await uploadEquipmentPhoto(data.photo);
      } else if (data.removePhoto) {
        photoUrl = null;
      }

      const userShort = user.email ? user.email.split("@")[0].toUpperCase() : "USER";
      const now = new Date().toISOString();

      if (editingEquipment) {
        const validIds = new Set(data.items.map((i) => i.id));
        const payload: Record<string, unknown> = {
          name: data.name,
          maintenance_items: data.items,
          consumables: data.consumables,
          completed_items: editingEquipment.completed_items.filter((id) => validIds.has(id)),
          updated_at: now,
        };
        if (photoUrl !== undefined) payload.photo_url = photoUrl;

        const { error } = await supabase
          .from(EQUIPMENT_TABLE)
          .update(payload)
          .eq("id", editingEquipment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(EQUIPMENT_TABLE).insert([
          {
            name: data.name,
            photo_url: photoUrl ?? null,
            maintenance_items: data.items,
            consumables: data.consumables,
            completed_items: [],
            created_by: userShort,
            created_at: now,
            updated_at: now,
          },
        ]);
        if (error) throw error;
      }

      await fetchEquipment();
      setModalOpen(false);
      setEditingEquipment(null);
    } finally {
      setSavingMessage(null);
    }
  };

  const handleToggleItem = async (eq: Equipment, itemId: string) => {
    const isChecked = eq.completed_items.includes(itemId);
    const nextCompleted = isChecked
      ? eq.completed_items.filter((id) => id !== itemId)
      : [...eq.completed_items, itemId];
    const now = new Date().toISOString();

    // Optimistic update
    setEquipmentList((prev) =>
      prev.map((e) =>
        e.id === eq.id
          ? {
              ...e,
              completed_items: nextCompleted,
              last_checked_at: isChecked ? e.last_checked_at : now,
              updated_at: now,
            }
          : e
      )
    );

    const { error } = await supabase
      .from(EQUIPMENT_TABLE)
      .update({
        completed_items: nextCompleted,
        last_checked_at: isChecked ? eq.last_checked_at : now,
        updated_at: now,
      })
      .eq("id", eq.id);

    if (error) {
      console.error("Error updating maintenance checklist:", error);
      // Roll back
      setEquipmentList((prev) => prev.map((e) => (e.id === eq.id ? eq : e)));
      alert(`체크 상태 저장 실패: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from(EQUIPMENT_TABLE).delete().eq("id", deleteTarget.id);
      if (error) throw error;
      setEquipmentList((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
      setModalOpen(false);
      setEditingEquipment(null);
    } catch (err) {
      console.error("Error deleting equipment:", err);
      alert(err instanceof Error ? err.message : "장비 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const { doneCount, pendingCount } = useMemo(() => {
    let done = 0;
    let pending = 0;
    for (const eq of equipmentList) {
      if (eq.maintenance_items.length === 0) continue;
      if (eq.maintenance_items.every((i) => eq.completed_items.includes(i.id))) done++;
      else pending++;
    }
    return { doneCount: done, pendingCount: pending };
  }, [equipmentList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipmentList.filter((eq) => {
      if (q) {
        const matches =
          eq.name.toLowerCase().includes(q) ||
          eq.consumables.some((c) => c.name.toLowerCase().includes(q)) ||
          eq.maintenance_items.some((i) => i.label.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (filter === "all") return true;
      const total = eq.maintenance_items.length;
      const allDone = total > 0 && eq.maintenance_items.every((i) => eq.completed_items.includes(i.id));
      return filter === "done" ? allDone : !allDone;
    });
  }, [equipmentList, search, filter]);

  return (
    <div className="flex-1 p-3 sm:p-6 md:p-8 flex flex-col min-h-0 bg-zinc-50 dark:bg-zinc-950">
      {/* Search Bar & Plus Button */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 mb-3 sm:mb-3.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="장비 이름, 점검 항목, 소모품 검색..."
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all"
          />
        </div>

        <button
          onClick={openCreate}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-600/30 transition-all active:scale-90 cursor-pointer shrink-0"
          title="새 장비 등록"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 mb-3.5 sm:mb-5 shrink-0 overflow-x-auto no-scrollbar">
        {[
          { id: "all" as const, label: "전체", count: equipmentList.length },
          { id: "pending" as const, label: "점검 필요", count: pendingCount },
          { id: "done" as const, label: "점검 완료", count: doneCount },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`shrink-0 px-3.5 py-2 rounded-2xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
              filter === f.id
                ? "bg-blue-600 text-white border border-blue-600 shadow-md shadow-blue-600/30 font-black"
                : "bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 shadow-xs"
            }`}
          >
            <span>{f.label}</span>
            <span className={`tabular-nums ${filter === f.id ? "text-white/80" : "text-zinc-400 dark:text-zinc-500"}`}>
              {f.count}
            </span>
          </button>
        ))}
        <div className="ml-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchEquipment();
            }}
            className="w-9 h-9 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center p-20">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center p-10 sm:p-20 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <CircleAlert className="w-12 h-12 text-amber-400" />
            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">장비 목록을 불러오지 못했습니다.</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-md leading-relaxed">{loadError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 sm:p-20 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <MonitorCog className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
            {equipmentList.length === 0 ? (
              <>
                <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">등록된 장비가 없습니다.</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  우측 상단 <span className="font-black text-blue-600">+</span> 버튼을 눌러 장비를 등록해 보세요.
                </p>
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-1 inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  장비 등록
                </button>
              </>
            ) : (
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                검색/필터 조건에 맞는 장비가 없습니다.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 sm:gap-4">
            {filtered.map((eq) => (
              <EquipmentCard
                key={eq.id}
                equipment={eq}
                onEdit={() => openEdit(eq)}
                onToggleItem={(itemId) => handleToggleItem(eq, itemId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Save overlay */}
      {savingMessage && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[400] flex items-center justify-center">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl px-5 py-4 shadow-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{savingMessage}</span>
          </div>
        </div>
      )}

      {/* Equipment form modal */}
      {modalOpen && (
        <EquipmentModal
          key={editingEquipment?.id || "new-equipment-modal"}
          editing={editingEquipment}
          onClose={() => {
            setModalOpen(false);
            setEditingEquipment(null);
          }}
          onDeleteRequest={(eq) => setDeleteTarget(eq)}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-[400px] rounded-[2.5rem] shadow-2xl p-8 space-y-6 text-center border border-zinc-200 dark:border-zinc-800">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-zinc-900 dark:text-white">
              <Trash2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">정말 삭제하시겠습니까?</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-2 leading-relaxed">
                &quot;{deleteTarget.name}&quot; 장비와 점검 항목, 소모품 정보가 영구적으로 삭제됩니다.
              </p>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-black text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-white rounded-2xl font-black text-sm shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                삭제 완료
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
