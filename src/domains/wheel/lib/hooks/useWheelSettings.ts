import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { WheelSettingsParsedRecord } from '@shared/lib/database/db';

import { WheelSettingsSavedRecord, wheelSettingsStore } from '../indexedDbSettingsStore';

export const WHEEL_SETTINGS_QUERY_KEY = ['wheelSettings'];

export function useWheelSettings() {
  return useQuery<WheelSettingsParsedRecord | null>({
    queryKey: WHEEL_SETTINGS_QUERY_KEY,
    queryFn: () => wheelSettingsStore.get(),
    staleTime: Infinity,
  });
}

export function useSaveWheelSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: WheelSettingsSavedRecord) => {
      await wheelSettingsStore.save(settings);
    },
    onSuccess: (_, settings) => {
      queryClient.setQueryData(WHEEL_SETTINGS_QUERY_KEY, settings);
    },
  });
}
