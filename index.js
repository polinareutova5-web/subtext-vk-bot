const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Замени на свой секретный ключ из ВК
const SECRET_KEY = 'aaQ13axAPQEcczQa';

// Обработка всех запросов
app.post('/', (req, res) => {
  const { type, group_id } = req.body;

  // Подтверждение сервера
  if (type === 'confirmation') {
    console.log('Подтверждение сервера...');
    res.send('9626cf0a'); // ← ЭТО СТРОКА ДОЛЖНА БЫТЬ ТОЧНО КАК В ВК
    return;
  }

  // Проверка подписи (опционально, но важно для безопасности)
  // Сейчас пропускаем — для старта

  console.log('Получено сообщение:', req.body);
  res.status(200).send('OK');
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});
