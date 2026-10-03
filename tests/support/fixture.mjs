export const fixtureDatabase = "fixture";
export const fixtureContainer = "items";
export const fixtureDocument = Object.freeze({ id: "1", tenant: "a", nested: { value: null }, tags: ["x"] });
export const fixtureIdentity = Object.freeze({ id: "1", partition_key: [{ type: "string", value: "a" }] });
export const fixturePartitionPaths = ["/tenant"];
export const fixtureHierarchicalPartitionPaths = ["/tenant", "/region"];

export async function createFixture(_test, _options = {}) {
  throw Object.assign(new Error("CAPABILITY_UNAVAILABLE: the SDK boundary fixture awaits the real driver handlers."), { code: "CAPABILITY_UNAVAILABLE" });
}
