import Aedes from 'aedes';
import net from 'net';
import { getPrismaClient } from './helpers.ts';
import 'dotenv/config';

const prisma = getPrismaClient();

const brokerUrl = process.env.MQTT_BROKER_URL || '';
const brokerUser = process.env.MQTT_USERNAME || '';
const brokerPassword = process.env.MQTT_PASSWORD || '';

const PORT = parseInt(brokerUrl.split(':').pop() || '1883', 10);
const aedes: any = new Aedes();
const server = net.createServer(aedes.handle);

const sendDeviceMessage = async ({ deviceCode, payloadString }: any) => {
  let device = await prisma.device.findFirst({
    where: { deletedAt: null, code: deviceCode },
  });

  if (!device) {
    console.log('device not found: ' + deviceCode);
    return;
  }

  let data: any = {
    createdAt: new Date(),
    code: deviceCode,
    message: payloadString,
  };

  try {
    const newData = await prisma.deviceMessage.create({
      data,
    });

    if (!newData) {
      console.log('device message not saved: ' + deviceCode);
      return;
    }
  } catch (error) {
    console.log('device message save error: ' + deviceCode, error);
  }

  // client.publish(
  //   `reply/${deviceCode}`,
  //   JSON.stringify({ message: 'success' })
  // );
};

const updateSettings = async ({ deviceCode, payloadString }: any) => {
  console.log('mqtt → updateSettings → ', deviceCode, payloadString);

  let device = await prisma.device.findFirst({
    where: { deletedAt: null, code: deviceCode },
  });

  if (!device) {
    console.log('device not found: ' + deviceCode);
    return;
  }

  aedes.publish({
    topic: `reply/${deviceCode}`,
    payload: payloadString,
  });
};
const alarmStatus = async ({ deviceCode, payloadString }: any) => {
  console.log('\n mqtt → alarmStatus → ', deviceCode, payloadString);
};
const addDevice = async ({ deviceCode, payloadString }: any) => {
  console.log('\n mqtt → addDevice → ', deviceCode, payloadString);
};
const version = async ({ deviceCode, payloadString }: any) => {
  console.log('\n mqtt → version → ', deviceCode, payloadString);
};

aedes.authenticate = (
  client: any,
  username: string,
  password: Buffer,
  callback: Function
) => {
  if (
    username == brokerUser?.toString() &&
    password?.toString() == brokerPassword
  ) {
    callback(null, true);
  } else {
    const error = new Error('Authentication Failed');
    callback(error, false);
  }
};

server.listen(PORT, () => {
  console.log(`🚀 MQTT listening → port ${PORT}`);
});

aedes.on('clientReady', (client: any) => {
  console.log(`🔌 Client ready: ${client?.id}`);
});

aedes.on('clientDisconnect', (client: any) => {
  console.log(`❌ Client disconnected: ${client?.id}`);
});

aedes.on('publish', async (packet: any, client: any) => {
  try {
    const payloadString = packet.payload.toString();
    // console.log('packet', packet, ' payloadString: ', payloadString);

    console.log('\n mqtt → publish → ', packet, payloadString);

    if (
      payloadString != '' &&
      payloadString.startsWith('{') &&
      payloadString.endsWith('}')
    ) {
      // console.log('payloadString', payloadString);
      const payload = JSON.parse(payloadString);
      const [action, deviceCode] = packet.topic.split('/');

      const params: any = {
        payloadString,
        payload,
        action,
        deviceCode,
      };

      if (action == 'sendDeviceMessage') {
        sendDeviceMessage(params);
      }

      if (action == 'updateSettings') {
        updateSettings(params);
      }

      if (action == 'alarmStatus') {
        alarmStatus(params);
      }

      if (action == 'addDevice') {
        addDevice(params);
      }

      if (action == 'version') {
        version(params);
      }
    }
  } catch (err) {
    console.error('❌ publish on error:', err);
  }
});
