import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
  console.log(req?.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverLocalPath = req?.files?.coverImage[0]?.path;

  if (avatarLocalPath) {
    throw new ApiError(400, "Avatar image required.");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverLocalPath);

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
