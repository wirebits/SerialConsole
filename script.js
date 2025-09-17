// JavaScript File for SerialConsole
// Author - WireBits

let port;
let reader;
let writer;
let isConnected = false;
let isManualDisconnect = false;

let textDecoder = new TextDecoder();
let consoleElement = document.getElementById("console");
let inputBox = document.getElementById("inputBox");
let connectButton = document.getElementById("connectButton");

let commandHistory = [];
let historyIndex = -1;
let suppressBootGarbage = true;

async function connectSerial() {
    try {
        if (isConnected) {
            await disconnectSerial();
            return;
        }
        port = await navigator.serial.requestPort();

        await port.open({ baudRate: 115200 });
        consoleElement.value += "Connected at 115200! Go On!\n";
        isConnected = true;
        connectButton.textContent = "Disconnect";

        reader = port.readable.getReader();
        writer = port.writable.getWriter();

        suppressBootGarbage = true;
        setTimeout(() => suppressBootGarbage = false, 1500);

        readData();

    } catch (err) {
        console.error("Error:", err);
        alert("Failed to connect to serial port.");
    }
}

async function disconnectSerial() {
    try {
        isManualDisconnect = true;

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
        consoleElement.value += "Disconnected!\n";

    } catch (err) {
        console.error("Disconnection Error:", err);
        alert("Error while disconnecting!");
    } finally {
        isManualDisconnect = false;
    }
}

async function readData() {
    while (isConnected && port.readable && !isManualDisconnect) {
        try {
            const { value, done } = await reader.read();

            if (done) {
                await reader.releaseLock();
                if (isManualDisconnect) break;
                await new Promise(resolve => setTimeout(resolve, 1000));
                reader = port.readable.getReader();
                continue;
            }

            let decodedChunk = textDecoder.decode(value, { stream: true });

            if (!suppressBootGarbage) {
                consoleElement.value += decodedChunk;
                consoleElement.scrollTop = consoleElement.scrollHeight;
                if (consoleElement.scrollWidth > consoleElement.clientWidth) {
                    consoleElement.style.overflowX = "auto";
                }
            }

        } catch (err) {
            if (isManualDisconnect) break;
            try {
                await reader.releaseLock();
                await new Promise(resolve => setTimeout(resolve, 1000));
                reader = port.readable.getReader();
            } catch (e) {
                break;
            }
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
