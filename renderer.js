const nodemailer = require("nodemailer");
const notifier = require("node-notifier");
const axios = require("axios");
const { shell } = require("electron");
const Groq = require("groq-sdk");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");
const puppeteer = require("puppeteer");
const cron = require("node-cron");

const GROQ_KEY = "API KEY";
const EMAIL = "pratyushdahal33@gmail.com";
const EMAIL_PASSWORD = "APP KEY";

const client = new Groq.default({
  apiKey: GROQ_KEY,
  dangerouslyAllowBrowser: true
});

const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const chatBox = document.getElementById("chat-box");
const micBtn = document.getElementById("mic-btn");

const historyFile = path.join(__dirname, "chat-history.json");

let messages = [];
try {
  const saved = fs.readFileSync(historyFile, "utf8");
  messages = JSON.parse(saved);
} catch {
  messages = [];
}

const systemPrompt = `You are Pratyush AI, a personal AI friend and assistant for a guy named Pratyush. 
He is a computer science student who loves AI, coding, and building products. 
He is building projects like FoodExpress and KhelKhoj.
Talk like a cool, smart friend — not a formal assistant. 
Be casual, motivating, and helpful.
Keep replies short and conversational unless he asks for detail.`;

function saveHistory() {
  fs.writeFileSync(historyFile, JSON.stringify(messages, null, 2));
}

function addMessage(text, sender) {
  const msg = document.createElement("p");
  msg.className = sender === "user" ? "user-msg" : "bot-msg";
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function loadPreviousChat() {
  messages.forEach(m => {
    if (m.role === "user") addMessage(m.content, "user");
    if (m.role === "assistant") addMessage(m.content, "bot");
  });
}

function openMacApp(appName) {
  exec(`open -a "${appName}"`, (err) => {
    if (err) console.error("Could not open app:", err);
  });
}

async function playOnYouTube(query) {
  try {
    addMessage(`Finding "${query}" on YouTube... 🎵`, "bot");
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    const videoId = await page.evaluate(() => {
      const scripts = document.querySelectorAll("script");
      for (const script of scripts) {
        const match = script.textContent.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (match) return match[1];
      }
      return null;
    });
    await browser.close();
    if (videoId) {
      shell.openExternal(`https://www.youtube.com/watch?v=${videoId}`);
      addMessage(`Playing "${query}"! 🎵🔥`, "bot");
    } else {
      shell.openExternal(searchUrl);
      addMessage(`Opened YouTube for "${query}" 🎬`, "bot");
    }
  } catch (err) {
    console.error("Puppeteer error:", err);
    shell.openExternal(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    addMessage(`Opened YouTube for "${query}" 🎬`, "bot");
  }
}

async function sendEmail(to, subject, body) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: EMAIL, pass: EMAIL_PASSWORD }
  });

  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { margin: 0; padding: 0; background: #f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .wrapper { max-width: 480px; margin: 40px auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
      .header { background: linear-gradient(135deg, #6c63ff, #0a84ff); padding: 32px 28px; text-align: center; }
      .header h1 { color: white; font-size: 22px; margin: 0; font-weight: 700; }
      .header p { color: rgba(255,255,255,0.8); font-size: 13px; margin: 6px 0 0; }
      .avatar { width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
      .body { padding: 28px; }
      .greeting { font-size: 16px; color: #1a1a2e; font-weight: 600; margin-bottom: 8px; }
      .message { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 20px; }
      .weather-card { background: linear-gradient(135deg, #e8f4fd, #dbeafe); border-radius: 16px; padding: 20px; text-align: center; margin: 16px 0; }
      .weather-icon { font-size: 48px; margin-bottom: 8px; }
      .weather-temp { font-size: 32px; font-weight: 700; color: #1a1a2e; }
      .weather-desc { font-size: 14px; color: #555; margin-top: 4px; }
      .weather-feels { font-size: 12px; color: #888; margin-top: 4px; }
      .footer { background: #f8f9fa; padding: 20px 28px; text-align: center; border-top: 1px solid #eee; }
      .footer p { font-size: 12px; color: #999; margin: 0; }
      .footer strong { color: #6c63ff; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header">
        <h1>Good Morning! ☀️</h1>
        <p>Your daily weather update from Pratyush AI</p>
      </div>
      <div class="body">
        <p class="greeting">Hey there! 👋</p>
        <p class="message">Here's your weather update for Kathmandu today. Stay prepared and have an amazing day!</p>
        <div class="weather-card">
          <div class="weather-icon">🌤️</div>
          <div class="weather-temp">${body.match(/(\d+)°C/)?.[1] || '20'}°C</div>
          <div class="weather-desc">${body.match(/: (.+),/)?.[1] || 'Clear'}</div>
          <div class="weather-feels">Feels like ${body.match(/like (\d+)°C/)?.[1] || '20'}°C</div>
        </div>
        <p class="message">Have a productive day! 💪</p>
      </div>
      <div class="footer">
        <p>Sent automatically by <strong>Pratyush AI</strong> 🤖</p>
        <p style="margin-top:4px;">Built by Pratyush Dahal</p>
      </div>
    </div>
  </body>
  </html>
  `;

  await transporter.sendMail({
    from: `Pratyush Dahal <${EMAIL}>`,
    to,
    subject,
    text: body, // fallback plain text
    html: htmlBody // beautiful HTML version
  });
}

async function getWeather(city) {
  try {
    const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
    const data = res.data.current_condition[0];
    const temp = data.temp_C;
    const feels = data.FeelsLikeC;
    const desc = data.weatherDesc[0].value;
    return `Weather in ${city}: ${desc}, ${temp}°C (feels like ${feels}°C) 🌤️`;
  } catch (err) {
    return `Couldn't get weather for ${city}. Try again!`;
  }
}

function setReminder(minutes, message) {
  setTimeout(() => {
    notifier.notify({
      title: "Pratyush AI ⏰",
      message: message,
      sound: true
    });
  }, minutes * 60 * 1000);
}

function handleCommands(text) {
  const lower = text.toLowerCase();

  // Play YouTube
  if (lower.includes("play ") && (lower.includes("youtube") || lower.includes("music") || lower.includes("song"))) {
    const query = text
      .replace(/play/i, "")
      .replace(/on youtube/i, "")
      .replace(/in youtube/i, "")
      .replace(/on music/i, "")
      .replace(/song/i, "")
      .trim();
    playOnYouTube(query);
    return null;
  }

  // Weather
  // Weather (only if NOT sending email)
if (lower.includes("weather") && !lower.includes("email")) {
    let city = "Kathmandu";
    const weatherMatch = text.match(/weather\s+in\s+([a-zA-Z\s]+)/i);
    if (weatherMatch) city = weatherMatch[1].trim();
    getWeather(city).then(result => addMessage(result, "bot"));
    return null;
  }

  // Reminder
  const reminderMatch = text.match(/remind\s+me\s+in\s+(\d+)\s*(min|minute|hour|hr)/i);
  if (reminderMatch) {
    let time = parseInt(reminderMatch[1]);
    const unit = reminderMatch[2].toLowerCase();
    if (unit.includes("hour") || unit === "hr") time *= 60;
    const msgMatch = text.match(/to\s+(.+)/i);
    const reminderMsg = msgMatch ? msgMatch[1] : "Time's up!";
    setReminder(time, reminderMsg);
    return `Got it! Reminding you to "${reminderMsg}" in ${reminderMatch[1]} ${unit}(s) ⏰`;
  }

  // Email
  const emailMatch = text.match(/send\s+(?:an?\s+)?email\s+to\s+([\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,})/i);
if (emailMatch) {
  const to = emailMatch[1];

  // Extract subject
  const subjectMatch = text.match(/subject[:\s]+([^,\.]+)/i);
  const subject = subjectMatch ? subjectMatch[1].trim() : "Hey from Pratyush!";

  // Extract body
  const bodyMatch = text.match(/(?:body|saying|that|:)\s+(.+)/i);
  let body = bodyMatch ? bodyMatch[1] : text;

  // If body mentions weather, fetch and include it
  if (body.toLowerCase().includes("weather") || text.toLowerCase().includes("weather")) {
    const cityMatch = text.match(/weather\s+of\s+([a-zA-Z\s]+)/i) || text.match(/weather\s+in\s+([a-zA-Z\s]+)/i);
    const city = cityMatch ? cityMatch[1].trim() : "Kathmandu";

    addMessage(`Getting weather and sending email to ${to}... 📧🌤️`, "bot");

    getWeather(city).then(weather => {
      const fullBody = `${body}\n\n${weather}`;
      sendEmail(to, subject, fullBody)
        .then(() => addMessage(`Email sent to ${to} with weather! ✅`, "bot"))
        .catch(err => addMessage(`Failed: ${err.message}`, "bot"));
    });
    return null;
  }

  addMessage(`Sending email to ${to}... 📧`, "bot");
  sendEmail(to, subject, body)
    .then(() => addMessage(`Email sent to ${to}! ✅`, "bot"))
    .catch(err => addMessage(`Failed: ${err.message}`, "bot"));
  return null;
}

  // Websites
  if (lower.includes("open youtube")) { shell.openExternal("https://youtube.com"); return "Opening YouTube! 🎬"; }
  if (lower.includes("open github")) { shell.openExternal("https://github.com"); return "Opening GitHub! 💻"; }
  if (lower.includes("open google")) { shell.openExternal("https://google.com"); return "Opening Google! 🔍"; }
  if (lower.includes("open instagram")) { shell.openExternal("https://instagram.com"); return "Opening Instagram! 📸"; }
  if (lower.includes("open spotify")) { shell.openExternal("https://open.spotify.com"); return "Opening Spotify! 🎵"; }
  if (lower.includes("open twitter") || lower.includes("open x")) { shell.openExternal("https://x.com"); return "Opening X! 🐦"; }

  // Mac apps
  if (lower.includes("open vs code") || lower.includes("open vscode")) { openMacApp("Visual Studio Code"); return "Opening VS Code! 🖥️"; }
  if (lower.includes("open finder")) { openMacApp("Finder"); return "Opening Finder! 📁"; }
  if (lower.includes("open notes")) { openMacApp("Notes"); return "Opening Notes! 📝"; }
  if (lower.includes("open terminal")) { openMacApp("Terminal"); return "Opening Terminal! ⌨️"; }
  if (lower.includes("open safari")) { openMacApp("Safari"); return "Opening Safari! 🌐"; }
  if (lower.includes("open chrome")) { openMacApp("Google Chrome"); return "Opening Chrome! 🌐"; }
  if (lower.includes("open whatsapp")) { openMacApp("WhatsApp"); return "Opening WhatsApp! 💬"; }
  if (lower.includes("open calculator")) { openMacApp("Calculator"); return "Opening Calculator! 🔢"; }

  // Clear chat
  if (lower.includes("clear chat")) {
    chatBox.innerHTML = "";
    messages = [];
    saveHistory();
    return "Chat cleared! 🧹";
  }

  return null;
}

async function handleInput() {
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";

  const commandReply = handleCommands(text);
  if (commandReply) { addMessage(commandReply, "bot"); return; }

  const lower = text.toLowerCase();
  if (lower.includes("play ")) return;
  if (lower.includes("weather") && !lower.includes("email")) return;
if (lower.includes("send") && lower.includes("email")) return;

  addMessage("...", "bot");
  messages.push({ role: "user", content: text });

  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 1024
    });
    const reply = response.choices[0].message.content;
    messages.push({ role: "assistant", content: reply });
    saveHistory();
    const allMsgs = chatBox.querySelectorAll(".bot-msg");
    allMsgs[allMsgs.length - 1].textContent = reply;
  } catch (err) {
    const allMsgs = chatBox.querySelectorAll(".bot-msg");
    allMsgs[allMsgs.length - 1].textContent = "Error: " + err.message;
    console.error(err);
  }
}

// Voice
let isListening = false;
let mediaRecorder = null;
let audioChunks = [];

micBtn.addEventListener("click", async () => {
  if (isListening) { mediaRecorder.stop(); return; }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    isListening = true;
    micBtn.textContent = "🔴";
    micBtn.classList.add("listening");
    addMessage("Listening... speak now! 🎤", "bot");

    mediaRecorder.ondataavailable = (e) => { audioChunks.push(e.data); };

    mediaRecorder.onstop = async () => {
      isListening = false;
      micBtn.textContent = "🎤";
      micBtn.classList.remove("listening");
      stream.getTracks().forEach(t => t.stop());

      const allMsgs = chatBox.querySelectorAll(".bot-msg");
      allMsgs[allMsgs.length - 1].textContent = "Processing voice... ⏳";

      try {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const tmpFile = "/tmp/pratyush-voice.webm";
        fs.writeFileSync(tmpFile, buffer);

        const transcription = await client.audio.transcriptions.create({
          file: fs.createReadStream(tmpFile),
          model: "whisper-large-v3",
          language: "en"
        });

        const transcript = transcription.text.trim();
        const msgs = chatBox.querySelectorAll(".bot-msg");
        msgs[msgs.length - 1].remove();

        if (transcript) {
          input.value = transcript;
          handleInput();
        } else {
          addMessage("Couldn't hear you, try again! 🎤", "bot");
        }
      } catch (err) {
        console.error("Whisper error:", err);
        const msgs = chatBox.querySelectorAll(".bot-msg");
        msgs[msgs.length - 1].textContent = "Error: " + err.message;
      }
    };

    mediaRecorder.start();
    setTimeout(() => { if (isListening && mediaRecorder) mediaRecorder.stop(); }, 6000);

  } catch (err) {
    console.error("Mic error:", err);
    addMessage("Mic access denied! 🎤", "bot");
  }
});
cron.schedule("30 8 * * *", async () => {
  const friends = [
    "prajwalbhattarai125@gmail.com",
    "pratyushdahal33@gmail.com"
  ];
  
  const weather = await getWeather("Kathmandu");
  const subject = "☀️ Good Morning! Today's Kathmandu Weather";
  const body = `Good morning!\n\nHere's today's weather in Kathmandu:\n\n${weather}\n\n— Sent by Pratyush AI`;
  
  for (const friendEmail of friends) {
    sendEmail(friendEmail, subject, body)
      .then(() => {
        console.log(`Sent to ${friendEmail}!`);
        addMessage(`✅ Sent to ${friendEmail}!`, "bot");
      })
      .catch(err => {
        console.error(`Failed for ${friendEmail}:`, err);
        addMessage(`❌ Failed: ${err.message}`, "bot");
      });
    }

  addMessage(`☀️ Morning weather sent to ${friends.length} friends!`, "bot");
});

sendBtn.addEventListener("click", handleInput);
input.addEventListener("keydown", (e) => { if (e.key === "Enter") handleInput(); });

loadPreviousChat();