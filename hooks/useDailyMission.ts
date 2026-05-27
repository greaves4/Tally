/**
 * useDailyMission
 *
 * Hook delgado que lee del store global de misiones (`/stores/missionStore`).
 * Toda la lógica (bootstrap, watchSteps, auto-complete, persistencia) vive en
 * el store; este hook solo:
 *  1. Dispara `bootstrap()` la primera vez (idempotente).
 *  2. Selecciona el subconjunto de estado que el consumidor necesita.
 *
 * Lift hecho en respuesta a la observación #15 del QA Sprint 4: antes, cada
 * componente que usaba el hook tenía su propio state y suscripción a
 * `watchSteps`, causando doble bootstrap al abrir mission-details y re-renders
 * en cascada (parpadeo visible en device).
 *
 * Contrato público (no cambió):
 *   - `todayMission`: instancia con `evaluate` reconstruida
 *   - `progress`: 0–1
 *   - `isCompleted`: boolean
 *   - `streakState`: snapshot { current, longest, wildcardsAvailable }
 *   - `isReady`: true tras el primer bootstrap
 *   - `refresh()`: fuerza re-bootstrap (resetea flags internas)
 *
 * Ver `.claude/skills/daily-missions/SKILL.md` para la filosofía completa.
 */

import { useEffect } from 'react';

import {
  useMissionStore,
  type MissionStreakSnapshot,
} from '@/stores/missionStore';
import type { MissionInstance } from '@/features/missions/types';

export type UseDailyMissionResult = {
  todayMission: MissionInstance | null;
  progress: number;
  isCompleted: boolean;
  streakState: MissionStreakSnapshot;
  isReady: boolean;
  refresh: () => Promise<void>;
};

export function useDailyMission(): UseDailyMissionResult {
  const todayMission = useMissionStore((s) => s.todayMission);
  const progress = useMissionStore((s) => s.progress);
  const isCompleted = useMissionStore((s) => s.isCompleted);
  const streakState = useMissionStore((s) => s.streakState);
  const isReady = useMissionStore((s) => s.isReady);
  const refresh = useMissionStore((s) => s.refresh);

  useEffect(() => {
    // Idempotente: si ya está bootstrapped o hay uno en vuelo, no-op.
    void useMissionStore.getState().bootstrap();
  }, []);

  return { todayMission, progress, isCompleted, streakState, isReady, refresh };
}
