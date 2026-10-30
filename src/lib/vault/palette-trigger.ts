export const OPEN_ASSET_COMMAND_EVENT = "open-asset-command-palette";

export function triggerAssetCommandPalette() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_ASSET_COMMAND_EVENT));
  }
}
