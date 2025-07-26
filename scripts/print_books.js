const { Book, User, sequelize } = require('../config/db');

(async () => {
  try {
    const books = await Book.findAll({
      attributes: ['id', 'title', 'userId'],
      order: [['createdAt', 'DESC']]
    });
    console.log('All books:');
    books.forEach(book => {
      console.log(`ID: ${book.id}, Title: ${book.title}, userId: ${book.userId}`);
    });
    await sequelize.close();
  } catch (err) {
    console.error('Error printing books:', err);
  }
})(); 