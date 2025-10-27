import nodemailer from 'nodemailer';
import qs from 'qs';
import jwt from 'jsonwebtoken';

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
    console.error('Error fetching column types:', error);
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
    const mailOptions: any = {
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
    console.error('sendMail error:', error);
    return { success: false, error };
  }
}

export async function apiInit(req: any, res: any, prisma: any) {
  const JWT_SECRET = process.env.JWT_SECRET as string;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method == 'OPTIONS') {
    return res.status(200).end();
  }

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  req.query = qs.parse(req.query);

  const authHeader: string = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is missing' });
  }

  const token = authHeader.split(' ')[1];
  if (!authHeader.startsWith('Bearer ') || !token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = null;
    if (decoded.userId) {
      req.user = await prisma.user.findFirst({
        where: { id: decoded.userId },
      });

      if (!req.user) {
        res.status(404).json({ error: 'User Not found' });
        return;
      }
    } else {
      res.status(404).json({ error: 'Token UserId Not found' });
      return;
    }
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }

  return true;
}
