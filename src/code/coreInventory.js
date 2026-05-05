const PORTAL_LINK_KEY = "PORTAL_LINK_KEY";

export const CoreInventoryErrorCode = {
  EMPTY_INVENTORY: "empty_inventory",
  INVALID_INVENTORY: "invalid_inventory",
  NO_SUBSCRIPTION: "no_subscription",
  REQUEST_FAILED: "request_failed",
};

export class CoreInventoryError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.code = code;
    this.name = "CoreInventoryError";
    this.status = status;
  }
}

function postAjaxPromise(action, data) {
  return new Promise((resolve, reject) => {
    window.postAjax(
      action,
      data,
      (response) => resolve(response),
      (jqXHR) => {
        const status =
          jqXHR && typeof jqXHR.status == "number" ? jqXHR.status : 0;
        reject(
          new CoreInventoryError(
            CoreInventoryErrorCode.REQUEST_FAILED,
            `CORE request failed for ${action}`,
            status
          )
        );
      }
    );
  });
}

function createParsedKey(guid, count = 1, capsule = "") {
  if (!guid) return null;
  return {
    capsule: capsule || "",
    count,
    guid,
  };
}

function parsePortalKeyObject(obj, count = 1, capsule = "") {
  if (!obj || !obj.resource || !obj.portalCoupler) return [];
  if (obj.resource.resourceType !== PORTAL_LINK_KEY) return [];

  const parsed = createParsedKey(obj.portalCoupler.portalGuid, count, capsule);
  return parsed ? [parsed] : [];
}

function parseContainer(container) {
  const capsule = container?.moniker?.differentiator || "";
  const stackableItems = container?.container?.stackableItems;
  if (!Array.isArray(stackableItems)) return [];

  const keys = [];
  for (const stackableItem of stackableItems) {
    const itemKeys = parseInventoryEntry(stackableItem?.exampleGameEntity);
    const count = Array.isArray(stackableItem?.itemGuids)
      ? stackableItem.itemGuids.length
      : 0;

    for (const key of itemKeys) {
      keys.push({
        capsule,
        count: count || key.count,
        guid: key.guid,
      });
    }
  }
  return keys;
}

function parseInventoryEntry(entry) {
  if (!Array.isArray(entry) || entry.length < 3) return [];

  const obj = entry[2];
  if (!obj || typeof obj != "object") return [];

  if (obj.container) return parseContainer(obj);
  return parsePortalKeyObject(obj);
}

function collapseCapsules(names) {
  const uniqueNames = Array.from(new Set(names));
  if (uniqueNames.length == 0) return "";
  if (uniqueNames.length == 1) return uniqueNames[0];

  const normalized = uniqueNames.map((name) => (name === "" ? "Inv" : name));
  if (normalized.length > 8) return "*multi*";

  const size = Math.floor((16 + 1 - normalized.length) / normalized.length);
  return normalized.map((name) => name.slice(0, size)).join(",");
}

function aggregateInventory(entries) {
  const keys = new Map();
  for (const entry of entries) {
    const parsedEntries = parseInventoryEntry(entry);
    for (const parsed of parsedEntries) {
      if (!keys.has(parsed.guid)) {
        keys.set(parsed.guid, {
          capsules: new Set(),
          count: 0,
        });
      }
      const current = keys.get(parsed.guid);
      current.count += parsed.count;
      current.capsules.add(parsed.capsule || "");
    }
  }

  const aggregated = new Map();
  for (const [guid, entry] of keys) {
    aggregated.set(guid, {
      capsule: collapseCapsules(Array.from(entry.capsules)),
      count: entry.count,
    });
  }
  return aggregated;
}

export async function getCoreInventoryMap() {
  const subscription = await postAjaxPromise("getHasActiveSubscription", {});
  if (!subscription || subscription.result !== true) {
    throw new CoreInventoryError(
      CoreInventoryErrorCode.NO_SUBSCRIPTION,
      "CORE subscription is inactive"
    );
  }

  const inventory = await postAjaxPromise("getInventory", {
    lastQueryTimestamp: 0,
  });
  if (!inventory || !Array.isArray(inventory.result)) {
    throw new CoreInventoryError(
      CoreInventoryErrorCode.INVALID_INVENTORY,
      "CORE inventory payload was invalid"
    );
  }
  if (inventory.result.length == 0) {
    throw new CoreInventoryError(
      CoreInventoryErrorCode.EMPTY_INVENTORY,
      "CORE inventory was empty"
    );
  }

  return aggregateInventory(inventory.result);
}
