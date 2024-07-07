import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const option = {
  httpOnly: true,
  secure: true,
};

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (e) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token."
    );
  }
};

export const registerUser = asyncHandler(async (req, res) => {
  // Below are the steps
  // get user details from front end
  // validation for user details
  // check if user exist or not with both(username and email for tutorial's sake smh)
  // check for images
  // check for avatar
  // upload them to cloudinary if images and avatar are available
  // create user object then creation call for adding data in db
  // remove password and refreshtoken field from response
  // check for user creation
  // return response

  const { username, fullName, password, email } = req.body;
  if (
    [username, fullName, password, email].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required.");
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new ApiError(409, "Username or Email already exists.");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverLocalPath = req?.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image required.");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverLocalPath);
  console.log("avatar", avatar);
  const user = await User.create({
    username: username?.toLowerCase(),
    fullName,
    avatar: avatar?.url,
    coverImage: coverImage?.url || "",
    password,
    email,
  });

  const userCreated = await User.findById(user?._id).select(
    "-password -refreshToken"
  );
  if (!userCreated) {
    throw new ApiError(404, "User not created");
  }
  const response = new ApiResponse(
    201,
    userCreated,
    "User created successfully!"
  );
  return res.status(201).json(response);
});

export const loginUser = asyncHandler(async (req, res) => {
  // take email and password from the req
  // check whether email exists or not
  // check if the password is correct
  // generateAccessToken && generateRefreshtoken
  // return access token && return refreshtoken
  // send access token and refresh token via cookies
  const { password, email, username } = req.body;
  if (!email || !username) {
    throw new ApiError(400, "email or username is required");
  }
  if (!password) {
    throw new ApiError(400, "password is required");
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!existingUser) {
    throw new ApiError(404, "User does not exist");
  }
  const isPasswordCorrect = await existingUser?.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "invalid credentials");
  }
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(existingUser?._id);

  const loggedInUser = await User.findById(existingUser?._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken".refreshToken, option)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

export const logoutUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, {
    $unset: {
      refreshToken: 1, // removes the token
    },
  });
  return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200, {}, "user logged out"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }
  try {
    const decodedToken = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(404, "invalid refresh token");
    }
    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user?._id);
    user.refreshToken = refreshToken;
    return res
      .status(200)
      .cookie("accessToken", accessToken, option)
      .cookie("refreshToken", refreshToken, option)
      .json(new ApiResponse(200, { user, accessToken, refreshToken }));
  } catch (error) {
    throw new ApiError(400, "Something went wrong");
  }
});
