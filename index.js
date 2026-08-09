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

const chatId = '5209781777';
const intervalMs = 5000;
let isSending = true;
let currentMode = 'cat'; // 'cat', 'mixed', 'gif'

// ---- Вспомогательные функции для получения изображений ----

async function fetchCat() {
  try {
    const res = await fetch('https://api.thecatapi.com/v1/images/search');
    const data = await res.json();
    return data[0]?.url || `https://cataas.com/cat?${Math.random()}`;
  } catch {
    return `https://cataas.com/cat?${Math.random()}`;
  }
}

async function fetchDog() {
  try {
    const res = await fetch('https://random.dog/woof.json');
    const data = await res.json();
    return data.url || 'https://cataas.com/cat';
  } catch {
    return 'https://cataas.com/cat';
  }
}

async function fetchFox() {
  try {
    const res = await fetch('https://randomfox.ca/floof/');
    const data = await res.json();
    return data.image || 'https://cataas.com/cat';
  } catch {
    return 'https://cataas.com/cat';
  }
}

function fetchCatGif() {
  return `https://cataas.com/cat/gif?${Math.random()}`;
}

// Основная функция получения URL в зависимости от режима
async function getImageUrl() {
  switch (currentMode) {
    case 'mixed': {
      const animals = [fetchCat, fetchDog, fetchFox];
      const pick = animals[Math.floor(Math.random() * animals.length)];
      return await pick();
    }
    case 'gif':
      return fetchCatGif();
    default: // 'cat'
      return 'https://cataas.com/cat';
  }
}

// ---- Команды бота ----

// /hello – диагностика
bot.command('hello', (ctx) => {
  ctx.reply('Hello! Bot is working ✅');
  console.log('Command /hello received');
});

// /stop – остановка отправки
bot.command('stop', (ctx) => {
  isSending = false;
  ctx.reply('⏸️ Отправка фото остановлена. Для возобновления отправьте /start');
  console.log('Sending stopped by command');
});

// /start – возобновление отправки
bot.start((ctx) => {
  if (!isSending) {
    isSending = true;
    ctx.reply('▶️ Отправка фото возобновлена!');
    sendCat();
  } else {
    ctx.reply('✅ Бот уже работает и отправляет фото');
  }
});

// /mode – переключение режима
bot.command('mode', (ctx) => {
  const args = ctx.message.text.split(' ');
  const newMode = args[1]?.toLowerCase();

  if (newMode === 'cat' || newMode === 'mixed' || newMode === 'gif') {
    currentMode = newMode;
    ctx.reply(`✅ Режим изменён на: ${newMode === 'cat' ? '🐱 только котики' : newMode === 'mixed' ? '🐾 смешанные животные' : '🎞️ гифки'}`);
    console.log(`Mode changed to: ${currentMode}`);
  } else {
    ctx.reply(
      `📌 Текущий режим: ${currentMode === 'cat' ? '🐱 только котики' : currentMode === 'mixed' ? '🐾 смешанные животные' : '🎞️ гифки'}\n\n` +
      `Используйте:\n/mode cat – только котики\n/mode mixed – смешанные животные\n/mode gif – гифки`
    );
  }
});

// /status - текущий режим
bot.command('status', (ctx) => {
  const modeText = currentMode === 'cat' ? '🐱 только котики' : currentMode === 'mixed' ? '🐾 смешанные животные' : '🎞️ гифки';
  ctx.reply(`📊 Текущий режим: ${modeText}\nОтправка ${isSending ? 'активна ✅' : 'остановлена ⏸️'}`);
});

// ---- Основной цикл отправки ----

const sendCat = async () => {
  if (!isSending) {
    console.log('Sending is paused');
    return;
  }
  console.log(`Sending image (mode: ${currentMode})...`);
  try {
    const imageUrl = await getImageUrl();
    await bot.telegram.sendPhoto(chatId, imageUrl);
    console.log('Photo sent successfully');
  } catch (err) {
    console.error('Error sending photo:', err.message);
    if (err.response) {
      console.error('Response data:', err.response.data);
    }
  }
  if (isSending) {
    setTimeout(sendCat, intervalMs);
  }
};

// ---- Запуск бота с повторными попытками ----

async function startBot() {
  try {
    // Сброс вебхука (на случай, если он мешает polling)
    await bot.telegram.setWebhook({ url: '' });
    console.log('Webhook cleared');
  } catch (err) {
    console.warn('Could not clear webhook:', err.message);
  }

  // Пытаемся запустить polling
  bot.launch({ dropPendingUpdates: true })
    .then(() => {
      console.log('Bot launched for commands (polling started)');
    })
    .catch((err) => {
      console.error('Launch error:', err.message);
      console.log('Will retry in 10 seconds...');
      setTimeout(startBot, 10000);
    });
}

console.log('Bot is ready, starting send loop...');
sendCat();

// Запускаем бота с повторными попытками
startBot();