require('dotenv').config();

const { Telegraf } = require('telegraf');
const https = require('https');

// Принудительно используем только IPv4
const agent = new https.Agent({ family: 4 });

const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: { agent }
});

const chatId = 5209781777;
const intervalMs = 5000;

const getCatUrl = () =>
  `https://mobimg.b-cdn.net/v3/fetch/d3/d3d2226f52b64f3850a9ab926334d897.jpeg`;

const sendCat = () => {
  bot.telegram
    .sendPhoto(chatId, getCatUrl())
    .then(() => setTimeout(sendCat, intervalMs))
    .catch((err) => console.error('Error sending photo:', err.message));
};

sendCat();