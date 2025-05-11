chrome.commands.onCommand.addListener(async (command) => {
  console.log("[bg] command:", command);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log("[bg] active tab URL:", tab?.url);

  if (!tab?.url.includes("instagram.com")) {
    console.warn("[bg] not on instagram → abort");
    return;
  }

  const friendNumber = command.split("-").pop();
  const storageKey = `friend${friendNumber}`;
  const { [storageKey]: targetFriend } = await chrome.storage.local.get(
    storageKey
  );
  console.log("[bg] targetFriend:", targetFriend);

  if (!targetFriend) {
    console.warn(`[bg] no friend mapped for ${storageKey}`);
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: shareReel,
      args: [targetFriend],
    });
    console.log("[bg] injected shareReel");
  } catch (err) {
    console.error("[bg] injection failed:", err);
  }
});

function shareReel(targetFriend) {
  console.log("[page] shareReel() →", targetFriend);

  function simulateClick(el) {
    if (!el) return false;
    ["mousedown", "mouseup", "click"].forEach((type) =>
      el.dispatchEvent(
        new MouseEvent(type, { bubbles: true, cancelable: true })
      )
    );
    return true;
  }

  function simulateInput(el, text) {
    if (!el) return false;
    el.focus();
    el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  const svgs = Array.from(
    document.querySelectorAll(
      'svg[aria-label="Share"], svg[aria-label="Share Post"]'
    )
  );
  let bestSvg = null,
    bestArea = 0;
  for (const svg of svgs) {
    const r = svg.getBoundingClientRect();
    const visW = Math.max(
      0,
      Math.min(r.right, window.innerWidth) - Math.max(r.left, 0)
    );
    const visH = Math.max(
      0,
      Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)
    );
    const area = visW * visH;
    if (area > bestArea) {
      bestArea = area;
      bestSvg = svg;
    }
  }
  if (!bestSvg || bestArea === 0) {
    console.warn("[page] no visible share icon found");
    return;
  }
  const shareBtn =
    bestSvg.closest("button, div[role='button']") || bestSvg.parentElement;
  if (!shareBtn) {
    console.warn("[page] could not locate share button wrapper");
    return;
  }
  simulateClick(shareBtn);
  console.log("[page] clicked share button");

  setTimeout(() => {
    const searchInput = document.querySelector('input[placeholder="Search"]');
    if (!searchInput) {
      console.warn("[page] search input not found");
      return;
    }
    const username = targetFriend.startsWith("@")
      ? targetFriend.slice(1)
      : targetFriend;
    simulateInput(searchInput, username);
    console.log("[page] typed username →", username);

    setTimeout(() => {
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
            console.log("[page] clicked user row");
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) {
        console.warn(`[page] user row not found for ${username}`);
        return;
      }

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
          console.log("[page] clicked Send button");

          setTimeout(() => {
            const closeButton = document.querySelector(
              'svg[aria-label="Close"], div[aria-label="Close"], button[aria-label="Close"]'
            );
            if (closeButton) {
              const closeParent =
                closeButton.closest('button, div[role="button"]') ||
                closeButton.parentElement;
              simulateClick(closeParent || closeButton);
              console.log("[page] closed modal");
            }
          }, 1000);
        } else {
          console.warn("[page] Send button not found");
        }
      }, 1000);
    }, 1000);
  }, 1000);
}
