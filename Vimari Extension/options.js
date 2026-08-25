(function () {
    "use strict";

    var editor = document.getElementById("settingsEditor");
    var status = document.getElementById("status");
    var importFile = document.getElementById("importFile");

    function showStatus(message, type) {
        status.textContent = message;
        status.className = type || "";
    }

    function showSettings(value) {
        editor.value = JSON.stringify(value, null, 2) + "\n";
    }

    function parseEditor() {
        try {
            return JSON.parse(editor.value);
        } catch (error) {
            throw new Error(`Invalid JSON: ${error.message}`);
        }
    }

    async function validateEditor() {
        var candidate = parseEditor();
        var defaults = await VimariSettings.loadDefaults();
        var result = VimariSettings.validate(candidate, defaults);
        if (!result.valid) {
            throw new Error(result.errors.join("\n"));
        }
        return result.value;
    }

    document.getElementById("saveButton").addEventListener("click", async function () {
        try {
            var settings = await validateEditor();
            showSettings(await VimariSettings.save(settings));
            showStatus("Settings saved.", "success");
        } catch (error) {
            showStatus(error.message, "error");
        }
    });

    document.getElementById("resetButton").addEventListener("click", async function () {
        if (!window.confirm("Reset all Vimari settings to their defaults?")) {
            return;
        }

        try {
            showSettings(await VimariSettings.reset());
            showStatus("Default settings restored.", "success");
        } catch (error) {
            showStatus(error.message, "error");
        }
    });

    document.getElementById("importButton").addEventListener("click", function () {
        importFile.click();
    });

    importFile.addEventListener("change", async function () {
        var file = importFile.files && importFile.files[0];
        if (!file) {
            return;
        }

        try {
            editor.value = await file.text();
            showSettings(await validateEditor());
            showStatus("Configuration imported. Review it, then click Save.", "success");
        } catch (error) {
            showStatus(error.message, "error");
        } finally {
            importFile.value = "";
        }
    });

    document.getElementById("exportButton").addEventListener("click", async function () {
        try {
            var settings = await validateEditor();
            var blob = new Blob([JSON.stringify(settings, null, 2) + "\n"], { type: "application/json" });
            var link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "userSettings.json";
            link.click();
            URL.revokeObjectURL(link.href);
            showStatus("Configuration exported.", "success");
        } catch (error) {
            showStatus(error.message, "error");
        }
    });

    VimariSettings.load()
        .then(function (settings) {
            showSettings(settings);
            showStatus("Settings loaded.");
        })
        .catch(function (error) {
            showStatus(error.message, "error");
        });
})();
