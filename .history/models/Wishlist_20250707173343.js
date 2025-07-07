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
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true
});

// Relationships
Wishlist.belongsTo(User);
Wishlist.belongsTo(Book, { as: 'book' });

module.exports = Wishlist;
