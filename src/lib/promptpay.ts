/**
 * สร้างข้อความสำหรับ QR พร้อมเพย์ ตามมาตรฐาน EMVCo QR Code (Thai QR Payment)
 * ข้อความประกอบด้วยช่องข้อมูลแบบ ID(2 หลัก) + ความยาว(2 หลัก) + ค่า ต่อกันไปเรื่อยๆ
 * แล้วปิดท้ายด้วย CRC16 เพื่อให้แอปธนาคารตรวจได้ว่าข้อความไม่เสียหาย
 */

const ID = {
  payloadFormat: "00",
  pointOfInitiation: "01",
  merchantPromptPay: "29",
  currency: "53",
  amount: "54",
  country: "58",
  crc: "63",
} as const;

const PROMPTPAY_AID = "A000000677010111";
const SUB_ID = { mobile: "01", nationalId: "02", eWallet: "03" } as const;

function field(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) ตามที่ EMVCo กำหนด */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * แปลงรหัสพร้อมเพย์เป็นช่องข้อมูลย่อย
 * - เบอร์มือถือ 10 หลัก → "0066" + ตัด 0 ตัวหน้าออก (รวม 13 หลัก)
 * - เลขบัตรประชาชน / เลขผู้เสียภาษี 13 หลัก
 * - e-Wallet ID 15 หลัก
 */
function targetField(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return field(SUB_ID.mobile, "0066" + digits.slice(1));
  }
  if (digits.length === 13) return field(SUB_ID.nationalId, digits);
  if (digits.length === 15) return field(SUB_ID.eWallet, digits);
  throw new Error("รหัสพร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก เลขบัตรประชาชน 13 หลัก หรือ e-Wallet 15 หลัก");
}

/**
 * @param id เบอร์มือถือ / เลขบัตรประชาชน / e-Wallet ID ของผู้รับเงิน
 * @param amount จำนวนเงิน (บาท) ถ้าไม่ใส่ ผู้โอนต้องกรอกยอดเอง
 */
export function promptPayPayload(id: string, amount?: number): string {
  if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
    throw new Error("จำนวนเงินต้องมากกว่า 0");
  }

  const body = [
    field(ID.payloadFormat, "01"),
    // 11 = QR ใช้ซ้ำได้ (ไม่มียอด), 12 = QR ใช้ครั้งเดียว (มียอดกำหนดไว้)
    field(ID.pointOfInitiation, amount ? "12" : "11"),
    field(ID.merchantPromptPay, field("00", PROMPTPAY_AID) + targetField(id)),
    field(ID.country, "TH"),
    field(ID.currency, "764"), // THB ตาม ISO 4217
    amount ? field(ID.amount, amount.toFixed(2)) : "",
  ].join("");

  const withCrcHeader = body + ID.crc + "04";
  return withCrcHeader + crc16(withCrcHeader);
}
