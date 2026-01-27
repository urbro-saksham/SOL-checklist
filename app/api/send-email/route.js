import nodemailer from "nodemailer";
import axios from "axios";

const FILE_URL = "https://docs.google.com/spreadsheets/d/13UUl-aSWn86eW0ixwLOxBGahCMjaEA0R/export?format=csv";

export async function POST(request) {
  try {
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

    const date = request.headers.get('filedate');

    const filedate = date ? date : new Date().toLocaleDateString('en-IN');

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: "suckzhum@gmail.com",
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
  } catch (err) {
    console.error(err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
