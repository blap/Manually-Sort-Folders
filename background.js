// For Thunderbird 115 and later - using modern WebExtension APIs
browser.runtime.onInstalled.addListener(() => {
  // Register the options page
  browser.menus.create({
    id: "tbsf_menu_item",
    title: "Manually sort folders",
    contexts: ["tools_menu"]
  });
});

browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "tbsf_menu_item") {
    browser.windows.create({
      url: "content/ui.html",
      type: "popup",
      width: 600,
      height: 400
    });
  }
});

// Handle account and folder sorting logic using modern APIs
// This will need to be implemented in the UI files