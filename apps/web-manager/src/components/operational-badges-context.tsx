'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type AdminOperationalBadgeCounts = {
  livraisons: number;
  organisations: number;
  flotte: number;
  incidents: number;
  awaitingAssignment: number;
  awaitingReturnAssignment: number;
};

export type BusinessOperationalBadgeCounts = {
  colis: number;
  awaitingHandoff: number;
  awaitingDeposit: number;
  returnsToReview: number;
  returnsToCollect: number;
};

export type OperationalBadgesState = {
  admin?: AdminOperationalBadgeCounts;
  business?: BusinessOperationalBadgeCounts;
};

const OperationalBadgesContext = createContext<OperationalBadgesState>({});

export function OperationalBadgesProvider({
  value,
  children,
}: {
  value: OperationalBadgesState;
  children: ReactNode;
}) {
  return (
    <OperationalBadgesContext.Provider value={value}>{children}</OperationalBadgesContext.Provider>
  );
}

export function useOperationalBadges(): OperationalBadgesState {
  return useContext(OperationalBadgesContext);
}
