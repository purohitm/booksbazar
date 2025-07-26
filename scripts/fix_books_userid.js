const { Book, sequelize } = require('../config/db');

(async () => {
  try {
    const updated = await Book.update(
      { userId: 2 }, // Set to Mukesh's userId
      { where: {} }
    );
    console.log(`Updated userId to 2 for all books. Rows affected: ${updated[0]}`);
    await sequelize.close();
  } catch (err) {
    console.error('Error updating books:', err);
  }
})(); 