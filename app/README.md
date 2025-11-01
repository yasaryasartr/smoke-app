## Commands

```bash
npm run dev
npm run start
npx prisma migrate dev --name init
docker ps -a
docker compose -p smoke up --build -d
docker logs smoke-app
docker stop smoke-app smoke-db
docker rm -f smoke-app smoke-db
docker exec -it smoke-app sh
```

```
npx prisma db pull
npx prisma generate

cyber panelde port açmak için
> security > firewall içinden isim verip port numarası ile açıyoruz

arkaplan'da 8082 yani mobil arabirimi çalıştır
> nohup npm run web > web.log 2>&1 &

arplanda nohup ile çalışanların listesini ver
> ps -ef | grep nohup

üstteki gelen yanıttan 2.alandaki PID numarasıdır, PID zorla kapatmak için
> kill -9 <PID>

*DOCKER > app tarafı

tüm docker containerlarını listeler
> docker ps -a

docker containerları durdurmak için
> docker stop containerid1 containerid2

docker containerları kaldırmak için
> docker rm containerid1 containerid2

docker compose ile containerları arkaplanda ayağa kaldırma
> docker compose up -d

docker içindeki bir containerın canlı loglarını görmek için
> docker logs smoke-mqtt

select * from pg_sequences
SELECT nextval('"Location_id_seq"');
```

[http://localhost:3001](http://localhost:3001)


************

Message Documentation:

Devices

sıcaklık sensörlü duman dedektörü :
data: {"battery":90,"value":1,"temperature":50}
settings: 

sıcaklık sensörsüz duman dedektörü :
{"battery":90,"value":0}

hareket sensörü :
{"battery":90,"value":0}

su sensörü :
{"battery":90,"value":1}

************

Mqtt

start mqtt server:
 npx node src/mqtt.ts

mqtt://localhost:8080


* AYAR GÜNCELLEME senaryosu:

mobilden api ye istek geldi

> PUT: device/1 > PAYLOAD: settings: {sleepmode:8, threshold:50}

api bu isteği hem 1 id'li device'ın settings'ine kaydedecek

> mqtt 'ye cihazın parent'ın daki hubına device koduyla "hub-001" olarak istek atacak

updateSettings/hub-001 > {code:"002", sleepmode:8, threshold:50}



** ALARM senaryosu

device 002 duman algıladı.

hub-001 e bilgi verecek

hub-001 > mqtt ye publish edecek

mqtt > one signal üzerinden > mobile push notification gönderecek

kullanıcı notification'a tıklayınca  

 eğer device 002 settingsde alarm:"self" ise seçenek olmayacak
 değilse seçenekler gelecek (alarmı durdur / iptal)

> kullanıcı "alarmı durdur" dediğinde mqtt ye publish edecek 002 nin hub'una alarmı kapatma isteği atacak

alarmStatus/hub-001 > {code:"002", status:"off"}



** YENİ CİHAZ EKLEME senaryosu

mobilden yeni cihaz eklenince, bağlı olduğu hub'a mqtt isteği atılacak

addDevice/hub-001 > {code:"003"}



** HUB YAZILIM GÜNCELLEME senaryosu

yeni yazılım FTP ye yüklenecek (software/1.1.zip)

hub'lar günde 1 defa yeni versiyon var mı diye mqtt'ye istek atacak

version/hub-001 > {type:"check",version: "1.0"}

mqtt, yeni versiyon bilgisini ve url'yi dönecek

{version:"1.1", url:"http://nvimax.com/software/1.1.zip"}

sonra HUB bu bilgiyi alıp, kendindeki versiyon ile karşılaştıracak, eğer aynı değilse url den yeni dosyayı çekip güncelleyecek.

eğer güncellemede sorun olmazsa, hub mqtt'ye güncelledim bilgisini gönderecek

version/hub-001 > {type:"updated",version: "1.1"}

bu gelen bilgiye göre, DB'deki devices tablosundaki version sutununu güncelleyeceğiz

************

WebSocket

ws://localhost:8080/deviceCode

Message Types

{
    "type":"clients"
}

{
    "type":"device-messages",
    "data":[
        {"code":"100","signal":80,"battery":85,"temperature":30},
        {"code":"101","signal":83,"battery":90,"temperature":20}
    ]
}

{
    "type":"get-device"
}

