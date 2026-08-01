require("dotenv").config();

const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

const chatId = 5209781777;

const intervalMs = 5000;

const getCatUrl = () =>
  `https://mobimg.b-cdn.net/v3/fetch/d3/d3d2226f52b64f3850a9ab926334d897.jpeg`;

const sendCat = () => {
  bot.telegram
    .sendPhoto(chatId, getCatUrl())
    .then(() => setTimeout(sendCat, intervalMs));
};

sendCat();