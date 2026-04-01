const messageInput = document.getElementById("message");
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const repeatSelect = document.getElementById("repeat");
const setBtn = document.getElementById("setReminder");

const activeTab = document.getElementById("activeTab");
const passedTab = document.getElementById("passedTab");

const activeDiv = document.getElementById("activeReminders");
const passedDiv = document.getElementById("passedReminders");

// Highlight the active tab darker
function updateTabStyles() {
    if (activeDiv.style.display !== "none") {
        activeTab.classList.add("active");
        passedTab.classList.remove("active");
    } else {
        activeTab.classList.remove("active");
        passedTab.classList.add("active");
    }
}

// By default, show active reminders
activeDiv.style.display = "block";
passedDiv.style.display = "none";
updateTabStyles();

// Tabs toggle
activeTab.addEventListener("click", () => {
    activeDiv.style.display = "block";
    passedDiv.style.display = "none";
    updateTabStyles();
});

passedTab.addEventListener("click", () => {
    activeDiv.style.display = "none";
    passedDiv.style.display = "block";
    updateTabStyles();
});

// Auto-show picker
dateInput.addEventListener("focus", () => dateInput.showPicker?.());
timeInput.addEventListener("focus", () => timeInput.showPicker?.());

// Tab navigation: skip internal date fields if date already selected
dateInput.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && dateInput.value) {
        e.preventDefault();
        timeInput.focus();
    }
});

timeInput.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
        e.preventDefault();
        repeatSelect.focus();
    }
});

repeatSelect.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
        e.preventDefault();
        setBtn.focus();
    }
});

// Render reminders
function renderReminders() {
    chrome.storage.local.get({reminders: []}, (data) => {
        const now = Date.now();
        activeDiv.innerHTML = "";
        passedDiv.innerHTML = "";

        // Sort active reminders soonest first
        const sortedReminders = (data.reminders || []).sort((a, b) => a.timestamp - b.timestamp);

        sortedReminders.forEach(r => {
            const dateTime = new Date(r.timestamp);
            const repeatText = r.period ? (r.period === 24*60 ? "Daily" : "Weekly") : "None";

            const div = document.createElement("div");
            div.className = "reminder-item";

            const textDiv = document.createElement("div");
            textDiv.className = "reminder-text";
            textDiv.innerHTML = `<strong>${r.message}</strong><br>${dateTime.toLocaleString()}<br>Repeat: ${repeatText}`;

            const btnDiv = document.createElement("div");
            btnDiv.className = "reminder-buttons";

            if (!r.done && r.timestamp >= now) {
                const modifyBtn = document.createElement("button");
                modifyBtn.textContent = "Modify";
                modifyBtn.style.backgroundColor = "#4CAF50";
                modifyBtn.style.color = "white";
                modifyBtn.addEventListener("click", () => modifyReminder(r.id));

                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Delete";
                deleteBtn.style.backgroundColor = "#f44336";
                deleteBtn.style.color = "white";
                deleteBtn.addEventListener("click", () => deleteReminder(r.id));

                btnDiv.appendChild(modifyBtn);
                btnDiv.appendChild(deleteBtn);

                div.appendChild(textDiv);
                div.appendChild(btnDiv);
                activeDiv.appendChild(div);
            } else {
                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Delete";
                deleteBtn.style.backgroundColor = "#f44336";
                deleteBtn.style.color = "white";
                deleteBtn.addEventListener("click", () => deleteReminder(r.id));

                btnDiv.appendChild(deleteBtn);
                div.appendChild(textDiv);
                div.appendChild(btnDiv);
                passedDiv.appendChild(div);
            }
        });
    });
}

// Delete by ID
function deleteReminder(id) {
    chrome.storage.local.get({reminders: []}, (data) => {
        const reminders = (data.reminders || []).filter(r => r.id !== id);
        chrome.storage.local.set({reminders}, renderReminders);
        chrome.alarms.clear(id.toString()); // cancel old alarm
    });
}

// Modify by ID
function modifyReminder(id) {
    chrome.storage.local.get({reminders: []}, (data) => {
        const r = (data.reminders || []).find(r => r.id === id);
        if (!r) return;

        messageInput.value = r.message;
        const d = new Date(r.timestamp);
        dateInput.value = d.toISOString().split("T")[0];
        timeInput.value = d.toTimeString().slice(0,5);
        repeatSelect.value = r.period === 24*60 ? "daily" : r.period === 7*24*60 ? "weekly" : "";

        deleteReminder(r.id);
    });
}

// Add new reminder
setBtn.addEventListener("click", () => {
    const message = messageInput.value.trim();
    const date = dateInput.value;
    const time = timeInput.value;
    const repeat = repeatSelect.value;

    if (!message || !date || !time) return alert("Enter message, date, and time.");

    const [y, m, d] = date.split("-");
    const [h, min] = time.split(":");
    const timestamp = new Date(y, m-1, d, h, min).getTime();

    let period = null;
    if (repeat === "daily") period = 24*60;
    if (repeat === "weekly") period = 7*24*60;

    const reminderId = Date.now();
    const reminder = { id: reminderId, message, timestamp, period, done: false };

    chrome.storage.local.get({reminders: []}, (data) => {
        const reminders = data.reminders || [];
        reminders.push(reminder);
        chrome.storage.local.set({reminders}, () => {
            let delayMinutes = (timestamp - Date.now()) / 60000;
            if (delayMinutes < 0.5) delayMinutes = 0.5;
            chrome.alarms.create(reminderId.toString(), {delayInMinutes: delayMinutes, periodInMinutes: period});

            renderReminders();

            messageInput.value = "";
            dateInput.value = "";
            timeInput.value = "";
            repeatSelect.value = "";
        });
    });
});

// Initial render
renderReminders();