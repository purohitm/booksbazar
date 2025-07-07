const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'Please login to access this page');
        res.redirect('/auth/login');
    } else {
        next();
    }
};

const requireSeller = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'Please login to access this page');
        res.redirect('/auth/login');
    } else if (req.user.role !== 'seller') {
        req.flash('error', 'You must be a seller to access this page');
        res.redirect('/');
    } else {
        next();
    }
};

module.exports = {
    requireAuth,
    requireSeller
};
