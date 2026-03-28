export type AndroidBackAction =
  | "close-sheet"
  | "history-back"
  | "minimize-app";

export function resolveAndroidBackAction(input: {
  hasOpenSheet: boolean;
  canGoBack: boolean;
}): AndroidBackAction {
  if (input.hasOpenSheet) {
    return "close-sheet";
  }

  if (input.canGoBack) {
    return "history-back";
  }

  return "minimize-app";
}
