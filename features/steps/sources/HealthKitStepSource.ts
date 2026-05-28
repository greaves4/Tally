/**
 * Implementación de StepSource usando Apple HealthKit (react-native-health).
 *
 * Solo disponible en iOS nativo. En Expo Go la factory nunca instancia esta
 * clase — el `isExpoGo()` del factory la descarta antes.
 *
 * HealthKit no ofrece un stream de pasos en tiempo real equivalente al
 * Pedometer. Se simula con polling cada 30 segundos: calcula el total del
 * día y emite la diferencia (delta) respecto al último valor conocido.
 */

import { Platform } from 'react-native';
import AppleHealthKit, {
  type HealthKitPermissions,
  type HealthInputOptions,
  type HealthValue,
  HealthPermission,
} from 'react-native-health';

import type { PermissionStatus, StepSource, Subscription, SourceKind } from './StepSource';

const POLLING_INTERVAL_MS = 30_000;

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [HealthPermission.StepCount],
    write: [],
  },
};

export class HealthKitStepSource implements StepSource {
  readonly kind: SourceKind = 'healthkit';

  private initialized = false;

  isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      if (Platform.OS !== 'ios') {
        resolve(false);
        return;
      }
      AppleHealthKit.isAvailable((_err: object, available: boolean) => {
        resolve(available);
      });
    });
  }

  requestPermission(): Promise<PermissionStatus> {
    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(PERMISSIONS, (error: string) => {
        if (error) {
          resolve('denied');
        } else {
          this.initialized = true;
          resolve('granted');
        }
      });
    });
  }

  getPermissionStatus(): Promise<PermissionStatus> {
    return Promise.resolve(this.initialized ? 'granted' : 'undetermined');
  }

  getStepsForRange(start: Date, end: Date): Promise<number> {
    if (!this.initialized) return Promise.resolve(0);

    return new Promise((resolve, reject) => {
      const options: HealthInputOptions = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        includeManuallyAdded: true,
      };
      AppleHealthKit.getStepCount(options, (err: string, result: HealthValue) => {
        if (err) {
          reject(new Error(err));
        } else {
          resolve(Math.round(result.value));
        }
      });
    });
  }

  watchSteps(callback: (newSteps: number) => void): Subscription {
    let lastCount = 0;
    let stopped = false;

    const poll = async (): Promise<void> => {
      if (stopped) return;
      try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const total = await this.getStepsForRange(startOfDay, now);
        const delta = total - lastCount;
        if (delta > 0) {
          lastCount = total;
          callback(delta);
        }
      } catch {
        // Ignorar errores de polling — el siguiente tick reintentará
      }
      if (!stopped) {
        setTimeout(() => { void poll(); }, POLLING_INTERVAL_MS);
      }
    };

    void poll();

    return { remove: () => { stopped = true; } };
  }
}
