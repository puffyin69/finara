import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ConnectDb } from "@/app/lib/Mongodb";
import { User } from "@/models/User";

const dateRangeEnums = {
    LAST_30_DAYS:"30days",
    LAST_MONTH:"lastMonth",
    LAST_3_MONTHS:"3months",
    LAST_6_MONTHS:"6months",
    LAST_YEAR:"1year",
    ALL_TIME:"allTime",
    CUSTOM:"custom"
}


function getDateRange(preset){
    const now = new Date();
    let fromDate, toDate;
    switch(preset){
        case dateRangeEnums.LAST_30_DAYS:
            fromDate = new Date();
            fromDate.setDate(now.getDate() - 30);
            toDate = now;
            break;
        case dateRangeEnums.LAST_MONTH:
            fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            toDate = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        case dateRangeEnums.LAST_3_MONTHS:
            fromDate = new Date();
            fromDate.setMonth(now.getMonth() - 3);
            toDate = now;
            break;
        case dateRangeEnums.LAST_6_MONTHS:
            fromDate = new Date();
            fromDate.setMonth(now.getMonth() - 6);
            toDate = now;
            break;
        case dateRangeEnums.LAST_YEAR:
            fromDate = new Date();
            fromDate.setFullYear(now.getFullYear() - 1);
            toDate = now;
            break;
        case dateRangeEnums.ALL_TIME:
            fromDate = new Date(0);
            toDate = now;
            break;
        case dateRangeEnums.CUSTOM:
            // Handled separately
            break;
        default:
            throw new Error("Invalid date range preset");
    }
}


export async function GET(request,{params}){
    try{
        await ConnectDb();
        const session = await auth();
        
        if(!session.user.email){
            return NextResponse.json({
                message : "Not authorised! Please Login to continue",
            },{status:401})
        }
        const user = await User.findOne({email:session.user.email})
        if(!user){
            return NextResponse.json({
                message:"No user found!"
            },{status:404})
        }

        const {searchParams} = new URL(request.url);
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const preset = searchParams.get("preset");

        const filter ={
            dataRangePreset : preset,
            customFrom: from ? new Date() : undefined,
            customTo : to ? new Date() : undefined,
        }
        let fromDate, toDate;

        if(preset === dateRangeEnums.CUSTOM){
            if(!from || !to){
                return NextResponse.json({
                    message:"Missing required parameters: from and to dates"
                },{status:404})
            }
            fromDate= new Date(from);
            toDate = new Date(to);
            if(isNaN(fromDate.getTime()) || isNaN(toDate.getTime())){
                return NextResponse.json({
                    message:"Invalid date format. Use YYYY-MM-DD"
                },{status:400})
            }
            if(fromDate > toDate){
                return NextResponse.json({
                    message:"Invalid Date Range given"
                },{status:400})
            }
            toDate.setHours(23,59,59,999);
        }else{
            try{
                const range = getDateRange(preset);
                fromDate = range.fromDate;
                toDate = range.toDate;
            }catch(error){
                return NextResponse.json({
                    message:"Invalid date range preset"
                },{status:400})
            }

        }

        const date = getDateRange(preset);
        

    }catch(error){
        return NextResponse.json({
            message:"Internal Server Error",
            error : error.message
        },{status:401})
    }
    
}