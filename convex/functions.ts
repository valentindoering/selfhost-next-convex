/* eslint-disable no-restricted-imports */
import { mutation as rawMutation, internalMutation as rawInternalMutation } from "./_generated/server";
/* eslint-enable no-restricted-imports */
import { Triggers } from "convex-helpers/server/triggers";
import { customCtx, customMutation } from "convex-helpers/server/customFunctions";
import type { DataModel } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Initialize Triggers helper with our DataModel
const triggers = new Triggers<DataModel>();

// Register trigger for todos table to schedule research when needed
triggers.register("todos", async (ctx, change) => {
  console.log("[TRIGGER todos] change received", {
    id: change.id,
    hasNew: Boolean(change.newDoc),
    hasOld: Boolean(change.oldDoc),
  });
  const newDoc = change.newDoc;
  const oldDoc = change.oldDoc;

  if (!newDoc) return; // Only care about inserts/updates

  const needsResearchNow = Boolean(newDoc.needsResearch);
  const neededResearchBefore = Boolean(oldDoc?.needsResearch);
  const alreadyScheduled = Boolean(newDoc.researchScheduled);

  // Schedule research when a todo is created/updated with needsResearch=true
  // Guard against double-scheduling with researchScheduled flag
  if (needsResearchNow && !alreadyScheduled && (!oldDoc || !neededResearchBefore)) {
    console.log("[TRIGGER todos] scheduling research", {
      id: change.id,
      text: newDoc.text,
      needsResearchNow,
      neededResearchBefore,
      alreadyScheduled,
    });
    // Mark as scheduled to prevent recursion / duplicate scheduling
    await ctx.db.patch(change.id, { researchScheduled: true });
    console.log("[TRIGGER todos] marked researchScheduled=true", { id: change.id });

    // Kick off background research via scheduler (runs outside of the mutation)
    try {
      await ctx.scheduler.runAfter(0, api.research.performResearch, {
        todoId: change.id,
        query: newDoc.text,
      });
      console.log("[TRIGGER todos] scheduled performResearch action", { id: change.id });
    } catch (err) {
      console.error("[TRIGGER todos] failed to schedule performResearch", {
        id: change.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    console.log("[TRIGGER todos] no scheduling needed", {
      id: change.id,
      needsResearchNow,
      neededResearchBefore,
      alreadyScheduled,
    });
  }
});

// Create wrapped mutations that run triggers
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(rawInternalMutation, customCtx(triggers.wrapDB));


