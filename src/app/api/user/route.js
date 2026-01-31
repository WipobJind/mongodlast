import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  ...corsHeaders,
};

// Handle preflight OPTIONS requests
export async function OPTIONS(req) {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// GET all users with pagination
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const client = await getClientPromise();
    const db = client.db("wad-01");
    const collection = db.collection("user");

    const totalCount = await collection.countDocuments({});
    const totalPages = Math.ceil(totalCount / limit);

    // Exclude password from results
    const users = await collection
      .find({})
      .project({ password: 0 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json(
      {
        data: users,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      { headers: noCacheHeaders }
    );
  } catch (exception) {
    console.log("GET error:", exception.toString());
    return NextResponse.json(
      { message: exception.toString() },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST create new user
export async function POST(req) {
  try {
    const data = await req.json();
    const { username, email, password, firstname, lastname } = data;

    if (!username || !email || !password) {
      return NextResponse.json(
        { message: "Missing mandatory data: username, email, password" },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await getClientPromise();
    const db = client.db("wad-01");

    const result = await db.collection("user").insertOne({
      username: username,
      email: email,
      password: await bcrypt.hash(password, 10),
      firstname: firstname || "",
      lastname: lastname || "",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { id: result.insertedId, message: "User created" },
      { status: 201, headers: corsHeaders }
    );
  } catch (exception) {
    console.log("POST error:", exception.toString());
    const errorMsg = exception.toString();
    let displayErrorMsg = "An error occurred";

    if (errorMsg.includes("duplicate")) {
      if (errorMsg.includes("username")) {
        displayErrorMsg = "Duplicate Username!";
      } else if (errorMsg.includes("email")) {
        displayErrorMsg = "Duplicate Email!";
      }
    }

    return NextResponse.json(
      { message: displayErrorMsg },
      { status: 400, headers: corsHeaders }
    );
  }
}