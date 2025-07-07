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

// Define Book model
const Book = sequelize.define('Book', {
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
    sellerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
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
    tableName: 'books'
});

// Cart model
const Cart = sequelize.define('Cart', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    }
}, {
    timestamps: true
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
    foreignKey: 'sellerId',
    as: 'books'
});

Book.belongsTo(User, {
    foreignKey: 'sellerId',
    as: 'seller'
});

User.hasMany(Cart);
Cart.belongsTo(User);
Cart.belongsTo(Book);

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
