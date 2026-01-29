import nodemailer from "nodemailer";
import axios from "axios";

const FILE_URL = "https://docs.google.com/spreadsheets/d/13UUl-aSWn86eW0ixwLOxBGahCMjaEA0R/export?format=csv";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filedate: date, email } = body;

    if (!email || !email.trim()) {
      return Response.json(
        { success: false, error: 'Email address is required' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const response = await axios.get(FILE_URL, {
      responseType: "arraybuffer"
    });

    const filedate = date ? date : new Date().toLocaleDateString('en-IN');

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email.trim(),
      subject: `Attendance Sheet ${filedate}`,
      text: `Attached is the Attendance Excel Sheet of ${filedate}.`,
      attachments: [
        {
          filename: "sheet-data.csv",
          content: response.data
        }
      ]
    });

    return Response.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return Response.json(
      { success: false, error: err?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
