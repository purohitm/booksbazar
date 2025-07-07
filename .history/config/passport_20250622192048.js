const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const { models } = require('../config/db');
const User = models.User;

module.exports = (passport) => {
    passport.use(
        new LocalStrategy({
            usernameField: 'email',
            passwordField: 'password'
        }, async (email, password, done) => {
            try {
                // First find the user with password
                const user = await User.findOne({
                    where: { email }
                });

                if (!user) {
                    return done(null, false, { message: 'No user found' });
                }

                // Compare password
                const isValid = await user.validPassword(password);
                if (!isValid) {
                    return done(null, false, { message: 'Invalid password' });
                }

                // For serialization, exclude password
                const userForSession = await User.findByPk(user.id, {
                    attributes: { exclude: ['password'] }
                });

                return done(null, userForSession);
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
            const user = await User.findByPk(id, {
                attributes: { exclude: ['password'] }
            });
            done(null, user);
        } catch (error) {
            console.error('User deserialization error:', error);
            done(error);
        }
    });
};
