const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { nanoid } = require('nanoid');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Якщо прийде запит на статичний файл, то треба його шукати лише у теці "public"

const tempDir = path.join(__dirname, 'temp');
const booksDir = path.join(__dirname, 'public', 'books');

// Об'єкт налаштувань - middleware
const multerConfig = multer.diskStorage({
  // шлях до теки, в якій будемо зберігати тимчасовий файл
  // Можна і просто написати "./", але краще через path, бо різні є системи
  destination: tempDir,

  // налаштування - filename. Туди передаємо функцію, яка зберігає файл під іншим ім'ям
  // У функцію передається об'єкт request, об'єкт файл і колбек. file - це файл у пам'яті.
  // Тобто callback filename спрацьовує коли multer отримав file, зберіг його у пам'яті, але ще не зберіг його на диску
  filename: (req, file, cb) => {
    // Перший параметр null, якщо немає ніяких помилок. Другим параметром - ім'я файлу
    cb(null, file.originalname); // файл зберігається під оригінальним ім'ям. Тобто в цьому випадку запис filename ніби не потрібен. Але без нього файл зберігається під випадковим ім'ям без розширення, хоча його дані правильні.
  },
  // Налаштування limit дозволяє зробити певні обмеження
  // limit :
});

// Створення middleware для зберігання
const upload = multer({
  storage: multerConfig,
});

const books = [];

app.get('/api/books', (req, res) => {
  res.json(books);
});

// // Запис upload.single("cover") означає: ми очикуємо у полі cover один файл, всі інші поля будуть текстовими і їх тре записати у req.body
// // Тобто - візьми з поля cover файл, збережи його у теці temp, а текстові поля передай у req.body
// // Якщо ми очікуємо кілька файлів: upload.array("cover", 8) - другий аргумент - максимальна кількість файлів
// // Якщо очікуємо кілька файлів у різних полях: upload.fields([{ name: "cover", maxCount: 1}, { name: "subcover", maxCount: 2}])
// app.post('/api/books', upload.single('cover'), async (req, res) => {
//   console.log('req.body :>> ', req.body);
//   // req.body :>>  [Object: null prototype] { title: 'girl genius', author: 'Gogilo' }
//   console.log('req.file :>> ', req.file);
//   //   req.file :>>  {
//   //   fieldname: 'cover',
//   //   originalname: 'Screenshot_1.jpg',
//   //   encoding: '7bit',
//   //   mimetype: 'image/jpeg',
//   //   destination: 'D:\\Programming\\JS-Node-HW\\Module-05\\file-delivery-multer\\temp',
//   //
//   //   filename: '095c5e971d252c8becfc0128aefdea6b',
//   //   path: 'D:\\Programming\\JS-Node-HW\\Module-05\\file-delivery-multer\\temp\\095c5e971d252c8becfc0128aefdea6b',
//   //
//   //   або, якщо вказати filename у multerConfig:
//   //   filename: 'Screenshot_1.jpg',
//   //   path: 'D:\\Programming\\JS-Node-HW\\Module-05\\file-delivery-multer\\temp\\Screenshot_1.jpg',
//   //
//   //   size: 59330
//   // }
// });

app.post('/api/books', upload.single('cover'), async (req, res) => {
  // Щоби перемістити файл у fs використовується метод rename()
  // Перший аргумент - старий шлях з ім'ям. Другий - новий шлях з ім'ям
  // await fs.rename('./temp/Screenshot_1.jpg', './public/books/Screenshot_1.jpg');

  // Старий шлях записаний у req.file.path. Ім'я файлу - у req.file.originalname
  const { path: tempLoad, originalname } = req.file;
  // Створюємо новий шлях - до шляху до теки books (booksDir) додаємо ім'я файлу
  const resultUpload = path.join(booksDir, originalname); // абсолютний шлях на сервер
  await fs.rename(tempLoad, resultUpload);

  // Обробляємо поля з фронтенду - додаємо унікальний id і відносний шлях (відносно адреси сайту), де лежить доданий файл
  // const newFilePath = path.join('public', 'books', originalname);
  const newFilePath = path.join('books', originalname); // "public" видаляємо, бо він тепер зазначений у middleware app.use(express.static('public'));
  const newBook = {
    id: nanoid(),
    ...req.body,
    newFilePath,
  };
  books.push(newBook);

  // Повертаємо на фронтенд:
  res.status(201).json(newBook);
});

app.listen(3000);
