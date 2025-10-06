import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        username: user.username,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserImage = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("userid,", userId);

    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: "No image URL provided" });
    }

    // Update user's image
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { image },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile image updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user image:", error);
    res.status(500).json({
      message: "Server error updating profile image",
      error: error.message,
    });
  }
};
