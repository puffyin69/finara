import cloudinary from "@/app/lib/cloudinary";
import {NextResponse} from "next/server";

export async function POST(request){
    try{    
        const formData = await request.formData()
        const file = formData.get("file");
        if(!file){
            return NextResponse.json({
                message : "File not found"
            },{status:400});
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({
                folder: "images",
                resource_type: "auto"  
            }, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }).end(buffer);
        });

        return NextResponse.json({
            message: "File uploaded successfully",
            url: result.secure_url,
            public_id: result.public_id        
        }, { status: 201 });

    }catch(Error){
        return NextResponse.json({
            message : "Internal Server Error",error:Error.message
        },{status:500});
    }
}