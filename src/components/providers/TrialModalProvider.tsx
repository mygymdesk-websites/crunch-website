"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface TrialModalContextValue {
  isOpen: boolean;
  /** Pre-selects the interest dropdown, e.g. from a class card. */
  presetInterest: string | null;
  openTrial: (interest?: string) => void;
  closeTrial: () => void;
}

const TrialModalContext = createContext<TrialModalContextValue | null>(null);

/**
 * The Book Free Trial modal is global — it opens from the header, the mobile
 * menu, the hero, the closing CTA band, the empty timetable and the contact
 * sidebar. Keeping its open state here means one modal instance in the layout
 * rather than one per trigger.
 */
export function TrialModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [presetInterest, setPresetInterest] = useState<string | null>(null);

  const openTrial = useCallback((interest?: string) => {
    setPresetInterest(interest ?? null);
    setOpen(true);
  }, []);

  const closeTrial = useCallback(() => setOpen(false), []);

  const value = useMemo<TrialModalContextValue>(
    () => ({ isOpen, presetInterest, openTrial, closeTrial }),
    [isOpen, presetInterest, openTrial, closeTrial],
  );

  return (
    <TrialModalContext.Provider value={value}>
      {children}
    </TrialModalContext.Provider>
  );
}

export function useTrialModal(): TrialModalContextValue {
  const ctx = useContext(TrialModalContext);
  if (!ctx) {
    throw new Error("useTrialModal must be used within TrialModalProvider");
  }
  return ctx;
}
