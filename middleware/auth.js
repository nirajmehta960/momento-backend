export const requireAuth = (req, res, next) => {
  const currentUser = req.session["currentUser"];
  if (!currentUser) {
    return res
      .status(401)
      .json({ message: "Unauthorized. Please login to continue." });
  }
  req.currentUser = currentUser;
  next();
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    const currentUser = req.session["currentUser"];
    if (!currentUser) {
      return res
        .status(401)
        .json({ message: "Unauthorized. Please login to continue." });
    }
    if (!roles.includes(currentUser.role)) {
      return res
        .status(403)
        .json({
          message:
            "Forbidden. You do not have permission to access this resource.",
        });
    }
    next();
  };
};
