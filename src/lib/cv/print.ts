/** Opens a print-ready window for a tailored CV / cover letter so the user can save it as PDF. */
export type PrintableApplication = {
  fullName: string;
  contact: string;
  jobTitle: string;
  company: string;
  headline?: string | undefined;
  summary?: string | undefined;
  skills?: string[] | undefined;
  bullets?: Array<{ company: string; title: string; bullets: string[] }> | undefined;
  coverLetter?: string | undefined;
  dir: "rtl" | "ltr";
};

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function printApplicationDocuments(doc: PrintableApplication) {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return false;

  const bullets = (doc.bullets ?? [])
    .map(
      (entry) => `<section class="entry">
        <h3>${esc(entry.title)} — ${esc(entry.company)}</h3>
        <ul>${entry.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
      </section>`,
    )
    .join("");

  const cover = doc.coverLetter
    ? `<div class="page-break"></div><h2>${doc.dir === "rtl" ? "خطاب التقديم" : "Cover letter"}</h2><p class="letter">${esc(doc.coverLetter)}</p>`
    : "";

  win.document.write(`<!doctype html><html dir="${doc.dir}" lang="${doc.dir === "rtl" ? "ar" : "en"}"><head>
    <meta charset="utf-8" />
    <title>${esc(doc.fullName)} — ${esc(doc.jobTitle)}</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:"IBM Plex Sans Arabic","Plus Jakarta Sans",system-ui,sans-serif;color:#111827;margin:0;padding:48px;line-height:1.6}
      h1{font-size:26px;margin:0 0 4px}
      .meta{color:#6b7280;font-size:13px;margin-bottom:20px}
      h2{font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#1e3a5f;margin:26px 0 8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
      h3{font-size:14px;margin:14px 0 4px}
      ul{margin:0;padding-inline-start:20px}
      li{margin-bottom:4px;font-size:13px}
      p{font-size:13px;margin:0 0 8px}
      .skills span{display:inline-block;border:1px solid #e5e7eb;border-radius:999px;padding:2px 10px;margin:0 6px 6px 0;font-size:12px}
      .letter{white-space:pre-line}
      .page-break{page-break-before:always}
      @media print{body{padding:24px}}
    </style></head><body>
    <h1>${esc(doc.fullName)}</h1>
    <div class="meta">${esc(doc.headline ?? "")}${doc.contact ? ` · ${esc(doc.contact)}` : ""}</div>
    <div class="meta">${doc.dir === "rtl" ? "مخصصة لوظيفة" : "Tailored for"}: ${esc(doc.jobTitle)} — ${esc(doc.company)}</div>
    ${doc.summary ? `<h2>${doc.dir === "rtl" ? "نبذة" : "Summary"}</h2><p>${esc(doc.summary)}</p>` : ""}
    ${doc.skills?.length ? `<h2>${doc.dir === "rtl" ? "المهارات" : "Skills"}</h2><div class="skills">${doc.skills.map((s) => `<span>${esc(s)}</span>`).join("")}</div>` : ""}
    ${bullets ? `<h2>${doc.dir === "rtl" ? "الخبرة" : "Experience"}</h2>${bullets}` : ""}
    ${cover}
    <script>window.onload=function(){window.print()}</script>
  </body></html>`);
  win.document.close();
  return true;
}
