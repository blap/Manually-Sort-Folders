const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

// Logging using the latest from https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Log.jsm
// Assuming this is 68+ only.
Cu.import("resource://gre/modules/Log.jsm");
let tblog = Log.repository.getLogger("tbsortfolders.ui");
tblog.level = Log.Level.Debug;
tblog.addAppender(new Log.ConsoleAppender(new Log.BasicFormatter()));
tblog.addAppender(new Log.DumpAppender(new Log.BasicFormatter()));

var Services = globalThis.Services || ChromeUtils.import(
  "resource://gre/modules/Services.jsm"
).Services;
const g_ThunderbirdMajorVersion = Services.appinfo.version.split(".")[0];

Cu.import("resource://tbsortfolders/sort.jsm");
Cu.import("resource:///modules/MailUtils.jsm");

if (g_ThunderbirdMajorVersion >= 91) {
  Cu.import("resource:///modules/MailServices.jsm"); // for reorderAccounts
}

try {
  Cu.import("resource:///modules/iteratorUtils.jsm"); // for fixIterator
} catch(e) {
  /* fixIterator was removed together with iteratorutils.jsm on Thunderbird 91.
   * That's no longer needed.
   */
}

var g_accounts = Object();
const tbsf_prefs = Services.prefs.getBranch("extensions.tbsortfolders@xulforum.org.");
var tbsf_data = {};
var current_account = null;

const mail_accountmanager_prefs = Services.prefs.getBranch("mail.accountmanager.");
const mail_account_prefs = Services.prefs.getBranch("mail.account.");
const mail_server_prefs = Services.prefs.getBranch("mail.server.");

/* Most of the functions below are for *folder* sorting */

// Updated for HTML interface
function assert(v, s) {
  if (!v) {
    tblog.error("Assertion failure "+s);
    throw "Assertion failure";
  }
}

// Updated for HTML interface
function item_key(tree_item) {
  return tree_item.dataset.uri;
}

// Updated for HTML interface
function item_label(tree_item) {
  return tree_item.textContent;
}

let ftvItems = {};

// Updated for HTML interface
function rebuild_tree(full, collapse) {
  tblog.debug("rebuild_tree("+full+");");
  let dfs = 0;
  /* Cache these expensive calls. They're called for each comparison :( */
  let myFtvItem = function(tree_item) {
    if (!ftvItems[tree_item.dataset.uri]) {
      let text = item_label(tree_item);
      let folder = MailUtils.getExistingFolder(tree_item.dataset.uri);
      folder.QueryInterface(Ci.nsIMsgFolder);
      ftvItems[tree_item.dataset.uri] = { _folder: folder, text: text };
    }
    return ftvItems[tree_item.dataset.uri];
  }
  let sort_function;
  let replace_data = false;
  let sort_method = tbsf_data[current_account][0];
  if (sort_method == 0) {
      tblog.debug("Sort method 0");
      sort_function = (c1, c2) => tbsf_sort_functions[0](myFtvItem(c1), myFtvItem(c2));
  } else if (sort_method == 1) {
      tblog.debug("Sort method 1");
      sort_function = (c1, c2) => tbsf_sort_functions[1](myFtvItem(c1), myFtvItem(c2));
  } else if (sort_method == 2) {
      tblog.debug("Sort method 2");
      sort_function =
        (c1, c2) => tbsf_sort_functions[2](tbsf_data[current_account][1], myFtvItem(c1), myFtvItem(c2));
      replace_data = true;
  } else if (sort_method == 3) {
      tblog.debug("Sort method 3");
      sort_function = (c1, c2) => tbsf_sort_functions[3](myFtvItem(c1), myFtvItem(c2));
  }
  let fresh_data = {};
  let my_sort = function(a_tree_items, indent) {
    let tree_items = Array.from(a_tree_items);
    tblog.debug(indent+a_tree_items.length+" nodes passed");
    tblog.debug(indent+tree_items.length+" folders to examine before sort");
    tree_items.sort(sort_function);

    tblog.debug(indent+tree_items.length+" folders to examine");
    for (let i = 0; i < tree_items.length; ++i) {
      dfs++;
      fresh_data[item_key(tree_items[i])] = dfs;
      if (full) {
        tblog.debug(indent+"### Rebuilding "+dfs+" is "+item_key(tree_items[i]));
      }
    }

    // Update the HTML UI
    const folderTree = document.getElementById("folderTree");
    folderTree.innerHTML = "";
    tree_items.forEach(item => {
      folderTree.appendChild(item);
    });
  }

  const folderTree = document.getElementById("folderTree");
  const children = folderTree.children;
  my_sort(children, "");
  if (replace_data)
    tbsf_data[current_account][1] = fresh_data;
}

function decode_special(flags) {
  if (flags & 0x00000100) {
    return 'Trash';
  } else if (flags & 0x00000200) {
    return 'Sent';
  } else if (flags & 0x00000400) {
    return 'Drafts';
  } else if (flags & 0x00000800) {
    return 'Outbox';
  } else if (flags & 0x00001000) {
    return 'Inbox';
  } else if (flags & 0x00004000) {
    return 'Archives';
  } else if (flags & 0x00400000) {
    return 'Templates';
  } else if (flags & 0x40000000) {
    return 'Junk';
  } else if (flags & 0x80000000) {
    return 'Favorite';
  } else {
    return 'none';
  }
}

// Updated for HTML interface
function build_folder_tree(account) {
  const folderTree = document.getElementById("folderTree");
  folderTree.innerHTML = "";

  if (account.incomingServer.rootFolder.hasSubFolders) {
    walk_folder(account.incomingServer.rootFolder, folderTree, 0);
  }
}

// Updated for HTML interface
function walk_folder(folder, container, depth) {
  let subFolders = folder.subFolders;
  if (Array.isArray(subFolders)) {
    // Thunderbird 91 and later
    subFolders.forEach(s => {
      let folder = s.QueryInterface(Components.interfaces.nsIMsgFolder);
      walk_folder_append(folder, container, depth);
    });
  } else {
    // before Thunderbird 91
    while (typeof subFolders.hasMoreElements === 'function' && subFolders.hasMoreElements()) {
      let folder = subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
      walk_folder_append(folder, container, depth);
    }
  }
}

// Updated for HTML interface
function walk_folder_append(folder, container, depth) {
  let indent = ' '.repeat(2*depth);
  tblog.debug("Folder: "+indent+folder.prettyName);
  tblog.debug("Folder URI: "+indent+folder.URI);
  tblog.debug("Folder flags: "+indent+folder.flags);
    
  let special_name = decode_special(folder.flags);
  tblog.debug("Special name: "+special_name);

  let div = document.createElement('div');
  div.className = 'folder-item';
  div.dataset.uri = folder.URI;
  div.textContent = folder.prettyName;
  div.style.paddingLeft = (depth * 20) + 'px';
  
  // Add click handler for selection
  div.addEventListener('click', function() {
    // Remove selected class from all items
    const items = container.querySelectorAll('.folder-item');
    items.forEach(item => item.classList.remove('selected'));
    // Add selected class to this item
    this.classList.add('selected');
  });

  if (folder.hasSubFolders) {
    let subContainer = document.createElement('div');
    walk_folder(folder, subContainer, depth + 1);
    div.appendChild(subContainer);
  }

  container.appendChild(div);
}

// Updated for HTML interface
function on_load() {
  try {
    tblog.debug("on_load");

    let json = tbsf_prefs.getStringPref("tbsf_data");
    try {
      tbsf_data = JSON.parse(json);
    } catch (e) {
    }

    let account_manager = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);
    let name_initial = '';
    let accounts_menu = document.getElementById("accountSelector");
    let accounts = [];
    if (Array.isArray(account_manager.accounts)) {
      accounts = account_manager.accounts;
    } else {
      if (typeof fixIterator === 'function') {
        for (let x of fixIterator(account_manager.accounts, Ci.nsIMsgAccount)) {
          accounts.push(x);
        }
      }
    }
    tblog.debug("Total accounts: "+accounts.length);
    if (!accounts.length) {
      document.querySelector(".tabcontent").style.display = "none";
      document.getElementById("err_no_accounts").style.display = "";
      return;
    }
    for (let account of accounts) {
      if (!account.incomingServer)
        continue;
      tblog.debug("Account: "+account.incomingServer.rootFolder.prettyName);
      let name = account.incomingServer.rootFolder.prettyName;
      let option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      accounts_menu.appendChild(option);

      //register the account for future use, create the right data structure in
      //the data
      g_accounts[name] = account;
      if (!tbsf_data[name]) tbsf_data[name] = Array();
      if (!name_initial) name_initial = name;
    }
    accounts_menu.value = name_initial;

    on_account_changed();
  } catch (e) {
    tblog.debug(e);
    throw e;
  }
}

function renumber(treeItem, start) {
  tbsf_data[current_account][1][treeItem.dataset.uri] = start++;
  // For HTML interface, we need to update the UI differently
  return start;
}

// Updated for HTML interface
function move_up(element) {
  const uri = element.dataset.uri;
  tblog.debug("URI: "+uri);
  if (element.previousElementSibling) {
    let previous_item = element.previousElementSibling;
    let previous_uri = previous_item.dataset.uri;
    let data = tbsf_data[current_account][1];
    renumber(previous_item, renumber(element, data[previous_uri]));
    rebuild_tree();
  } else {
    tblog.debug("This is unexpected");
  }
}

// Updated for HTML interface
function on_move_up() {
  tblog.debug("on_move_up");
  const selected = document.querySelector('.folder-item.selected');
  if (selected && selected.previousElementSibling) {
    move_up(selected);
    selected.scrollIntoView();
  }
}

// Updated for HTML interface
function on_move_down() {
  tblog.debug("on_move_down");
  const selected = document.querySelector('.folder-item.selected');
  if (selected && selected.nextElementSibling) {
    move_up(selected.nextElementSibling);
    selected.scrollIntoView();
  }
}

// Updated for HTML interface
function on_alphabetical() {
  tblog.debug("on_alphabetical");
  const selected = document.querySelector('.folder-item.selected');
  if (!selected) return;
  
  const parent = selected.parentElement;
  if (!parent) return;
  
  const compare_function = document.getElementById("sort_folder_name_case_sensitive").checked ?
        ((a, b) => a.textContent > b.textContent) : 
        ((a, b) => a.textContent.toLowerCase() > b.textContent.toLowerCase());
  
  let number = tbsf_data[current_account][1][selected.dataset.uri];
  let siblingArray = Array.from(parent.children);
  siblingArray.sort((a, b) => compare_function(a, b));
  siblingArray.forEach(item => {
    parent.appendChild(item);
    number = renumber(item, number);
  });
  rebuild_tree(true, false);
  selected.scrollIntoView();
}

function get_sort_method_for_account(account) {
  if (tbsf_data[account] && tbsf_data[account][0] !== undefined)
    return tbsf_data[account][0];
  else
    return 0;
}

// Updated for HTML interface
function update_tree() {
  let account = g_accounts[current_account];
  build_folder_tree(account);
}

// Updated for HTML interface
function on_account_changed() {
  const new_account = document.getElementById("accountSelector").value;
  if (new_account && new_account != current_account) {
    current_account = new_account;
    let sort_method = get_sort_method_for_account(current_account);
    document.getElementById("sortMethod").value = sort_method;
    update_tree();
    on_sort_method_changed();
  }
}

// Updated for HTML interface
function on_sort_method_changed() {
  if (!current_account) return;
  
  let sort_method = document.getElementById("sortMethod").value;
  tbsf_data[current_account][0] = parseInt(sort_method);
  
  tbsf_prefs.setStringPref("tbsf_data", JSON.stringify(tbsf_data));
  rebuild_tree(true, true);
}

function on_close() {
  on_refresh();
  window.close();
}

function on_refresh() {
  tbsf_prefs.setStringPref("tbsf_data", JSON.stringify(tbsf_data));
  for (let win of Services.wm.getEnumerator("mail:3pane")) {
    win.gFolderTreeView._rebuild();
  }
}

window.addEventListener("unload", on_refresh, false);

/* The functions below are for *account* sorting */

var g_other_accounts = [];
var g_active_list = null;

// Updated for HTML interface
function accounts_on_load() {
  // This function will be adapted for the HTML interface
  let accounts = mail_accountmanager_prefs.getStringPref("accounts").split(",");
  // Implementation will be updated for HTML
}

// Updated for HTML interface
function update_accounts_prefs() {
  // This function will be adapted for the HTML interface
}

// Updated for HTML interface
function account_reordered() {
  // This function will be adapted for the HTML interface
}

// Updated for HTML interface
function account_move_up(index, listElement) {
  let items = Array.from(listElement.children);
  if (index <= 0 || index >= items.length) return false;
  
  let item = items[index];
  let previous_item = items[index - 1];
  
  listElement.insertBefore(item, previous_item);
  return true;
}

// Updated for HTML interface
function on_account_move_up() {
  tblog.debug("on_account_move_up");
  // Implementation for HTML interface
}

// Updated for HTML interface
function on_account_move_down() {
  tblog.debug("on_account_move_down");
  // Implementation for HTML interface
}

// Updated for HTML interface
function on_account_alphabetical() {
  tblog.debug("on_account_alphabetical");
  // Implementation for HTML interface
}

function on_account_restart() {
  let mainWindow = Services.wm.getMostRecentWindow("mail:3pane");
  mainWindow.setTimeout(function () { Services.startup.quit(Services.startup.eForceQuit|Services.startup.eRestart); },1000);
  window.close();
}

// Updated for HTML interface
function extra_on_load() {
  // Implementation for HTML interface
}

// Updated for HTML interface
function on_startup_folder_method_changed() {
  // Implementation for HTML interface
}

// Updated for HTML interface
function on_hide_folder_icons_changed() {
  // Implementation for HTML interface
}
