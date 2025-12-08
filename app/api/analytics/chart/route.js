import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ConnectDb } from "@/app/lib/Mongodb";
import { User } from "@/models/User";
import {Transactions} from "@/models/Transaction";

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
        if(!session.user.email){
            return NextResponse.json({
                message:"Not authorised! Please Login to continue"
            },{status:401})
        }

        const user = await User.findOne({ email: session.user.email });
        if(!user){
            return NextResponse.json({
                message:"No user found!"
            },{status:404})
        }


    }catch(error){
        return NextResponse.json({
            message:"Internal Server Error"
        },{status:500})
    }
}