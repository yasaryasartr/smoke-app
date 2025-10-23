import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });
const clients: any = {};

const getTime = () => {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  const urlPath = req.url || '/';
  const code = urlPath?.replace('/', '') || null;

  if (!code) {
    ws.send(
      JSON.stringify({
        status: 'error',
        message: 'code required',
      })
    );
    ws.close(4000, 'code required');
    return;
  }

  //todo: burada device code var mı yok mu kontrol edilecek
  if (!['100', '101', '102'].includes(code)) {
    ws.send(
      JSON.stringify({
        status: 'error',
        message: 'code not found',
      })
    );
    ws.close(4004, 'code not found');
    return;
  }

  console.log(`✅ device ${code} connected`);

  if (typeof clients[code] != 'undefined') {
    clients[code].ws.close(4001, 'new connection opened');
    delete clients[code];
  }

  clients[code] = {
    ws,
    connectedTime: getTime(),
    lastActivityTime: getTime(),
  };

  ws.on('message', (data: Buffer) => {
    clients[code].lastActivityTime = getTime();

    try {
      const message = JSON.parse(data.toString());

      if (message.type == 'clients') {
        ws.send(
          JSON.stringify({
            clients: Object.keys(clients).map((key) => ({
              code: key,
              connectedTime: clients[key].connectedTime,
              lastActivityTime: clients[key].lastActivityTime,
            })),
          })
        );
        return;
      }

      if (message.type == 'device-messages') {
        for (const data of message.data) {
          const received = {
            status: 'success',
            data,
          };

          console.log(`received: `, received);

          ws.send(JSON.stringify(received));
        }

        return;
      }
      if (message.type == 'get-device') {
        const receiveds: any = [];

        //todo: burası bağlantı kuranhub'ın ve onun altındaki dedekötrlerin verileri veritabanından gelecek
        const devices: any = [
          { code, name: 'test hub' },
          { code: 'd1', name: 'dedektor1' },
          { code: 'd2', name: 'dedektor2' },
        ];

        for (const device of devices) {
          receiveds.push({ ...device });
        }

        ws.send(JSON.stringify(receiveds));

        return;
      }

      ws.send(
        JSON.stringify({
          status: 'error',
          message: 'invalid message',
          receivedData: message,
        })
      );
    } catch (error) {
      ws.send(
        JSON.stringify({
          status: 'error',
          message: error,
          receivedData: data.toString(),
        })
      );
    }
  });

  ws.on('error', (error: Error) => {
    console.error(`❌ device ${code} error:`, error.message);
  });

  ws.on('close', () => {
    console.log(`❌ device ${code} disconnected`);
  });
});

console.log(`🚀 WebSocket sunucusu ${PORT} portunda çalışıyor`);
console.log(`   ws://localhost:${PORT}`);
