import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { apiInit, getColumnTypes } from '@/helpers';

const prisma = new PrismaClient({ log: ['error', 'warn', 'info', 'query'] });

export default async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  const result = await apiInit(req, res, prisma);
  if (!result) return;

  if (
    ['POST', 'PUT', 'DELETE'].includes(req.method) &&
    req.user?.role != 'admin'
  ) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const moduleName = 'Category';
  const types: any = await getColumnTypes(prisma, moduleName);
  const id: number | null = req.query?.slug ? Number(req.query?.slug[0]) : null;

  req.meta = { userId: req.user?.id, moduleName, types, id };

  if (req.method === 'GET' && id) {
    await get(req, res);
  } else if (req.method === 'GET') {
    await index(req, res);
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
          where.AND.push({ [key]: { contains: val, mode: 'insensitive' } });
        }
      });
    }

    const order = (req.query.order as string) || 'id';
    const direction = (req.query.direction as string) || 'desc';

    const data: any = await (prisma as any)[req.meta.moduleName].findMany({
      skip: Number(req.query.skip || 0),
      take: Number(req.query.take || 50),
      where,
      orderBy: {
        [order]: direction,
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
    });

    if (!data) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

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
    res.status(401).json({ error: 'code required' });
    return;
  }

  if (!req.body.name) {
    res.status(401).json({ error: 'name required' });
    return;
  }

  // Check if code already exists
  let dataByCode = await (prisma as any)[req.meta.moduleName].findFirst({
    where: { deletedAt: null, code: req.body.code },
  });

  if (dataByCode) {
    res.status(409).json({ error: `Already exists code: ${req.body.code}` });
    return;
  }

  // Check if name already exists
  let dataByName = await (prisma as any)[req.meta.moduleName].findFirst({
    where: { deletedAt: null, name: req.body.name },
  });

  if (dataByName) {
    res.status(409).json({ error: `Already exists name: ${req.body.name}` });
    return;
  }

  // Check if parentId exists
  if (req.body.parentId) {
    let parentData = await (prisma as any)[req.meta.moduleName].findFirst({
      where: { deletedAt: null, id: req.body.parentId * 1 },
    });

    if (!parentData) {
      res
        .status(404)
        .json({ error: `ParentId not found: ${req.body.parentId}` });
      return;
    }
  }

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
  let data = await (prisma as any)[req.meta.moduleName].findFirst({
    where: { deletedAt: null, id: req.meta.id },
  });

  if (!data) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (req.body.code) {
    // Check if code already exists
    let dataByCode = await (prisma as any)[req.meta.moduleName].findFirst({
      where: { deletedAt: null, code: req.body.code, NOT: { id: req.meta.id } },
    });

    if (dataByCode) {
      res.status(409).json({ error: `Already exists code: ${req.body.code}` });
      return;
    }
  }

  if (req.body.name) {
    // Check if name already exists
    let dataByName = await (prisma as any)[req.meta.moduleName].findFirst({
      where: { deletedAt: null, name: req.body.name, NOT: { id: req.meta.id } },
    });

    if (dataByName) {
      res.status(409).json({ error: `Already exists name: ${req.body.name}` });
      return;
    }
  }

  // Check if parentId exists
  if (req.body.parentId) {
    let parentData = await (prisma as any)[req.meta.moduleName].findFirst({
      where: { deletedAt: null, id: req.body.parentId * 1 },
    });

    if (!parentData) {
      res
        .status(404)
        .json({ error: `ParentId not found: ${req.body.parentId}` });
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
