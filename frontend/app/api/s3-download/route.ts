import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function POST(req: Request) {
    try {
        const { objectKey, callerWallet } = await req.json();

        // IMPORTANT: Verify against your RDS database here!
        // 1. Is the vault status 'unlocked'?
        // 2. Is callerWallet in the beneficiary_wallets array?

        const isAuthorized = true; // Replace with actual RDS check

        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: objectKey,
        });

        // Generate a pre-signed download URL valid for 5 minutes
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        return NextResponse.json({ downloadUrl: signedUrl });
    } catch (error) {
        console.error("Error generating download URL", error);
        return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
    }
}