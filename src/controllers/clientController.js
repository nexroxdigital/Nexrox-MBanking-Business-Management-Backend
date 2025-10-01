import Client from "../models/client.js";

// Create a new client
export const addNewClient = async (req, res) => {
  try {
    const { name, phone, totalSale, paid, due } = req.body;

    // Basic validation
    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }

    const newClient = new Client({
      name,
      phone,
      totalSale: totalSale || 0,
      paid: paid || 0,
      due: due || 0,
    });

    await newClient.save();

    res.status(201).json({
      message: "Client created successfully",
      data: newClient,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error creating client",
      error: error.message,
    });
  }
};

// Get clients with pagination
export const getClients = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // current page (default 1)
    const limit = parseInt(req.query.limit) || 10; // rows per page (default 10)
    const skip = (page - 1) * limit;

    // Fetch clients with pagination
    const clients = await Client.find().skip(skip).limit(limit);

    // Total count
    const totalClients = await Client.countDocuments();

    res.status(200).json({
      message: "Clients fetched successfully",
      data: clients,
      pagination: {
        total: totalClients,
        page,
        limit,
        totalPages: Math.ceil(totalClients / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching clients",
      error: error.message,
    });
  }
};

// Delete a client by ID
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedClient = await Client.findByIdAndDelete(id);

    if (!deletedClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json({
      message: "Client deleted successfully",
      data: deletedClient,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting client",
      error: error.message,
    });
  }
};

// Update client (only name & phone)
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    // Validate input
    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }

    const updatedClient = await Client.findByIdAndUpdate(
      id,
      { name, phone },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json({
      message: "Client updated successfully",
      data: updatedClient,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating client",
      error: error.message,
    });
  }
};
