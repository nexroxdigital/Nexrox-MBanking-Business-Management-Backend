export const verifyAdmin = (req, res, next) => {
  try {
    // verifyToken must run before this
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    next(); // allow request to continue
  } catch (error) {
    console.error("Admin check failed:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};
