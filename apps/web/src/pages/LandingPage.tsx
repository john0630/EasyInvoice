import { Link } from "react-router-dom";
import { KIND_LABELS, type DocumentKind } from "@easy-invoice/shared";

const kinds: { kind: DocumentKind; desc: string; color: string }[] = [
  {
    kind: "proforma",
    desc: "Send a cost estimate before work begins. Non-binding quote for client approval.",
    color: "from-violet-500 to-purple-600",
  },
  {
    kind: "invoice",
    desc: "Request payment after delivery. Includes due date and payment terms.",
    color: "from-blue-500 to-brand",
  },
  {
    kind: "receipt",
    desc: "Confirm payment received. Proof of transaction for your records.",
    color: "from-emerald-500 to-teal-600",
  },
];

export function LandingPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Simple invoices, done right
          </h1>
          <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
            Create professional proforma invoices, invoices, and receipts in minutes.
            Live preview, PDF export, and cloud storage for your business.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {kinds.map((k) => (
              <Link
                key={k.kind}
                to={`/documents/new/${k.kind}`}
                className="bg-white text-slate-900 px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-100 transition-colors"
              >
                Create {KIND_LABELS[k.kind]}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">Choose your document type</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {kinds.map((k) => (
            <Link
              key={k.kind}
              to={`/documents/new/${k.kind}`}
              className="group block rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className={`h-2 bg-gradient-to-r ${k.color}`} />
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-brand transition-colors">
                  {KIND_LABELS[k.kind]}
                </h3>
                <p className="text-slate-500 text-sm mt-2">{k.desc}</p>
                <span className="inline-block mt-4 text-brand text-sm font-medium">
                  Start →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-slate-200 py-12 px-4">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
          {[
            { title: "Live preview", desc: "See your document update as you type" },
            { title: "PDF export", desc: "Download print-ready PDFs instantly" },
            { title: "Cloud save", desc: "Access documents from any device" },
          ].map((f) => (
            <div key={f.title}>
              <h3 className="font-semibold text-slate-800">{f.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
