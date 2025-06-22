const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const { models } = require('../config/db');
const User = models.User;

module.exports = (passport) => {
    passport.use(
        new LocalStrategy({
            usernameField: 'email'
        }, async (email, password, done) => {
            try {
                const user = await User.findOne({
                    where: {
                        email
                    }
                });

                if (!user) {
                    return done(null, false, { message: 'No user found' });
                }

                const isValid = await user.validPassword(password);
                if (!isValid) {
                    return done(null, false, { message: 'Invalid password' });
                }

                return done(null, user);
            } catch (error) {
                console.error('Authentication error:', error);
                return done(error);
            }
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findByPk(id);
            done(null, user);
        } catch (error) {
            console.error('User deserialization error:', error);
            done(error);
        }
    });
};
