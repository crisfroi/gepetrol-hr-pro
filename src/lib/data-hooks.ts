import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSupabaseList<T = any>(
  table: string,
  opts: {
    select?: string;
    order?: { column: string; ascending?: boolean };
    orderBy?: { column: string; ascending?: boolean };
    filter?: (q: any) => any;
    deps?: any[];
    limit?: number;
  } = {},
) {
  const { select = "*", order: orderOpt, orderBy, filter, deps = [], limit = 500 } = opts;
  const order = orderOpt ?? orderBy;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    let q: any = (supabase.from as any)(table).select(select).limit(limit);
    if (order) q = q.order(order.column, { ascending: order.ascending ?? true });
    if (filter) q = filter(q);
    const { data: rows, error: err } = await q;
    if (err) {
      setError(err.message);
      toast.error(`Error al cargar ${table}: ${err.message}`);
    } else {
      setData((rows ?? []) as T[]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, JSON.stringify(order), limit, ...deps]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh, refetch: refresh, setData };
}

export async function insertRow(table: string, values: Record<string, any>) {
  const { data, error } = await (supabase.from as any)(table).insert(values).select().single();
  if (error) {
    toast.error(`Error: ${error.message}`);
    throw error;
  }
  toast.success("Registro creado");
  return data;
}

export async function updateRow(table: string, id: string, values: Record<string, any>) {
  const { data, error } = await (supabase.from as any)(table).update(values).eq("id", id).select().single();
  if (error) {
    toast.error(`Error: ${error.message}`);
    throw error;
  }
  toast.success("Registro actualizado");
  return data;
}

export async function deleteRow(table: string, id: string) {
  const { error } = await (supabase.from as any)(table).delete().eq("id", id);
  if (error) {
    toast.error(`Error: ${error.message}`);
    throw error;
  }
  toast.success("Registro eliminado");
}
