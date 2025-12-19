// Content script for text selection and popup balloon
(function () {
  "use strict";

  // Prevent multiple injections
  if (window.wordsmithInjected) {
    return;
  }
  window.wordsmithInjected = true;

  let popup = null;
  let currentElement = null;
  let selectedText = "";
  let selectionStart = 0;
  let selectionEnd = 0;
  let savedRange = null;
  let popupBalloonEnabled = true; // Default to enabled

  const toneOptions = [
    { value: "formal", label: "Formal" },
    { value: "casual", label: "Casual" },
    { value: "friendly", label: "Friendly" },
    { value: "concise", label: "Concise" },
    { value: "funny", label: "Funny" },
    { value: "persuasive", label: "Persuasive" },
    { value: "simplified", label: "Simplified" },
    { value: "academic", label: "Academic" },
  ];

  // Load popup balloon setting from storage
  chrome.storage.local.get(["extensionSettings"], function (result) {
    const settings = result.extensionSettings;
    if (settings && settings.enablePopupBalloon !== undefined) {
      popupBalloonEnabled = settings.enablePopupBalloon;
    }
  });

  // Listen for setting updates
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updatePopupBalloonSetting") {
      popupBalloonEnabled = request.enabled;
      if (!popupBalloonEnabled) {
        hidePopup();
      }
    }
  });

  // Detect special editors
  function detectEditorType(element) {
    if (
      element.closest('[class*="slateTextArea"]') ||
      element.closest('[data-slate-editor="true"]') ||
      element.getAttribute("data-slate-editor") === "true"
    ) {
      return "discord-slate";
    }

    if (window.location.hostname.includes("docs.google.com")) {
      return "google-docs";
    }

    if (window.location.hostname.includes("web.whatsapp.com")) {
      return "whatsapp";
    }

    return "standard";
  }

  // Create popup element
  function createPopup() {
    const popup = document.createElement("div");
    popup.id = "wordsmith-popup";
    popup.className = "wordsmith-popup";
    popup.innerHTML = `
      <div class="wordsmith-popup-content">
        <div class="wordsmith-popup-header">
          <button class="wordsmith-toggle-btn" title="Disable popup balloon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
            </svg>
          </button>
        </div>
        <div class="wordsmith-tone-selector">
          <div class="wordsmith-tone-label">Select tone:</div>
          <div class="wordsmith-tone-buttons">
            ${toneOptions
              .map(
                (tone) => `
              <button class="wordsmith-tone-btn" data-tone="${tone.value}">${tone.label}</button>
            `
              )
              .join("")}
          </div>
        </div>
        <div class="wordsmith-action-area" style="display: none;">
          <button class="wordsmith-smithen-btn">Smithen</button>
        </div>
        <div class="wordsmith-result-area" style="display: none;">
          <div class="wordsmith-result-text"></div>
          <div class="wordsmith-result-actions">
            <button class="wordsmith-accept-btn">Accept</button>
            <button class="wordsmith-close-btn">Close</button>
          </div>
        </div>
        <div class="wordsmith-loading" style="display: none;">
          <div class="wordsmith-spinner"></div>
          <span>Processing...</span>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
    return popup;
  }

  // Position popup near selection
  function positionPopup(element) {
    if (!popup || !element) return;

    const rect = element.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    let top = rect.top + window.scrollY - popupRect.height - 10;
    let left =
      rect.left + window.scrollX + rect.width / 2 - popupRect.width / 2;

    if (top < window.scrollY) {
      top = rect.bottom + window.scrollY + 10;
    }

    if (left < window.scrollX) {
      left = window.scrollX + 10;
    } else if (left + popupRect.width > window.scrollX + window.innerWidth) {
      left = window.scrollX + window.innerWidth - popupRect.width - 10;
    }

    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
  }

  // Show popup
  function showPopup(element, text, start, end) {
    // Check if popup balloon is enabled
    if (!popupBalloonEnabled) {
      return;
    }

    hidePopup();

    currentElement = element;
    selectedText = text;
    selectionStart = start;
    selectionEnd = end;

    if (element.isContentEditable) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
      }
    }

    if (!popup) {
      popup = createPopup();
      attachPopupEventListeners();
    }

    popup.style.display = "block";
    positionPopup(element);
    resetPopupState();
  }

  // Hide popup
  function hidePopup() {
    if (popup) {
      popup.style.display = "none";
      resetPopupState();
    }
    currentElement = null;
    selectedText = "";
    savedRange = null;
  }

  // Reset popup to initial state
  function resetPopupState() {
    if (!popup) return;

    const toneSelector = popup.querySelector(".wordsmith-tone-selector");
    const actionArea = popup.querySelector(".wordsmith-action-area");
    const resultArea = popup.querySelector(".wordsmith-result-area");
    const loading = popup.querySelector(".wordsmith-loading");

    if (toneSelector) toneSelector.style.display = "block";
    if (actionArea) actionArea.style.display = "none";
    if (resultArea) resultArea.style.display = "none";
    if (loading) loading.style.display = "none";

    popup.querySelectorAll(".wordsmith-tone-btn").forEach((btn) => {
      btn.classList.remove("selected");
    });
  }

  // Disable popup balloon
  function disablePopupBalloon() {
    const confirmed = confirm(
      "Disable popup balloon?\n\n" +
        "The popup will no longer appear when you select text.\n\n" +
        "To re-enable it, open the WordSmith extension settings."
    );

    if (confirmed) {
      popupBalloonEnabled = false;

      // Save to storage
      chrome.storage.local.get(["extensionSettings"], function (result) {
        const settings = result.extensionSettings || {};
        settings.enablePopupBalloon = false;
        chrome.storage.local.set({ extensionSettings: settings });
      });

      hidePopup();
    }
  }

  // Attach event listeners to popup
  function attachPopupEventListeners() {
    // Toggle button click
    popup
      .querySelector(".wordsmith-toggle-btn")
      .addEventListener("click", function () {
        disablePopupBalloon();
      });

    // Tone button clicks
    popup.querySelectorAll(".wordsmith-tone-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        popup
          .querySelectorAll(".wordsmith-tone-btn")
          .forEach((b) => b.classList.remove("selected"));
        this.classList.add("selected");

        const actionArea = popup.querySelector(".wordsmith-action-area");
        actionArea.style.display = "block";
        actionArea.dataset.selectedTone = this.dataset.tone;

        setTimeout(() => positionPopup(currentElement), 10);
      });
    });

    // Smithen button click
    popup
      .querySelector(".wordsmith-smithen-btn")
      .addEventListener("click", async function () {
        const actionArea = popup.querySelector(".wordsmith-action-area");
        const selectedTone = actionArea.dataset.selectedTone;

        if (!selectedTone || !selectedText) return;

        popup.querySelector(".wordsmith-tone-selector").style.display = "none";
        actionArea.style.display = "none";
        popup.querySelector(".wordsmith-loading").style.display = "flex";
        positionPopup(currentElement);

        try {
          const response = await chrome.runtime.sendMessage({
            action: "rephrase",
            text: selectedText,
            mode: selectedTone,
          });

          if (response.error) {
            throw new Error(response.error);
          }

          showResult(response.result);
        } catch (error) {
          console.error("WordSmith rephrase error:", error);
          alert("WordSmith Error: " + error.message);
          hidePopup();
        }
      });

    // Accept button click
    popup
      .querySelector(".wordsmith-accept-btn")
      .addEventListener("click", function () {
        const resultText = popup.querySelector(
          ".wordsmith-result-text"
        ).textContent;
        replaceSelectedText(resultText);
        hidePopup();
      });

    // Close button click
    popup
      .querySelector(".wordsmith-close-btn")
      .addEventListener("click", function () {
        hidePopup();
      });
  }

  // Show result in popup
  function showResult(result) {
    const loading = popup.querySelector(".wordsmith-loading");
    const resultArea = popup.querySelector(".wordsmith-result-area");
    const resultText = popup.querySelector(".wordsmith-result-text");

    loading.style.display = "none";
    resultText.textContent = result;
    resultArea.style.display = "block";

    positionPopup(currentElement);
  }

  // Replace selected text with result
  function replaceSelectedText(newText) {
    if (!currentElement) return;

    const element = currentElement;
    const editorType = detectEditorType(element);

    try {
      if (editorType === "discord-slate") {
        replaceWithExecCommand(newText);
      } else if (editorType === "whatsapp") {
        replaceWhatsAppText(newText);
      } else if (element.isContentEditable) {
        replaceContentEditableText(newText);
      } else {
        replaceInputText(newText);
      }
    } catch (error) {
      console.error("WordSmith text replacement error:", error);
      copyToClipboard(newText);
      alert(
        "Text copied to clipboard! Please paste it manually (Ctrl+V or Cmd+V)."
      );
    }
  }

  // Replace text in standard contenteditable elements
  function replaceContentEditableText(newText) {
    if (savedRange) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRange);

      savedRange.deleteContents();
      const textNode = document.createTextNode(newText);
      savedRange.insertNode(textNode);

      savedRange.setStartAfter(textNode);
      savedRange.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(savedRange);

      currentElement.dispatchEvent(new Event("input", { bubbles: true }));
      currentElement.dispatchEvent(new Event("change", { bubbles: true }));
      currentElement.focus();
    }
  }

  // Replace text using execCommand (for Discord/Slate.js)
  function replaceWithExecCommand(newText) {
    // Discord's Slate.js editor is very complex and doesn't reliably sync state
    // The safest approach is to copy to clipboard and let user paste
    try {
      copyToClipboard(newText);

      // Show a user-friendly notification
      const notification = document.createElement("div");
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #5865f2;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
      `;
      notification.innerHTML = `
        ✓ Text copied to clipboard!<br>
        <span style="font-size: 12px; opacity: 0.9;">Press Ctrl+V (or Cmd+V) to paste</span>
      `;

      // Add animation
      const style = document.createElement("style");
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);

      document.body.appendChild(notification);

      // Remove notification after 3 seconds
      setTimeout(() => {
        notification.style.animation = "slideIn 0.3s ease-out reverse";
        setTimeout(() => notification.remove(), 300);
      }, 3000);

      // Focus the element so user can paste immediately
      if (currentElement) {
        currentElement.focus();
      }
    } catch (error) {
      console.error("Discord clipboard error:", error);
      alert("Text ready! Please paste it manually (Ctrl+V or Cmd+V).");
    }
  }

  // Replace text in WhatsApp Web
  function replaceWhatsAppText(newText) {
    if (savedRange) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRange);

      // WhatsApp: just use insertText, it will replace the selection
      document.execCommand("insertText", false, newText);
      currentElement.focus();
    }
  }

  // Replace text in regular input/textarea
  function replaceInputText(newText) {
    const element = currentElement;
    const value = element.value;
    const newValue =
      value.substring(0, selectionStart) +
      newText +
      value.substring(selectionEnd);
    element.value = newValue;

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));

    const newCursorPos = selectionStart + newText.length;
    element.setSelectionRange(newCursorPos, newCursorPos);
    element.focus();
  }

  // Copy to clipboard as fallback
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }

  // Handle text selection for input/textarea
  function handleSelection(event) {
    try {
      const element = event.target;

      if (element.tagName !== "INPUT" && element.tagName !== "TEXTAREA") {
        return;
      }

      if (element.type === "password") {
        return;
      }

      setTimeout(() => {
        const start = element.selectionStart;
        const end = element.selectionEnd;
        const text = element.value.substring(start, end).trim();

        if (text.length > 0) {
          showPopup(element, text, start, end);
        } else {
          hidePopup();
        }
      }, 10);
    } catch (error) {
      console.debug("WordSmith selection handler error:", error);
    }
  }

  // Handle text selection for contenteditable elements
  function handleContentEditableSelection(event) {
    try {
      const element = event.target;

      if (!element.isContentEditable) {
        return;
      }

      if (window.location.hostname.includes("docs.google.com")) {
        return;
      }

      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (text.length > 0 && element.contains(selection.anchorNode)) {
          showPopup(element, text, 0, 0);
        } else {
          hidePopup();
        }
      }, 10);
    } catch (error) {
      console.debug("WordSmith contenteditable handler error:", error);
    }
  }

  // Handle clicks outside popup
  function handleClickOutside(event) {
    try {
      if (popup && popup.style.display === "block") {
        if (!popup.contains(event.target) && event.target !== currentElement) {
          hidePopup();
        }
      }
    } catch (error) {
      console.debug("WordSmith click handler error:", error);
    }
  }

  // Handle scroll to reposition popup
  function handleScroll() {
    try {
      if (popup && popup.style.display === "block" && currentElement) {
        positionPopup(currentElement);
      }
    } catch (error) {
      console.debug("WordSmith scroll handler error:", error);
    }
  }

  // Initialize with error handling
  try {
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);
    document.addEventListener("mouseup", handleContentEditableSelection);
    document.addEventListener("keyup", handleContentEditableSelection);
    document.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);

    console.log("WordSmith content script loaded successfully");
  } catch (error) {
    console.error("WordSmith initialization error:", error);
  }
})();
