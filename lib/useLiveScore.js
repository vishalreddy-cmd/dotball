'use client';
import { useState, useEffect, useRef } from 'react';

const POLL_INTERVAL = 30_000; // 30 seconds

/**
 * Polls /api/live-score during a live match.
 * Returns { playerStats, score, status, live, complete, loading, error }
 *
 * playerStats: { [playerId]: { runs, wickets, balls, fours, sixes, economy, overs } }
 */
export function useLiveScore(matchId, enabled = true) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!matchId || !enabled) return;

    async function fetch_() {
      setLoading(true);
      try {
        const res  = await fetch(`/api/live-score?matchId=${matchId}`);
        const json = await res.json();
        setData(json);
        setError(null);
        // Stop polling once match is complete
        if (json.complete && timerRef.current) {
          clearInterval(timerRef.current);
        }
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }

    fetch_();
    timerRef.current = setInterval(fetch_, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [matchId, enabled]);

  return {
    playerStats: data?.playerStats || {},
    score:       data?.score || [],
    status:      data?.status || '',
    live:        data?.live   || false,
    complete:    data?.complete || false,
    result:      data?.result  || null,
    loading,
    error,
  };
}

/**
 * Compute total fantasy points for a squad using live playerStats.
 */
export function calcSquadPoints(players, playerStats, captainId, vcId, ip1Id, ip2Id) {
  return players.reduce((total, p) => {
    const stat = playerStats[p.id];
    if (!stat) return total;
    return total + (stat.pts || 0);
  }, 0);
}
