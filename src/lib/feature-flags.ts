type FeatureFlagEnv = Partial<Record<string, string | undefined>>;

const visibleDeveloperSettingsEnvironments = new Set([
  "dev",
  "development",
  "preview",
  "stage",
  "staging",
  "test",
  "testing",
]);

function parseBooleanFlag(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

function normalizeEnvironment(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function shouldShowDeveloperSettings(env: FeatureFlagEnv = process.env) {
  const explicitFlag = parseBooleanFlag(
    env.NEXT_PUBLIC_SHOW_DEVELOPER_SETTINGS ??
      env.SHOW_DEVELOPER_SETTINGS ??
      env.NEXT_PUBLIC_SHOW_SAVED_WORDS_SYNC ??
      env.SHOW_SAVED_WORDS_SYNC,
  );

  if (explicitFlag !== null) {
    return explicitFlag;
  }

  if (env.NODE_ENV !== "production") {
    return true;
  }

  const namedEnvironment = normalizeEnvironment(
    env.NEXT_PUBLIC_APP_ENV ??
      env.APP_ENV ??
      env.NEXT_PUBLIC_DEPLOY_ENV ??
      env.DEPLOY_ENV ??
      env.ENVIRONMENT ??
      env.CLOUDFLARE_ENV ??
      env.VERCEL_ENV,
  );

  if (visibleDeveloperSettingsEnvironments.has(namedEnvironment)) {
    return true;
  }

  const cloudflarePagesBranch = normalizeEnvironment(env.CF_PAGES_BRANCH);

  return Boolean(cloudflarePagesBranch && cloudflarePagesBranch !== "main");
}
