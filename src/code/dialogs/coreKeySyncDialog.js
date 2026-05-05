import { WDialog } from "../leafletClasses";
import { CoreInventoryErrorCode, getCoreInventoryMap } from "../coreInventory";
import { displayError } from "../error";
import { WasabeeMarker, WasabeeMe } from "../model";
import { getSelectedOperation } from "../selectedOp";
import { opKeyPromise } from "../server";
import statics from "../static";
import wX from "../wX";

function normalizeCount(value) {
  if (typeof value == "number") return value;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildTargetPortalIDs(operation) {
  const targetIDs = new Set();

  for (const link of operation.links) {
    if (link.toPortalId) targetIDs.add(link.toPortalId);
  }

  for (const marker of operation.markers) {
    if (
      marker.type == WasabeeMarker.constants.MARKER_TYPE_KEY &&
      marker.portalId
    )
      targetIDs.add(marker.portalId);
  }

  return Array.from(targetIDs);
}

function getPortalName(operation, portalID) {
  const portal = operation.getPortal(portalID);
  if (portal && portal.name) return portal.name;
  return portalID;
}

function getCurrentAgentKeyState(operation, portalID, gid) {
  const existing = operation.keysonhand.find((entry) => {
    return entry.portalId == portalID && entry.gid == gid;
  });

  if (!existing) {
    return {
      capsule: "",
      count: 0,
    };
  }

  return {
    capsule: existing.capsule || "",
    count: normalizeCount(existing.onhand),
  };
}

function buildFailureMessage(error) {
  if (error && typeof error.toString == "function") return error.toString();
  return "Unknown error";
}

function buildSummaryContent(result) {
  const container = L.DomUtil.create("div", "core-key-sync-summary");
  L.DomUtil.create("div", null, container).textContent = wX(
    "dialog.core_key_sync.summary_title"
  );
  L.DomUtil.create("div", null, container).textContent = wX(
    "dialog.core_key_sync.summary_portals",
    { count: result.targets }
  );
  L.DomUtil.create("div", null, container).textContent = `${wX(
    "dialog.core_key_sync.updated"
  )}: ${result.updated}`;
  L.DomUtil.create("div", null, container).textContent = `${wX(
    "dialog.core_key_sync.cleared"
  )}: ${result.cleared}`;
  L.DomUtil.create("div", null, container).textContent = `${wX(
    "dialog.core_key_sync.skipped"
  )}: ${result.skipped}`;
  L.DomUtil.create("div", null, container).textContent = `${wX(
    "dialog.core_key_sync.failed"
  )}: ${result.failed}`;

  if (result.failedPortals.length > 0) {
    const failed = result.failedPortals.join(", ");
    L.DomUtil.create("div", null, container).textContent = wX(
      "dialog.core_key_sync.failed_portals",
      { names: failed }
    );
  }

  return container;
}

function buildCoreInventoryErrorMessage(error) {
  if (error?.code == CoreInventoryErrorCode.NO_SUBSCRIPTION) {
    return wX("dialog.core_key_sync.no_subscription");
  }
  if (error?.code == CoreInventoryErrorCode.EMPTY_INVENTORY) {
    return wX("dialog.core_key_sync.empty_inventory");
  }
  if (error?.code == CoreInventoryErrorCode.INVALID_INVENTORY) {
    return wX("dialog.core_key_sync.invalid_inventory");
  }
  if (error?.code == CoreInventoryErrorCode.REQUEST_FAILED) {
    return wX("dialog.core_key_sync.request_failed", {
      status: error.status || 0,
    });
  }
  return buildFailureMessage(error);
}

async function syncCoreKeysForOperation(operation, gid) {
  const portalIDs = buildTargetPortalIDs(operation);
  const result = {
    cleared: 0,
    failed: 0,
    failedPortals: [],
    skipped: 0,
    targets: portalIDs.length,
    updated: 0,
  };

  if (portalIDs.length == 0) return result;

  const coreInventory = await getCoreInventoryMap();
  const successfulWrites = [];

  for (const portalID of portalIDs) {
    const target = coreInventory.get(portalID) || { capsule: "", count: 0 };
    const fromCore = coreInventory.has(portalID);
    const current = getCurrentAgentKeyState(operation, portalID, gid);

    if (current.count === target.count && current.capsule === target.capsule) {
      result.skipped++;
      continue;
    }

    try {
      await opKeyPromise(operation.ID, portalID, target.count, target.capsule);
      successfulWrites.push({
        capsule: target.capsule,
        count: target.count,
        portalID,
      });
      if (fromCore) result.updated++;
      else result.cleared++;
    } catch (error) {
      result.failed++;
      result.failedPortals.push(getPortalName(operation, portalID));
      console.error("CORE key sync write failed:", buildFailureMessage(error));
    }
  }

  if (successfulWrites.length == 0) return result;

  const previousLocalChanged = operation.localchanged;
  operation.startBatchMode();
  for (const update of successfulWrites) {
    operation.keyOnHand(update.portalID, gid, update.count, update.capsule);
  }
  operation.endBatchMode();

  if (operation.localchanged !== previousLocalChanged) {
    operation.localchanged = previousLocalChanged;
    operation.update(false);
  }

  return result;
}

const CoreKeySyncDialog = WDialog.extend({
  statics: {
    TYPE: "coreKeySyncDialog",
  },

  needWritePermission: true,

  addHooks: function () {
    WDialog.prototype.addHooks.call(this);
    window.map.on("wasabee:login wasabee:logout", this.update, this);
    this._displayDialog();
  },

  removeHooks: function () {
    WDialog.prototype.removeHooks.call(this);
    window.map.off("wasabee:login wasabee:logout", this.update, this);
  },

  _displayDialog: function () {
    const content = L.DomUtil.create("div", "content");
    this._description = L.DomUtil.create("div", null, content);
    this._scope = L.DomUtil.create("div", null, content);
    this._summary = L.DomUtil.create("div", null, content);

    const buttons = {};
    buttons[wX("dialog.core_key_sync.sync")] = () => {
      this._syncFromCore();
    };
    buttons[wX("CLOSE")] = () => {
      this.closeDialog();
    };

    this.createDialog({
      title: this._getTitle(),
      html: content,
      width: "auto",
      dialogClass: "core-key-sync",
      buttons,
      id: statics.dialogNames.coreKeySync,
    });
    this.update();
  },

  _getTitle: function () {
    const operation = getSelectedOperation();
    const opName = operation ? operation.name : "";
    return wX("dialog.core_key_sync.title", { opName });
  },

  update: function () {
    const operation = getSelectedOperation();
    if (this._description) {
      this._description.textContent = wX("dialog.core_key_sync.description");
    }
    if (this.setTitle) {
      this.setTitle(this._getTitle());
    }
    if (!this._scope) return;
    if (!operation) {
      this._scope.textContent = "";
      return;
    }

    const portalIDs = buildTargetPortalIDs(operation);
    let scopeText = wX("dialog.core_key_sync.scope", {
      count: portalIDs.length,
    });
    if (!operation.isOnCurrentServer()) {
      scopeText += ` ${wX("dialog.core_key_sync.require_current_server")}`;
    }
    if (portalIDs.length == 0) {
      scopeText += ` ${wX("dialog.core_key_sync.no_targets")}`;
    }
    this._scope.textContent = scopeText;
  },

  _setSummaryText: function (message) {
    this._summary.textContent = message;
  },

  _setSummaryContent: function (content) {
    this._summary.textContent = "";
    this._summary.appendChild(content);
  },

  _syncFromCore: async function () {
    if (this._syncing) return;

    const me = WasabeeMe.localGet();
    const operation = getSelectedOperation();
    if (!me) {
      this._setSummaryText(wX("NOT LOGGED IN SHORT"));
      return;
    }
    if (!operation || !operation.isOnCurrentServer()) {
      this._setSummaryText(wX("dialog.core_key_sync.require_current_server"));
      return;
    }

    const targets = buildTargetPortalIDs(operation);
    if (targets.length == 0) {
      this._setSummaryText(wX("dialog.core_key_sync.no_targets"));
      return;
    }

    this._syncing = true;
    this._setSummaryText(wX("dialog.core_key_sync.syncing"));

    try {
      const result = await syncCoreKeysForOperation(operation, me.id);
      this._setSummaryContent(buildSummaryContent(result));
    } catch (error) {
      const message = buildCoreInventoryErrorMessage(error);
      this._setSummaryText(message);
      if (error?.code == CoreInventoryErrorCode.REQUEST_FAILED) {
        displayError(message);
      }
    } finally {
      this._syncing = false;
    }
  },
});

export default CoreKeySyncDialog;
