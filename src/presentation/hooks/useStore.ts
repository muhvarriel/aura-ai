import { useState, useEffect } from "react";

/**
 * Custom hook untuk hydration-safe Zustand store access.
 * Mengatasi hydration mismatch dengan return immediate value.
 *
 * @template T - Type dari Zustand store state
 * @template F - Type dari return value (hasil selector)
 * @param store - Zustand store instance
 * @param callback - Selector function
 * @returns Selected state value (tidak pernah undefined)
 */
export const useStore = <T, F>(
  store: (callback: (state: T) => unknown) => unknown,
  callback: (state: T) => F,
): F => {
  // FIX: Langsung ambil result sebagai initial value
  // Ini mencegah undefined flash di first render
  const result = store(callback) as F;

  // State untuk track perubahan (hydration di background)
  const [data, setData] = useState<F>(result);

  useEffect(() => {
    // Sync state dengan store updates
    setData(result);
  }, [result]);

  // FIX: Return data yang selalu terdefinisi
  // Di initial render, return result langsung
  // Di subsequent renders, return state yang sudah ter-sync
  return data;
};
