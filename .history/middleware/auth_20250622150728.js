module.exports = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'Please login first');
        return res.redirect('/auth/login');
    }
    next();
};
