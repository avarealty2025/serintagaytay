"use client";
import { useState, useEffect, createContext, useContext } from "react";

export interface UnitItem {
  id: string;
  buildingId: string;
  tower: number;
  code: string;
  name?: string;
  type: string;
  baseRate: number;
  weekendRate: number;
  cleaningFee: number;
  extraGuestFee: number;
  capacity: number;
  maxGuests: number;
  minStay?: number;
  active: boolean;
  view?: string;
}

const Ctx = createContext<UnitItem[]>([]);

export function useUnits() {
  return useContext(Ctx);
}

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const [units, setUnits] = useState<UnitItem[]>([]);

  useEffect(() => {
    fetch("/api/units")
      .then((r) => r.json())
      .then((d) => {
        if (d.units) setUnits(d.units);
      })
      .catch(() => {});
  }, []);

  return <Ctx.Provider value={units}>{children}</Ctx.Provider>;
}
