const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  const db = mongoose.connection.db;
  const tenants = await db.collection("tenants").find({}).toArray();
  console.log("Tenants:", tenants.map(t => t.slug));
  process.exit(0);
});
