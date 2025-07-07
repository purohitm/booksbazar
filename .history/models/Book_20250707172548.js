const { DataTypes } = require('sequelize');
const db = require('../config/db');

const Book = db.define('Book', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    author: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    coverImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isbn: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
    },
    publisher: {
        type: DataTypes.STRING,
        allowNull: true
    },
    publicationYear: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    stockQuantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = Book;
