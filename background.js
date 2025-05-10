// Listen for keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
  // Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check if we're on Instagram
  if (!tab.url.includes("instagram.com")) {
    console.log("Not on Instagram");
    return;
  }

  // Get the friend mapping from storage
  const friendNumber = command.split("-").pop(); // Gets "1" or "2" from "share-to-friend-1"
  const storageKey = `friend${friendNumber}`;

  const result = await chrome.storage.local.get(storageKey);
  const targetFriend = result[storageKey];

  if (!targetFriend) {
    console.log(`No friend mapped to command ${command}`);
    return;
  }

  // Inject the simplified share logic
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: shareReel,
      args: [targetFriend],
    });
  } catch (error) {
    console.error("Error executing script:", error);
  }
});

// Simplified content script logic for sharing a reel
function shareReel(targetFriend) {
  // --- Helper functions ---
  function simulateClick(element) {
    if (!element) return false;
    try {
      ["mousedown", "mouseup", "click"].forEach((type) =>
        element.dispatchEvent(
          new MouseEvent(type, { bubbles: true, cancelable: true })
        )
      );
      return true;
    } catch {
      return false;
    }
  }
  function simulateInput(element, text) {
    if (!element) return false;
    try {
      element.focus();
      element.value = text;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch {
      return false;
    }
  }

  // --- Main logic ---
  // 1. Find and click the first visible share button
  let shareButton = document.querySelector(
    'svg[aria-label="Share"], svg[aria-label="Share Post"]'
  );
  if (shareButton) {
    let clickable =
      shareButton.closest('button, div[role="button"]') ||
      shareButton.parentElement;
    simulateClick(clickable);
  } else {
    console.log("Share button not found");
    return;
  }

  // 2. Wait for modal, search, and select user
  setTimeout(() => {
    const searchInput = document.querySelector('input[placeholder="Search"]');
    if (!searchInput) return;
    const username = targetFriend.startsWith("@")
      ? targetFriend.slice(1)
      : targetFriend;
    simulateInput(searchInput, username);

    setTimeout(() => {
      // Find the user row and click the radio/circle
      const userRows = document.querySelectorAll('div[role="button"]');
      let found = false;
      for (const row of userRows) {
        const smalls = row.querySelectorAll("span, div");
        for (const s of smalls) {
          if (s.textContent.trim() === username) {
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

      // 3. Click the Send button
      setTimeout(() => {
        const sendButtons = Array.from(
          document.querySelectorAll('button, div[role="button"]')
        );
        const sendButton = sendButtons.find(
          (btn) =>
            btn.textContent.trim().toLowerCase() === "send" &&
            btn.offsetWidth > 100
        );
        if (sendButton) {
          simulateClick(sendButton);
          // 4. Close the modal
          setTimeout(() => {
            const closeButton = document.querySelector(
              'svg[aria-label="Close"], div[aria-label="Close"], button[aria-label="Close"]'
            );
            if (closeButton) {
              const closeParent =
                closeButton.closest('button, div[role="button"]') ||
                closeButton.parentElement;
              simulateClick(closeParent || closeButton);
            }
          }, 1000);
        }
      }, 1000);
    }, 1000);
  }, 1000);
}
