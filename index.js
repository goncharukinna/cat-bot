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

const intervalMs = 5000;

// ---- Хранилище состояний для каждого чата ----
const chatStates = new Map(); // key: chatId, value: { isSending, mode, isFirstStart, timer }

function getChatState(chatId) {
  if (!chatStates.has(chatId)) {
    chatStates.set(chatId, {
      isSending: true,
      mode: 'cat',
      isFirstStart: true,
      timer: null
    });
  }
  return chatStates.get(chatId);
}

function stopSendingForChat(chatId) {
  const state = getChatState(chatId);
  state.isSending = false;
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
}

function startSendingForChat(chatId) {
  const state = getChatState(chatId);
  if (!state.isSending) {
    state.isSending = true;
  }
  // Если уже есть таймер, не создаём новый
  if (!state.timer) {
    scheduleSend(chatId);
  }
}

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

async function getImageUrl(mode) {
  switch (mode) {
    case 'mixed': {
      const animals = [fetchCat, fetchDog, fetchFox];
      const pick = animals[Math.floor(Math.random() * animals.length)];
      return await pick();
    }
    case 'gif':
      return fetchCatGif();
    default: {
      const sources = [
        fetchCat,
        async () => `https://cataas.com/cat?${Math.random()}`
      ];
      const pick = sources[Math.floor(Math.random() * sources.length)];
      return await pick();
    }
  }
}

// ---- Основной цикл отправки для конкретного чата ----
async function scheduleSend(chatId) {
  const state = getChatState(chatId);
  if (!state.isSending) {
    console.log(`Sending paused for chat ${chatId}`);
    return;
  }

  console.log(`Sending image to chat ${chatId} (mode: ${state.mode})...`);
  try {
    const imageUrl = await getImageUrl(state.mode);
    await bot.telegram.sendPhoto(chatId, imageUrl);
    console.log(`Photo sent to ${chatId} successfully`);
  } catch (err) {
    console.error(`Error sending photo to ${chatId}:`, err.message);
    if (err.response) {
      console.error('Response data:', err.response.data);
    }
  }

  // Планируем следующую отправку, если отправка не остановлена
  if (state.isSending) {
    state.timer = setTimeout(() => scheduleSend(chatId), intervalMs);
  } else {
    state.timer = null;
  }
}

// ---- Команды бота ----

// /hello – диагностика (отвечает в том же чате)
bot.command('hello', (ctx) => {
  ctx.reply('Hello! Bot is working ✅');
  console.log(`Command /hello received from ${ctx.chat.id}`);
});

// /stop – остановка отправки для этого чата
bot.command('stop', (ctx) => {
  const chatId = ctx.chat.id;
  stopSendingForChat(chatId);
  ctx.reply('⏸️ Отправка фото остановлена. Для возобновления отправьте /start');
  console.log(`Sending stopped for chat ${chatId}`);
});

// /start – запуск отправки и приветствие (для нового пользователя)
bot.start((ctx) => {
  const chatId = ctx.chat.id;
  const state = getChatState(chatId);

  // Приветствие только при первом запуске для этого чата
  if (state.isFirstStart) {
    ctx.reply(
      `🐱 Привет! Я КотоБот — отправляю милых животных каждые 5 секунд.

Команды:
/mode cat — только котики
/mode mixed — котики, собачки, лисички
/mode gif — гифки с котами
/stop — приостановить отправку
/start — возобновить отправку
/hello — проверить, жив ли бот

Приятного общения! 🐱`
    );
    state.isFirstStart = false;
  }

  // Если отправка остановлена, запускаем
  if (!state.isSending) {
    state.isSending = true;
    ctx.reply('▶️ Отправка фото возобновлена!');
    startSendingForChat(chatId);
  } else {
    ctx.reply('✅ Бот уже работает и отправляет фото');
  }
});

// /mode – переключение режима для этого чата
bot.command('mode', (ctx) => {
  const chatId = ctx.chat.id;
  const state = getChatState(chatId);
  const args = ctx.message.text.split(' ');
  const newMode = args[1]?.toLowerCase();

  if (newMode === 'cat' || newMode === 'mixed' || newMode === 'gif') {
    state.mode = newMode;
    ctx.reply(`✅ Режим изменён на: ${newMode === 'cat' ? '🐱 только котики' : newMode === 'mixed' ? '🐾 смешанные животные' : '🎞️ гифки'}`);
    console.log(`Mode changed to ${state.mode} for chat ${chatId}`);
  } else {
    const modeText = state.mode === 'cat' ? '🐱 только котики' : state.mode === 'mixed' ? '🐾 смешанные животные' : '🎞️ гифки';
    ctx.reply(
      `📌 Текущий режим: ${modeText}\n\n` +
      `Используйте:\n/mode cat – только котики\n/mode mixed – смешанные животные\n/mode gif – гифки`
    );
  }
});

// /status – текущий статус для этого чата
bot.command('status', (ctx) => {
  const chatId = ctx.chat.id;
  const state = getChatState(chatId);
  const modeText = state.mode === 'cat' ? '🐱 только котики' : state.mode === 'mixed' ? '🐾 смешанные животные' : '🎞️ гифки';
  ctx.reply(`📊 Текущий режим: ${modeText}\nОтправка ${state.isSending ? 'активна ✅' : 'остановлена ⏸️'}`);
});

// ---- Запуск бота с повторными попытками ----
async function startBot() {
  try {
    await bot.telegram.deleteWebhook();
    console.log('Webhook deleted');
  } catch (err) {
    console.warn('Could not delete webhook:', err.message);
  }

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

console.log('Bot is ready. Waiting for /start commands...');
startBot();