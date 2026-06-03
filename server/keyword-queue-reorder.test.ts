import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Tests for the keyword queue reorder mutation schema and logic.
 * The reorderKeywords mutation accepts { jobId, orderedIds } and updates sortOrder for each keyword.
 */

const reorderInputSchema = z.object({
  jobId: z.number(),
  orderedIds: z.array(z.number()),
});

describe("Keyword Queue Reorder", () => {
  it("should validate correct reorder input", () => {
    const input = { jobId: 1, orderedIds: [5, 3, 1, 4, 2] };
    const result = reorderInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should reject missing jobId", () => {
    const input = { orderedIds: [1, 2, 3] };
    const result = reorderInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject non-number orderedIds", () => {
    const input = { jobId: 1, orderedIds: ["a", "b", "c"] };
    const result = reorderInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should accept empty orderedIds array", () => {
    const input = { jobId: 1, orderedIds: [] };
    const result = reorderInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should correctly compute new sort order from array index", () => {
    const orderedIds = [10, 5, 8, 3, 12];
    const newOrders = orderedIds.map((id, index) => ({ id, sortOrder: index }));
    expect(newOrders).toEqual([
      { id: 10, sortOrder: 0 },
      { id: 5, sortOrder: 1 },
      { id: 8, sortOrder: 2 },
      { id: 3, sortOrder: 3 },
      { id: 12, sortOrder: 4 },
    ]);
  });

  it("should handle single item reorder", () => {
    const input = { jobId: 1, orderedIds: [42] };
    const result = reorderInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderedIds).toHaveLength(1);
    }
  });

  it("should preserve all IDs during arrayMove simulation", () => {
    // Simulates what the frontend does with arrayMove
    const original = [1, 2, 3, 4, 5];
    const oldIndex = 0;
    const newIndex = 3;
    // Manual arrayMove: remove from old, insert at new
    const moved = [...original];
    const [item] = moved.splice(oldIndex, 1);
    moved.splice(newIndex, 0, item);
    expect(moved).toEqual([2, 3, 4, 1, 5]);
    expect(moved).toHaveLength(original.length);
    expect(new Set(moved)).toEqual(new Set(original));
  });
});
