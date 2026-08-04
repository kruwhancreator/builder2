เห็นภาพแบบฝึกหัดแล้วครับ! จากโครงสร้างในภาพนี้ การออกแบบ URL และการแยก **Exercise 1, 2, 3** เป็นสิ่งที่ **"ถูกต้องและจำเป็นอย่างยิ่ง"** ครับ

เพราะแบบฝึกหัดแต่ละส่วนมีรูปแบบการตรวจและ Context ที่ต่างกันโดยสิ้นเชิง:

* **Exercise 1:** แปลประโยคตรงตัว (มีเฉลยค่อนข้างตายตัว)
* **Exercise 2:** เติมคำจากกล่อง/แต่งประโยคตามโครงสร้างที่กำหนด (มีคำศัพท์บังคับให้เลือก)
* **Exercise 3:** แต่งประโยคจากภาพโดยใช้โครงสร้าง `Core + Context + Connect` (เป็น Open-ended + Visual Context)

---

## 📌 1. การวาง URL Structure & QR Code Strategy

เพื่อให้ QR Code ที่มุมขวาล่างของหน้านี้หน้าเดียว สามารถพานักเรียนมาทำได้ทั้ง 3 Exercises โดยไม่ต้องให้สแกนแยกทุกข้อ ยูอาร์แอลควรออกแบบเป็น Hierarchy ดังนี้ครับ:

### Primary URL Structure (ที่ฝังใน QR Code หน้านั้น):

`[https://yourdomain.com/sentence-builder-vol-2/chapter-1](https://yourdomain.com/sentence-builder-vol-2/chapter-1)`

เมื่อนักเรียนสแกน QR Code หน้าเว็บจะแสดงหน้า **Overview ของ Chapter 1** มีแท็บหรือการ์ดให้เลือกทำ `Exercise 1`, `Exercise 2`, หรือ `Exercise 3` ได้ในหน้าเดียวกันเลย (หรือเลือกทำต่อกันทีละข้อ)

* **Exercise 1 Direct Link:** `/sentence-builder-vol-2/chapter-1/ex-1`
* **Exercise 2 Direct Link:** `/sentence-builder-vol-2/chapter-1/ex-2`
* **Exercise 3 Direct Link:** `/sentence-builder-vol-2/chapter-1/ex-3`

---

## 🛠️ 2. Structure ของ `exercises.json` สำหรับ Chapter 1

นี่คือ Mockup ข้อมูลจริงจากภาพแนบ นำไปใส่ใน `data/sentence-builder-vol-2/chapter-1.json` ได้เลยครับ:

```json
{
  "book": "sentence-builder-vol-2",
  "chapter": 1,
  "title": "Present Continuous & Sentence Expansion",
  "exercises": {
    "ex-1": {
      "type": "translation",
      "instruction": "แปลประโยคภาษาอังกฤษ",
      "grammar_focus": "Present Continuous (S + is/am/are + V.ing)",
      "items": [
        {
          "id": 1,
          "thai": "ฉันกำลังเดินทางเพื่อกลับบ้าน",
          "keywords": ["traveling", "travelling", "heading home", "go home"]
        },
        {
          "id": 2,
          "thai": "ฉันกำลังจัดผมเพื่อเสริมความมั่นใจตอนนี้",
          "keywords": ["styling my hair", "doing my hair", "adjusting my hair", "boost confidence", "right now", "now"]
        },
        {
          "id": 3,
          "thai": "ฉันกำลังติดตามพัสดุเพราะมันเสี่ยง",
          "keywords": ["tracking", "parcel", "package", "because", "risky"]
        },
        {
          "id": 4,
          "thai": "ฉันกำลังลังเลที่จะออกไปข้างนอก ณ ตอนนี้เพราะมันดึกแล้ว",
          "keywords": ["hesitating", "go outside", "at the moment", "right now", "late"]
        }
      ]
    },
    "ex-2": {
      "type": "guided_sentence",
      "instruction": "เลือกคำจากที่มีให้ (หรือใช้คำของตัวเอง) มาแต่งประโยค",
      "grammar_focus": "Sentence Building (Action + Time + Purpose + Reason)",
      "word_bank": {
        "action": ["making breakfast", "cleaning my room", "adjusting my schedule"],
        "purpose": ["to save money", "to find my keys", "to fit my schedule"],
        "time": ["now", "right now", "at the moment", "currently"],
        "reason": ["because it is healthy", "cheap", "challenging"]
      },
      "templates": [
        "I am [Action]",
        "I am [Action] right now",
        "I am [Action] to [Purpose]",
        "I am [Action] to [Purpose] now because it was/is [Reason]"
      ]
    },
    "ex-3": {
      "type": "picture_description",
      "instruction": "ดูภาพแล้วแต่งประโยคโดยใช้โครงสร้าง Core + Context + Connect",
      "structure_required": {
        "Core": "S + am + V.ing (เช่น I am drinking coffee)",
        "Context": "time/place (เช่น at the moment, right now)",
        "Connect": "because + reason (เช่น because it is...)"
      },
      "items": [
        { "id": 1, "image_description": "ผู้ชายกำลังดื่มกาแฟในคาเฟ่" },
        { "id": 2, "image_description": "ผู้หญิงกำลังวิ่งออกกำลังกายในสวนสาธารณะ" },
        { "id": 3, "image_description": "ผู้หญิงกำลังเลือกซื้อของสุขภาพในซูเปอร์มาร์เก็ต" }
      ]
    }
  }
}

```

---

## 🔄 3. System Prompt & Logic แยกตาม Exercise

เวลาส่งหา Gemini API เราจะส่ง Context ตามประเภทของ Exercise ดังนี้:

### สำหรับ Exercise 1 (Translation):

> **Prompt Logic:** ตรวจความถูกต้องของการแปลและไวยากรณ์ `S + is/am/are + V.ing` หากนักเรียนใช้คำศัพท์อื่นที่ความหมายเหมือนกัน (เช่น traveling / heading home) ให้ถือว่าถูก แต่แนะนำคำศัพท์ทางการเพิ่มได้

### สำหรับ Exercise 2 (Guided Sentence):

> **Prompt Logic:** ตรวจดูว่านักเรียนนำคำจาก Word Bank มาใส่ตามโครงสร้างถูกตำแหน่งหรือไม่ หากนักเรียนใช้คำของตัวเอง ให้ตรวจว่า Grammar ถูกต้องและตรงตามจุดประสงค์ของช่องนั้นๆ หรือไม่

### สำหรับ Exercise 3 (Picture Context):

> **Prompt Logic:** ตรวจว่าประโยคมีครบ 3 ส่วนหรือไม่:
> 1. **Core:** มี `I am + V.ing` ไหม
> 2. **Context:** มีคำบอกเวลา/สถานที่ไหม
> 3. **Connect:** มีการใช้ `because` เชื่อมประโยคไหม
> 
> 

---

## 🖥️ 4. Mockup UI Flow (สิ่งที่นักเรียนจะเห็นบนมือถือ)

```text
===================================================
 📘 Sentence Builder Vol.2 - Chapter 1
===================================================
 [ Ex 1: แปลประโยค ] [ Ex 2: เติมคำ ] [ Ex 3: แต่งจากภาพ ]
---------------------------------------------------

 📍 Exercise 1 : ข้อ 2/4
 โจทย์: "ฉันกำลังจัดผมเพื่อเสริมความมั่นใจตอนนี้"

 [ ช่องพิมพ์คำตอบของนักเรียน ]
 ┌──────────────────────────────────────────────┐
 │ I am styling my hair to boost confidence     │
 │ now.                                         │
 └──────────────────────────────────────────────┘

               [ 🔍 ตรวจคำตอบ ]

---------------------------------------------------
 🤖 ผลการตรวจโดย AI (QuillBot Style)
---------------------------------------------------
 ✅ เกือบถูกต้องแล้ว! (90%)

 📝 ประโยคที่ถูกต้องตามหลักภาษา:
 "I am styling my hair to boost my confidence now."
                          ^^^^
 💡 คำแนะนำภาษาไทย:
 • เพิ่มคำว่า "my" หน้า confidence เพื่อให้ประโยคสมบูรณ์และเป็นธรรมชาติยิ่งขึ้น
 • การใช้ "I am styling" ถูกต้องตามโครงสร้าง Present Continuous แล้วครับ! Great job!

===================================================

```

---

## 🚀 5. Implementation Roadmap สำหรับ Antigravity

สามารถก๊อปปี้สเปกนี้ไปสั่ง Antigravity ให้สร้าง Dynamic Router ได้เลยครับ:

> **Antigravity Instruction:**
> "Build dynamic routes for Next.js App Router with structure:
> `/sentence-builder-vol-2/[chapter]/[exercise]`
> 1. Read static JSON from `data/sentence-builder-vol-2/[chapter].json`.
> 2. Pass the selected exercise context (`ex-1`, `ex-2`, or `ex-3`) to `/api/check`.
> 3. Dynamically adjust system prompt instructions based on `exercise.type` (`translation`, `guided_sentence`, or `picture_description`).
> 4. Render a tabbed or stepped UI for seamless student experience."
> 
>