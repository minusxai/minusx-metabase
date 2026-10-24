import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";

import { memoize } from "./cache";
import { resetCache } from "./indexedDb";

let counter = 0
const dummyFunction = async () => {
    counter += 1
    return counter
}
describe("cache", () => {
  it("should cache the result of a function", async () => {
    const memoizedFn = memoize(dummyFunction, 1);
    await resetCache()
    counter = 0
    const result = await memoizedFn();
    expect(result).toBe(1);
    const result2 = await memoizedFn();
    expect(result2).toBe(1);
    await new Promise(resolve => setTimeout(resolve, 1100));
    const result3 = await memoizedFn();
    expect(result3).toBe(2);
  });
  it("should not return cached result if .refresh() is called", async () => {
    const memoizedFn = memoize(dummyFunction, 1);
    counter = 0
    await resetCache()
    const result = await memoizedFn();
    expect(result).toBe(1);
    const result2 = await memoizedFn.refresh()
    expect(result2).toBe(2);
    const result3 = await memoizedFn.refresh();
    expect(result3).toBe(3);
  });
});