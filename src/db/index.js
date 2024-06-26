import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(`Database connected at ${connectionInstance.connection.host}`);
  } catch (e) {
    console.log(e);
  }
};

export default connectDB;
