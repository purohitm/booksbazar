const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const config = require('../config/config.json')['development'];

// Create a new Sequelize instance
const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    logging: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Test the connection
sequelize.authenticate()
    .then(() => {
        console.log('Database connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

// Define User model
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user'
    },
    profilePicture: {
        type: DataTypes.STRING,
        defaultValue: '/images/default-avatar.png'
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'User'
});

// Add password hashing before create
User.beforeCreate(async (user) => {
    if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
    }
});

// Add password comparison method
User.prototype.validPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

// Book model
const Book = sequelize.define('Book', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
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
    publisher: {
        type: DataTypes.STRING,
        allowNull: true
    },
    publishedDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    pageCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    language: {
        type: DataTypes.STRING,
        allowNull: true
    },
    rating: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0
    },
    ratingCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
    },
    previewLink: {
        type: DataTypes.STRING,
        allowNull: true
    },
    coverImage: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    condition: {
        type: DataTypes.ENUM('new', 'like new', 'good', 'fair', 'poor'),
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id'
        }
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
}, {
    sequelize,
    modelName: 'Book'
});

// Cart model
const Cart = sequelize.define('Cart', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id'
        }
    },
    bookId: {
        type: DataTypes.STRING,
        references: {
            model: Book,
            key: 'id'
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
}, {
    sequelize,
    modelName: 'Cart'
});

// Order model
const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id'
        }
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending'
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    shippingAddress: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    paymentMethod: {
        type: DataTypes.STRING,
        allowNull: false
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
}, {
    sequelize,
    modelName: 'Order'
});

// OrderItem model
const OrderItem = sequelize.define('OrderItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    orderId: {
        type: DataTypes.INTEGER,
        references: {
            model: Order,
            key: 'id'
        }
    },
    bookId: {
        type: DataTypes.STRING,
        references: {
            model: Book,
            key: 'id'
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
}, {
    sequelize,
    modelName: 'OrderItem'
});

// Saved model
const Saved = sequelize.define('Saved', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    }
}, {
    timestamps: true
});

// Payment model
const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending'
    },
    paymentMethod: {
        type: DataTypes.STRING,
        defaultValue: 'mock'
    },
    transactionId: {
        type: DataTypes.STRING,
        unique: true
    }
}, {
    timestamps: true
});

// Challenge model for Literary Escape Room
const Challenge = sequelize.define('Challenge', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    bookId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'Books',
            key: 'id'
        }
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    question: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    answer: {
        type: DataTypes.STRING,
        allowNull: false
    },
    difficulty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 1,
            max: 5
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    timestamps: true
});

// UserAttempts model for Literary Escape Room
const UserAttempts = sequelize.define('UserAttempts', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    challengeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Challenges',
            key: 'id'
        }
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    attempt: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    isCorrect: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    attemptNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    }
}, {
    timestamps: true
});

// Define associations
User.hasMany(Book, {
    foreignKey: 'userId',
    as: 'books'
});

Book.belongsTo(User, {
    foreignKey: 'userId',
    as: 'seller'
});

User.hasMany(Cart, {
    foreignKey: 'userId',
    as: 'cartItems'
});

Cart.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

Cart.belongsTo(Book, {
    foreignKey: 'bookId',
    as: 'book'
});

Book.hasMany(Cart, {
    foreignKey: 'bookId',
    as: 'cart'
});

User.hasMany(Order, {
    foreignKey: 'userId',
    as: 'orders'
});

Order.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

Order.hasMany(OrderItem, {
    foreignKey: 'orderId',
    as: 'items'
});

OrderItem.belongsTo(Order, {
    foreignKey: 'orderId',
    as: 'order'
});

OrderItem.belongsTo(Book, {
    foreignKey: 'bookId',
    as: 'book'
});

Book.hasMany(OrderItem, {
    foreignKey: 'bookId',
    as: 'orderItems'
});

// Sync models with database
sequelize.sync()
    .then(() => {
        console.log('Models synced with database');
    })
    .catch(err => {
        console.error('Error syncing models:', err);
    });

// Export models
const db = {
    User,
    Book,
    Cart,
    Order,
    OrderItem,
    Saved,
    Payment,
    Challenge,
    UserAttempts,
    sequelize
};

// Export individual models for direct access
module.exports = {
    ...db,
    models: db
};
