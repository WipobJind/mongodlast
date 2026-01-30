import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
  ...corsHeaders,
};

// Handle preflight OPTIONS requests
export async function OPTIONS(req) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// GET all items with pagination
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const client = await getClientPromise();
    const db = client.db("wad-01");
    const collection = db.collection("item");

    const totalCount = await collection.countDocuments({});
    const totalPages = Math.ceil(totalCount / limit);

    const items = await collection.find({}).skip(skip).limit(limit).toArray();

    return NextResponse.json(
      {
        data: items,
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

// POST create new item
export async function POST(req) {
  try {
    const data = await req.json();

    if (!data.name || !data.category || data.price === undefined) {
      return NextResponse.json(
        { message: "Missing required fields: name, category, price" },
        { status: 400, headers: corsHeaders }
      );
    }

    const client = await getClientPromise();
    const db = client.db("wad-01");

    const result = await db.collection("item").insertOne({
      itemName: data.name,
      itemCategory: data.category,
      itemPrice: parseFloat(data.price),
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { id: result.insertedId, message: "Item created" },
      { status: 201, headers: corsHeaders }
    );
  } catch (exception) {
    console.log("POST error:", exception.toString());
    return NextResponse.json(
      { message: exception.toString() },
      { status: 500, headers: corsHeaders }
    );
  }
}
