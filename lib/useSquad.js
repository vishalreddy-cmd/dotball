'use client';

import { useState, useCallback } from 'react';
import { creditSum } from './credits';

/**
 * Classic XI squad selection state machine.
 *   step: 'pick' → 'roles' → 'done'
 */
export function useSquad() {
  const [sel,  setSel]  = useState([]);
  const [C,    setC]    = useState(null);   // captain
  const [VC,   setVC]   = useState(null);   // vice-captain
  const [IP1,  setIP1]  = useState(null);   // impact player 1
  const [IP2,  setIP2]  = useState(null);   // impact player 2
  const [step, setStep] = useState('pick'); // 'pick' | 'roles' | 'done'

  /** Toggle a player in/out of selection (respects all constraints). */
  const toggle = useCallback((player, matchT1, matchT2) => {
    setSel(prev => {
      if (prev.some(p => p.id === player.id)) {
        return prev.filter(p => p.id !== player.id);
      }
      if (prev.length >= 11)                                     return prev;
      if (creditSum([...prev, player]) > 100)                    return prev;
      if (prev.filter(p => p.team === player.team).length >= 6)  return prev;
      return [...prev, player];
    });
  }, []);

  /** Remove one player by id. */
  const remove = useCallback((id) => setSel(prev => prev.filter(p => p.id !== id)), []);

  /** Assign / unassign captain. */
  const setCaptain = useCallback((id, players) => {
    const p = players.find(x => x.id === id);
    setC(cur => (cur?.id === id ? null : p ?? null));
  }, []);

  /** Assign / unassign vice-captain. */
  const setViceCaptain = useCallback((id, players) => {
    const p = players.find(x => x.id === id);
    setVC(cur => (cur?.id === id ? null : p ?? null));
  }, []);

  /**
   * Toggle impact player slot.
   * Pass current IP1/IP2 values so we can read them synchronously.
   */
  const toggleImpact = useCallback((id, players, curIP1, curIP2) => {
    const p = players.find(x => x.id === id);
    if (!p) return;
    if (curIP1?.id === id) { setIP1(null); return; }
    if (curIP2?.id === id) { setIP2(null); return; }
    if (!curIP1) { setIP1(p); return; }
    if (!curIP2) { setIP2(p); return; }
    // both slots full — do nothing
  }, []);

  /** Directly set the full 11-player list (used by autoPick). */
  const setPicked = useCallback((players) => {
    setSel(players.slice(0, 11));
    setC(null); setVC(null); setIP1(null); setIP2(null);
    setStep('pick');
  }, []);

  const goToRoles = useCallback(() => setStep('roles'), []);

  const reset = useCallback(() => {
    setSel([]); setC(null); setVC(null); setIP1(null); setIP2(null); setStep('pick');
  }, []);

  const lockSquad  = useCallback(() => setStep('done'), []);

  /** Go back to pick view keeping the current squad intact (for editing). */
  const editSquad  = useCallback(() => setStep('pick'), []);

  const loadSquad = useCallback((squadData, allPlayers) => {
    const players = (squadData.players ?? [])
      .map(id => allPlayers.find(p => p.id === id))
      .filter(Boolean);
    setSel(players);
    setC(players.find(p => p.id === squadData.captainId) ?? null);
    setVC(players.find(p => p.id === squadData.vcId) ?? null);
    setIP1(players.find(p => p.id === squadData.ip1Id) ?? null);
    setIP2(players.find(p => p.id === squadData.ip2Id) ?? null);
    setStep('done');
  }, []);

  const credits   = creditSum(sel);
  const remaining = Math.round((100 - credits) * 10) / 10;
  const roleCounts = { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
  sel.forEach(p => roleCounts[p.r]++);
  const rolesReady = !!(C && VC && IP1 && IP2);

  return {
    sel, C, VC, IP1, IP2, step,
    credits, remaining, roleCounts, rolesReady,
    toggle, remove, setPicked, setCaptain, setViceCaptain, toggleImpact,
    goToRoles, reset, lockSquad, editSquad, loadSquad,
  };
}

/**
 * Top-3 run-scorer prediction state.
 */
export function useR3Squad() {
  const [squad3, setSquad3] = useState([]);
  const [done,   setDone]   = useState(false);

  const toggle = useCallback((player) => {
    setSquad3(prev => {
      if (prev.some(p => p.id === player.id)) return prev.filter(p => p.id !== player.id);
      if (prev.length >= 3)                   return prev;
      if (prev.filter(p => p.team === player.team).length >= 2) return prev;
      return [...prev, player];
    });
  }, []);

  const removeAt = useCallback((idx) => setSquad3(prev => prev.filter((_, i) => i !== idx)), []);
  const lock     = useCallback(() => setDone(true), []);
  const reset    = useCallback(() => { setSquad3([]); setDone(false); }, []);
  const loadR3   = useCallback((data, allPlayers) => {
    setSquad3((data.players ?? []).map(id => allPlayers.find(p => p.id === id)).filter(Boolean));
    setDone(true);
  }, []);

  return { squad3, done, toggle, removeAt, lock, reset, loadR3 };
}
