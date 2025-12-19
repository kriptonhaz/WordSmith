function initializeExtension() {
  const wordSmithBtn = document.getElementById("wordSmithBtn");
  const inputText = document.getElementById("inputText");
  const resultText = document.getElementById("resultText");
  const copyBtn = document.getElementById("copyBtn");
  const rephraseMode = document.getElementById("rephraseMode");
  const statusDiv = document.getElementById("status");

  // Settings modal elements
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const enablePopupBalloon = document.getElementById("enablePopupBalloon");
  const useDefaultApi = document.getElementById("useDefaultApi");
  const customApiSettings = document.getElementById("customApiSettings");
  const apiProvider = document.getElementById("apiProvider");
  const modelName = document.getElementById("modelName");
  const apiKey = document.getElementById("apiKey");

  // Load saved settings on startup
  loadSettings();

  wordSmithBtn.addEventListener("click", async function () {
    const input = inputText.value.trim();

    if (!input) {
      showStatus("Please enter some text to process", "error");
      return;
    }

    wordSmithBtn.disabled = true;
    wordSmithBtn.textContent = "Processing...";

    try {
      const selectedMode = rephraseMode.value;
      const response = await chrome.runtime.sendMessage({
        action: "rephrase",
        text: input,
        mode: selectedMode,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      resultText.value = response.result;
      showStatus("Text rephrased successfully!", "success");
      updateCopyButtonVisibility();
    } catch (error) {
      console.error("Service Worker error:", error);
      showStatus("Error: " + error.message, "error");
    } finally {
      wordSmithBtn.disabled = false;
      wordSmithBtn.textContent = "Smithen";
    }
  });

  // Copy button functionality
  copyBtn.addEventListener("click", async function () {
    const textToCopy = resultText.value.trim();

    if (!textToCopy) {
      showStatus("No text to copy", "error");
      return;
    }

    try {
      // Use the modern Clipboard API
      await navigator.clipboard.writeText(textToCopy);

      // Update button to show copied state
      copyBtn.textContent = "Copied!";
      copyBtn.classList.add("copied");
      showStatus("Copied to clipboard!", "success");

      // Reset button after 2 seconds
      setTimeout(() => {
        copyBtn.textContent = "Copy Result";
        copyBtn.classList.remove("copied");
      }, 2000);
    } catch (error) {
      console.error("Copy failed:", error);
      showStatus("Failed to copy text", "error");
    }
  });

  // Update copy button visibility based on content
  function updateCopyButtonVisibility() {
    if (resultText.value.trim()) {
      copyBtn.style.display = "flex";
    } else {
      copyBtn.style.display = "none";
    }
  }

  inputText.addEventListener("input", function () {
    if (this.value.trim()) {
      resultText.value = "";
      updateCopyButtonVisibility();
    }
  });

  // Initialize copy button visibility
  updateCopyButtonVisibility();

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = "block";

    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 3000);
  }

  // Settings modal event listeners
  settingsBtn.addEventListener("click", function () {
    settingsModal.style.display = "block";
  });

  closeSettingsBtn.addEventListener("click", function () {
    settingsModal.style.display = "none";
  });

  // Close modal when clicking outside
  window.addEventListener("click", function (event) {
    if (event.target === settingsModal) {
      settingsModal.style.display = "none";
    }
  });

  useDefaultApi.addEventListener("change", function () {
    if (this.checked) {
      customApiSettings.style.display = "none";
    } else {
      customApiSettings.style.display = "block";
    }
  });

  saveSettingsBtn.addEventListener("click", function () {
    const settings = {
      enablePopupBalloon: enablePopupBalloon.checked,
      useDefaultApi: useDefaultApi.checked,
      customApi: null,
    };

    if (!useDefaultApi.checked) {
      settings.customApi = {
        provider: apiProvider.value,
        model: modelName.value.trim(),
        key: apiKey.value.trim(),
      };

      // Validate required fields
      if (
        !settings.customApi.provider ||
        !settings.customApi.model ||
        !settings.customApi.key
      ) {
        showStatus("Please fill in all custom API fields", "error");
        return;
      }
    }

    // Save settings using Chrome Storage API
    chrome.storage.local.set({ extensionSettings: settings }, function () {
      showStatus("Settings saved successfully!", "success");
      settingsModal.style.display = "none";

      // Notify all tabs about the setting change
      chrome.tabs.query({}, function (tabs) {
        tabs.forEach((tab) => {
          chrome.tabs
            .sendMessage(tab.id, {
              action: "updatePopupBalloonSetting",
              enabled: settings.enablePopupBalloon,
            })
            .catch(() => {});
        });
      });
    });
  });

  // Load settings function
  function loadSettings() {
    chrome.storage.local.get(["extensionSettings"], function (result) {
      const settings = result.extensionSettings;

      if (settings) {
        // Load popup balloon setting (default to true)
        enablePopupBalloon.checked =
          settings.enablePopupBalloon !== undefined
            ? settings.enablePopupBalloon
            : true;

        useDefaultApi.checked =
          settings.useDefaultApi !== undefined ? settings.useDefaultApi : true;

        if (!settings.useDefaultApi && settings.customApi) {
          customApiSettings.style.display = "block";
          apiProvider.value = settings.customApi.provider || "";
          modelName.value = settings.customApi.model || "";
          apiKey.value = settings.customApi.key || "";
        } else {
          customApiSettings.style.display = "none";
        }
      }
    });
  }

  // Get current settings (to be used by background script)
  function getCurrentSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["extensionSettings"], function (result) {
        resolve(result.extensionSettings || { useDefaultApi: true });
      });
    });
  }
}

// Initialize extension when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  initializeExtension();
});
