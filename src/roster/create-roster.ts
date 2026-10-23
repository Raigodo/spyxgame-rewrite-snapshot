// STUB (step A). Replaced in step F; exists so index.ts and fakes.ts compile.
import type { Scope } from "@/kernel";
import type { Roster, RosterDeps } from "./model";

export function createRoster(deps: RosterDeps, scope: Scope): Roster {
  void deps;
  void scope;
  throw new Error("[roster] createRoster is not implemented yet (step F).");
}
