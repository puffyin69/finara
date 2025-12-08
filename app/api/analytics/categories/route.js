import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ConnectDb } from "@/app/lib/Mongodb";
import { User } from "@/models/User";
import mongoose from "mongoose";
import { Transactions } from "@/models/Transaction";
import { getDateRange } from "../route";
const dateRangeEnums = {
  LAST_30_DAYS: "30days",
  LAST_MONTH: "lastMonth",
  LAST_3_MONTHS: "3months",
  LAST_6_MONTHS: "6months",
  LAST_YEAR: "1year",
  ALL_TIME: "allTime",
  CUSTOM: "custom",
};

export async function GET(request){
    try{
        await ConnectDb();
        const session = await auth();
        if (!session.user.email) {
          return NextResponse.json(
            {
              message: "Not authorised! Please Login to continue",
            },
            { status: 401 }
          );
        }
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
          return NextResponse.json(
            {
              message: "No user found!",
            },
            { status: 404 }
          );
        }

        const { searchParams } = new URL(request.url);

    }catch(error){
        return NextResponse.json({
            message:"Internal Server Error",
            error:error.message
        },{status:500} 
    
    )
    }
}

