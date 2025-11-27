## autoinsert.js Duplicate Variable Error

If you see console errors like `Identifier 'isDragging' has already been declared` coming from `autoinsert.js`, the code is not part of this repository. The script is injected by a browser extension (e.g., clipboard helpers, smart form fillers, screenshot helpers). To eliminate the error:

1. Open the page in a private/incognito window with all extensions disabled.
2. If the error disappears, re-enable extensions one by one to find the culprit.
3. Disable the problematic extension or add the app domain to the extension's ignore list.

This warning does not indicate an issue with the chat app's frontend bundle; it comes from third-party code in the browser.