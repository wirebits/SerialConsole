// JavaScript File for SerialConsole
// Author - WireBits

let port;
let reader;
let writer;
let isConnected = false;
let textDecoder = new TextDecoder();
let consoleElement = document.getElementById("console");
let inputBox = document.getElementById("inputBox");
let connectButton = document.getElementById("connectButton");

let commandHistory = [];
let historyIndex = -1;

async function connectSerial() {
    try {
        if (isConnected) {
            await disconnectSerial();
            return;
        }
        port = await navigator.serial.requestPort();
        let baudRate = document.getElementById('baudRate').value;

        if (baudRate === "Select Baud Rate") {
            alert("Please select a valid baud rate.");
            return;
        }
        await port.open({ baudRate: parseInt(baudRate) });
        consoleElement.value += "Connected! Go On!\n";
        isConnected = true;
        connectButton.textContent = "Disconnect";
        reader = port.readable.getReader();
        writer = port.writable.getWriter();
        readData();
    } catch (err) {
        console.error("Error:", err);
        alert("Failed to connect to serial port.");
    }
}

async function disconnectSerial() {
    try {
        if (reader) {
            await reader.cancel();
            await reader.releaseLock();
        }
        if (writer) {
            await writer.close();
            await writer.releaseLock();
        }
        if (port) {
            await port.close();
        }
        isConnected = false;
        connectButton.textContent = "Connect";
        consoleElement.value += "\nDisconnected!\n";
    } catch (err) {
        console.error("Disconnection Error:", err);
        alert("Error while disconnecting!");
    }
}

async function readData() {
    while (port.readable) {
        try {
            const { value, done } = await reader.read();
            if (done) break;
            let decodedChunk = textDecoder.decode(value, { stream: true });
            consoleElement.value += decodedChunk;
            consoleElement.scrollTop = consoleElement.scrollHeight;
            if (consoleElement.scrollWidth > consoleElement.clientWidth) {
                consoleElement.style.overflowX = "auto";
            }
        } catch (err) {
            console.error("Read error:", err);
            break;
        }
    }
}

async function sendData() {
    if (!isConnected) {
        alert("Not connected to a serial port!");
        return;
    }
    let data = inputBox.value.trim();
    if (data === "") return;
    let encodedData = new TextEncoder().encode(data + "\n");
    await writer.write(encodedData);
    consoleElement.value += "Sent: " + data + "\n";
    commandHistory.push(data);
    historyIndex = commandHistory.length;
    consoleElement.scrollTop = consoleElement.scrollHeight;
    inputBox.value = "";
}

function clearConsole() {
    consoleElement.value = "";
}

function downloadCommandHistory() {
    if (commandHistory.length === 0) {
        alert("No command history available.");
        return;
    }
    let date = new Date();
    let hours = date.getHours() % 12 || 12;
    let minutes = date.getMinutes().toString().padStart(2, '0');
    let seconds = date.getSeconds().toString().padStart(2, '0');
    let ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    let dateTimeString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${hours}-${minutes}-${seconds} ${ampm}`;
    let fileName = `${dateTimeString}-CommandHistory.txt`;
    let historyContent = commandHistory.map(cmd => `[${dateTimeString}] ${cmd}`).join("\n");
    let blob = new Blob([historyContent], { type: "text/plain" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleCommandHistory(event) {
    if (event.key === "ArrowUp") {
        if (historyIndex > 0) {
            historyIndex--;
            inputBox.value = commandHistory[historyIndex];
        }
        event.preventDefault();
    } else if (event.key === "ArrowDown") {
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            inputBox.value = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            inputBox.value = "";
        }
        event.preventDefault();
    }
}

inputBox.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendData();
    }
});

inputBox.addEventListener("keydown", handleCommandHistory);

document.getElementById("connectButton").addEventListener("click", connectSerial);
document.getElementById("sendButton").addEventListener("click", sendData);
document.getElementById("clearButton").addEventListener("click", clearConsole);
document.getElementById("historyButton").addEventListener("click", downloadCommandHistory);