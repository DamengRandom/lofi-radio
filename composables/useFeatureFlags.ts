export interface FeatureFlags {
  freeSearch: boolean
}

export function useFeatureFlags() {
  const config = useRuntimeConfig()
  const flags = (config.public.featureFlags ?? {}) as Partial<FeatureFlags>

  return {
    freeSearch: computed<boolean>(() => flags.freeSearch === true),
  }
}
