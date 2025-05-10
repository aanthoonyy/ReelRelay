document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    ["friend1", "friend2", "friend1Title", "friend2Title"],
    (result) => {
      document.getElementById("friend1").value = result.friend1 || "";
      document.getElementById("friend2").value = result.friend2 || "";
      document.getElementById("friend1Title").value = result.friend1Title || "";
      document.getElementById("friend2Title").value = result.friend2Title || "";
    }
  );

  document.getElementById("save").addEventListener("click", () => {
    const friend1 = document.getElementById("friend1").value.trim();
    const friend2 = document.getElementById("friend2").value.trim();
    const friend1Title = document.getElementById("friend1Title").value.trim();
    const friend2Title = document.getElementById("friend2Title").value.trim();

    chrome.storage.local.set(
      {
        friend1: friend1,
        friend2: friend2,
        friend1Title: friend1Title,
        friend2Title: friend2Title,
      },
      () => {
        const status = document.getElementById("status");
        status.textContent = "Settings saved!";
        status.className = "status success";
        status.style.display = "block";

        setTimeout(() => {
          status.style.display = "none";
        }, 2000);
      }
    );
  });
});
