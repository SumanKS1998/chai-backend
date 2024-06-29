import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

export const app = express();

app.use(
  cors({
    credentials: true,
    origin: process.env.CORS_ORIGIN,
  })
);

app.use(
  express.urlencoded({
    limit: "16kb",
  })
);

app.use(cookieParser());

app.use(
  express.json({
    limit: "16kb",
  })
);

app.use(express.static("public"));

// routes import
import userRouter from "./routes/user.routes.js";

// routes declaration
app.use("/api/v1/users", userRouter);
