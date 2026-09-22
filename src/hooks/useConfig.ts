import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { effectiveRemainingTerm } from "@/lib/group-term";

export interface Group {
  id: string;
  name: string;
  code: string;
  description: string | null;
  initial_term: number;
  remaining_term: number;
  term_reference_date: string;
  reserve_fund: number;
  active: boolean;
}

export interface CreditRange {
  id: string;
  group_id: string;
  credit_value: number;
  active: boolean;
}
export interface AdminRate {
  id: string;
  group_id: string;
  rate: number;
  active: boolean;
}
export interface InstallmentType {
  id: string;
  group_id: string;
  name: string;
  multiplier: number;
  active: boolean;
}
export interface InsuranceRule {
  id: string;
  group_id: string;
  name: string;
  rate: number;
  active: boolean;
}

export function useGroups(onlyActive = true) {
  return useQuery({
    queryKey: ["groups", onlyActive],
    queryFn: async () => {
      let q = supabase.from("groups").select("*").order("code");
      if (onlyActive) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        initial_term: Number(row.initial_term),
        remaining_term: effectiveRemainingTerm(Number(row.remaining_term), row.term_reference_date),
        reserve_fund: Number(row.reserve_fund),
      })) satisfies Group[];
    },
  });
}

export function useGroupConfig(groupId: string | null, onlyActive = true) {
  return useQuery({
    enabled: !!groupId,
    queryKey: ["group-config", groupId, onlyActive],
    queryFn: async () => {
      if (!groupId) throw new Error("Selecione um grupo.");
      const [ranges, rates, types, insurance] = await Promise.all([
        supabase
          .from("credit_ranges")
          .select("*")
          .eq("group_id", groupId)
          .order("credit_value", { ascending: false }),
        supabase.from("administration_rates").select("*").eq("group_id", groupId).order("rate"),
        supabase
          .from("installment_types")
          .select("*")
          .eq("group_id", groupId)
          .order("multiplier", { ascending: false }),
        supabase.from("insurance_rules").select("*").eq("group_id", groupId),
      ]);
      const keep = <T extends { active: boolean }>(rows: T[]) =>
        onlyActive ? rows.filter((r) => r.active) : rows;

      if (ranges.error || rates.error || types.error || insurance.error) {
        throw ranges.error ?? rates.error ?? types.error ?? insurance.error;
      }

      return {
        ranges: keep(
          (ranges.data ?? []).map((row) => ({
            ...row,
            credit_value: Number(row.credit_value),
          })) satisfies CreditRange[],
        ),
        rates: keep(
          (rates.data ?? []).map((row) => ({ ...row, rate: Number(row.rate) })) satisfies AdminRate[],
        ),
        types: keep(
          (types.data ?? []).map((row) => ({
            ...row,
            multiplier: Number(row.multiplier),
          })) satisfies InstallmentType[],
        ),
        insurance:
          keep(
            (insurance.data ?? []).map((row) => ({
              ...row,
              rate: Number(row.rate),
            })) satisfies InsuranceRule[],
          )[0] ?? null,
      };
    },
  });
}
