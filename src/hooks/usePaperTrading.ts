import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyPaperAccount,
  getMyOpenTrades,
  getMyClosedTrades,
  openPaperTrade,
  closePaperTrade,
  getMyPendingOrders,
  createPendingOrder,
  cancelPendingOrder,
  fillPendingOrder,
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

export function usePendingOrders() {
  const fetch = useServerFn(getMyPendingOrders);
  return useQuery({
    queryKey: ["paper-pending-orders"],
    queryFn: () => fetch(),
    refetchInterval: 10_000,
  });
}

export function useCreatePendingOrder() {
  const qc = useQueryClient();
  const fn = useServerFn(createPendingOrder);
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paper-pending-orders"] });
    },
  });
}

export function useCancelPendingOrder() {
  const qc = useQueryClient();
  const fn = useServerFn(cancelPendingOrder);
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paper-pending-orders"] });
    },
  });
}

export function useFillPendingOrder() {
  const qc = useQueryClient();
  const fn = useServerFn(fillPendingOrder);
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paper-account"] });
      qc.invalidateQueries({ queryKey: ["paper-trades-open"] });
      qc.invalidateQueries({ queryKey: ["paper-pending-orders"] });
    },
  });
}

type PendingOrderSlim = {
  id: string;
  symbol: string;
  entry_price: number;
  price_above: boolean;
};

export function usePendingOrderMonitor(
  prices: Record<string, number>,
  orders: PendingOrderSlim[],
) {
  const fill = useFillPendingOrder();
  const fillingRef = useRef(new Set<string>());

  useEffect(() => {
    for (const order of orders) {
      const price = prices[order.symbol];
      if (price == null) continue;
      if (fillingRef.current.has(order.id)) continue;

      const target = Number(order.entry_price);
      // price_above=true: price was above entry → triggers when price drops to target
      // price_above=false: price was below entry → triggers when price rises to target
      const triggered = order.price_above ? price <= target : price >= target;

      if (triggered) {
        fillingRef.current.add(order.id);
        fill.mutate(
          { data: { order_id: order.id, fill_price: price } },
          { onError: () => fillingRef.current.delete(order.id) },
        );
      }
    }
  }, [prices, orders]);
}
