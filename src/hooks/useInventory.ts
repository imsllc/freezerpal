import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { defaultPreferences, today, type Snapshot } from "../core/model";
import { openRepository } from "../data/database";
import type { Repository } from "../data/repository";

const empty: Snapshot = {
  items: [],
  locations: [],
  preferences: defaultPreferences,
};
export function useInventory() {
  const [state, setState] = useState(empty);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(0);
  const [date, setDate] = useState(today());
  const repository = useRef<Repository | null>(null);
  const mounted = useRef(true);
  const initialize = useCallback(async () => {
    try {
      const repo = await openRepository();
      const saved = await repo.load();
      if (mounted.current) {
        repository.current = repo;
        setState(saved);
        setError("");
        setReady(true);
      }
    } catch (e) {
      if (mounted.current)
        setError(
          `Could not open saved inventory. ${e instanceof Error ? e.message : "Please try again."}`,
        );
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    // Hydrate React state from the external SQLite database on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void initialize();
    const timer = setInterval(() => setDate(today()), 30_000);
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") setDate(today());
    });
    return () => {
      mounted.current = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [initialize]);
  const run = useCallback(
    async (
      operation: (repo: Repository) => Promise<Snapshot>,
    ): Promise<boolean> => {
      if (!repository.current) return false;
      setPending((n) => n + 1);
      setError("");
      try {
        const saved = await operation(repository.current);
        if (mounted.current) setState(saved);
        return true;
      } catch (e) {
        if (mounted.current)
          setError(
            e instanceof Error
              ? e.message
              : "Could not save. Check available device storage and try again.",
          );
        return false;
      } finally {
        if (mounted.current) setPending((n) => n - 1);
      }
    },
    [],
  );
  return {
    state,
    ready,
    error,
    clearError: () => setError(""),
    busy: pending > 0,
    run,
    initialize,
    date,
  };
}
