import type { Decision, Role, Session } from "../types";

export const STORAGE = {
  session: "anteraja.session",
  decisions: "anteraja.decisions",
  radii: "anteraja.radii",
  completed: "anteraja.completed",
  relation: "anteraja.relation",
} as const;

function available(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function read<T>(key: string, fallback: T): T {
  if (!available()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T): void {
  if (!available()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function getSession(): Session | null {
  return read<Session | null>(STORAGE.session, null);
}

export function setSession(session: Session): void {
  write(STORAGE.session, session);
}

export function createSession(role: Role, name: string): Session {
  const session: Session = { role, name, at: Date.now() };
  setSession(session);
  return session;
}

export function getDecisions(): Record<string, Decision> {
  return read<Record<string, Decision>>(STORAGE.decisions, {});
}

export function setDecision(
  tracking: string,
  decision: Decision["decision"],
  note: string,
): void {
  const all = getDecisions();
  all[tracking] = { decision, note: note || "", at: Date.now() };
  write(STORAGE.decisions, all);
}

export function getCompleted(): string[] {
  return read<string[]>(STORAGE.completed, []);
}

export function markCompleted(tracking: string): string[] {
  const list = getCompleted();
  if (!list.includes(tracking)) {
    list.push(tracking);
    write(STORAGE.completed, list);
  }
  return list;
}

export function getRelation(): string | null {
  return read<string | null>(STORAGE.relation, null);
}

export function setRelation(relation: string): void {
  write(STORAGE.relation, relation);
}

export function getRadii(): Record<string, number> {
  return read<Record<string, number>>(STORAGE.radii, {});
}

export function setRadii(radii: Record<string, number>): void {
  write(STORAGE.radii, radii);
}
