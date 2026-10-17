# ติดตั้ง ShiftTrack บน ByetHost

เว็บหลักปัจจุบัน: https://shifttrackteam.byethost9.com/

## ฐานข้อมูลและการตั้งค่า
1. สร้างฐานข้อมูลใน VistaPanel แล้วนำเข้า `database/schema.sql` สำหรับการติดตั้งใหม่เท่านั้น การอัปเดตหน้าเว็บไม่ต้องแทนฐานข้อมูลจริง
2. คัดลอก `private/config.example.php` เป็น `private/config.php` กรอก MySQL hostname, database, username และ password ตามบัญชีโฮสต์
3. สร้าง hash รหัสผ่านเจ้าของด้วย `password_hash` แล้วใส่ `admin_hash` ตั้ง `secure_cookies=true` บน HTTPS ไม่ส่งรหัสผ่านเข้า GitHub

## วางไฟล์บนบัญชีปัจจุบัน
บัญชีนี้สร้างโฟลเดอร์นอก htdocs ไม่ได้ API รองรับ private ภายใต้ htdocs โดยปิดการเข้าถึงด้วย .htaccess:

```
htdocs/
  index.php
  admin.php
  api.php
  sw.js
  manifest.webmanifest
  offline.html
  .htaccess
  assets/
  private/
    .htaccess
    bootstrap.php
    config.php
```

อัปโหลดเนื้อหา `public/` ลง `htdocs/` และเฉพาะ `bootstrap.php`, `.htaccess`, `config.php` ลง `htdocs/private/` ต้องคงชื่อ .htaccess และเนื้อหา `Require all denied` ตรวจว่า URL ไฟล์ทดสอบใน private ตอบ 403 และไม่เปิดเผยเนื้อหาก่อนตั้งค่าข้อมูลลับ

หากโฮสต์อื่นรองรับ ให้เก็บ private เป็นโฟลเดอร์พี่น้องของ htdocs นอก document root ได้ API รองรับทั้งสองตำแหน่ง

ห้ามอัปโหลด LOCAL_OWNER.txt, config.qa.php, JSON ผล OCR, ภาพทดสอบ, logs, dist หรือทั้ง repository ลงโฮสต์ อัปโหลดเป็นไฟล์แยกหรือชุด ZIP ย่อยต่ำกว่าขีดจำกัด 10 MB และตรวจ path ภายใน ZIP ก่อนแตก

## ตรวจหลังอัปเดต
- เปิด HTTPS ตรวจหน้าใช้งานและหน้าล็อกอิน รวม Light/Dark Mode
- ค้นหารหัสจริงและเดือนที่เผยแพร่ ตรวจค่ากะ วันทำงาน วันหยุด และเพื่อนร่วมกะ
- เปิดเว็บใหม่เพื่อทดสอบจำรหัสและเดือนล่าสุด เก็บเพียงรหัสกับเดือนในเบราว์เซอร์ ไม่เก็บตารางและค่ากะ
- ทดสอบติดตั้ง PWA บนโทรศัพท์จริง ตารางต้องออนไลน์ มีเฉพาะหน้าแจ้งสถานะเมื่อออฟไลน์
- เข้าหน้าจัดการเฉพาะเจ้าของ ทดสอบการอ่านรูปและตรวจร่างโดยไม่เผยแพร่ข้อมูลทดสอบทับข้อมูลจริง
- สำรองฐานข้อมูลผ่าน phpMyAdmin ก่อนเปลี่ยน schema

ไม่ต้องมี SSH, Composer, Node หรือ OCR บนเซิร์ฟเวอร์ OCR ทำงานในเบราว์เซอร์เจ้าของ ตรวจว่าบัญชีรองรับ PDO MySQL, session และฟังก์ชันประมวลผลรูปของ PHP ก่อนใช้งาน
