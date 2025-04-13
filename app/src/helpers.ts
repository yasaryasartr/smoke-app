import nodemailer from "nodemailer";

export async function getColumnTypes(prisma: any, tableName: string) {
  let columnTypes;
  try {
    const sql = `SELECT col.column_name,col.data_type FROM information_schema.columns AS col WHERE col.table_schema = 'public' AND col.table_name = '${tableName}'`;

    const result: any[] = await prisma.$queryRawUnsafe(sql);

    columnTypes = result?.reduce(
      (
        acc: Record<string, string>,
        column: { column_name: string; data_type: string }
      ) => {
        acc[column.column_name] = column.data_type;
        return acc;
      },
      {}
    );
  } catch (error) {
    console.error("Error fetching column types:", error);
  }

  return columnTypes;
}

export async function sendMail({
  to,
  subject,
  message,
}: {
  to: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; error?: any }> {
  try {
    const mailOptions = {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: process.env.MAIL_SECURE,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    };
    const transporter = nodemailer.createTransport(mailOptions);

    await transporter.sendMail({
      from: mailOptions.auth.user,
      to,
      subject,
      html: message,
    });

    return { success: true };
  } catch (error) {
    console.error("sendMail error:", error);
    return { success: false, error };
  }
}
