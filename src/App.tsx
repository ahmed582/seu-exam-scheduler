import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import InstallAppButton from "./InstallAppButton";

type CsvRow = Record<string, string>;
type Degree = "Bachelor" | "Master";
type Delivery = "campus" | "online";

type Exam = {
  code: string;
  name: string;
  nameAr: string;
  college: string;
  degree: Degree;
  date: Date;
  dateKey: string;
  start: string;
  end: string;
  sessionKey: string;
  examType: string;
};

const COLLEGES: Record<string, { key: string; en: string; ar: string }> = {
  CI: { key: "CCI", en: "College of Computing and Informatics", ar: "كلية الحوسبة والمعلوماتية" },
  SA: { key: "CSTS", en: "College of Science and Theoretical Studies", ar: "كلية العلوم والدراسات النظرية" },
  BU: { key: "CAFS", en: "College of Administrative and Financial Sciences", ar: "كلية العلوم الإدارية والمالية" },
  HS: { key: "CHS", en: "College of Health Sciences", ar: "كلية العلوم الصحية" },
};

const SESSION_COLORS = ["blue", "teal", "purple", "navy", "gold", "slate"];
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

function parseCsv(text: string): CsvRow[] {
  const matrix: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field.trim()); field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field.trim());
      if (row.some(Boolean)) matrix.push(row);
      row = []; field = "";
    } else field += char;
  }
  row.push(field.trim());
  if (row.some(Boolean)) matrix.push(row);
  if (matrix.length < 2) return [];
  const headers = matrix[0].map((value) => value.replace(/^\uFEFF/, "").trim());
  return matrix.slice(1).map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""])));
}

function value(row: CsvRow, ...names: string[]) {
  const entry = Object.entries(row).find(([key]) => names.some((name) => key.trim().toLowerCase() === name.toLowerCase()));
  return entry?.[1]?.trim() ?? "";
}

function normalizeTime(raw: string) {
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function displayTime(raw: string) {
  const [hourText, minute] = raw.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 || (hour >= 1 && hour <= 8) ? "PM" : "AM";
  const twelve = hour % 12 || 12;
  return `${twelve}:${minute} ${suffix}`;
}

function parseDate(raw: string) {
  if (!raw) return null;
  const excel = Number(raw);
  if (Number.isFinite(excel) && excel > 20000) return new Date(Date.UTC(1899, 11, 30 + excel));
  const parts = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (parts) return new Date(Date.UTC(Number(parts[3]), Number(parts[1]) - 1, Number(parts[2])));
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function dateKey(date: Date) { return date.toISOString().slice(0, 10); }

function degreeFor(code: string): Degree {
  const match = code.match(/(\d{3})\s*$/);
  return match && Number(match[1]) >= 500 ? "Master" : "Bachelor";
}

function SchedulePage({ collegeKey, degree, exams, sessions, examType, pageLabel, delivery, termEn, termAr, selectedForPrint, onPrint }: {
  collegeKey: string; degree: Degree; exams: Exam[]; sessions: string[]; examType: string; pageLabel: string; delivery: Delivery; termEn: string; termAr: string; selectedForPrint: boolean; onPrint: () => void;
}) {
  const college = Object.values(COLLEGES).find((item) => item.key === collegeKey)!;
  const dates = [...new Map(exams.map((exam) => [exam.dateKey, exam.date])).entries()].sort(([a], [b]) => a.localeCompare(b));
  const rowsForDate = (key: string) => Math.max(3, ...sessions.map((session) => exams.filter((exam) => exam.dateKey === key && exam.sessionKey === session).length));
  const printedRows = dates.reduce((sum, [key]) => sum + rowsForDate(key), 0);
  const densityClass = printedRows > 30 ? "print-density-max" : printedRows > 20 ? "print-density-high" : "";
  const isFinal = examType === "FEXM";

  return (
    <div className="schedule-wrapper">
      <div className="schedule-actions no-print"><div><strong>{college.en}</strong><span>{degree}&apos;s Degree Programs · {pageLabel}</span></div><button onClick={onPrint}>Print this schedule</button></div>
    <article className={`schedule-page ${sessions.length > 4 ? "many-sessions" : ""} ${selectedForPrint ? "selected-for-print" : ""} ${densityClass}`}>
      <header className="schedule-letterhead">
        <img src={asset("brand/seu-logo.png")} alt="Saudi Electronic University" className="schedule-logo" />
        <div className="arabic-letterhead" dir="rtl">
          <span>المملكة العربية السعودية</span><span>وزارة التعليم</span><strong>الجامعة السعودية الإلكترونية</strong><strong>{college.ar}</strong>
        </div>
      </header>
      <div className="accent-rule"><i /><i /><i /></div>
      <div className="college-band">
        <div>{college.en}<br /><strong>{degree}&apos;s Degree Programs</strong></div>
        <div dir="rtl">{college.ar}<br /><strong>{degree === "Master" ? "برامج الماجستير" : "برامج البكالوريوس"}</strong></div>
      </div>
      <div className="title-band">
        <div>{isFinal ? "Final Exams Schedule" : examType === "MEXM" ? "Mid-Term Exam Schedule" : "Exam Schedule"}<br /><span>{termEn}</span></div>
        <div dir="rtl">{isFinal ? "جدول الاختبارات النهائية" : examType === "MEXM" ? "جدول الاختبارات النصفية" : "جدول الاختبارات"}<br /><span>{termAr}</span></div>
      </div>
      <div className="schedule-watermark"><img src={asset("brand/seu-logo.png")} alt="" /></div>
      <table className="exam-table">
        <thead>
          <tr>
            <th rowSpan={2} className="date-heading">Day / Date<br /><span dir="rtl">اليوم / التاريخ</span></th>
            {sessions.map((session, index) => {
              const [start, end] = session.split("|");
              return <th key={session} colSpan={2} className={`session-heading ${SESSION_COLORS[index % SESSION_COLORS.length]}`}>{ordinal(index + 1)} Session<br /><small>{displayTime(start)} – {displayTime(end)}</small></th>;
            })}
          </tr>
          <tr>{sessions.flatMap((session, index) => [<th key={`${session}-c`} className={`subheading ${SESSION_COLORS[index % SESSION_COLORS.length]}`}>Code</th>, <th key={`${session}-n`} className={`subheading ${SESSION_COLORS[index % SESSION_COLORS.length]}`}>Course Name</th>])}</tr>
        </thead>
        <tbody>
          {dates.map(([key, date]) => {
            const dayRows = rowsForDate(key);
            return Array.from({ length: dayRows }).map((_, rowIndex) => (
              <tr key={`${key}-${rowIndex}`} className={rowIndex === 0 ? "day-start" : ""}>
                {rowIndex === 0 && <th rowSpan={dayRows} className="date-cell"><span>{new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" }).format(date)}</span><span>{formatDate(date)}</span></th>}
                {sessions.flatMap((session, sessionIndex) => {
                  const exam = exams.filter((item) => item.dateKey === key && item.sessionKey === session)[rowIndex];
                  return [<td key={`${session}-c`} className={`code-cell ${SESSION_COLORS[sessionIndex % SESSION_COLORS.length]}`}>{exam?.code}</td>, <td key={`${session}-n`} className={`name-cell ${SESSION_COLORS[sessionIndex % SESSION_COLORS.length]}`}>{exam?.name}</td>];
                })}
              </tr>
            ));
          })}
        </tbody>
      </table>
      <div className="schedule-note">Note / ملاحظة: All scheduled exams are conducted {delivery === "online" ? "online" : "on campus"}.</div>
      <footer className="schedule-footer">Saudi Electronic University&nbsp; • &nbsp;{college.en}&nbsp; • &nbsp;{degree}&apos;s Degree Programs&nbsp; • &nbsp;{pageLabel}</footer>
      <img src={asset("brand/seu-pattern.png")} alt="" className="schedule-pattern" />
    </article>
    </div>
  );
}

function ordinal(value: number) {
  if (value === 1) return "1st";
  if (value === 2) return "2nd";
  if (value === 3) return "3rd";
  return `${value}th`;
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [delivery, setDelivery] = useState<Delivery>("campus");
  const [termEn, setTermEn] = useState("Summer Semester 1447H (2025–2026)");
  const [termAr, setTermAr] = useState("الفصل الصيفي 1447هـ (2025–2026)");
  const [includeBachelor, setIncludeBachelor] = useState(true);
  const [includeMaster, setIncludeMaster] = useState(true);
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [error, setError] = useState("");
  const [printTarget, setPrintTarget] = useState<string | null>(null);
  const [examType, setExamType] = useState("AUTO");

  useEffect(() => {
    if (!printTarget) return;
    const timer = window.setTimeout(() => window.print(), 120);
    const reset = () => setPrintTarget(null);
    window.addEventListener("afterprint", reset, { once: true });
    return () => { window.clearTimeout(timer); window.removeEventListener("afterprint", reset); };
  }, [printTarget]);

  const parsed = useMemo(() => {
    let excluded = 0;
    const exams: Exam[] = [];
    rows.forEach((row) => {
      const code = value(row, "CRSE", "COURSE_CODE", "COURSE CODE");
      const collegeRaw = value(row, "coll_code", "COLL_CODE", "COLLEGE_CODE").toUpperCase();
      const college = COLLEGES[collegeRaw];
      const typeCode = value(row, "MTYP_CODE", "EXAM_TYPE_CODE").toUpperCase();
      const date = parseDate(value(row, "DATE_", "EXAM_DATE", "DATE"));
      const start = normalizeTime(value(row, "Start_TIME", "START_TIME", "START TIME"));
      const end = normalizeTime(value(row, "END_TIME", "END TIME"));
      if (!code || !college || !typeCode || !date || !start || !end) { excluded += 1; return; }
      exams.push({ code, name: value(row, "course_title", "COURSE_TITLE", "COURSE NAME"), nameAr: value(row, "course_title_AR"), college: college.key, degree: degreeFor(code), date, dateKey: dateKey(date), start, end, sessionKey: `${start}|${end}`, examType: typeCode });
    });
    const examTypes = [...new Set(exams.map((exam) => exam.examType))].sort((a, b) => exams.filter((exam) => exam.examType === b).length - exams.filter((exam) => exam.examType === a).length);
    return { exams, examTypes, excluded };
  }, [rows]);

  const activeExamType = examType === "AUTO" ? (parsed.examTypes[0] ?? "") : examType;
  const activeExams = useMemo(() => parsed.exams.filter((exam) => exam.examType === activeExamType), [parsed.exams, activeExamType]);
  const activeSessions = useMemo(() => [...new Set(activeExams.map((exam) => exam.sessionKey))].sort((a, b) => a.localeCompare(b)), [activeExams]);

  const pages = useMemo(() => {
    const result: Array<{ key: string; college: string; degree: Degree; exams: Exam[]; sessions: string[]; pageLabel: string }> = [];
    for (const college of Object.values(COLLEGES)) {
      for (const degree of ["Bachelor", "Master"] as Degree[]) {
        if (degree === "Bachelor" ? !includeBachelor : !includeMaster) continue;
        const degreeExams = activeExams.filter((exam) => exam.college === college.key && exam.degree === degree);
        if (!degreeExams.length) {
          if (includeEmpty) result.push({ key: `${college.key}-${degree}-empty`, college: college.key, degree, exams: [], sessions: activeSessions.slice(0, 4), pageLabel: "Empty schedule" });
          continue;
        }
        const degreeSessions = [...new Set(degreeExams.map((exam) => exam.sessionKey))].sort((a, b) => a.localeCompare(b));
        const sessionGroups = chunks(degreeSessions, 4);
        sessionGroups.forEach((sessions, sessionGroupIndex) => {
          const groupExams = degreeExams.filter((exam) => sessions.includes(exam.sessionKey));
          const dateKeys = [...new Set(groupExams.map((exam) => exam.dateKey))].sort();
          const dateGroups: string[][] = [];
          let currentDates: string[] = [];
          let currentRows = 0;
          for (const key of dateKeys) {
            const dayRows = Math.max(3, ...sessions.map((session) => groupExams.filter((exam) => exam.dateKey === key && exam.sessionKey === session).length));
            if (currentDates.length && currentRows + dayRows > 24) { dateGroups.push(currentDates); currentDates = []; currentRows = 0; }
            currentDates.push(key); currentRows += dayRows;
          }
          if (currentDates.length) dateGroups.push(currentDates);
          dateGroups.forEach((dates, dateGroupIndex) => {
            const pageExams = groupExams.filter((exam) => dates.includes(exam.dateKey));
            const pageLabel = `Session group ${sessionGroupIndex + 1} of ${sessionGroups.length} · Page ${dateGroupIndex + 1} of ${dateGroups.length}`;
            result.push({ key: `${college.key}-${degree}-${sessionGroupIndex}-${dateGroupIndex}`, college: college.key, degree, exams: pageExams, sessions, pageLabel });
          });
        });
      }
    }
    return result;
  }, [activeExams, activeSessions, includeBachelor, includeMaster, includeEmpty]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const nextRows = parseCsv(await file.text());
    if (!nextRows.length) { setError("The file could not be read. Please upload a CSV export with column headings."); setRows([]); return; }
    setFileName(file.name); setRows(nextRows); setExamType("AUTO"); setError("");
  }

  return (
    <main>
      <section className="app-shell no-print">
        <header className="app-header">
          <img src={asset("brand/seu-logo.png")} alt="Saudi Electronic University" />
          <div><p className="eyebrow">Saudi Electronic University</p><h1>Exam Schedule PDF Generator</h1><p>Upload the course export, review the schedules, then print or save them as a polished PDF.</p></div>
          <InstallAppButton />
        </header>

        <section className="workflow-card">
          <div className="step-number">1</div>
          <div className="step-content"><h2>Upload the course CSV</h2><p>The file stays in your browser and is not stored by this website.</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} hidden />
            <button className="upload-zone" onClick={() => fileRef.current?.click()}><span className="upload-icon">↑</span><strong>{fileName || "Choose CSV file"}</strong><small>{fileName ? "Click to replace this file" : "Use the Exam time by COURSES export"}</small></button>
            {error && <p className="error-message">{error}</p>}
          </div>
        </section>

        <section className={`workflow-card ${!rows.length ? "disabled-card" : ""}`}>
          <div className="step-number">2</div>
          <div className="step-content"><h2>Choose the schedule options</h2>
            <div className="settings-grid">
              <label>English semester title<input value={termEn} onChange={(event) => setTermEn(event.target.value)} /></label>
              <label>Arabic semester title<input dir="rtl" value={termAr} onChange={(event) => setTermAr(event.target.value)} /></label>
              <label>Exam type<select value={examType} onChange={(event) => setExamType(event.target.value)}><option value="AUTO">Auto-detect ({activeExamType || "none"})</option>{parsed.examTypes.map((type) => <option key={type} value={type}>{type === "FEXM" ? "Final Exams" : type === "MEXM" ? "Mid-Term Exams" : type}</option>)}</select></label>
              <fieldset><legend>Exam delivery</legend><label className="choice"><input type="radio" checked={delivery === "campus"} onChange={() => setDelivery("campus")} /> On campus</label><label className="choice"><input type="radio" checked={delivery === "online"} onChange={() => setDelivery("online")} /> Online</label></fieldset>
              <fieldset><legend>Degree schedules</legend><label className="choice"><input type="checkbox" checked={includeBachelor} onChange={(event) => setIncludeBachelor(event.target.checked)} /> Bachelor</label><label className="choice"><input type="checkbox" checked={includeMaster} onChange={(event) => setIncludeMaster(event.target.checked)} /> Master</label></fieldset>
            </div>
            <label className="choice empty-choice"><input type="checkbox" checked={includeEmpty} onChange={(event) => setIncludeEmpty(event.target.checked)} /> Include empty college/degree schedules</label>
          </div>
        </section>

        {rows.length > 0 && <section className="result-card">
          <div><span className="status-dot" /><strong>Schedules ready</strong><p>{activeExams.length} {activeExamType === "FEXM" ? "final" : activeExamType === "MEXM" ? "midterm" : "valid"} exams · {parsed.excluded} invalid rows · {pages.length} printable schedule pages</p></div>
          <button className="print-button" onClick={() => { setPrintTarget(null); window.setTimeout(() => window.print(), 120); }}>Print all generated pages</button>
        </section>}
        {rows.length > 0 && <section className="college-print-card">
          <div><h2>Print one college</h2><p>Print every generated page for the selected college, including Bachelor and Master schedules.</p></div>
          <div className="college-print-buttons">
            {Object.values(COLLEGES).filter((college) => pages.some((page) => page.college === college.key)).map((college) => <button key={college.key} onClick={() => setPrintTarget(`college-${college.key}`)}><strong>{college.key}</strong><span>{college.en}</span></button>)}
          </div>
        </section>}
        {rows.length > 0 && <p className="print-tip">In the print window, choose <strong>Save as PDF</strong>, A4 landscape, and enable background graphics. Keep scale at 100%.</p>}
      </section>

      {rows.length > 0 && <section className={`preview-area ${printTarget ? "single-print-mode" : ""}`}>
        <div className="preview-label no-print">Printable preview</div>
        {pages.map((page) => <SchedulePage key={page.key} collegeKey={page.college} degree={page.degree} exams={page.exams} sessions={page.sessions} examType={activeExamType} pageLabel={page.pageLabel} delivery={delivery} termEn={termEn} termAr={termAr} selectedForPrint={printTarget === page.key || printTarget === `college-${page.college}`} onPrint={() => setPrintTarget(page.key)} />)}
      </section>}
    </main>
  );
}
