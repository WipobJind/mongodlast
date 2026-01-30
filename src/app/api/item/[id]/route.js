import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  ...corsHeaders,
};

// Handle preflight OPTIONS requests - THIS IS IMPORTANT FOR CORS
export async function OPTIONS(req) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// GET single item by ID
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const client = await getClientPromise();
    const db = client.db("wad-01");

    const item = await db.collection("item").findOne({ _id: new ObjectId(id) });

    if (!item) {
      return NextResponse.json(
        { message: "Item not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(item, { headers: noCacheHeaders });
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
    if (data.name !== undefined) partialUpdate.itemName = data.name;
    if (data.category !== undefined) partialUpdate.itemCategory = data.category;
    if (data.price !== undefined) partialUpdate.itemPrice = parseFloat(data.price);
    if (data.status !== undefined) partialUpdate.status = data.status;

    const client = await getClientPromise();
    const db = client.db("wad-01");

    const result = await db.collection("item").updateOne(
      { _id: new ObjectId(id) },
      { $set: partialUpdate }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Item not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { message: "Item updated", modifiedCount: result.modifiedCount },
      { status: 200, headers: corsHeaders }
    );
  } catch (exception) {
    console.log("PATCH error:", exception.toString());
    return NextResponse.json(
      { message: exception.toString() },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PUT - full replace
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const data = await req.json();

    const client = await getClientPromise();
    const db = client.db("wad-01");

    const result = await db.collection("item").updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Item not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { message: "Item replaced", modifiedCount: result.modifiedCount },
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

// DELETE item
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const client = await getClientPromise();
    const db = client.db("wad-01");

    const result = await db.collection("item").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Item not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { message: "Item deleted", deletedCount: result.deletedCount },
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