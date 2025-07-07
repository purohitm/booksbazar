const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'Please login to access this page');
        res.redirect('/auth/login');
    }
    next();
};

const requireSeller = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'Please login to access this page');
        res.redirect('/auth/login');
    }
    if (req.user.role !== 'seller') {
        req.flash('error', 'You must be a seller to access this page');
        res.redirect('/');
    }
    next();
};

module.exports = {
    requireAuth,
    requireSeller
};
