import { verifyJWT } from "@/lib/auth";
import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

export async function OPTIONS(req) {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// Helper to parse multipart form data
async function parseMultipartFormData(req) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data")) {
    throw new Error("Invalid content-type");
  }
  const formData = await req.formData();
  return formData;
}

// POST - Upload profile image
export async function POST(req) {
  const user = verifyJWT(req);

  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  let formData;
  try {
    formData = await parseMultipartFormData(req);
  } catch (err) {
    return NextResponse.json(
      { message: "Invalid form data" },
      { status: 400, headers: corsHeaders }
    );
  }

  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { message: "No file uploaded" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Check if file is an image
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { message: "Only image files allowed (jpeg, png, gif, webp)" },
      { status: 400, headers: corsHeaders }
    );
  }

  // Generate unique filename using UUID (unguessable)
  const ext = file.name.split(".").pop();
  const filename = uuidv4() + "." + ext;
  const savePath = path.join(process.cwd(), "public", "profile-images", filename);

  // Ensure directory exists
  const dir = path.join(process.cwd(), "public", "profile-images");
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }

  // Save file to disk
  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(savePath, Buffer.from(arrayBuffer));

  // Delete old image if exists
  try {
    const client = await getClientPromise();
    const db = client.db("wad-01");
    const existingUser = await db.collection("user").findOne({ email: user.email });

    if (existingUser && existingUser.profileImage) {
      const oldPath = path.join(process.cwd(), "public", existingUser.profileImage);
      try {
        await fs.rm(oldPath);
      } catch (err) {
        // File might not exist, ignore
      }
    }

    // Update user in MongoDB
    await db.collection("user").updateOne(
      { email: user.email },
      { $set: { profileImage: `/profile-images/${filename}` } }
    );
  } catch (err) {
    return NextResponse.json(
      { message: "Failed to update user" },
      { status: 500, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    { imageUrl: `/profile-images/${filename}` },
    { status: 200, headers: corsHeaders }
  );
}

// DELETE - Remove profile image
export async function DELETE(req) {
  const user = verifyJWT(req);

  if (!user) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const client = await getClientPromise();
    const db = client.db("wad-01");
    const email = user.email;
    const profile = await db.collection("user").findOne({ email });

    if (profile && profile.profileImage) {
      const filePath = path.join(process.cwd(), "public", profile.profileImage);
      try {
        await fs.rm(filePath);
      } catch (err) {
        // File might not exist, ignore
      }
      await db.collection("user").updateOne(
        { email },
        { $set: { profileImage: null } }
      );
    }

    return NextResponse.json(
      { message: "Image deleted" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.toString() },
      { status: 500, headers: corsHeaders }
    );
  }
}
