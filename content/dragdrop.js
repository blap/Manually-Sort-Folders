// Drag and drop functionality for folder sorting in the real folder pane

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/MailUtils.jsm");

// Logging
const Cu = Components.utils;
Cu.import("resource://gre/modules/Log.jsm");
let tblog = Log.repository.getLogger("tbsortfolders.dragdrop");
tblog.level = Log.Level.Debug;
tblog.addAppender(new Log.ConsoleAppender(new Log.BasicFormatter()));
tblog.addAppender(new Log.DumpAppender(new Log.BasicFormatter()));

const tbsf_prefs = Services.prefs.getBranch("extensions.tbsortfolders@xulforum.org.");

// Enable drag and drop functionality when the window loads
function enableFolderDragAndDrop(window) {
  tblog.debug("Enabling drag and drop functionality");
  
  if (!window || !window.gFolderTreeView) {
    tblog.debug("Window or folder tree view not available");
    return;
  }
  
  // Get the folder tree element
  let folderTree = window.document.getElementById("folderTree");
  if (!folderTree) {
    tblog.debug("Folder tree element not found");
    return;
  }
  
  tblog.debug("Adding drag and drop event listeners");
  
  // Add drag and drop event listeners
  folderTree.addEventListener("dragstart", function(event) {
    handleDragStart(event, window);
  }, false);
  
  folderTree.addEventListener("dragover", handleDragOver, false);
  folderTree.addEventListener("drop", function(event) {
    handleDrop(event, window);
  }, false);
  folderTree.addEventListener("dragend", handleDragEnd, false);
}

function handleDragStart(event, window) {
  tblog.debug("Drag start event");
  
  // Only allow dragging of folder tree rows
  let row = event.target.closest(".tree-row");
  if (!row) {
    return;
  }
  
  // Get the folder associated with this row
  let folder = window.gFolderTreeView.getFolderForViewIndex(row.rowIndex);
  if (!folder) {
    return;
  }
  
  // Store folder URI in drag data
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", folder.URI);
  
  // Add visual feedback
  row.style.opacity = "0.75";
  
  // Store the dragged row index
  row.setAttribute("data-dragged", "true");
}

function handleDragOver(event) {
  // Prevent default to allow drop
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  
  // Add visual feedback to drop target
  let row = event.target.closest(".tree-row");
  if (row) {
    row.style.backgroundColor = "#e0e0e0";
  }
}

function handleDrop(event, window) {
  tblog.debug("Drop event");
  
  // Prevent default action
  event.preventDefault();
  
  // Remove visual feedback
  let allRows = window.document.querySelectorAll(".tree-row");
  allRows.forEach(row => {
    row.style.backgroundColor = "";
    row.style.opacity = "";
  });
  
  // Get the dragged folder URI
  let draggedFolderURI = event.dataTransfer.getData("text/plain");
  if (!draggedFolderURI) {
    tblog.debug("No dragged folder URI found");
    return;
  }
  
  // Get the dragged folder
  let draggedFolder = MailUtils.getExistingFolder(draggedFolderURI);
  if (!draggedFolder) {
    tblog.debug("Dragged folder not found");
    return;
  }
  
  // Get the drop target row
  let targetRow = event.target.closest(".tree-row");
  if (!targetRow) {
    tblog.debug("Drop target is not a folder row");
    return;
  }
  
  // Get the target folder
  let targetFolder = window.gFolderTreeView.getFolderForViewIndex(targetRow.rowIndex);
  if (!targetFolder) {
    tblog.debug("Target folder not found");
    return;
  }
  
  // Don't drop on the same folder
  if (draggedFolder.URI === targetFolder.URI) {
    tblog.debug("Cannot drop folder on itself");
    return;
  }
  
  // Check if both folders belong to the same account
  let draggedAccount = getAccountForFolder(draggedFolder);
  let targetAccount = getAccountForFolder(targetFolder);
  
  if (draggedAccount !== targetAccount) {
    tblog.debug("Cannot move folders between different accounts");
    return;
  }
  
  tblog.debug("Moving folder " + draggedFolder.URI + " to position of " + targetFolder.URI);
  
  // Reorder the folders in our data structure
  reorderFolders(draggedFolder, targetFolder, window);
}

function handleDragEnd(event) {
  tblog.debug("Drag end event");
  
  // Remove visual feedback
  let allRows = event.target.ownerDocument.querySelectorAll(".tree-row");
  allRows.forEach(row => {
    row.style.backgroundColor = "";
    row.style.opacity = "";
    row.removeAttribute("data-dragged");
  });
}

function getAccountForFolder(folder) {
  // Walk up the folder hierarchy to find the root folder (account)
  let rootFolder = folder;
  while (rootFolder.parent) {
    rootFolder = rootFolder.parent;
  }
  return rootFolder.prettyName;
}

function reorderFolders(draggedFolder, targetFolder, window) {
  tblog.debug("Reordering folders");
  
  try {
    // Get the current sorting data
    let tbsf_data = {};
    try {
      let json = tbsf_prefs.getStringPref("tbsf_data");
      tbsf_data = JSON.parse(json);
    } catch (e) {
      tblog.debug("Error parsing tbsf_data: " + e);
    }
    
    // Get account name from the folder
    let accountName = getAccountForFolder(draggedFolder);
    tblog.debug("Account name: " + accountName);
    
    // Ensure the account exists in our data structure with custom sort method
    if (!tbsf_data[accountName]) {
      tbsf_data[accountName] = [2, {}]; // Custom sort method
    } else if (tbsf_data[accountName][0] !== 2) {
      // Switch to custom sort method if not already using it
      tbsf_data[accountName][0] = 2;
      tbsf_data[accountName][1] = {};
    } else if (!tbsf_data[accountName][1]) {
      tbsf_data[accountName][1] = {};
    }
    
    // Get the folder data for this account
    let folderData = tbsf_data[accountName][1];
    
    // Get all folders in this account to rebuild the sort order
    let accountRoot = draggedFolder.server.rootFolder;
    let allFolders = getAllSubFolders(accountRoot);
    
    // Assign sort numbers to all folders if not already present
    let maxSortNumber = 0;
    for (let folder of allFolders) {
      if (folderData[folder.URI] && folderData[folder.URI] > maxSortNumber) {
        maxSortNumber = folderData[folder.URI];
      }
    }
    
    // Assign sort numbers to any folders that don't have them
    for (let folder of allFolders) {
      if (!folderData[folder.URI]) {
        folderData[folder.URI] = ++maxSortNumber;
      }
    }
    
    // Now adjust the sort numbers to move the dragged folder
    let draggedSortNumber = folderData[draggedFolder.URI];
    let targetSortNumber = folderData[targetFolder.URI];
    
    tblog.debug("Dragged sort number: " + draggedSortNumber);
    tblog.debug("Target sort number: " + targetSortNumber);
    
    if (draggedSortNumber < targetSortNumber) {
      // Moving down - shift folders up
      for (let folderURI in folderData) {
        let sortNumber = folderData[folderURI];
        if (sortNumber > draggedSortNumber && sortNumber <= targetSortNumber) {
          folderData[folderURI] = sortNumber - 1;
        }
      }
      // Place dragged folder at target position
      folderData[draggedFolder.URI] = targetSortNumber;
    } else if (draggedSortNumber > targetSortNumber) {
      // Moving up - shift folders down
      for (let folderURI in folderData) {
        let sortNumber = folderData[folderURI];
        if (sortNumber >= targetSortNumber && sortNumber < draggedSortNumber) {
          folderData[folderURI] = sortNumber + 1;
        }
      }
      // Place dragged folder at target position
      folderData[draggedFolder.URI] = targetSortNumber;
    }
    
    // Save the updated data
    tbsf_prefs.setStringPref("tbsf_data", JSON.stringify(tbsf_data));
    
    // Refresh the folder tree
    if (window.gFolderTreeView) {
      window.gFolderTreeView._rebuild();
    }
    
    tblog.debug("Folder reordering completed successfully");
  } catch (e) {
    tblog.error("Error reordering folders: " + e);
  }
}

function getAllSubFolders(rootFolder) {
  let folders = [];
  
  function walkFolder(folder) {
    folders.push(folder);
    if (folder.hasSubFolders) {
      let subFolders = folder.subFolders;
      if (Array.isArray(subFolders)) {
        // Thunderbird 91 and later
        subFolders.forEach(subFolder => {
          walkFolder(subFolder.QueryInterface(Ci.nsIMsgFolder));
        });
      } else {
        // before Thunderbird 91
        while (typeof subFolders.hasMoreElements === 'function' && subFolders.hasMoreElements()) {
          let subFolder = subFolders.getNext().QueryInterface(Ci.nsIMsgFolder);
          walkFolder(subFolder);
        }
      }
    }
  }
  
  if (rootFolder.hasSubFolders) {
    walkFolder(rootFolder);
  }
  
  return folders;
}

// Export the function
var EXPORTED_SYMBOLS = ["enableFolderDragAndDrop"];