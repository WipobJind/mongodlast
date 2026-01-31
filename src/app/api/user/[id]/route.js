import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";

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

// GET single user by ID
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const client = await getClientPromise();
    const db = client.db("wad-01");

    const user = await db.collection("user").findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(user, { headers: noCacheHeaders });
  } catch (exception) {
    console.log("GET error:", exception.toString());
    return NextResponse.json(
      { message: exception.toString() },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PATCH - partial update
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const data = await req.json();

    const partialUpdate = { updatedAt: new Date() };

    if (data.username !== undefined) partialUpdate.username = data.username;
    if (data.email !== undefined) partialUpdate.email = data.email;
    if (data.firstname !== undefined) partialUpdate.firstname = data.firstname;
    if (data.lastname !== undefined) partialUpdate.lastname = data.lastname;
    if (data.status !== undefined) partialUpdate.status = data.status;

    // If password is provided, hash it
    if (data.password && data.password.trim() !== "") {
      partialUpdate.password = await bcrypt.hash(data.password, 10);
    }

    const client = await getClientPromise();
    const db = client.db("wad-01");

    const result = await db.collection("user").updateOne(
      { _id: new ObjectId(id) },
      { $set: partialUpdate }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { message: "User updated", modifiedCount: result.modifiedCount },
      { status: 200, headers: corsHeaders }
    );
  } catch (exception) {
    console.log("PATCH error:", exception.toString());
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

// PUT - full replace
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const data = await req.json();

    const updateData = {
      username: data.username,
      email: data.email,
      firstname: data.firstname || "",
      lastname: data.lastname || "",
      status: data.status || "ACTIVE",
      updatedAt: new Date(),
    };

    // If password is provided, hash it
    if (data.password && data.password.trim() !== "") {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const client = await getClientPromise();
    const db = client.db("wad-01");

    const result = await db.collection("user").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { message: "User replaced", modifiedCount: result.modifiedCount },
      { status: 200, headers: corsHeaders }
    );
  } catch (exception) {
    console.log("PUT error:", exception.toString());
    return NextResponse.json(
      { message: exception.toString() },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE user
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const client = await getClientPromise();
    const db = client.db("wad-01");

    const result = await db.collection("user").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { message: "User deleted", deletedCount: result.deletedCount },
      { status: 200, headers: corsHeaders }
    );
  } catch (exception) {
    console.log("DELETE error:", exception.toString());
    return NextResponse.json(
      { message: exception.toString() },
      { status: 500, headers: corsHeaders }
    );
  }
}
