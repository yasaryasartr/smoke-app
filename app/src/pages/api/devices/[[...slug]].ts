import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import qs from "qs";
import jwt from "jsonwebtoken";
import { getColumnTypes } from "@/helpers";

const JWT_SECRET = process.env.JWT_SECRET as string;
const prisma = new PrismaClient({ log: ["error", "warn", "info", "query"] });

export default async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  req.query = qs.parse(req.query);

  let userId: number = 0;
  const authHeader: string = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header is missing" });
  }

  const token = authHeader.split(" ")[1];
  if (!authHeader.startsWith("Bearer ") || !token) {
    return res.status(401).json({ error: "Token missing" });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    if (decoded.userId) {
      userId = decoded.userId;
    }
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }

  const moduleName = "Device";
  const types: any = await getColumnTypes(prisma, moduleName);
  const id: number | null = req.query?.slug ? Number(req.query?.slug[0]) : null;

  req.meta = { userId, moduleName, types, id };

  if (req.method === "GET" && id) {
    await get(req, res);
  } else if (req.method === "GET") {
    await index(req, res);
  } else if (
    req.method === "POST" &&
    req.query?.slug &&
    req.query.slug[0] == "register"
  ) {
    await register(req, res);
  } else if (req.method === "POST") {
    await create(req, res);
  } else if (req.method === "PUT" && id) {
    await update(req, res);
  } else if (
    req.method === "DELETE" &&
    req.query?.slug &&
    req.query.slug[0] == "unregister"
  ) {
    await unregister(req, res);
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

    const data: any = await (prisma as any)[req.meta.moduleName].findMany({
      skip: Number(req.query.skip || 0),
      take: Number(req.query.take || 50),
      where,
      orderBy: {
        [order]: direction,
      },
      include: {
        product: true,
      },
    });
    const total = await (prisma as any)[req.meta.moduleName].count({ where });

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
      include: {
        location: {
          include: {
            parent: {
              include: {
                parent: {
                  include: {
                    parent: {
                      include: {
                        parent: {
                          include: {
                            parent: {
                              include: {
                                parent: {
                                  include: {
                                    parent: true,
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!data) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    //only users can see their own data

    if (!req.user?.userId) {
      res.status(404).json({ error: "UserId Not found" });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { id: req.user.userId },
    });

    if (!user) {
      res.status(404).json({ error: "User Not found" });
      return;
    }

    if (!data.customerId || data.customerId != user.accountId) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    data.locationPath = "a > b";

    //----

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error });
  }
};

const create = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  if (!req.body.code) {
    res.status(401).json({ error: "code required" });
    return;
  }

  if (!req.body.productId) {
    res.status(401).json({ error: "productId required" });
    return;
  }

  let data = await (prisma as any)[req.meta.moduleName].findFirst({
    where: { deletedAt: null, code: req.body.code },
  });

  if (data) {
    res.status(409).json({ error: `Already exists code: ${req.body.code}` });
    return;
  }

  data = await (prisma as any)["Product"].findFirst({
    where: { deletedAt: null, id: req.body.productId * 1 },
  });

  if (!data) {
    res
      .status(404)
      .json({ error: `Not found productId: ${req.body.productId}` });
    return;
  }

  try {
    let maxId = await (prisma as any)[req.meta.moduleName].findFirst({
      select: { id: true },
      orderBy: { id: "desc" },
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
        if ((type == "integer" || type == "numeric") && !isNaN(val * 1)) {
          val = parseInt(val, 10);
        }
        data[key] = val;
      });
    }

    const newData = await (prisma as any)[req.meta.moduleName].create({
      data,
    });

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
  let data = await (prisma as any)[req.meta.moduleName].findFirst({
    where: { deletedAt: null, id: req.meta.id },
  });

  if (!data) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (!req.user?.userId) {
    res.status(404).json({ error: "UserId Not found" });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { id: req.user.userId },
  });

  if (!user) {
    res.status(404).json({ error: "User Not found" });
    return;
  }

  let body: any = {};

  if (req.body.name) {
    body.name = req.body.name;
  }
  if (req.body.locationId) {
    body.locationId = req.body.locationId;
  }

  //only standard user
  req.body = body;

  if (req.body.code) {
    data = await (prisma as any)[req.meta.moduleName].findFirst({
      where: { deletedAt: null, code: req.body.code, NOT: { id: req.meta.id } },
    });

    if (data) {
      res.status(409).json({ error: `Already exists code: ${req.body.code}` });
      return;
    }
  }

  if (req.body.productId) {
    data = await (prisma as any)["Product"].findFirst({
      where: { deletedAt: null, id: req.body.productId * 1 },
    });

    if (!data) {
      res
        .status(404)
        .json({ error: `Not found productId: ${req.body.productId}` });
      return;
    }
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
    let where: any = { deletedAt: null, id: req.meta.id };
    let data = await (prisma as any)[req.meta.moduleName].findFirst({
      where,
    });

    if (!data) {
      res.status(404).json({ error: "Not found" });
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

const register = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  if (!req.body.code) {
    res.status(401).json({ error: "code required" });
    return;
  }

  if (!req.body.name) {
    res.status(401).json({ error: "name required" });
    return;
  }

  if (!req.user?.userId) {
    res.status(404).json({ error: "UserId Not found" });
    return;
  }

  const user = await prisma.user.findFirst({ where: { id: req.user.userId } });

  if (!user) {
    res.status(404).json({ error: "User Not found" });
    return;
  }

  const device = await (prisma as any)[req.meta.moduleName].findFirst({
    where: { deletedAt: null, code: req.body.code, customerId: null },
  });

  if (!device) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const registered = await (prisma as any)[req.meta.moduleName].update({
    data: {
      status: 1,
      locationId: req.body.locationId * 1,
      customerId: user.accountId,
      code: req.body.code,
      name: req.body.name,
    },
    where: { id: device.id },
  });

  if (!registered) {
    res.status(400).json({ error: "Not registered" });
    return;
  }

  res.status(200).json(registered);
};

const unregister = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  if (!req.body.code) {
    res.status(401).json({ error: "code required" });
    return;
  }

  if (!req.user?.userId) {
    res.status(404).json({ error: "UserId Not found" });
    return;
  }

  const user = await prisma.user.findFirst({ where: { id: req.user.userId } });

  if (!user) {
    res.status(404).json({ error: "User Not found" });
    return;
  }

  const device = await (prisma as any)[req.meta.moduleName].findFirst({
    where: { deletedAt: null, code: req.body.code, customerId: user.accountId },
  });

  if (!device) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const unregistered = await (prisma as any)[req.meta.moduleName].update({
    data: {
      status: 0,
      customerId: null,
      name: null,
    },
    where: { id: device.id, customerId: user.accountId },
  });

  if (!unregistered) {
    res.status(400).json({ error: "Not unregistered" });
    return;
  }

  res.status(200).json({ message: "unregistered" });
};
