// ─── Load settings from chrome.storage.local ─────────────────────────────────
function loadSettings() {
    chrome.storage.local.get({
        extensionIsDisabled: false,
        appearChance: 1.00,
        flipChance: 0.25,
        customImageURL: "",
        useCustomImage: false,
    }, (data) => {
        document.getElementById("disableExtension").checked = !data.extensionIsDisabled;
        document.getElementById("appearChance").value = data.appearChance * 100;
        document.getElementById("flipChance").value = data.flipChance * 100;
        document.getElementById("customImageURL").value = data.customImageURL || "";

        const srcCustom = document.getElementById("srcCustom");
        const srcBuiltin = document.getElementById("srcBuiltin");
        if (data.useCustomImage) {
            srcCustom.checked = true;
        } else {
            srcBuiltin.checked = true;
        }

        updatePreview(data.customImageURL);
    });
}

// ─── Save settings to chrome.storage.local ───────────────────────────────────
function saveSettings() {
    const data = {
        extensionIsDisabled: !document.getElementById("disableExtension").checked,
        appearChance: parseInt(document.getElementById("appearChance").value) / 100,
        flipChance: parseInt(document.getElementById("flipChance").value) / 100,
        customImageURL: document.getElementById("customImageURL").value.trim(),
        useCustomImage: document.getElementById("srcCustom").checked,
    };

    chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
            console.error("保存设置失败:", chrome.runtime.lastError);
        }
    });
}

// ─── Preview helper ───────────────────────────────────────────────────────────
function updatePreview(url) {
    const preview = document.getElementById("imagePreview");
    if (url) {
        preview.src = url;
        preview.classList.add("visible");
        preview.onerror = () => {
            preview.classList.remove("visible");
        };
    } else {
        preview.classList.remove("visible");
    }
}

// ─── File upload → base64 data URL ───────────────────────────────────────────
document.getElementById("uploadBtn").addEventListener("click", () => {
    document.getElementById("fileInput").click();
});

document.getElementById("fileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const status = document.getElementById("uploadStatus");
    status.textContent = "读取中…";

    const reader = new FileReader();
    reader.onload = (ev) => {
        const dataURL = ev.target.result;
        document.getElementById("customImageURL").value = "";
        document.getElementById("srcCustom").checked = true;

        // Store the base64 data URL directly
        chrome.storage.local.set({ customImageURL: dataURL, useCustomImage: true }, () => {
            status.textContent = `已上传: ${file.name}`;
            updatePreview(dataURL);
            // Reload all numeric fields so they stay in sync
            document.getElementById("appearChance");  // just reference, no change needed
        });
    };
    reader.onerror = () => {
        status.textContent = "读取失败，请重试";
    };
    reader.readAsDataURL(file);
});

// ─── URL input: preview on change ────────────────────────────────────────────
document.getElementById("customImageURL").addEventListener("input", (e) => {
    updatePreview(e.target.value.trim());
    saveSettings();
});

// ─── Event listeners ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", loadSettings);

document.getElementById("disableExtension").addEventListener("input", saveSettings);
document.getElementById("appearChance").addEventListener("input", saveSettings);
document.getElementById("flipChance").addEventListener("input", saveSettings);
document.getElementById("srcBuiltin").addEventListener("input", saveSettings);
document.getElementById("srcCustom").addEventListener("input", saveSettings);

