"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * B5: 티켓 API 중복 호출 방지 훅
 *
 * - window.__mamastaleTicketCache로 cross-chunk 안전한 싱글턴 캐시
 * - TTL 30초 + in-flight dedup
 * - 7개 소비 파일에서 직접 fetch 대신 이 훅 사용
 */

export interface TicketData {
  remaining: number;
  worksheetTicketsRemaining: number;
  storyCount: number;
  isFirstPurchase: boolean;
}

const EMPTY_DATA: TicketData = {
  remaining: 0,
  worksheetTicketsRemaining: 0,
  storyCount: 0,
  isFirstPurchase: false,
};

interface TicketCache {
  data: TicketData;
  fetchedAt: number;
  inflight: Promise<TicketData> | null;
}

declare global {
  interface Window {
    __mamastaleTicketCache?: TicketCache;
  }
}

const CACHE_TTL_MS = 30_000; // 30초

function getCache(): TicketCache {
  if (typeof window === "undefined") {
    return { data: { ...EMPTY_DATA }, fetchedAt: 0, inflight: null };
  }
  if (!window.__mamastaleTicketCache) {
    window.__mamastaleTicketCache = { data: { ...EMPTY_DATA }, fetchedAt: 0, inflight: null };
  }
  return window.__mamastaleTicketCache;
}

async function fetchTicketsOnce(): Promise<TicketData> {
  const cache = getCache();

  // TTL 내 캐시 히트
  if (cache.fetchedAt > 0 && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  // in-flight dedup
  if (cache.inflight) {
    return cache.inflight;
  }

  const promise = (async () => {
    try {
      // W3-FIX: Skip fetch for unauthenticated users (prevents 401 console error)
      const supabase = createClient();
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          cache.fetchedAt = Date.now(); // Cache briefly to avoid re-checking
          return { ...EMPTY_DATA };
        }
      }
      const res = await fetch("/api/tickets", { credentials: "include" });
      if (!res.ok) return cache.data; // 실패 시 이전 값 유지
      const raw = await res.json();
      const data: TicketData = {
        remaining: raw.remaining ?? 0,
        worksheetTicketsRemaining: raw.worksheet_tickets_remaining ?? 0,
        storyCount: raw.storyCount ?? 0,
        isFirstPurchase: raw.isFirstPurchase ?? false,
      };
      cache.data = data;
      cache.fetchedAt = Date.now();
      return data;
    } catch {
      return cache.data;
    } finally {
      cache.inflight = null;
    }
  })();

  cache.inflight = promise;
  return promise;
}

/** 캐시 무효화 (티켓 사용/구매 후 호출) */
export function invalidateTicketCache() {
  const cache = getCache();
  cache.fetchedAt = 0;
}

/**
 * 티켓 잔여량을 가져오는 훅
 * @returns { tickets, ticketData, loading, refetch }
 *   - tickets: remaining count (backward compat)
 *   - ticketData: full data (remaining, worksheetTicketsRemaining, storyCount, isFirstPurchase)
 */
export function useTickets() {
  const [ticketData, setTicketData] = useState<TicketData>(getCache().data);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    invalidateTicketCache();
    setLoading(true);
    const d = await fetchTicketsOnce();
    setTicketData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTicketsOnce().then((d) => {
      if (!cancelled) {
        setTicketData(d);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  return {
    tickets: ticketData.remaining,
    ticketData,
    loading,
    refetch,
  };
}
