const reminderListDiv = document.getElementById("reminderList");
const doneButton = document.getElementById("doneButton");

chrome.storage.local.get({reminders: []}, (data) => {
    const now = Date.now();
    const remindersList = data.reminders || [];
    const missed = remindersList.filter(r => !r.done && r.timestamp <= now);

    if (missed.length === 0) {
        reminderListDiv.innerHTML = "<p>No reminders!</p>";
        return;
    }

    // Create bullet list for multiple reminders
    const ul = document.createElement("ul");

    missed.forEach(r => {
        const li = document.createElement("li");
        const dateTime = new Date(r.timestamp);
        const repeatText = r.period ? (r.period === 24*60 ? "Daily" : "Weekly") : "None";
        li.innerHTML = `<strong>${r.message}</strong> (${dateTime.toLocaleString()}, Repeat: ${repeatText})`;
        ul.appendChild(li);
    });

    reminderListDiv.appendChild(ul);
});

// Mark all as done and close popup
doneButton.addEventListener("click", () => {
    chrome.storage.local.get({reminders: []}, (data) => {
        const now = Date.now();
        const remindersList = data.reminders || [];
        remindersList.forEach(r => {
            if (!r.done && r.timestamp <= now) r.done = true;
        });
        chrome.storage.local.set({reminders: remindersList}, () => window.close());
    });
});