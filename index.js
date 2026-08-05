process.stdout.write('Starting process...\n');

require('dotenv').config();

const { Telegraf } = require('telegraf');
const https = require('https');

// Лог запуска бота
console.log('Bot starting...');
console.log('BOT_TOKEN exists:', !!process.env.BOT_TOKEN);

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
  console.log('Sending photo...');
  bot.telegram
    .sendPhoto(chatId, getCatUrl())
    .then(() => {
      console.log('Photo sent successfully');
      setTimeout(sendCat, intervalMs);
    })
    .catch((err) => {
      console.error('Error sending photo:', err.message);
      setTimeout(sendCat, intervalMs);
    });
};

// Обработка неожиданных ошибок (чтобы видеть их в логах)
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

console.log('Bot is ready, starting send loop...');
sendCat();