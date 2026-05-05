import { WButton } from "../leafletClasses";
import CoreKeySyncDialog from "../dialogs/coreKeySyncDialog";
import { WasabeeMe } from "../model";
import wX from "../wX";

const CoreKeySyncButton = WButton.extend({
  statics: {
    TYPE: "coreKeySyncButton",
  },

  initialize: function (container) {
    this.type = CoreKeySyncButton.TYPE;
    this.title = wX("toolbar.core_key_sync.title");

    this.button = this._createButton({
      container,
      className: "wasabee-toolbar-core-key-sync",
      context: this,
      title: this.title,
      callback: () => {
        const dialog = new CoreKeySyncDialog();
        dialog.enable();
      },
    });

    window.map.on("wasabee:ui:skin wasabee:ui:lang", () => {
      this.button.title = wX("toolbar.core_key_sync.title");
    });

    this.update();
  },

  update: function () {
    if (WasabeeMe.isLoggedIn()) this.button.style.display = "block";
    else this.button.style.display = "none";
  },
});

export default CoreKeySyncButton;
