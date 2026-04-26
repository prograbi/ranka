import React, { useMemo, useState, useEffect } from "react";

type Screen = "reserve" | "floor" | "admin" | "checkin";
type Status = "承諾待ち" | "承諾" | "保留" | "非承諾";
type CheckIn = "未チェックイン" | "チェックイン済み";
type Rank = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "BLACK";

type Reservation = {
  id: number; customerId: number; customerName: string; phone: string; date: string; time: string;
  adults: string; children: string; allergy: string; seat: string; plate: string; note: string;
  status: Status; checkInStatus: CheckIn; code: string; sales?: number;
};
type Customer = { id: number; name: string; phone: string; rank: Rank; caution?: boolean; birthday?: string; allergy?: string; visits: number; revenue: number; };
type ManualForm = Pick<Reservation, "customerName" | "phone" | "date" | "time" | "adults" | "children" | "allergy" | "seat" | "plate" | "note">;

const RAMO_TIME_OPTIONS = ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];
const ADULT_OPTIONS = [...Array.from({ length: 10 }, (_, i) => `${i + 1}名`), "それ以上"];
const CHILD_OPTIONS = [...Array.from({ length: 6 }, (_, i) => `${i}名`), "それ以上"];
const SEAT_OPTIONS = ["指定なし", "カウンター", "テーブル", "個室", "ペアシート"];
const RANK_SERVICE: Record<Rank, string> = { BLACK: "乾杯ドリンク＋デザートプレート優先", PLATINUM: "乾杯ドリンクサービス", GOLD: "おすすめ前菜サービス", SILVER: "次回来店特典案内", BRONZE: "クレジット登録必須 / 通常対応" };
const childService = (children: string) => children !== "0名" ? `子供${children}：ファーストドリンク / フライドポテト / スイーツ` : "子供サービス：なし";
const norm = (v: string) => v.replace(/[^0-9]/g, "");
const fmt = (date: string) => date.replace(/^\d{4}-/, "").replace("-", "/");
const code = () => Math.random().toString(36).slice(2, 6).toUpperCase();
const yen = (n = 0) => `¥${n.toLocaleString()}`;

const seedReservations: Reservation[] = [
  { id: 1, customerId: 1, customerName: "山田 花子", phone: "090-1111-2222", date: "2026-04-20", time: "19:00", adults: "2名", children: "2名", allergy: "なし", seat: "テーブル", plate: "あり", note: "窓側希望", status: "承諾", checkInStatus: "未チェックイン", code: "A7K9" },
  { id: 2, customerId: 2, customerName: "佐藤 美咲", phone: "080-3333-4444", date: "2026-04-20", time: "20:30", adults: "2名", children: "0名", allergy: "なし", seat: "カウンター", plate: "なし", note: "なし", status: "承諾", checkInStatus: "未チェックイン", code: "S3M8" },
  { id: 3, customerId: 3, customerName: "伊藤 里奈", phone: "070-5555-6666", date: "2026-04-20", time: "18:00", adults: "2名", children: "1名", allergy: "ナッツ", seat: "個室", plate: "なし", note: "キャンセル歴あり", status: "承諾", checkInStatus: "チェックイン済み", code: "R5N2" },
  { id: 4, customerId: 4, customerName: "中村 彩乃", phone: "090-7777-8888", date: "2026-04-21", time: "19:30", adults: "4名", children: "0名", allergy: "なし", seat: "テーブル", plate: "あり", note: "バースデー利用", status: "保留", checkInStatus: "未チェックイン", code: "N9C4" },
];
const seedCustomers: Customer[] = [
  { id: 1, name: "山田 花子", phone: "09011112222", rank: "BLACK", visits: 8, revenue: 160000, allergy: "なし", birthday: "1996-08-10" },
  { id: 2, name: "佐藤 美咲", phone: "08033334444", rank: "PLATINUM", visits: 3, revenue: 45000, allergy: "なし", birthday: "1998-02-14" },
  { id: 3, name: "伊藤 里奈", phone: "07055556666", rank: "BRONZE", visits: 2, revenue: 18000, allergy: "ナッツ", caution: true, birthday: "1997-11-03" },
  { id: 4, name: "中村 彩乃", phone: "09077778888", rank: "SILVER", visits: 1, revenue: 26000, allergy: "なし" },
];
const rankClass: Record<Rank, string> = { BLACK: "bg-black text-white border-black", PLATINUM: "bg-[#eef1f4] text-[#4f5b66] border-[#d9e0e6]", GOLD: "bg-[#fff3d6] text-[#9a6a16] border-[#f0d89d]", SILVER: "bg-[#f1f3f5] text-[#6b7280] border-[#e2e8f0]", BRONZE: "bg-[#f6e8de] text-[#8a5a3c] border-[#e8cdbd]" };

function RankaLogo() { return <div className="flex select-none items-center justify-center gap-2"><div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#3fa35b] text-[34px] font-black leading-none text-white">R</div><div className="text-[44px] font-black tracking-[0.18em] text-black">ANKA</div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><div className="mb-2 text-[12px] text-[#8e949b]">{label}</div>{children}</div>; }
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`w-full rounded-[14px] border border-[#d6dde3] bg-white px-4 py-3 text-[15px] outline-none ${props.className ?? ""}`} />; }
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={`w-full rounded-[14px] border border-[#d6dde3] bg-white px-4 py-3 text-[15px] outline-none ${props.className ?? ""}`} />; }
function Button({ children, className = "", variant = "black", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "black" | "hold" | "gray" }) { const cls = variant === "black" ? "bg-black text-white" : variant === "hold" ? "border border-[#ead7a5] bg-[#fff7e8] text-[#8d6a23]" : "border border-[#e4e4e7] bg-[#f4f4f5] text-[#71717a]"; return <button type="button" {...props} className={`rounded-[14px] px-5 py-3 text-[14px] font-semibold ${cls} ${className}`}>{children}</button>; }

function ReservePage() { return <div className="mx-auto max-w-[760px] space-y-7"><RankaLogo /><div className="text-center"><h1 className="text-[32px] font-medium text-[#555d66]">ご予約フォーム</h1></div><Field label="お名前"><Input placeholder="山田 花子" /></Field><Field label="電話番号"><Input placeholder="090-1234-5678" /></Field><div className="grid grid-cols-2 gap-4"><Field label="来店日"><Input type="date" defaultValue="2026-04-20" /></Field><Field label="来店時間"><Select defaultValue="19:00">{RAMO_TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}</Select></Field></div><div className="grid grid-cols-2 gap-4"><Field label="大人人数"><Select defaultValue="2名">{ADULT_OPTIONS.map((n) => <option key={n}>{n}</option>)}</Select></Field><Field label="子供人数"><Select defaultValue="0名">{CHILD_OPTIONS.map((n) => <option key={n}>{n}</option>)}</Select></Field></div><Field label="席の希望"><Select defaultValue="指定なし">{SEAT_OPTIONS.map((s) => <option key={s}>{s}</option>)}</Select></Field><Field label="アレルギー"><Select><option>なし</option><option>あり</option></Select></Field><Field label="その他要望"><textarea className="min-h-[110px] w-full rounded-[14px] border border-[#d6dde3] bg-white px-4 py-3 text-[15px] outline-none" /></Field><Button className="w-full">この内容で予約する</Button></div>; }

function FloorPage({ reservations, customers }: { reservations: Reservation[]; customers: Customer[] }) {
  const [date, setDate] = useState("2026-04-20");
  const move = (days: number) => setDate(new Date(new Date(date).getTime() + days * 86400000).toISOString().slice(0, 10));
  const list = reservations.filter((r) => r.status === "承諾" && r.date === date).sort((a, b) => a.time.localeCompare(b.time));

  return <div className="mx-auto max-w-[980px] space-y-6">
    <RankaLogo />

    <div className="flex items-center justify-between rounded-[24px] border border-[#dde2e7] bg-white px-8 py-6">
      <button type="button" onClick={() => move(-1)} className="text-[34px] text-[#737b85]">←</button>

      <div className="relative flex items-center justify-center">
        <div className="pointer-events-none text-[34px] font-semibold text-[#4c535b]">{fmt(date)}</div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="日付を選択"
        />
      </div>

      <button type="button" onClick={() => move(1)} className="text-[34px] text-[#737b85]">→</button>
    </div>

    <div className="space-y-4">
      {list.length === 0 && <div className="rounded-[18px] bg-white p-6 text-center text-[14px] text-[#7c848d]">本日の予約はありません</div>}
      {list.map((r) => {
        const c = customers.find((x) => x.id === r.customerId);
        return <div key={r.id} className={`rounded-[24px] border p-6 ${c?.caution ? "border-[#f3caca] bg-[#fff0f0]" : "border-[#dde2e7] bg-white"}`}>
          <div className="flex justify-between gap-4">
            <div className="text-[24px] text-[#4c535b]">{r.customerName}様</div>
            <div className={`h-fit rounded-full border px-4 py-2 text-[12px] ${rankClass[c?.rank ?? "SILVER"]}`}>Rank: {c?.rank}</div>
          </div>
          <div className="mt-4 text-[16px] leading-8 text-[#6e675f]">
            {fmt(r.date)} {r.time}<br />大人{r.adults} / 子供{r.children}<br />電話番号 {r.phone}<br />アレルギー：{r.allergy}<br />席：{r.seat} / プレート：{r.plate}<br />備考：{r.note}
          </div>
          <div className="mt-5 rounded-[16px] border border-[#eadfca] bg-[#fffaf0] p-4 text-[14px] leading-7 text-[#6e675f]">
            <div>{childService(r.children)}</div>
            <div>ランク特典：{RANK_SERVICE[c?.rank ?? "SILVER"]}</div>
          </div>
        </div>;
      })}
    </div>
  </div>;
}

function AdminPage({ reservations, customers }: { reservations: Reservation[]; customers: Customer[] }) {
  const [items, setItems] = useState<Reservation[]>(() => {
    const saved = localStorage.getItem("ranka_reservations");
    return saved ? JSON.parse(saved) : reservations;
  }), [showManual, setShowManual] = useState(false), [manual, setManual] = useState<ManualForm>({ customerName: "", phone: "", date: "2026-04-20", time: "19:00", adults: "2名", children: "0名", allergy: "なし", seat: "指定なし", plate: "なし", note: "" }), [codeMsg, setCodeMsg] = useState("");
  useEffect(() => {
    localStorage.setItem("ranka_reservations", JSON.stringify(items));
  }, [items]);

  const pending = useMemo(() => ({ waiting: items.filter((r) => r.status === "承諾待ち"), hold: items.filter((r) => r.status === "保留"), sales: items.filter((r) => r.status === "承諾" && r.checkInStatus === "チェックイン済み" && !r.sales) }), [items]);
  const selected = pending.waiting[0] ?? pending.hold[0] ?? pending.sales[0] ?? items[0], customer = customers.find((c) => c.id === selected.customerId) ?? customers[0];
  const addManual = () => { if (!manual.customerName || !manual.phone) return alert("名前と電話番号は必須です"); const id = Math.max(...items.map((r) => r.id)) + 1, newCode = code(); setItems([{ ...manual, id, customerId: id, status: "承諾待ち", checkInStatus: "未チェックイン", code: newCode }, ...items]); setShowManual(false); setCodeMsg(`チェックインコード：${newCode}`); };
  const Card = ({ title, list }: { title: string; list: Reservation[] }) => list.length ? <div className="pt-4"><div className="mb-2 text-[12px] text-[#8a8f96]">{title}</div><div className="space-y-3">{list.map((r) => { const c = customers.find((x) => x.id === r.customerId); return <div key={r.id} className={`overflow-hidden rounded-[18px] border ${c?.caution ? "border-[#f3caca] bg-[#fff0f0]" : "border-[#eef1f4] bg-[#fafbfc]"}`}>{c?.caution && <div className="bg-[#ff4d4f] px-4 py-2 text-[11px] text-white">要注意顧客</div>}{r.checkInStatus === "チェックイン済み" && !r.sales && <div className="bg-[#ff4d4f] px-4 py-2 text-[11px] text-white">チェックイン済み・売上未入力</div>}<div className="p-4"><div className="text-[15px] font-medium text-[#4c535b]">{r.customerName}様</div><div className="mt-1 text-[13px] leading-6 text-[#6e675f]">{r.date} {r.time}<br />電話番号 {r.phone}<br />アレルギー：{r.allergy}</div></div></div>; })}</div></div> : null;
  return <div className="space-y-6"><RankaLogo /><div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]"><div className="rounded-[24px] border border-[#dde2e7] bg-white p-5"><div className="flex items-center justify-between"><div className="text-[16px] font-medium text-[#4c535b]">承諾待ち一覧</div><Button onClick={() => setShowManual(!showManual)} variant="gray">手動入力</Button></div>{showManual && <div className="mt-4 space-y-3 rounded-[16px] bg-[#f9fafb] p-4"><Field label="名前"><Input value={manual.customerName} onChange={(e) => setManual({ ...manual, customerName: e.target.value })} /></Field><Field label="電話番号"><Input value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="来店日"><Input type="date" value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} /></Field><Field label="時間"><Select value={manual.time} onChange={(e) => setManual({ ...manual, time: e.target.value })}>{RAMO_TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}</Select></Field></div><div className="grid grid-cols-2 gap-3"><Field label="大人"><Select value={manual.adults} onChange={(e) => setManual({ ...manual, adults: e.target.value })}>{ADULT_OPTIONS.map((n) => <option key={n}>{n}</option>)}</Select></Field><Field label="子供"><Select value={manual.children} onChange={(e) => setManual({ ...manual, children: e.target.value })}>{CHILD_OPTIONS.map((n) => <option key={n}>{n}</option>)}</Select></Field></div><Field label="席"><Select value={manual.seat} onChange={(e) => setManual({ ...manual, seat: e.target.value })}>{SEAT_OPTIONS.map((s) => <option key={s}>{s}</option>)}</Select></Field><Field label="アレルギー"><Input value={manual.allergy} onChange={(e) => setManual({ ...manual, allergy: e.target.value })} /></Field><Button onClick={addManual} className="w-full">手動で予約を追加</Button></div>}{codeMsg && <div className="mt-3 rounded-[14px] bg-[#eef6f1] px-4 py-3 text-[18px] font-bold text-[#2f6f4f]">{codeMsg}</div>}<div className="my-4 rounded-[16px] border border-[#eef1f4] bg-[#f9fafb] p-4"><div className="text-[13px] font-medium text-[#4c535b]">電話番号検索チェックイン</div><div className="mt-3 flex gap-2"><Input placeholder="電話番号で検索" /><Button>チェックイン</Button></div></div><Card title="承諾待ち" list={pending.waiting} /><Card title="保留" list={pending.hold} /><Card title="売上未入力" list={pending.sales} /></div><div className="rounded-[24px] border border-[#dde2e7] bg-white p-5"><div className="flex items-start justify-between"><div><div className="text-[20px] font-medium text-[#4c535b]">{selected.customerName}</div><div className="mt-1 text-[12px] text-[#7c848d]">{selected.phone}</div></div><div className={`rounded-full border px-3 py-1 text-[11px] ${rankClass[customer.rank]}`}>Rank: {customer.rank}</div></div><div className="mt-5 rounded-[18px] border border-[#eef1f4] bg-[#fafbfc] p-4 text-[14px] leading-7 text-[#5a6169]"><div>{selected.date} {selected.time}</div><div>チェックイン：{selected.checkInStatus}</div><div className={selected.checkInStatus === "チェックイン済み" && !selected.sales ? "font-medium text-[#ff4d4f]" : ""}>売上：{selected.sales ? yen(selected.sales) : "未入力"}</div><div>アレルギー：{selected.allergy}</div><div>席：{selected.seat} / プレート：{selected.plate}</div></div><div className="mt-4 grid grid-cols-3 gap-2"><Button>承諾</Button><Button variant="hold">保留</Button><Button variant="gray">非承諾</Button></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-[20px] border bg-white p-5"><div className="text-[11px] text-[#9aa1a9]">売上</div><div className="mt-3 text-[28px] text-[#4c535b]">{yen(customer.revenue)}</div></div><div className="rounded-[20px] border bg-white p-5"><div className="text-[11px] text-[#9aa1a9]">来店</div><div className="mt-3 text-[28px] text-[#4c535b]">{customer.visits}回</div></div></div></div></div></div>;
}

function CheckinPage() { return <div className="text-center"><RankaLogo /><div className="mt-10 text-[#666]">チェックイン画面（非表示状態）</div></div>; }

export default function RankaFrontPages() { const [screen, setScreen] = useState<Screen>("reserve"); const tabs: Array<[Exclude<Screen, "checkin">, string]> = [["reserve", "予約フォーム"], ["floor", "予約管理画面"], ["admin", "RANKA管理画面"]]; return <div className="min-h-screen bg-[#f3f5f7] px-4 py-8"><div className="mb-6 flex flex-wrap justify-center gap-2">{tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setScreen(key)} className={`rounded-full border px-4 py-2 text-[12px] ${screen === key ? "bg-black text-white" : "bg-white text-[#5a6169]"}`}>{label}</button>)}</div><div className="mx-auto max-w-[1200px] rounded-[28px] bg-[#f7f8fa] p-6 md:p-8">{screen === "reserve" && <ReservePage />}{screen === "floor" && <FloorPage reservations={seedReservations} customers={seedCustomers} />}{screen === "admin" && <AdminPage reservations={seedReservations} customers={seedCustomers} />}{screen === "checkin" && <CheckinPage />}</div></div>; }
