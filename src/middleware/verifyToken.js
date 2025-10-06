import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    //  Get token from the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No token provided" });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    //  Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //  Attach decoded user info to the request object
    req.user = decoded;

    //  Move to the next middleware/route
    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);

    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Session expired. Please log in again." });
    }

    return res.status(403).json({ message: "Invalid token" });
  }
};
