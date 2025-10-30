import type { NextApiRequest, NextApiResponse } from 'next';
import { getMqttClient, getPrismaClient } from '@/helpers';
import qs from 'qs';

const prisma = getPrismaClient();
const mqttClient = getMqttClient();

//-----------------

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
  const slug = req.query?.slug.length > 0 ? req.query?.slug[0] : '';

  if (slug == 'sendMessage') {
    await sendMessage(req, res);
  } else if (slug == 'updateSettings') {
    await updateSettings(req, res);
  } else if (slug == 'alarmStatus') {
    await alarmStatus(req, res);
  }
}

const sendMessage = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  try {
    ['001', '002'].forEach((deviceId) => {
      const message = { battery: 90, signal: 80 };
      mqttClient.publish(`sendDeviceMessage/${deviceId}`, JSON.stringify(message));
    });

    res.status(200).json({ message: 'success' });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const alarmStatus = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  //todo: yapılacak
};

const updateSettings = async function handler(
  req: NextApiRequest | any,
  res: NextApiResponse
) {
  if (req.query?.slug.length != 2) {
    return;
  }

  try {
    const deviceCode = req.query?.slug[1].toString();

    const device: any = await prisma.device.findFirst({
      where: { deletedAt: null, code: deviceCode },
    });

    if (!device) {
      res.status(500).json({ message: 'device not found' });
    }

    if (device.parentId) {
      const parentDevice: any = await prisma.device.findFirst({
        where: { deletedAt: null, id: device.parentId },
      });

      if (!parentDevice || !parentDevice.code) {
        res.status(500).json({ message: 'parent device not found' });
      }

      const payload = { code: deviceCode, alarm: 'off' };
      mqttClient.publish(`alarm/${parentDevice.code}`, JSON.stringify(payload));

      res.status(200).json({ message: 'success' });
    }
  } catch (error) {
    res.status(500).json({ error });
  }
};
