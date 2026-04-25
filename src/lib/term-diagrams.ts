import rawTermDiagrams from "./term-diagrams.json";

export type TermDiagramKind = keyof typeof rawTermDiagrams;

export type TermDiagramStep = {
  label: string;
  connectorAfter?: string;
};

export type TermDiagramDefinition = {
  title: string;
  steps: readonly TermDiagramStep[];
};

export const termDiagrams = rawTermDiagrams as Record<
  TermDiagramKind,
  TermDiagramDefinition
>;

export const termDiagramKeys = Object.keys(rawTermDiagrams) as TermDiagramKind[];
