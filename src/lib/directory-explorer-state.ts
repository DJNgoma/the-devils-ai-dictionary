import {
  difficultyOptions,
  technicalDepthOptions,
} from "@/lib/content-catalog.mjs";

export type DirectoryExplorerMode = "dictionary" | "search";

export type DirectoryExplorerState = {
  query: string;
  category: string;
  difficulty: string;
  vendor: string;
  depth: string;
  letter: string;
};

type SearchParamValue = string | string[] | undefined;
type SearchParamReader = {
  getAll: (key: string) => string[];
};

type SearchParamInput =
  | URLSearchParams
  | SearchParamReader
  | Record<string, SearchParamValue>;

const vendorOptions = new Set(["all", "vendor", "non-vendor"]);
const difficultyOptionSet = new Set(difficultyOptions);
const technicalDepthOptionSet = new Set(technicalDepthOptions);
const letterPattern = /^[A-Z]$/u;

function readSingleValue(input: SearchParamInput, key: string) {
  if (input instanceof URLSearchParams) {
    const values = input.getAll(key);
    return values.length === 1 ? values[0] : undefined;
  }

  if ("getAll" in input && typeof input.getAll === "function") {
    const values = input.getAll(key);
    return values.length === 1 ? values[0] : undefined;
  }

  const value = (input as Record<string, SearchParamValue>)[key];
  return typeof value === "string" ? value : undefined;
}

export function normalizeDirectoryExplorerState(
  input: SearchParamInput,
  {
    categorySlugs,
    mode,
  }: {
    categorySlugs: string[];
    mode: DirectoryExplorerMode;
  },
): DirectoryExplorerState {
  const allowedCategories = new Set(categorySlugs);
  const query = readSingleValue(input, "q")?.trim() ?? "";
  const category = readSingleValue(input, "category");
  const difficulty = readSingleValue(input, "difficulty");
  const vendor = readSingleValue(input, "vendor");
  const depth = readSingleValue(input, "depth");
  const letter = readSingleValue(input, "letter")?.toUpperCase();

  return {
    query,
    category:
      category && allowedCategories.has(category) ? category : "all",
    difficulty:
      difficulty && difficultyOptionSet.has(difficulty as typeof difficultyOptions[number])
        ? difficulty
        : "all",
    vendor: vendor && vendorOptions.has(vendor) ? vendor : "all",
    depth:
      depth && technicalDepthOptionSet.has(depth as typeof technicalDepthOptions[number])
        ? depth
        : "all",
    letter:
      mode === "dictionary" && letter && letterPattern.test(letter)
        ? letter
        : "all",
  };
}

export function areDirectoryExplorerStatesEqual(
  left: DirectoryExplorerState,
  right: DirectoryExplorerState,
) {
  return (
    left.query === right.query &&
    left.category === right.category &&
    left.difficulty === right.difficulty &&
    left.vendor === right.vendor &&
    left.depth === right.depth &&
    left.letter === right.letter
  );
}

export function serializeDirectoryExplorerState(
  state: DirectoryExplorerState,
  mode: DirectoryExplorerMode,
) {
  const params = new URLSearchParams();

  if (state.query) {
    params.set("q", state.query);
  }

  if (state.category !== "all") {
    params.set("category", state.category);
  }

  if (state.difficulty !== "all") {
    params.set("difficulty", state.difficulty);
  }

  if (state.vendor !== "all") {
    params.set("vendor", state.vendor);
  }

  if (state.depth !== "all") {
    params.set("depth", state.depth);
  }

  if (mode === "dictionary" && state.letter !== "all") {
    params.set("letter", state.letter);
  }

  return params.toString();
}
