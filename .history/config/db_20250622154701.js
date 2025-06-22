const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const config = require('../config/config.json')[process.env.NODE_ENV || 'development'];

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

// Import all models
const modelsPath = path.join(__dirname, '../models');
fs.readdirSync(modelsPath)
    .filter(file => file.endsWith('.js'))
    .forEach(file => {
        const model = require(path.join(modelsPath, file))(sequelize);
        sequelize.models[model.name] = model;
    });

// Define model associations
Object.keys(sequelize.models).forEach(modelName => {
    if (sequelize.models[modelName].associate) {
        sequelize.models[modelName].associate(sequelize.models);
    }
});

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
    models: sequelize.models
};
