module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('challenges', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            bookId: {
                type: Sequelize.STRING,
                allowNull: false,
                references: {
                    model: 'Books',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            ownerId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            question: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            answer: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            difficulty: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            createdAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            },
            updatedAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('challenges');
    }
};
