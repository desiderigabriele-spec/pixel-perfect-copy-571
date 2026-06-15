import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyPaperAccount,
  getMyOpenTrades,
  getMyClosedTrades,
  openPaperTrade,
  closePaperTrade,
} from "@/lib/paper.functions";

export function usePaperAccount() {
  const fetch = useServerFn(getMyPaperAccount);
  return useQuery({
    queryKey: ["paper-account"],
    queryFn: () => fetch(),
  });
}

export function useOpenTrades() {
  const fetch = useServerFn(getMyOpenTrades);
  return useQuery({
    queryKey: ["paper-trades-open"],
    queryFn: () => fetch(),
    refetchInterval: 5_000,
  });
}

export function useClosedTrades() {
  const fetch = useServerFn(getMyClosedTrades);
  return useQuery({
    queryKey: ["paper-trades-closed"],
    queryFn: () => fetch(),
  });
}

export function useOpenTrade() {
  const qc = useQueryClient();
  const fn = useServerFn(openPaperTrade);
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paper-account"] });
      qc.invalidateQueries({ queryKey: ["paper-trades-open"] });
    },
  });
}

export function useCloseTrade() {
  const qc = useQueryClient();
  const fn = useServerFn(closePaperTrade);
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paper-account"] });
      qc.invalidateQueries({ queryKey: ["paper-trades-open"] });
      qc.invalidateQueries({ queryKey: ["paper-trades-closed"] });
    },
  });
}
