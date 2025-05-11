document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    ["friend1", "friend2", "friend3", "friend4"],
    (result) => {
      if (result.friend1)
        document.getElementById("friend1").value = result.friend1;
      if (result.friend2)
        document.getElementById("friend2").value = result.friend2;
      if (result.friend3)
        document.getElementById("friend3").value = result.friend3;
      if (result.friend4)
        document.getElementById("friend4").value = result.friend4;
    }
  );

  document.getElementById("save").addEventListener("click", () => {
    const friend1 = document.getElementById("friend1").value.trim();
    const friend2 = document.getElementById("friend2").value.trim();
    const friend3 = document.getElementById("friend3").value.trim();
    const friend4 = document.getElementById("friend4").value.trim();

    chrome.storage.local.get(null, (existingData) => {
      const newData = {
        ...existingData,
        friend1: friend1,
        friend2: friend2,
        friend3: friend3,
        friend4: friend4,
      };

      chrome.storage.local.set(newData, () => {
        setTimeout(() => {
          window.close();
        }, 500);
      });
    });
  });
});
