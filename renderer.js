const nodemailer = require("nodemailer");
const axios = require("axios");
const { shell } = require("electron");
const Groq = require("groq-sdk");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");
const puppeteer = require("puppeteer");
const cron = require("node-cron");

const GROQ_KEY = "key";
const EMAIL = "pratyushdahal33@gmail.com";
const EMAIL_PASSWORD = "key";

const client = new Groq.default({
  apiKey: GROQ_KEY,
  dangerouslyAllowBrowser: true
});

const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const chatBox = document.getElementById("chat-box");
const micBtn = document.getElementById("mic-btn");

const historyFile = path.join(__dirname, "chat-history.json");

// Mac notification using osascript
function showNotification(title, message) {
  const safeMsg = message.replace(/"/g, '').replace(/'/g, '').replace(/\n/g, ' ');
  const safeTitle = title.replace(/"/g, '').replace(/'/g, '');
  exec(`osascript -e 'display dialog "${safeMsg}" with title "${safeTitle}" buttons {"OK"} default button "OK"'`, (err) => {
    if (err) console.error("Notification error:", err);
  });
}

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
  if (sender === "bot") {
    const row = document.createElement("div");
    row.className = "bot-row";
    row.innerHTML = `<div class="bot-av">P</div><p class="bot-msg">${text}</p>`;
    chatBox.appendChild(row);
  } else {
    const msg = document.createElement("p");
    msg.className = "user-msg";
    msg.textContent = text;
    chatBox.appendChild(msg);
  }
  chatBox.scrollTop = chatBox.scrollHeight;
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

function setReminder(minutes, message) {
  setTimeout(() => {
    showNotification("Pratyush AI", message);
    addMessage(`Reminder: ${message}`, "bot");
  }, minutes * 60 * 1000);
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
    await new Promise(r => setTimeout(r, 3000));
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
      shell.openExternal(`https://www.youtube.com/watch?v=${videoId}&autoplay=1`);
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
      .avatar { width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; color: white; }
      .body { padding: 28px; }
      .greeting { font-size: 16px; color: #1a1a2e; font-weight: 600; margin-bottom: 8px; }
      .message { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 20px; }
      .weather-card { background: linear-gradient(135deg, #e8f4fd, #dbeafe); border-radius: 16px; padding: 20px; text-align: center; margin: 16px 0; }
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
        <div class="avatar">PD</div>
        <h1>Good Morning!</h1>
        <p>Your daily weather update from Pratyush AI</p>
      </div>
      <div class="body">
        <p class="greeting">Hey there!</p>
        <p class="message">Here is your weather update for Kathmandu today. Stay prepared and have an amazing day!</p>
        <div class="weather-card">
          <div class="weather-temp">${body.match(/(\d+)°C/)?.[1] || '20'}°C</div>
          <div class="weather-desc">${body.match(/: (.+),/)?.[1] || 'Clear'}</div>
          <div class="weather-feels">Feels like ${body.match(/like (\d+)°C/)?.[1] || '20'}°C</div>
        </div>
        <p class="message">Have a productive day!</p>
      </div>
      <div class="footer">
        <p>Sent automatically by <strong>Pratyush AI</strong></p>
        <p style="margin-top:4px;">Built by Pratyush Dahal</p>
      </div>
    </div>
  </body>
  </html>`;
  await transporter.sendMail({
    from: `Pratyush Dahal <${EMAIL}>`,
    to, subject, text: body, html: htmlBody
  });
}

async function getWeather(city) {
  try {
    const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
    const data = res.data.current_condition[0];
    return `Weather in ${city}: ${data.weatherDesc[0].value}, ${data.temp_C}°C (feels like ${data.FeelsLikeC}°C)`;
  } catch (err) {
    return `Couldn't get weather for ${city}. Try again!`;
  }
}

async function webSearch(query) {
  try {
    addMessage(`Searching for "${query}"... 🔍`, "bot");
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await axios.get(url);
    const data = res.data;
    let result = "";
    if (data.AbstractText) {
      result = data.AbstractText;
    } else if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      result = data.RelatedTopics.filter(t => t.Text).slice(0, 3).map(t => t.Text).join("\n\n");
    }
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Answer this question briefly in 3-4 lines like a knowledgeable friend." },
        { role: "user", content: result ? `Query: ${query}\n\nResult: ${result}` : query }
      ],
      max_tokens: 200
    });
    addMessage(`🔍 ${response.choices[0].message.content}`, "bot");
  } catch (err) {
    console.error("Search error:", err);
    addMessage("Search failed, try again! 🔍", "bot");
  }
}

async function getNEPSE(query) {
  try {
    addMessage("Fetching live NEPSE data... 📈", "bot");
    const cheerio = require("cheerio");
    const lower = query.toLowerCase();

    // Individual stock lookup
    if (lower.includes("price of") || lower.includes("stock price")) {
      const stockSymbol = query
        .replace(/price of/gi, "")
        .replace(/stock price/gi, "")
        .replace(/stock|share|price/gi, "")
        .trim()
        .toUpperCase();
      try {
        const res = await axios.get(
          `https://www.sharesansar.com/company/${stockSymbol.toLowerCase()}`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            timeout: 10000
          }
        );
        const $ = cheerio.load(res.data);
        let price = "", change = "", high = "", low = "", week52 = "";

        $("table tr").each((i, el) => {
          const tds = $(el).find("td");
          if (tds.length >= 2) {
            const label = $(tds[0]).text().trim().toLowerCase();
            const value = $(tds[1]).text().trim();
            if (label.includes("ltp") || label.includes("last traded")) price = value;
            if (label.includes("change") && label.includes("%")) change = value;
            if (label.includes("high") && label.includes("day")) high = value;
            if (label.includes("low") && label.includes("day")) low = value;
            if (label.includes("52")) week52 = value;
          }
        });

        if (!change || !high) {
          const allTds = $("td");
          allTds.each((i, el) => {
            const text = $(el).text().trim().toLowerCase();
            const nextVal = $(allTds[i+1]).text().trim();
            if (text.includes("day high")) high = nextVal;
            if (text.includes("day low")) low = nextVal;
            if (text.includes("% change")) change = nextVal;
            if (text.includes("52 week high")) week52 = nextVal;
          });
        }

        if (!price) {
          price = $(".ltp, .stock-price, [class*='price']").first().text().trim();
        }

        if (price) {
          addMessage(
            `📊 ${stockSymbol}:\n\n` +
            `💰 LTP: Rs.${price}\n` +
            `📈 Change: ${change}\n` +
            `⬆️ High: ${high}\n` +
            `⬇️ Low: ${low}\n` +
            `📅 52 Week: ${week52}`,
            "bot"
          );
        } else {
          shell.openExternal(`https://merolagani.com/CompanyDetail.aspx?comSymbol=${stockSymbol}`);
          addMessage(`Opened ${stockSymbol} on Merolagani for you! 📊`, "bot");
        }
      } catch(e) {
        shell.openExternal(`https://merolagani.com/CompanyDetail.aspx?comSymbol=${stockSymbol}`);
        addMessage(`Opened ${stockSymbol} on Merolagani! 📊`, "bot");
      }
      return;
    }

    // Market summary + gainers/losers
    const res = await axios.get("https://merolagani.com/Handlers/TradeSummaryHandler.ashx", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": "https://merolagani.com/",
        "Accept": "application/json, text/javascript, */*"
      },
      timeout: 10000
    });
    const data = res.data;

    if (lower.includes("gainer") || lower.includes("best")) {
      const gainers = data.g || [];
      if (gainers.length > 0) {
        const list = gainers.slice(0, 7).map(s => `${s.s}: Rs.${s.ltp} (+${s.pc}%)`).join("\n");
        addMessage(`🏆 Top Gainers Today:\n\n${list}`, "bot");
      } else {
        addMessage("Market closed! Come back during trading hours 📊", "bot");
      }
      return;
    }

    if (lower.includes("loser") || lower.includes("worst") || lower.includes("down")) {
      const losers = data.l || [];
      if (losers.length > 0) {
        const list = losers.slice(0, 7).map(s => `${s.s}: Rs.${s.ltp} (${s.pc}%)`).join("\n");
        addMessage(`📉 Top Losers Today:\n\n${list}`, "bot");
      } else {
        addMessage("Market closed! Come back during trading hours 📊", "bot");
      }
      return;
    }

    const index = data.ni || "N/A";
    const change = data.nc || "N/A";
    const turnover = data.t || "N/A";
    const traded = data.ts || "N/A";

    addMessage(
      `📊 NEPSE Today:\n\n` +
      `📈 Index: ${index}\n` +
      `🔄 Change: ${change}\n` +
      `💰 Turnover: Rs.${turnover}\n` +
      `📝 Shares Traded: ${traded}`,
      "bot"
    );

  } catch (err) {
    console.error("NEPSE error:", err.message);
    addMessage("NEPSE data unavailable. Market might be closed! 📊", "bot");
  }
}

async function takeScreenshot() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const screenshotPath = path.join(require("os").homedir(), "Desktop", `screenshot-${timestamp}.png`);
    exec(`screencapture "${screenshotPath}"`, (err) => {
      if (err) {
        addMessage("Screenshot failed! ❌", "bot");
      } else {
        addMessage(`Screenshot saved to Desktop!\nFile: screenshot-${timestamp}.png`, "bot");
      }
    });
  } catch (err) {
    addMessage("Screenshot failed! ❌", "bot");
  }
}

function handleCommands(text) {
  const lower = text.toLowerCase();

  if (lower.includes("play ")) {
    let query = text;
    query = query.replace(/all good like can you/gi, "");
    query = query.replace(/can you/gi, "");
    query = query.replace(/play for me/gi, "");
    query = query.replace(/play me/gi, "");
    query = query.replace(/please/gi, "");
    query = query.replace(/hey bro/gi, "");
    query = query.replace(/in youtube/gi, "");
    query = query.replace(/on youtube/gi, "");
    query = query.replace(/in music/gi, "");
    query = query.replace(/\?/g, "");
    query = query.replace(/play/gi, "");
    query = query.trim();
    playOnYouTube(query);
    return null;
  }

  if (lower.includes("weather") && !lower.includes("email")) {
    let city = "Kathmandu";
    const weatherMatch = text.match(/weather\s+in\s+([a-zA-Z\s]+)/i);
    if (weatherMatch) city = weatherMatch[1].trim();
    getWeather(city).then(result => addMessage(result, "bot"));
    return null;
  }

  const reminderMatch = text.match(/remind\s+me\s+in\s+(\d+)\s*(min|minute|hour|hr)/i);
  if (reminderMatch) {
    let time = parseInt(reminderMatch[1]);
    const unit = reminderMatch[2].toLowerCase();
    if (unit.includes("hour") || unit === "hr") time *= 60;
    const msgMatch = text.match(/to\s+(.+)/i);
    const reminderMsg = msgMatch ? msgMatch[1] : "Time's up!";
    setReminder(time, reminderMsg);
    return `Got it! Reminding you to "${reminderMsg}" in ${reminderMatch[1]} ${unit}(s)`;
  }

  const emailMatch = text.match(/send\s+(?:an?\s+)?email\s+to\s+([\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) {
    const to = emailMatch[1];
    const subjectMatch = text.match(/subject[:\s]+([^,\.]+)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : "Hey from Pratyush!";
    const bodyMatch = text.match(/(?:body|saying|that|:)\s+(.+)/i);
    let body = bodyMatch ? bodyMatch[1] : text;
    if (body.toLowerCase().includes("weather") || text.toLowerCase().includes("weather")) {
      const cityMatch = text.match(/weather\s+of\s+([a-zA-Z\s]+)/i) || text.match(/weather\s+in\s+([a-zA-Z\s]+)/i);
      const city = cityMatch ? cityMatch[1].trim() : "Kathmandu";
      addMessage(`Getting weather and sending email to ${to}...`, "bot");
      getWeather(city).then(weather => {
        sendEmail(to, subject, `${body}\n\n${weather}`)
          .then(() => addMessage(`Email sent to ${to} with weather!`, "bot"))
          .catch(err => addMessage(`Failed: ${err.message}`, "bot"));
      });
      return null;
    }
    addMessage(`Sending email to ${to}...`, "bot");
    sendEmail(to, subject, body)
      .then(() => addMessage(`Email sent to ${to}!`, "bot"))
      .catch(err => addMessage(`Failed: ${err.message}`, "bot"));
    return null;
  }

  if (lower.includes("open youtube")) { shell.openExternal("https://youtube.com"); return "Opening YouTube!"; }
  if (lower.includes("open github")) { shell.openExternal("https://github.com"); return "Opening GitHub!"; }
  if (lower.includes("open google")) { shell.openExternal("https://google.com"); return "Opening Google!"; }
  if (lower.includes("open instagram")) { shell.openExternal("https://instagram.com"); return "Opening Instagram!"; }
  if (lower.includes("open spotify")) { shell.openExternal("https://open.spotify.com"); return "Opening Spotify!"; }
  if (lower.includes("open twitter") || lower.includes("open x")) { shell.openExternal("https://x.com"); return "Opening X!"; }
  if (lower.includes("open vs code") || lower.includes("open vscode")) { openMacApp("Visual Studio Code"); return "Opening VS Code!"; }
  if (lower.includes("open finder")) { openMacApp("Finder"); return "Opening Finder!"; }
  if (lower.includes("open notes")) { openMacApp("Notes"); return "Opening Notes!"; }
  if (lower.includes("open terminal")) { openMacApp("Terminal"); return "Opening Terminal!"; }
  if (lower.includes("open safari")) { openMacApp("Safari"); return "Opening Safari!"; }
  if (lower.includes("open chrome")) { openMacApp("Google Chrome"); return "Opening Chrome!"; }
  if (lower.includes("open whatsapp")) { openMacApp("WhatsApp"); return "Opening WhatsApp!"; }
  if (lower.includes("open calculator")) { openMacApp("Calculator"); return "Opening Calculator!"; }

  if (lower.includes("screenshot") || lower.includes("take a screenshot")) {
    takeScreenshot();
    return null;
  }

  if (lower.includes("nepse") || lower.includes("gainer") || lower.includes("loser") || lower.includes("share market")) {
    getNEPSE(text);
    return null;
  }

  const stockMatch = text.match(/price\s+of\s+([A-Za-z]{2,6})/i);
  if (stockMatch) {
    getNEPSE(`price of ${stockMatch[1]}`);
    return null;
  }

  if (lower.startsWith("search ") || lower.includes("search for") || lower.includes("look up")) {
    const query = text.replace(/^search\s+for?\s*/i, "").replace(/^look\s+up\s*/i, "").trim();
    webSearch(query);
    return null;
  }

  if (lower.includes("clear chat")) {
    chatBox.innerHTML = "";
    messages = [];
    saveHistory();
    return "Chat cleared!";
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
  if (lower.includes("nepse") || lower.includes("gainer") || lower.includes("loser") || lower.includes("share market")) return;
  if (lower.includes("price of") || lower.includes("stock price")) return;
  if (lower.match(/price of [a-z]/i)) return;
  if (lower.startsWith("search ")) return;
  if (lower.includes("screenshot")) return;

  addMessage("...", "bot");
  messages.push({ role: "user", content: text });
  if (messages.length > 20) messages = messages.slice(-20);

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

function quickSend(text) {
  input.value = text;
  handleInput();
}

function clearChat() {
  chatBox.innerHTML = "";
  messages = [];
  saveHistory();
  addMessage("Chat cleared! Fresh start", "bot");
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
    micBtn.innerHTML = '<i class="fa-solid fa-circle" style="color:white;font-size:12px;"></i>';
    micBtn.classList.add("listening");
    addMessage("Listening... speak now!", "bot");
    mediaRecorder.ondataavailable = (e) => { audioChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      isListening = false;
      micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
      micBtn.classList.remove("listening");
      stream.getTracks().forEach(t => t.stop());
      const allMsgs = chatBox.querySelectorAll(".bot-msg");
      allMsgs[allMsgs.length - 1].textContent = "Processing voice...";
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
          addMessage("Couldn't hear you, try again!", "bot");
        }
      } catch (err) {
        console.error("Whisper error:", err);
        const msgs = chatBox.querySelectorAll(".bot-msg");
        msgs[msgs.length - 1].textContent = "Voice error: " + err.message;
      }
    };
    mediaRecorder.start();
    setTimeout(() => { if (isListening && mediaRecorder) mediaRecorder.stop(); }, 6000);
  } catch (err) {
    console.error("Mic error:", err);
    addMessage("Mic access denied!", "bot");
  }
});

// Morning weather email — 8:30 AM daily
cron.schedule("30 8 * * *", async () => {
  const friends = ["prajwalbhattarai125@gmail.com", "pratyushdahal33@gmail.com"];
  const weather = await getWeather("Kathmandu");
  const subject = "Good Morning! Today's Kathmandu Weather";
  const body = `Good morning!\n\nHere is today's weather in Kathmandu:\n\n${weather}\n\n— Sent by Pratyush AI`;
  for (const friendEmail of friends) {
    sendEmail(friendEmail, subject, body)
      .then(() => { console.log(`Sent to ${friendEmail}!`); })
      .catch(err => { console.error(`Failed:`, err); });
  }
  addMessage(`Morning weather sent to ${friends.length} friends!`, "bot");
  showNotification("Pratyush AI — Good Morning!", weather);
});

// 4PM NEPSE closing summary — Monday to Friday
cron.schedule("0 16 * * 1-5", async () => {
  try {
    const nepseRes = await axios.get("https://merolagani.com/Handlers/TradeSummaryHandler.ashx", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": "https://merolagani.com/",
        "Accept": "application/json, text/javascript, */*"
      },
      timeout: 10000
    });

    const data = nepseRes.data;
    const index = data.ni || "N/A";
    const change = data.nc || "N/A";
    const turnover = data.t || "N/A";
    const topGainer = (data.g || [])[0]?.s || "N/A";
    const topLoser = (data.l || [])[0]?.s || "N/A";

    const subject = "NEPSE Closing Summary — " + new Date().toLocaleDateString();
    const body = `NEPSE Closing Summary\n\nIndex: ${index}\nChange: ${change}\nTurnover: Rs.${turnover}\n\nTop Gainer: ${topGainer}\nTop Loser: ${topLoser}`;

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { margin: 0; padding: 0; background: #f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .wrapper { max-width: 480px; margin: 40px auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 32px 28px; text-align: center; }
        .header h1 { color: white; font-size: 22px; margin: 0; font-weight: 700; }
        .header p { color: rgba(255,255,255,0.6); font-size: 13px; margin: 6px 0 0; }
        .avatar { width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: white; }
        .body { padding: 28px; }
        .index-card { background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 16px; padding: 20px; text-align: center; margin: 16px 0; }
        .index-value { font-size: 36px; font-weight: 700; color: white; }
        .index-change { font-size: 16px; color: #30d158; margin-top: 6px; }
        .index-change.red { color: #ff3b30; }
        .stat-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
        .stat-label { color: #888; font-size: 13px; }
        .stat-value { color: #1a1a2e; font-size: 13px; font-weight: 600; }
        .section-title { font-size: 14px; font-weight: 700; color: #1a1a2e; margin: 20px 0 10px; }
        .gainer-item { background: #f0fff4; border-left: 3px solid #30d158; padding: 8px 12px; border-radius: 8px; margin-bottom: 6px; font-size: 13px; color: #1a1a2e; }
        .loser-item { background: #fff0f0; border-left: 3px solid #ff3b30; padding: 8px 12px; border-radius: 8px; margin-bottom: 6px; font-size: 13px; color: #1a1a2e; }
        .footer { background: #f8f9fa; padding: 20px 28px; text-align: center; border-top: 1px solid #eee; }
        .footer p { font-size: 12px; color: #999; margin: 0; }
        .footer strong { color: #6c63ff; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <div class="avatar">NEPSE</div>
          <h1>Market Closing Summary</h1>
          <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div class="body">
          <div class="index-card">
            <div class="index-value">${index}</div>
            <div class="index-change ${change && change.toString().includes('-') ? 'red' : ''}">${change} pts</div>
          </div>
          <div class="stat-row">
            <span class="stat-label">Total Turnover</span>
            <span class="stat-value">Rs. ${turnover}</span>
          </div>
          <div class="section-title">Top Gainers</div>
          ${(data.g || []).slice(0, 5).map(s => `<div class="gainer-item">${s.s} — Rs.${s.ltp} <strong>+${s.pc}%</strong></div>`).join("")}
          <div class="section-title">Top Losers</div>
          ${(data.l || []).slice(0, 5).map(s => `<div class="loser-item">${s.s} — Rs.${s.ltp} <strong>${s.pc}%</strong></div>`).join("")}
        </div>
        <div class="footer">
          <p>Sent automatically by <strong>Pratyush AI</strong></p>
          <p style="margin-top:4px;">Built by Pratyush Dahal</p>
        </div>
      </div>
    </body>
    </html>`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: EMAIL, pass: EMAIL_PASSWORD }
    });

    await transporter.sendMail({
      from: `Pratyush Dahal <${EMAIL}>`,
      to: "pratyushdahal33@gmail.com",
      subject, text: body, html: htmlBody
    });

    addMessage(`NEPSE closing summary sent! Index: ${index} (${change})`, "bot");
    showNotification("Pratyush AI — NEPSE Closing", `Index: ${index} (${change}) | Top Gainer: ${topGainer} | Top Loser: ${topLoser}`);

  } catch (err) {
    console.error("NEPSE email error:", err);
    addMessage("Failed to send NEPSE summary!", "bot");
  }
});

sendBtn.addEventListener("click", handleInput);
input.addEventListener("keydown", (e) => { if (e.key === "Enter") handleInput(); });

loadPreviousChat();