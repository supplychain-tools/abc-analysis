import type { MakeOrBuyDictionary } from '@/lib/i18n';
import {
  SettingsProvider,
  useSettings as useSharedSettings,
  type Settings as SharedSettings,
} from '@sct/shared/ui/settings';

/**
 * This tool's binding of the shared settings context.
 *
 * The shared context is generic over the dictionary precisely so another tool
 * can bind it to strings the first two have never heard of. This is that third
 * binding, and it is the whole of what the boundary costs.
 */
export type MakeOrBuySettings = SharedSettings<MakeOrBuyDictionary>;
export { SettingsProvider };

export function useSettings(): MakeOrBuySettings {
  return useSharedSettings<MakeOrBuyDictionary>();
}
