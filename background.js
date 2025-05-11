// Listens for keyboard shortcuts (like Ctrl+Shift+1, Ctrl+Shift+2)
chrome.commands.onCommand.addListener(async (command) => {
  // Gets the currently active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Only runs on Instagram pages
  if (!tab?.url.includes("instagram.com")) {
    return;
  }

  // Gets the number from the command (e.g., "share-to-friend-1" → "1")
  const friendNumber = command.split("-").pop();
  // Creates key like "friend1" or "friend2"
  const storageKey = `friend${friendNumber}`;
  // Gets the username from Chrome's storage
  const { [storageKey]: targetFriend } = await chrome.storage.local.get(
    storageKey
  );

  // Stops if no friend is set for this shortcut
  if (!targetFriend) {
    return;
  }

  // Injects our sharing code into the Instagram page
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: shareReel,
      args: [targetFriend],
    });
  } catch (err) {}
});

function shareReel(targetFriend) {
  // Simulates a real mouse click by triggering all mouse events
  function simulateClick(element) {
    // Stops if element doesn't exist
    if (!element) return false;
    // Triggers mousedown, mouseup, and click events to simulate a real click
    ["mousedown", "mouseup", "click"].forEach((type) =>
      element.dispatchEvent(
        new MouseEvent(type, { bubbles: true, cancelable: true })
      )
    );
    return true;
  }

  // Simulates typing into an input field
  function simulateInput(element, text) {
    // Stops if element doesn't exist
    if (!element) return false;
    // Puts cursor in the input
    element.focus();
    // Types the text
    element.value = text;
    // Triggers events to make Instagram think a real user typed this
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  // Waits for an element to appear on the page
  function waitForElement(selector, timeout = 500) {
    return new Promise((resolve) => {
      // If element exists, return it immediately
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }

      // Watches for changes to the page to detect when our element appears
      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve(document.querySelector(selector));
        }
      });

      // Starts watching the page for changes
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Gives up after timeout (500ms) and returns whatever we found
      setTimeout(() => {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }, timeout);
    });
  }

  // Finds the share button by looking for the largest visible share icon
  // Thanks chatgpt lol
  const svgs = Array.from(
    document.querySelectorAll(
      'svg[aria-label="Share"], svg[aria-label="Share Post"]'
    )
  );
  let bestSvg = null,
    bestArea = 0;
  for (const svg of svgs) {
    // Gets the position and size of the share icon
    const r = svg.getBoundingClientRect();
    // Calculates how much of the icon is visible on screen
    const visW = Math.max(
      0,
      Math.min(r.right, window.innerWidth) - Math.max(r.left, 0)
    );
    const visH = Math.max(
      0,
      Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)
    );
    const area = visW * visH;
    // Keeps track of the largest visible share icon
    if (area > bestArea) {
      bestArea = area;
      bestSvg = svg;
    }
  }

  // Clicks the share button if we found one
  if (!bestSvg || bestArea === 0) return;
  const shareBtn =
    bestSvg.closest("button, div[role='button']") || bestSvg.parentElement;
  if (!shareBtn) return;
  simulateClick(shareBtn);

  // Main sharing process - using async/await for better flow control
  (async () => {
    // Waits for and finds the search input
    const searchInput = await waitForElement('input[placeholder="Search"]');
    if (!searchInput) return;

    // Types the username (removes @ if present)
    const username = targetFriend.startsWith("@")
      ? targetFriend.slice(1)
      : targetFriend;
    simulateInput(searchInput, username);

    // Waits a bit for search results to appear
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Finds and clicks the user in search results
    const userRows = document.querySelectorAll('div[role="button"]');
    let found = false;
    for (const row of userRows) {
      // Looks for the username in span and div elements
      const smalls = row.querySelectorAll("span, div");
      for (const s of smalls) {
        if (s.textContent.trim() === username) {
          // Tries to find a clickable element (checkbox, radio, button) or falls back to the row
          let circle = row.querySelector(
            'input[type="checkbox"], input[type="radio"], button, div[role="radio"], div[role="checkbox"]'
          );
          if (!circle) circle = row;
          simulateClick(circle);
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (!found) return;

    // Waits a bit for the send button to appear
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Finds and clicks the send button
    const sendButtons = Array.from(
      document.querySelectorAll('button, div[role="button"]')
    );
    const sendButton = sendButtons.find(
      (btn) =>
        btn.textContent.trim().toLowerCase() === "send" && btn.offsetWidth > 100
    );
    if (sendButton) {
      simulateClick(sendButton);

      // Waits a bit for the close button to appear
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Finds and clicks the close button to exit the share modal
      const closeButton = await waitForElement(
        'svg[aria-label="Close"], div[aria-label="Close"], button[aria-label="Close"]'
      );
      if (closeButton) {
        const closeParent =
          closeButton.closest('button, div[role="button"]') ||
          closeButton.parentElement;
        simulateClick(closeParent || closeButton);
      }
    }
  })();
}
