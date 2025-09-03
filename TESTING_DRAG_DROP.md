# Testing Drag and Drop Functionality

This document provides instructions for testing the full drag and drop implementation for folder sorting.

## Prerequisites

1. Thunderbird 115+ installed
2. Manually Sort Folders extension installed
3. At least one email account configured with multiple folders

## Test Cases

### 1. Basic Drag and Drop Functionality

**Steps:**
1. Open Thunderbird
2. Open the folder pane
3. Select a folder (not the root account folder)
4. Drag the folder and drop it on another folder in the same account
5. Observe that the folder moves to the new position

**Expected Results:**
- The folder should move to the new position
- The folder tree should refresh automatically
- The new order should be preserved after restarting Thunderbird

### 2. Cross-Account Drag Prevention

**Steps:**
1. Open Thunderbird
2. Open the folder pane
3. Select a folder from one account
4. Attempt to drag it to a folder from a different account

**Expected Results:**
- The drag operation should be prevented
- No changes should be made to the folder structure
- An appropriate error message should be logged (visible in the error console)

### 3. Same Folder Drop Prevention

**Steps:**
1. Open Thunderbird
2. Open the folder pane
3. Select a folder
4. Attempt to drag it onto itself

**Expected Results:**
- The drag operation should be prevented
- No changes should be made to the folder structure

### 4. Root Folder Drag Handling

**Steps:**
1. Open Thunderbird
2. Open the folder pane
3. Attempt to drag an account root folder

**Expected Results:**
- Root folders should not be draggable
- The drag operation should be prevented

### 5. Visual Feedback

**Steps:**
1. Open Thunderbird
2. Open the folder pane
3. Start dragging a folder

**Expected Results:**
- The dragged folder should have reduced opacity
- The drop target should have a highlighted background
- Visual feedback should be removed when drag ends

### 6. Sort Order Preservation

**Steps:**
1. Open Thunderbird
2. Open the folder pane
3. Drag a folder to a new position
4. Close and reopen Thunderbird
5. Check the folder order

**Expected Results:**
- The folder order should be preserved after restart
- The custom sort method should be maintained for the account

### 7. Integration with Manual Sort Dialog

**Steps:**
1. Open Thunderbird
2. Use drag and drop to reorder folders
3. Open the "Manually sort folders" dialog
4. Verify that the order matches

**Expected Results:**
- The order in the dialog should match the folder pane
- Changes made in the dialog should be reflected in drag and drop

## Debugging

If issues are encountered:

1. Enable debug logging by setting the log level in Thunderbird's config editor:
   - Set `log.tbsortfolders.dragdrop` to `Debug`

2. Check the error console (Ctrl+Shift+J) for any error messages

3. Verify that the extension's preferences are correctly set:
   - The account should be using the "Custom" sort method (value 2)

## Known Limitations

1. Drag and drop only works within the same account
2. Root account folders cannot be reordered via drag and drop
3. The feature requires Thunderbird's folder pane to be visible

## Troubleshooting

### Issue: Folders don't move when dragged
**Solution:** 
- Ensure the account is using custom sort method
- Check that the extension is properly loaded
- Verify no JavaScript errors in the console

### Issue: Visual feedback not working
**Solution:**
- Check CSS styling in the dragdrop.js file
- Ensure event listeners are properly attached

### Issue: Sort order not preserved
**Solution:**
- Verify that preferences are being saved correctly
- Check that tbsf_data is being updated properly