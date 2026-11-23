import type { Progress, Resume } from '../src/progress';
export const LEVEL_IDS: string[];
export function validResume(value: unknown): Resume | null;
export function isProgress(value: unknown): boolean;
export function normalizeProgress(value: unknown): Progress;
export function mergeProgress(left: unknown, right: unknown): Progress;
