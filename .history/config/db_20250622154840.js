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

// Initialize models
const modelsPath = path.join(__dirname, '../models');
const models = {};

// Import all model files
fs.readdirSync(modelsPath)
    .filter(file => file.endsWith('.js'))
    .forEach(file => {
        const modelName = file.replace('.js', '');
        const modelFn = require(path.join(modelsPath, file));
        models[modelName] = modelFn(sequelize);
    });

// Define model associations
Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(models);
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
    models
};
