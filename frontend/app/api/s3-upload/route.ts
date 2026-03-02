import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

// Initialize the S3 client
const s3Client = new S3Client({
    region: process.env.S3_REGION!,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
});

export async function POST(req: Request) {
    try {
        const { fileName, fileType, ownerWallet } = await req.json();

        // Enforce authentication/wallet verification here if needed

        // Create a unique object key, storing it inside a folder based on the wallet
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
        console.error("Error generating pre-signed URL", error);
        return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }
}