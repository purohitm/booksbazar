const { DataTypes } = require('sequelize');
const db = require('../config/db');
const Book = require('./Book');
const User = require('./User');

const Wishlist = db.define('Wishlist', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    bookId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Book,
            key: 'id'
        }
    },
    priority: {
        type: DataTypes.ENUM('high', 'medium', 'low'),
        defaultValue: 'medium'
    },
    category: {
        type: DataTypes.ENUM('course', 'leisure', 'research', 'gift'),
        defaultValue: 'leisure'
    },
    targetPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    currentPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    lastChecked: {
        type: DataTypes.DATE,
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    alertFrequency: {
        type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
        defaultValue: 'weekly'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    timestamps: true
});

// Associations
Wishlist.belongsTo(User);
Wishlist.belongsTo(Book);

module.exports = Wishlist;
