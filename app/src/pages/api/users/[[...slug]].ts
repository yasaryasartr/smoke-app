import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import qs from "qs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getColumnTypes } from "@/helpers";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_TOKEN_EXPIRE = process.env.JWT_TOKEN_EXPIRE as string;
const prisma = new PrismaClient({ log: ["error", "warn", "info"] });

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
  req.query = qs.parse(req.query);
  const isLogin = req.method === "POST" && req.query?.slug == "login";

  let userId: number = 0;

  if (!isLogin) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header is missing" });
    }

    const token = authHeader.split(" ")[1];
    if (!authHeader.startsWith("Bearer ") || !token) {
      return res.status(401).json({ error: "Token missing" });
    }

    try {
      const decoded:any = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      if (decoded.userId) {
        userId = decoded.userId;
      }
    } catch (error) {
      return res.status(403).json({ message: "Invalid token" });
    }
  }

  const moduleName = "User";
  const types: any = await getColumnTypes(prisma, moduleName);
  const id: number | null = req.query?.slug ? Number(req.query?.slug[0]) : null;

  req.meta = { userId, moduleName, types, id };

  if (req.method === "GET" && id) {
    await get(req, res);
  } else if (req.method === "GET") {
    await index(req, res);
  } else if (req.method === "POST" && req.query?.slug == "login") {
    await login(req, res);
  } else if (req.method === "POST") {
    await create(req, res);
  } else if (req.method === "PUT" && id) {
    await update(req, res);
  } else if (req.method === "DELETE" && id) {
    await destroy(req, res);
  } else {
    res.status(405).end(`Not Allowed`);
  }
}

const index = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  try {
    let where: any = { deletedAt: null, AND: [] };

    if (req.query.filter && typeof req.query.filter === "object") {
      Object.keys(req.query.filter).forEach((key: string) => {
        let val = req.query.filter[key];
        let type = req.meta.types[key] || null;
        if (type == "integer" || type == "numeric") {
          where.AND.push({ [key]: val * 1 });
        } else {
          where.AND.push({ [key]: { contains: val, mode: "insensitive" } });
        }
      });
    }

    const order = (req.query.order as string) || "id";
    const direction = (req.query.direction as string) || "desc";

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
    let where: any = { deletedAt: null, id: req.meta.id };
    const data = await (prisma as any)[req.meta.moduleName].findFirst({
      where,
    });

    if (!data) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    delete data.password;

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error });
  }
};

const create = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  try {
    let data: any = {
      createdAt: new Date(),
      createdUserId: req.meta.userId,
    };

    if (req.body && Object.keys(req.body).length > 0) {
      Object.keys(req.body).forEach((key: string) => {
        let val = req.body[key];
        let type = req.meta.types[key] || null;
        if ((type == "integer" || type == "numeric") && !isNaN(val * 1)) {
          val = parseInt(val, 10);
        }
        data[key] = val;
      });
    }

    const newData = await (prisma as any)[req.meta.moduleName].create({
      data,
    });

    //409 conflict

    if (!newData) {
      res.status(400).json({ error: "Not created" });
      return;
    }

    res.status(201).json(newData);
  } catch (error: any) {
    if (error.code == "P2002") {
      res.status(409).json(Object.assign({ error: "Conflict" }, error.meta));
      return;
    }

    res.status(500).json({ error });
  }
};

const update = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
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
        if ((type == "integer" || type == "numeric") && !isNaN(val * 1)) {
          val = parseInt(val, 10);
        }
        data[key] = val;
      });
    }

    const newData = await (prisma as any)[req.meta.moduleName].update({
      data,
      where,
    });

    //409 conflict

    if (!newData) {
      res.status(400).json({ error: "Not updated" });
      return;
    }

    res.status(200).json(newData);
  } catch (error: any) {
    if (error.code == "P2002") {
      res.status(409).json(Object.assign({ error: "Conflict" }, error.meta));
      return;
    } else if (error.code == "P2025") {
      res.status(404).json({ error: "Not found" });
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
    let where: any = { id: req.meta.id };

    let data: any = {
      deletedAt: new Date(),
      deletedUserId: req.meta.userId,
    };

    const newData = await (prisma as any)[req.meta.moduleName].update({
      data,
      where,
    });

    if (!newData) {
      res.status(400).json({ error: "Not deleted" });
      return;
    }

    res.status(200).json({ message: "deleted" });
  } catch (error: any) {
    if (error.code == "P2025") {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.status(500).json({ error });
  }
};

const login = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  try {
    let where: any = { deletedAt: null, email: req.body.email };
    const data = await (prisma as any)[req.meta.moduleName].findFirst({
      where,
    });

    if (!data) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    if (data.status != 1) {
      res.status(401).json({ error: "Not active" });
      return;
    }

    const isPasswordCorrect = await bcrypt.compare(
      req.body.password,
      data.password
    );
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = await jwt.sign({ userId: data.id }, JWT_SECRET, {
      expiresIn: JWT_TOKEN_EXPIRE,
    });

    data.token = token;

    delete data.password;

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error });
  }
};
