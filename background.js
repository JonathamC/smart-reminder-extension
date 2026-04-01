// background.js
let reminderWindowOpen = false;

chrome.alarms.onAlarm.addListener(() => {
    if (reminderWindowOpen) return; // Prevent multiple popups

    chrome.storage.local.get({reminders: []}, (data) => {
        const now = Date.now();

        // Get all due reminders
        const dueReminders = (data.reminders || []).filter(r => 
            !r.done && r.timestamp <= now
        );

        if (dueReminders.length === 0) return;

        reminderWindowOpen = true;

        chrome.windows.create({
            url: "reminder.html",
            type: "popup",
            width: 420,
            height: 500
        }, (win) => {
            // When window closes → allow new popup later
            chrome.windows.onRemoved.addListener(function listener(id) {
                if (id === win.id) {
                    reminderWindowOpen = false;
                    chrome.windows.onRemoved.removeListener(listener);
                }
            });
        });
    });
});