// Logging using the latest from https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Log.jsm
// Assuming this is 68+ only.
const Cu = Components.utils;
Cu.import("resource://gre/modules/Log.jsm");
let tblog = Log.repository.getLogger("tbsortfolders.preferences");
tblog.level = Log.Level.Debug;
tblog.addAppender(new Log.ConsoleAppender(new Log.BasicFormatter()));
tblog.addAppender(new Log.DumpAppender(new Log.BasicFormatter()));

var Services = globalThis.Services || ChromeUtils.import(
  "resource://gre/modules/Services.jsm"
).Services;

const tbsf_prefs = Services.prefs.getBranch("extensions.tbsortfolders@xulforum.org.");

document.addEventListener('DOMContentLoaded', function() {
  // Load preferences
  try {
    document.getElementById('hideFolderIcons').checked = tbsf_prefs.getBoolPref("hide_folder_icons");
  } catch (e) {
    document.getElementById('hideFolderIcons').checked = false;
  }
  
  try {
    document.getElementById('applyToFavorites').checked = tbsf_prefs.getBoolPref("apply_to_favorites");
  } catch (e) {
    document.getElementById('applyToFavorites').checked = false;
  }
  
  try {
    document.getElementById('startupFolderMethod').value = tbsf_prefs.getIntPref("startup_folder_method");
  } catch (e) {
    document.getElementById('startupFolderMethod').value = 0;
  }

  // Add event listeners
  document.getElementById('hideFolderIcons').addEventListener('change', on_hide_folder_icons_changed);
  document.getElementById('applyToFavorites').addEventListener('change', on_apply_to_favorites_changed);
  document.getElementById('startupFolderMethod').addEventListener('change', on_startup_folder_method_changed);
  document.getElementById('openFullUI').addEventListener('click', on_open_full_ui);
  document.getElementById('refreshButton').addEventListener('click', on_refresh);
});

function on_hide_folder_icons_changed() {
  let hideIcons = document.getElementById('hideFolderIcons').checked;
  tbsf_prefs.setBoolPref("hide_folder_icons", hideIcons);
}

function on_apply_to_favorites_changed() {
  let applyToFavorites = document.getElementById('applyToFavorites').checked;
  tbsf_prefs.setBoolPref("apply_to_favorites", applyToFavorites);
}

function on_startup_folder_method_changed() {
  let method = document.getElementById('startupFolderMethod').value;
  tbsf_prefs.setIntPref("startup_folder_method", parseInt(method));
}

function on_open_full_ui() {
  // Open the full UI in a new window
  Services.wm.getMostRecentWindow("mail:3pane").openDialog(
    "chrome://tbsortfolders/content/ui.html",
    "",
    "chrome,dialog,resizable,centerscreen"
  );
}

function on_refresh() {
  // Refresh the folder tree in all Thunderbird windows
  for (let win of Services.wm.getEnumerator("mail:3pane")) {
    win.gFolderTreeView._rebuild();
  }
}