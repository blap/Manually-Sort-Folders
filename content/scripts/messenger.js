// Import any needed modules.
var Services = globalThis.Services || ChromeUtils.import(
  "resource://gre/modules/Services.jsm"
).Services;
const g_ThunderbirdMajorVersion = Services.appinfo.version.split(".")[0];

// Load an additional JavaScript file.
Services.scriptloader.loadSubScript("chrome://tbsortfolders/content/folderPane.js", window, "UTF-8");

// Load drag and drop functionality
Services.scriptloader.loadSubScript("chrome://tbsortfolders/content/dragdrop.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
  // For modern Thunderbird, we'll add a menu item using the menus API
  // This is handled in background.js now, so we don't need to do anything here
  // The XUL injection approach is deprecated
  
  // Enable drag and drop functionality
  if (typeof enableFolderDragAndDrop === "function") {
    enableFolderDragAndDrop(window);
  }
}

function onUnload(deactivatedWhileWindowOpen) {
  // Cleanup if needed
}