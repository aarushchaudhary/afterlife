import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        // 1. Check if environment variables are actually loaded by Amplify
        if (!process.env.S3_REGION || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY || !process.env.S3_S3_BUCKET_NAME) {
            console.error("CRITICAL ERROR: Missing S3 Environment Variables. Loaded status:", {
                region: !!process.env.S3_REGION,
                accessKey: !!process.env.S3_ACCESS_KEY_ID,
                secretKey: !!process.env.S3_SECRET_ACCESS_KEY,
                bucket: !!process.env.S3_S3_BUCKET_NAME
            });
            return NextResponse.json({ error: "Server missing environment variables" }, { status: 500 });
        }

        // 2. Initialize the S3 client INSIDE the handler
        const s3Client = new S3Client({
            region: process.env.S3_REGION,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            },
        });

        const { fileName, fileType, ownerWallet } = await req.json();

        // Create a unique object key
        const uniqueFileName = `${Date.now()}-${fileName}`;
        const objectKey = `vaults/${ownerWallet}/${uniqueFileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.S3_S3_BUCKET_NAME,
            Key: objectKey,
            ContentType: fileType,
        });

        // Generate a pre-signed URL valid for 60 seconds
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

        return NextResponse.json({
            uploadUrl: signedUrl,
            objectKey: objectKey
        });
    } catch (error) {
        // Now this will actually catch S3 errors and log them properly
        console.error("Error generating pre-signed URL:", error);
        return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }
}