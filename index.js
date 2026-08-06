process.stdout.write('Starting process...\n');

require('dotenv').config();

const { Telegraf } = require('telegraf');
const https = require('https');

console.log('Bot starting...');
console.log('BOT_TOKEN exists:', !!process.env.BOT_TOKEN);

const agent = new https.Agent({ family: 4 });

const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: { agent }
});

const chatId = '5209781777'; // теперь строка
const intervalMs = 5000;

const getCatUrl = () =>
  `https://mobimg.b-cdn.net/v3/fetch/d3/d3d2226f52b64f3850a9ab926334d897.jpeg`;

// Обработчик команды /hello
bot.command('hello', (ctx) => {
  ctx.reply('Hello! Bot is working ✅');
  console.log('Command /hello received and replied');
});

const sendCat = () => {
  console.log(`Sending photo to chat ${chatId}...`);
  bot.telegram
    .sendPhoto(chatId, getCatUrl())
    .then(() => {
      console.log('Photo sent successfully');
      setTimeout(sendCat, intervalMs);
    })
    .catch((err) => {
      console.error('Error sending photo:', err.message);
      if (err.response) {
        console.error('Response data:', err.response.data);
      }
      setTimeout(sendCat, intervalMs);
    });
};

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

console.log('Bot is ready, starting send loop...');
sendCat();

// Запуск бота (для обработки команд)
bot.launch()
  .then(() => console.log('Bot launched for commands'))
  .catch(err => console.error('Launch error:', err));