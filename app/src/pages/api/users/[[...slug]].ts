import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import qs from 'qs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getColumnTypes, sendMail } from '@/helpers';

const JWT_SECRET: any = process.env.JWT_SECRET;
const JWT_TOKEN_EXPIRE: any = process.env.JWT_TOKEN_EXPIRE;
const prisma = new PrismaClient({ log: ['error', 'warn', 'info', 'query'] });

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

//demo password: $2a$10$tFq/p.cfAOlWP72sD0zwiO8Obi.C2Rj5z/vGMtFIbF9U0hv0E6QW2

export default async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  if (req.method == 'OPTIONS') {
    return res.status(200).end();
  }

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  req.query = qs.parse(req.query);
  const isLogin = req.method === 'POST' && req.query?.slug == 'login';
  const isForgot = req.method === 'POST' && req.query?.slug == 'forgot';
  const isPreRegister =
    req.method === 'POST' && req.query?.slug == 'pre-register';
  const isVerifyRegister =
    req.method === 'POST' && req.query?.slug == 'verify-register';
  const isProfile = req.method === 'PUT' && req.query?.slug == 'profile';

  if (!isLogin && !isForgot && !isPreRegister && !isVerifyRegister) {
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
      }
    } catch (error) {
      return res.status(403).json({ message: 'Invalid token' });
    }
  }

  const moduleName = 'User';
  const types: any = await getColumnTypes(prisma, moduleName);
  const id: number | null = req.query?.slug ? Number(req.query?.slug[0]) : null;

  req.meta = { userId: req.user?.id, moduleName, types, id };

  if (req.method === 'GET' && id) {
    await get(req, res);
  } else if (req.method === 'GET') {
    await index(req, res);
  } else if (isLogin) {
    await login(req, res);
  } else if (isForgot) {
    await forgot(req, res);
  } else if (isPreRegister) {
    await preRegister(req, res);
  } else if (isVerifyRegister) {
    await verifyRegister(req, res);
  } else if (isProfile) {
    await profile(req, res);
  } else if (req.method === 'POST') {
    await create(req, res);
  } else if (req.method === 'PUT' && id) {
    await update(req, res);
  } else if (req.method === 'DELETE' && id) {
    await destroy(req, res);
  }
}

const index = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  try {
    let where: any = { deletedAt: null, AND: [] };

    if (req.query.filter && typeof req.query.filter === 'object') {
      Object.keys(req.query.filter).forEach((key: string) => {
        let val = req.query.filter[key];
        let type = req.meta.types[key] || null;
        if (type == 'integer' || type == 'numeric') {
          where.AND.push({ [key]: val * 1 });
        } else {
          where.AND.push({
            [key]: { contains: val, mode: 'insensitive' },
          });
        }
      });
    }

    const order = (req.query.order as string) || 'id';
    const direction = (req.query.direction as string) || 'desc';

    let data: any = await (prisma as any)[req.meta.moduleName].findMany({
      skip: Number(req.query.skip || 0),
      take: Number(req.query.take || 50),
      where,
      orderBy: {
        [order]: direction,
      },
    });

    const total = await (prisma as any)[req.meta.moduleName].count({ where });

    data = data.map((d: any) => {
      delete d.password;
      return d;
    });

    res.status(200).json({ data, total });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const get = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  try {
    const data = await (prisma as any)[req.meta.moduleName].findFirst({
      where: { deletedAt: null, id: req.meta.id },
    });

    if (!data) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    delete data.password;

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error });
  }
};

const profile = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  try {
    if (!req.body.name || !req.body.email) {
      res.status(400).json({ error: 'name and email required' });
      return;
    }

    if (!req.user?.userId) {
      res.status(404).json({ error: 'UserId Not found' });
      return;
    }

    if (!req.user) {
      res.status(404).json({ error: 'User Not found' });
      return;
    }

    const userEmailCheck = await (prisma as any)[req.meta.moduleName].findFirst(
      {
        where: { email: req.body.email, NOT: { id: req.user.id } },
      }
    );

    if (userEmailCheck) {
      res.status(409).json({ error: `Already exists email` });
      return;
    }

    //update data
    let data: any = { name: req.body.name, email: req.body.email };

    if (req.body.password) {
      data.password = await hashPassword(req.body.password);
    }

    const updated = await (prisma as any)[req.meta.moduleName].update({
      where: { id: req.user.id },
      data,
    });

    if (!updated) {
      res.status(500).json({ error: 'not updated' });
      return;
    }
  } catch (error) {
    res.status(500).json({ error });
  }

  res.status(200).json({ message: 'success' });
};

const verifyRegister = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  try {
    if (!req.body.verificationCode) {
      res.status(401).json({ error: 'verificationCode required' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { email: req.body.email, status: 0 },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (req.body.verificationCode != user.verificationCode) {
      res.status(400).json({
        error: 'invalid verification code',
        field: 'verification_code',
      });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: 1 },
    });

    if (!updated) {
      res.status(500).json({ error: 'User not updated' });
    }

    res.status(200).json({ message: 'success' });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const preRegister = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  let accountId = 0;

  try {
    if (req.body.registerType == 'new') {
      //accountCheck
      const accountCheck = await prisma.account.findFirst({
        where: { name: req.body.accountName },
      });
      if (accountCheck) {
        res
          .status(409)
          .json({ error: 'Account name exists', field: 'account_name' });
        return;
      }

      //userCheck
      const userCheck = await prisma.user.findFirst({
        where: { email: req.body.email },
      });
      if (userCheck) {
        res
          .status(409)
          .json({ error: 'User email exists', field: 'user_email' });
        return;
      }

      let maxId = await prisma.account.findFirst({
        select: { id: true },
        orderBy: { id: 'desc' },
      });

      const account = await prisma.account.create({
        data: {
          id: (maxId?.id ?? 0) + 1,
          status: 1,
          name: req.body.accountName,
          email: req.body.email,
        },
      });

      if (!account) {
        res.status(400).json({ error: 'Accout Not created' });
        return;
      }

      accountId = account.id;
    }

    if (req.body.registerType == 'join') {
      accountId = req.body.accountId * 1;

      //accountCheck
      const accountCheck = await prisma.account.findFirst({
        where: { id: accountId },
      });
      if (!accountCheck) {
        res
          .status(404)
          .json({ error: 'Account id not found', field: 'account_id' });
        return;
      }
    }

    const password = await hashPassword(req.body.password);

    const verificationCode = Math.floor(
      10000000 + Math.random() * 90000000
    ).toString();

    let maxId = await prisma.user.findFirst({
      select: { id: true },
      orderBy: { id: 'desc' },
    });

    const user = await prisma.user.create({
      data: {
        id: (maxId?.id ?? 0) + 1,
        status: 0,
        name: req.body.name,
        email: req.body.email,
        password,
        accountId: accountId,
        verificationCode,
      },
    });

    if (!user) {
      res.status(400).json({ error: 'User Not created' });
      return;
    }

    let sendMailRequest: any = {};

    try {
      sendMailRequest = await sendMail({
        to: req.body.email,
        subject: 'Nvimax Doğrulama Kodu',
        message: `Merhaba, ${req.body.name}<br><br>Kayıt işlemine devam edebilmeniz için,<br>Doğrulama Kodunuz: <b>${verificationCode}</b><br><br>www.nvimax.com`,
      });
    } catch (mailError) {}

    if (sendMailRequest.success) {
      res.status(201).json({ message: 'created' });
    } else {
      res.status(201).json({
        message: 'created',
        error: 'Email could not be sent',
        mail_error: sendMailRequest.error,
      });
    }
  } catch (error: any) {
    if (error.code == 'P2002') {
      res.status(409).json(Object.assign({ error: 'Conflict' }, error.meta));
      return;
    }
  }
};

const create = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  try {
    let maxId = await (prisma as any)[req.meta.moduleName].findFirst({
      select: { id: true },
      orderBy: { id: 'desc' },
    });

    let data: any = {
      id: (maxId?.id ?? 0) + 1,
      createdAt: new Date(),
      createdUserId: req.meta.userId,
    };

    if (req.body && Object.keys(req.body).length > 0) {
      Object.keys(req.body).forEach((key: string) => {
        let val = req.body[key];
        let type = req.meta.types[key] || null;
        if ((type == 'integer' || type == 'numeric') && !isNaN(val * 1)) {
          val = parseInt(val, 10);
        }
        data[key] = val;
      });
    }

    const newData = await (prisma as any)[req.meta.moduleName].create({
      data,
    });

    if (!newData) {
      res.status(400).json({ error: 'Not created' });
      return;
    }

    res.status(201).json(newData);
  } catch (error: any) {
    if (error.code == 'P2002') {
      res.status(409).json(Object.assign({ error: 'Conflict' }, error.meta));
      return;
    }

    res.status(500).json({ error });
  }
};

const update = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  const data = await (prisma as any)[req.meta.moduleName].findFirst({
    where: { deletedAt: null, id: req.meta.id },
  });

  if (!data) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    let where: any = { id: req.meta.id };

    let data: any = {
      updatedAt: new Date(),
      updatedUserId: req.meta.userId,
    };

    if (req.body && Object.keys(req.body).length > 0) {
      Object.keys(req.body).forEach((key: string) => {
        let val = req.body[key];
        let type = req.meta.types[key] || null;
        if ((type == 'integer' || type == 'numeric') && !isNaN(val * 1)) {
          val = parseInt(val, 10);
        }
        data[key] = val;
      });
    }

    const newData = await (prisma as any)[req.meta.moduleName].update({
      data,
      where,
    });

    if (!newData) {
      res.status(400).json({ error: 'Not updated' });
      return;
    }

    res.status(200).json(newData);
  } catch (error: any) {
    if (error.code == 'P2002') {
      res.status(409).json(Object.assign({ error: 'Conflict' }, error.meta));
      return;
    } else if (error.code == 'P2025') {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.status(500).json({ error });
  }
};

const destroy = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  try {
    let where: any = { deletedAt: null, id: req.meta.id };
    let data = await (prisma as any)[req.meta.moduleName].findFirst({
      where,
    });

    if (!data) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const newData = await (prisma as any)[req.meta.moduleName].update({
      data: {
        deletedAt: new Date(),
        deletedUserId: req.meta.userId,
      },
      where,
    });

    if (!newData) {
      res.status(400).json({ error: 'Not deleted' });
      return;
    }

    res.status(200).json({ message: 'deleted' });
  } catch (error: any) {
    if (error.code == 'P2025') {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.status(500).json({ error });
  }
};

const forgot = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  if (!req.body.email) {
    res.status(401).json({ error: 'email required' });
    return;
  }

  let where: any = { deletedAt: null, email: req.body.email };
  const user = await (prisma as any)[req.meta.moduleName].findFirst({
    where,
  });

  if (!user) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (req.body.step == 'verification') {
    if (!req.body.verificationCode) {
      res.status(401).json({ error: 'verificationCode required' });
      return;
    }
    if (req.body.verificationCode != user.verificationCode) {
      res.status(401).json({ error: 'verificationCode wrong' });
      return;
    }

    res.status(200).json({ message: 'verified' });
    return;
  }

  if (req.body.step == 'reset_password') {
    if (!req.body.password) {
      res.status(401).json({ error: 'password required' });
      return;
    }

    if (!req.body.passwordRepeat) {
      res.status(401).json({ error: 'passwordRepeat required' });
      return;
    }

    if (req.body.password != req.body.passwordRepeat) {
      res.status(401).json({ error: 'passwordRepeat wrong' });
      return;
    }

    const password = await hashPassword(req.body.password);

    const updated = await (prisma as any)[req.meta.moduleName].update({
      where: { id: user.id },
      data: { password, status: 1 },
    });

    if (!updated) {
      res.status(500).json({ error: 'not reset' });
      return;
    }

    res.status(200).json({ message: 'password reset' });
    return;
  }

  const verificationCode = Math.floor(
    10000000 + Math.random() * 90000000
  ).toString();

  const updated = await (prisma as any)[req.meta.moduleName].update({
    where: { id: user.id },
    data: { verificationCode },
  });

  if (!updated) {
    res.status(500).json({ error: 'not updated' });
    return;
  }

  let sendMailRequest: any = {};

  try {
    sendMailRequest = await sendMail({
      to: user.email,
      subject: 'Nvimax Doğrulama Kodu',
      message: `Merhaba, ${user.name}<br><br>Parola sıfırlama işlemine devam edebilmeniz için,<br>Doğrulama Kodunuz: <b>${verificationCode}</b><br><br>www.nvimax.com`,
    });
  } catch (mailError) {}

  if (sendMailRequest.success) {
    res.status(200).json({ message: 'mail sended' });
  } else {
    res.status(200).json({
      message: 'mail sended',
      error: 'Email could not be sent',
      mail_error: sendMailRequest.error,
    });
  }
};

const login = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  if (!req.body.email) {
    res.status(401).json({ error: 'email required' });
    return;
  }
  if (!req.body.password) {
    res.status(401).json({ error: 'password required' });
    return;
  }

  try {
    let where: any = { deletedAt: null, email: req.body.email };
    const data = await (prisma as any)[req.meta.moduleName].findFirst({
      where,
    });

    if (!data) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (data.status != 1) {
      res.status(401).json({ error: 'Not active' });
      return;
    }
    let isPasswordCorrect = false;

    try {
      isPasswordCorrect = await bcrypt.compare(
        req.body.password,
        data.password
      );
    } catch (error) {
      console.error('bcrypt.compare', error);
    }

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: data.id }, JWT_SECRET, {
      expiresIn: JWT_TOKEN_EXPIRE,
    });
    data.token = token;

    delete data.password;

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error });
  }
};
