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
        allowNull: true
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
    tableName: 'users'
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
    categories: {
        type: DataTypes.ARRAY(DataTypes.STRING),
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
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'New'
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
        autoIncrement: true,
        primaryKey: true
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
        defaultValue: 1
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
}, {
    sequelize,
    modelName: 'Cart'
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

// Order model
const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending'
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
}, {
    timestamps: true
});

// OrderItem model
const OrderItem = sequelize.define('OrderItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
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

User.hasMany(Cart, { foreignKey: 'userId' });
Cart.belongsTo(User, { foreignKey: 'userId' });

Cart.belongsTo(Book, { foreignKey: 'bookId' });
Book.hasMany(Cart, { foreignKey: 'bookId' });

User.hasMany(Saved);
Saved.belongsTo(User);
Saved.belongsTo(Book);

User.hasMany(Payment);
Payment.belongsTo(User);
Payment.belongsTo(Book);

User.hasMany(Order);
Order.belongsTo(User);
Order.belongsTo(Payment);

Order.hasMany(OrderItem);
OrderItem.belongsTo(Order);
OrderItem.belongsTo(Book);

// Sync models with database
sequelize.sync()
    .then(() => {
        console.log('Models synced with database');
    })
    .catch(err => {
        console.error('Error syncing models:', err);
    });

module.exports = {
    sequelize,
    models: {
        User,
        Book,
        Cart,
        Saved,
        Payment,
        Order,
        OrderItem
    }
};
