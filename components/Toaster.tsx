"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

type ToastItem = { id: number; message: string; type: "success" | "error" };

type Listener = (item: ToastItem) => void;
const listeners = new Set<Listener>();

let counter = 0;

function emit(type: "success" | "error", message: string) {
  const item: ToastItem = { id: ++counter, message, type };
  listeners.forEach((l) => l(item));
}

export const toast = {
  success: (message: string) => emit("success", message),
  error: (message: string) => emit("error", message),
};

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (item: ToastItem) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== item.id)), 3000);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white min-w-[200px] max-w-xs animate-in slide-in-from-right-4 ${
            item.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {item.type === "success"
            ? <CheckCircle size={16} className="shrink-0" />
            : <XCircle size={16} className="shrink-0" />
          }
          <span className="flex-1">{item.message}</span>
          <button
            onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
            className="shrink-0 opacity-80 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
