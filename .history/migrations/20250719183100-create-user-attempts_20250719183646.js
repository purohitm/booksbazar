module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('user_attempts', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            challengeId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'challenges',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            userId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            attempt: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            isCorrect: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            attemptNumber: {
                type: Sequelize.INTEGER,
                defaultValue: 1
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
        await queryInterface.dropTable('user_attempts');
    }
};
