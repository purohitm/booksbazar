// Migration: Fix all books with NULL userId and enforce NOT NULL constraint
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Set userId to 1 (or another valid user) for all books where userId is NULL
    // You can change 1 to another user ID if you want a different default owner
    await queryInterface.sequelize.query(
      'UPDATE Books SET userId = 1 WHERE userId IS NULL;'
    );
    // 2. Alter the Books table to make userId NOT NULL
    await queryInterface.changeColumn('Books', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    // Revert userId to allow NULL (not recommended, but for rollback)
    await queryInterface.changeColumn('Books', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    });
  }
}; 