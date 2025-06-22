module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Create books table without foreign key
        await queryInterface.createTable('books', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            title: {
                type: Sequelize.STRING,
                allowNull: false
            },
            author: {
                type: Sequelize.STRING,
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            condition: {
                type: Sequelize.ENUM('new', 'like new', 'good', 'fair', 'poor'),
                allowNull: false
            },
            sellerId: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });

        // Add foreign key constraint after users table exists
        await queryInterface.addConstraint('books', {
            fields: ['sellerId'],
            type: 'foreign key',
            name: 'fk_books_sellerId_users',
            references: {
                table: 'users',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
    },
    down: async (queryInterface, Sequelize) => {
        // Remove foreign key constraint first
        await queryInterface.removeConstraint('books', 'fk_books_sellerId_users');
        // Then drop the table
        await queryInterface.dropTable('books');
    }
};
