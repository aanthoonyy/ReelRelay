chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getReelUrl") {
    const reelUrl = window.location.href;
    sendResponse({ url: reelUrl });
  }
  return true;
});
