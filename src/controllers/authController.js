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
    // console.log("userid,", userId);

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

export const registerUser = async (req, res) => {
  // console.log("called");
  try {
    const { username, password, role } = req.body;

    const user = await User.create({
      username,
      password,
      role,
    });

    res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserCredentials = async (req, res) => {
  try {
    const { currentPassword, newUsername, newPassword } = req.body;
    const userId = req.user.id;
    // console.log("userId", userId);

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.matchPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Prepare update object
    const updateFields = {};
    const updatedFields = [];

    // Update username if provided and different from current
    if (newUsername && newUsername !== user.username) {
      // Check if new username is already taken by another user
      const existingUser = await User.findOne({ username: newUsername });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({ message: "Username already taken" });
      }
      updateFields.username = newUsername;
      updatedFields.push("username");
    }
    // If newUsername is same as current, just proceed without error

    // Update password if provided and not empty
    if (newPassword && newPassword.trim() !== "") {
      updateFields.password = newPassword;
      updatedFields.push("password");
    }
    // If newPassword is same as current or empty, just proceed without error

    // If there are fields to update
    if (Object.keys(updateFields).length > 0) {
      // Update the user
      Object.assign(user, updateFields);
      await user.save();

      res.json({
        message: "User credentials updated successfully",
        updatedFields: updatedFields,
      });
    } else {
      res.json({
        message: "No changes made - credentials are the same",
        updatedFields: [],
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
